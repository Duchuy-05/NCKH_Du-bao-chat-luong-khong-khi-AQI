"""Triển khai GPR dựa trên scikit-learn cho dự báo chất ô nhiễm/AQI.

File này cung cấp lớp :class:`GPRModel`, một lớp bao bọc
``GaussianProcessRegressor`` để chuẩn hóa dữ liệu, giới hạn số mẫu huấn
luyện, tối ưu kernel RBF và dự đoán một hay nhiều biến đầu ra.

Các phương thức chính của ``GPRModel``: ``fit`` để huấn luyện, ``predict``
để dự đoán (kèm độ lệch chuẩn) và ``get_kernel_params`` để lấy cấu hình
kernel đã fit. Các phương thức bắt đầu bằng ``_`` là bước nội bộ hỗ trợ ba
thao tác này.

(Tích hợp từ ml_test/gpr.py)
"""

from __future__ import annotations

import warnings
from typing import List, Optional, Tuple

import numpy as np
from joblib import Parallel, delayed
from numpy.linalg import LinAlgError
from scipy.spatial.distance import pdist
from sklearn.gaussian_process import GaussianProcessRegressor
from sklearn.gaussian_process.kernels import RBF, WhiteKernel, ConstantKernel
from sklearn.preprocessing import StandardScaler
from app.algorithms.gpr.training_selection import choose_training_indices

try:
    from threadpoolctl import threadpool_limits

    _HAS_THREADPOOLCTL = True
except ImportError:
    _HAS_THREADPOOLCTL = False


class GPRModel:
    """Wrapper GPR cho bài toán dự báo AQI, có xử lý scale dữ liệu lớn."""

    def __init__(
        self,
        max_train_size: Optional[int] = 6000,
        recent_ratio: float = 0.7,
        random_state: int = 42,
        alpha: float = 1e-6,
        max_alpha_retries: int = 3,
        n_restarts_optimizer: int = 3,
        n_jobs: int = -1,
        inner_n_threads: int = 1,
    ):
        """Khởi tạo cấu hình GPR và các thuộc tính sẽ được tạo sau khi fit.

        ``max_train_size`` và ``recent_ratio`` kiểm soát việc lấy mẫu khi dữ
        liệu lớn; các tham số còn lại điều chỉnh độ ổn định số, tối ưu kernel
        và mức song song của scikit-learn.
        """

        if not 0.0 <= recent_ratio <= 1.0:
            raise ValueError("recent_ratio phải nằm trong khoảng [0, 1].")

        self.max_train_size = max_train_size
        self.recent_ratio = recent_ratio
        self.random_state = random_state
        self.alpha = alpha
        self.max_alpha_retries = max_alpha_retries
        self.n_restarts_optimizer = n_restarts_optimizer
        self.n_jobs = n_jobs
        self.inner_n_threads = inner_n_threads

        self.x_scaler = StandardScaler()
        self.models_: Optional[List[GaussianProcessRegressor]] = None
        self.is_multi_output_ = False
        self.n_features_in_: Optional[int] = None
        self.n_outputs_: Optional[int] = None
        self.n_training_samples_: Optional[int] = None
        self.length_scale_bounds_: Optional[List[Tuple[float, float]]] = None

        if not _HAS_THREADPOOLCTL and inner_n_threads is not None:
            warnings.warn(
                "Không tìm thấy `threadpoolctl` - không thể giới hạn số "
                "thread BLAS nội bộ mỗi worker. Nếu n_jobs > 1, cân nhắc "
                "`pip install threadpoolctl` để tránh oversubscribe CPU.",
                stacklevel=2,
            )

    # ------------------------------------------------------------------
    # Ước lượng length_scale_bounds RIÊNG cho từng feature, dựa vào dữ liệu
    # ------------------------------------------------------------------
    def _estimate_length_scale_bounds(
        self, X_scaled: np.ndarray, sample_size: int = 1000
    ) -> List[Tuple[float, float]]:
        """Ước lượng khoảng tìm ``length_scale`` riêng cho từng feature.

        Hàm lấy tối đa ``sample_size`` dòng đã chuẩn hóa, đo khoảng cách của
        từng cột và dùng các percentile rộng để optimizer không bị bó hẹp.
        """
        n = X_scaled.shape[0]
        rng = np.random.default_rng(self.random_state)
        if n > sample_size:
            idx = rng.choice(n, size=sample_size, replace=False)
            X_sample = X_scaled[idx]
        else:
            X_sample = X_scaled

        bounds: List[Tuple[float, float]] = []
        for j in range(X_sample.shape[1]):
            col = X_sample[:, j].reshape(-1, 1)
            dists = pdist(col, metric="euclidean")
            dists = dists[dists > 1e-8]

            if dists.size == 0:
                bounds.append((1e-2, 1e3))
                continue

            # Percentile rộng hơn (0.5/99.5) và hệ số nhân lớn hơn (8x, tối
            # thiểu 20x lower) so với trước đây (1/99, 3x, 10x) để optimizer
            # có đủ khoảng tìm kiếm, tránh việc length_scale tối ưu bị kẹt
            # sát biên trên (ConvergenceWarning) và bị đánh giá thấp hơn giá
            # trị thực sự tốt nhất.
            lower = float(max(np.percentile(dists, 0.5), 1e-3))
            upper = float(max(np.percentile(dists, 99.5) * 8, lower * 20))
            bounds.append((lower, upper))

        return bounds

    # ------------------------------------------------------------------
    # Kernel
    # ------------------------------------------------------------------
    def _build_kernel(
        self, n_features: int, length_scale_bounds: List[Tuple[float, float]]
    ):
        """
        ConstantKernel * RBF(length_scale mỗi chiều, bounds riêng mỗi chiều)
        + WhiteKernel(nhiễu quan sát).
        length_scale khởi tạo = trung bình nhân (geometric mean) của bounds
        tương ứng - điểm khởi đầu hợp lý hơn so với luôn khởi tạo bằng 1.0.
        """
        length_scale_init = np.array(
            [np.sqrt(lo * hi) for lo, hi in length_scale_bounds]
        )
        kernel = (
            ConstantKernel(1.0, constant_value_bounds=(1e-3, 1e3))
            * RBF(
                length_scale=length_scale_init,
                length_scale_bounds=length_scale_bounds,
            )
            + WhiteKernel(noise_level=1.0, noise_level_bounds=(1e-5, 1e2))
        )
        return kernel

    # ------------------------------------------------------------------
    # Giảm kích thước dữ liệu train để GPR khả thi
    # ------------------------------------------------------------------
    def _limit_training_data(
        self,
        X: np.ndarray,
        y: np.ndarray,
        timestamps: Optional[np.ndarray] = None,
    ):
        """Giữ nguyên dữ liệu nhỏ hoặc chọn tập con đại diện khi dữ liệu lớn.

        Tập con luôn ưu tiên phần gần đây và lấy mẫu lịch sử theo mùa thông
        qua ``choose_training_indices`` để giảm chi phí O(n³) của GPR.
        """
        n = X.shape[0]
        if self.max_train_size is None or n <= self.max_train_size:
            return X, y
        idx = choose_training_indices(
            n,
            self.max_train_size,
            self.recent_ratio,
            self.random_state,
            timestamps,
        )
        return X[idx], y[idx]

    # ------------------------------------------------------------------
    # Fit một GPR đơn lẻ (dùng cho từng horizon), có retry khi Cholesky lỗi
    # ------------------------------------------------------------------
    def _fit_single_gpr(
        self,
        X_scaled: np.ndarray,
        y_col: np.ndarray,
        kernel,
        random_state: int,
    ) -> GaussianProcessRegressor:
        """Fit một GPR cho một cột đích, tăng ``alpha`` nếu Cholesky lỗi."""
        alpha = self.alpha
        last_err: Optional[Exception] = None

        for attempt in range(self.max_alpha_retries + 1):
            gpr = GaussianProcessRegressor(
                kernel=kernel,
                alpha=alpha,
                normalize_y=True,
                n_restarts_optimizer=self.n_restarts_optimizer,
                random_state=random_state,
            )
            try:
                if _HAS_THREADPOOLCTL:
                    with threadpool_limits(limits=self.inner_n_threads):
                        gpr.fit(X_scaled, y_col)
                else:
                    gpr.fit(X_scaled, y_col)
                return gpr
            except LinAlgError as e:
                last_err = e
                alpha *= 10
                warnings.warn(
                    f"Cholesky decomposition thất bại (lần thử {attempt + 1}/"
                    f"{self.max_alpha_retries + 1}). Tăng alpha lên "
                    f"{alpha:.2e} và thử lại.",
                    stacklevel=3,
                )

        raise RuntimeError(
            f"GPR fit thất bại sau {self.max_alpha_retries + 1} lần thử "
            f"tăng alpha (alpha cuối = {alpha:.2e}). Có thể dữ liệu có "
            f"nhiều điểm trùng/gần trùng nhau. Lỗi gốc: {last_err}"
        ) from last_err

    # ------------------------------------------------------------------
    # Fit / Predict
    # ------------------------------------------------------------------
    def fit(
        self,
        X: np.ndarray,
        y: np.ndarray,
        timestamps: Optional[np.ndarray] = None,
    ) -> "GPRModel":
        """Huấn luyện một mô hình GPR cho mỗi cột của ``y``.

        Dữ liệu được sắp theo ``timestamps`` (nếu có), lấy mẫu khi cần và
        chuẩn hóa ``X`` trước khi tối ưu các kernel độc lập cho từng đầu ra.
        """

        X = np.asarray(X, dtype=float)
        y = np.asarray(y, dtype=float)

        if X.ndim != 2:
            raise ValueError(f"X phải là mảng 2D, nhận được shape {X.shape}.")
        if X.shape[0] != y.shape[0]:
            raise ValueError(
                f"X và y phải có cùng số dòng: X có {X.shape[0]}, "
                f"y có {y.shape[0]}."
            )

        if timestamps is not None:
            timestamps = np.asarray(timestamps)
            if timestamps.shape[0] != X.shape[0]:
                raise ValueError(
                    "timestamps phải có cùng độ dài với X, y."
                )
            order = np.argsort(timestamps, kind="stable")
            X, y = X[order], y[order]
            timestamps = timestamps[order]

        X, y = self._limit_training_data(X, y, timestamps)
        self.n_training_samples_ = X.shape[0]

        X_scaled = self.x_scaler.fit_transform(X)
        self.n_features_in_ = X_scaled.shape[1]

        self.length_scale_bounds_ = self._estimate_length_scale_bounds(X_scaled)
        kernel = self._build_kernel(self.n_features_in_, self.length_scale_bounds_)

        y_was_1d = y.ndim == 1
        y2d = y.reshape(-1, 1) if y_was_1d else y
        self.is_multi_output_ = not y_was_1d
        self.n_outputs_ = y2d.shape[1]

        seeds = [self.random_state + i * 1000 for i in range(self.n_outputs_)]

        fitted = Parallel(n_jobs=self.n_jobs)(
            delayed(self._fit_single_gpr)(X_scaled, y2d[:, i], kernel, seeds[i])
            for i in range(self.n_outputs_)
        )
        self.models_ = list(fitted)

        return self

    def predict(self, X: np.ndarray, return_std: bool = True):
        """Dự đoán giá trị trung bình và, tùy chọn, độ lệch chuẩn cho ``X``.

        Hình dạng kết quả một đầu ra được giữ giống ``y`` một chiều lúc fit;
        nhiều đầu ra trả về mảng hai chiều theo thứ tự cột đích.
        """
        if self.models_ is None:
            raise RuntimeError("Model chưa được fit. Gọi .fit(X, y) trước.")

        X = np.asarray(X, dtype=float)
        if X.ndim != 2:
            raise ValueError(f"X phải là mảng 2D, nhận được shape {X.shape}.")
        if X.shape[1] != self.n_features_in_:
            raise ValueError(
                f"X có {X.shape[1]} features nhưng model được train với "
                f"{self.n_features_in_} features."
            )

        X_scaled = self.x_scaler.transform(X)

        means, stds = [], []
        for gpr in self.models_:
            if return_std:
                mean, std = gpr.predict(X_scaled, return_std=True)
                stds.append(std)
            else:
                mean = gpr.predict(X_scaled, return_std=False)
            means.append(mean)

        y_mean = np.column_stack(means)
        y_std = np.column_stack(stds) if return_std else None

        # Trả về shape nhất quán với những gì fit() nhận vào ban đầu.
        if not self.is_multi_output_:
            y_mean = y_mean.ravel()
            if return_std:
                y_std = y_std.ravel()

        if return_std:
            return y_mean, y_std
        return y_mean

    # ------------------------------------------------------------------
    # Thông tin kernel sau khi fit (để log / ghi vào metadata.json)
    # ------------------------------------------------------------------
    def get_kernel_params(self):
        """Trả chuỗi mô tả kernel sau khi fit cho từng mô hình đầu ra."""
        if self.models_ is None:
            raise RuntimeError("Model chưa được fit.")
        return [str(gpr.kernel_) for gpr in self.models_]

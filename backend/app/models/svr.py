"""
Support Vector Regression (SVR) cho dự báo chuỗi thời gian AQI — app/ml/models/svr.py

Đặc điểm kỹ thuật:
- Sử dụng RBF Kernel với GridSearchCV trên C, gamma, epsilon.
- Tích hợp TimeSeriesSplit cho cross-validation chuỗi thời gian (tránh nhìn trước tương lai).
- Hỗ trợ cả đơn bước (Single-step) và đa bước (Multi-output qua MultiOutputRegressor).
- Tích hợp chuẩn hóa StandardScaler tự động trong Pipeline.
"""
from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, List, Optional, Union
import joblib
import numpy as np
import pandas as pd
from sklearn.compose import TransformedTargetRegressor
from sklearn.model_selection import GridSearchCV, TimeSeriesSplit
from sklearn.multioutput import MultiOutputRegressor
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.svm import SVR


class SVRModel:
    """Mô hình Support Vector Regression tối ưu hoá cho bài toán chuỗi thời gian AQI."""

    DEFAULT_PARAM_GRID = {
        "regressor__svr__estimator__C": [1, 5, 10, 50, 100],
        "regressor__svr__estimator__epsilon": [0.01, 0.05, 0.1, 0.2],
        "regressor__svr__estimator__gamma": ["scale", "auto", 0.001, 0.01, 0.1],
    }

    def __init__(self, kernel: str = "rbf"):
        self.kernel = kernel
        self.best_params_: Dict[str, Any] = {}
        self.best_score_: Optional[float] = None
        self.model: Optional[TransformedTargetRegressor] = None
        self.feature_names_: List[str] = []
        self.target_names_: List[str] = []

    def _build_pipeline(self) -> TransformedTargetRegressor:
        """Xây dựng Pipeline kết hợp chuẩn hóa đầu vào và chuẩn hóa target."""
        inner_pipeline = Pipeline([
            ("scaler", StandardScaler()),
            ("svr", MultiOutputRegressor(SVR(kernel=self.kernel))),
        ])
        return TransformedTargetRegressor(
            regressor=inner_pipeline,
            transformer=StandardScaler(),
        )

    def tune_and_fit(
        self,
        X_train: pd.DataFrame,
        y_train: pd.DataFrame,
        cv_splits: int = 5,
        param_grid: Optional[Dict[str, List[Any]]] = None,
        n_jobs: int = -1,
        verbose: int = 1,
    ) -> SVRModel:
        """
        Tìm kiếm siêu tham số tối ưu bằng GridSearchCV với TimeSeriesSplit và huấn luyện mô hình.

        Args:
            X_train: Ma trận đặc trưng huấn luyện.
            y_train: Ma trận target huấn luyện (1 hoặc nhiều horizon).
            cv_splits: Số folds của TimeSeriesSplit.
            param_grid: Lưới siêu tham số cần tìm kiếm.
            n_jobs: Số luồng tính toán song song (-1 là dùng tất cả CPU).
            verbose: Mức độ in log.
        """
        self.feature_names_ = list(X_train.columns)
        self.target_names_ = list(y_train.columns) if hasattr(y_train, "columns") else ["target"]

        if param_grid is None:
            param_grid = self.DEFAULT_PARAM_GRID

        tscv = TimeSeriesSplit(n_splits=cv_splits)
        base_pipeline = self._build_pipeline()

        grid_search = GridSearchCV(
            estimator=base_pipeline,
            param_grid=param_grid,
            cv=tscv,
            scoring="neg_mean_absolute_error",
            n_jobs=n_jobs,
            verbose=verbose,
            refit=True,
        )

        print(f"[SVRModel] Bắt đầu Grid Search trên {len(param_grid)} tham số với {cv_splits} TimeSeriesSplit folds...")
        grid_search.fit(X_train, y_train)

        self.best_params_ = grid_search.best_params_
        self.best_score_ = -float(grid_search.best_score_)
        self.model = grid_search.best_estimator_

        print(f"[SVRModel] Grid Search hoàn tất!")
        print(f"[SVRModel] Best params: {self.best_params_}")
        print(f"[SVRModel] Best Cross-Validation MAE: {self.best_score_:.3f}")

        return self

    def fit_with_params(
        self,
        X: pd.DataFrame,
        y: pd.DataFrame,
        params: Optional[Dict[str, Any]] = None,
    ) -> SVRModel:
        """Fit nhanh mô hình với tham số cụ thể (hoặc best_params đã tìm được)."""
        self.feature_names_ = list(X.columns)
        self.target_names_ = list(y.columns) if hasattr(y, "columns") else ["target"]

        pipeline = self._build_pipeline()
        if params:
            pipeline.set_params(**params)
            self.best_params_ = params
        elif self.best_params_:
            pipeline.set_params(**self.best_params_)

        pipeline.fit(X, y)
        self.model = pipeline
        return self

    def predict(self, X: Union[pd.DataFrame, np.ndarray]) -> np.ndarray:
        """Dự báo AQI cho các bước horizon tương lai."""
        if self.model is None:
            raise RuntimeError("Mô hình chưa được huấn luyện! Hãy gọi tune_and_fit() hoặc load() trước.")

        if isinstance(X, pd.DataFrame):
            # Giữ đúng thứ tự các features lúc train
            if self.feature_names_:
                X = X[self.feature_names_]
            preds = self.model.predict(X)
        else:
            preds = self.model.predict(X)

        return np.asarray(preds)

    def save(self, file_path: Union[str, Path]) -> None:
        """Lưu toàn bộ weights và cấu hình mô hình."""
        path = Path(file_path)
        path.parent.mkdir(parents=True, exist_ok=True)
        joblib.dump(
            {
                "model": self.model,
                "best_params": self.best_params_,
                "best_score": self.best_score_,
                "feature_names": self.feature_names_,
                "target_names": self.target_names_,
                "kernel": self.kernel,
            },
            path,
        )
        print(f"[SVRModel] Đã lưu mô hình thành công vào: {path}")

    @classmethod
    def load(cls, file_path: Union[str, Path]) -> SVRModel:
        """Nạp mô hình đã lưu từ file joblib."""
        data = joblib.load(file_path)
        instance = cls(kernel=data.get("kernel", "rbf"))
        instance.model = data["model"]
        instance.best_params_ = data.get("best_params", {})
        instance.best_score_ = data.get("best_score", None)
        instance.feature_names_ = data.get("feature_names", [])
        instance.target_names_ = data.get("target_names", [])
        return instance

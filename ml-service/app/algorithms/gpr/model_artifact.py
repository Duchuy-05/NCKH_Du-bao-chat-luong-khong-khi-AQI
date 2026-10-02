"""Đóng gói mô hình GPR và tạo đặc trưng dùng chung cho train/dự đoán.

``infer_feature_lookback_steps`` xác định số dòng lịch sử phải giữ;
``make_feature_frame`` tạo feature thời gian, gió, lag, rolling và trend.
Dataclass ``CityGPRArtifact`` lưu estimator cùng schema, đồng thời cung cấp
``predict`` và ``predict_frame`` để dự đoán an toàn từ DataFrame nguồn.

(Tích hợp từ ml_test/model_artifact.py)
"""

from __future__ import annotations

from dataclasses import dataclass
import re
from typing import Any, Sequence

import numpy as np
import pandas as pd


TIME_FEATURE_COLUMNS = (
    "hour_sin",
    "hour_cos",
    "day_of_week_sin",
    "day_of_week_cos",
    "day_of_year_sin",
    "day_of_year_cos",
)

POLLUTANT_FEATURE_COLUMNS = (
    "pm2_5",
    "pm10",
    "carbon_monoxide",
    "nitrogen_dioxide",
    "sulphur_dioxide",
    "ozone",
)
WIND_DIRECTION_COLUMN = "wind_direction_10m"
WIND_COMPONENT_COLUMNS = ("wind_u_10m", "wind_v_10m")

# Các cửa sổ này biểu diễn lịch sử đã biết tại thời điểm dự báo t. Chúng
# không dùng giá trị ở t + horizon nên an toàn khi train và dự đoán thực tế.
LAG_STEPS_HOURS = (1, 3, 6, 12, 24, 48, 168)
ROLLING_WINDOWS_HOURS = (3, 24)
TREND_STEPS_HOURS = (1, 24)
MAX_FEATURE_LOOKBACK_STEPS = max(
    *LAG_STEPS_HOURS, *ROLLING_WINDOWS_HOURS, *TREND_STEPS_HOURS
)


def infer_feature_lookback_steps(feature_columns: Sequence[str]) -> int:
    """Suy ra số dòng lịch sử tối thiểu cần có từ tên các feature đã lưu.

    Hàm này giữ cho artifact cũ (chưa có lag/rolling) vẫn dự đoán được: với
    chúng kết quả là 0. Artifact mới cần tối đa 168 giờ lịch sử.
    """
    steps = [
        int(match.group(1))
        for column in feature_columns
        if (match := re.search(r"_(?:lag|rolling|trend)_(\d+)h$", column))
    ]
    return max(steps, default=0)


def make_feature_frame(
    frame: pd.DataFrame,
    raw_feature_columns: Sequence[str],
    time_column: str,
) -> pd.DataFrame:
    """Tạo feature số giống hệt lúc huấn luyện từ dữ liệu một thành phố.

    ``frame`` phải được sắp theo ``time_column`` tăng dần. Các đặc trưng trễ,
    rolling và trend chỉ dùng dữ liệu ở hiện tại hoặc quá khứ. Vì vậy các dòng
    đầu tiên (tối đa 168 giờ) sẽ có NaN và được loại ở bước tạo training pair.
    """
    missing = set(raw_feature_columns).difference(frame.columns)
    if missing:
        raise ValueError(
            "Thiếu cột đầu vào để dự đoán: " + ", ".join(sorted(missing))
        )
    if time_column not in frame.columns:
        raise ValueError(f"Thiếu cột thời gian '{time_column}' để dự đoán.")

    raw = frame.loc[:, list(raw_feature_columns)].apply(
        pd.to_numeric, errors="coerce"
    )
    timestamps = pd.to_datetime(frame[time_column], errors="coerce")
    if timestamps.isna().any():
        raise ValueError(f"Cột '{time_column}' có thời điểm không hợp lệ.")

    # Wind direction là biến góc: không đưa trực tiếp 0..360 vào model vì
    # 0° và 360° thực chất gần nhau. Hai thành phần u/v giữ được tính chu kỳ.
    direct_columns = [
        column for column in raw_feature_columns if column != WIND_DIRECTION_COLUMN
    ]
    result = raw.loc[:, direct_columns].copy()

    hours = timestamps.dt.hour + timestamps.dt.minute / 60
    weekdays = timestamps.dt.dayofweek
    day_of_year = timestamps.dt.dayofyear - 1 + hours / 24
    result = result.assign(
        hour_sin=np.sin(2 * np.pi * hours / 24),
        hour_cos=np.cos(2 * np.pi * hours / 24),
        day_of_week_sin=np.sin(2 * np.pi * weekdays / 7),
        day_of_week_cos=np.cos(2 * np.pi * weekdays / 7),
        day_of_year_sin=np.sin(2 * np.pi * day_of_year / 365.2425),
        day_of_year_cos=np.cos(2 * np.pi * day_of_year / 365.2425),
    )

    if WIND_DIRECTION_COLUMN in raw_feature_columns:
        if "wind_speed_10m" not in raw:
            raise ValueError("Cần 'wind_speed_10m' để tạo thành phần hướng gió.")
        direction_radians = np.deg2rad(raw[WIND_DIRECTION_COLUMN])
        # Quy ước khí tượng: hướng gió là hướng gió THỔI TỪ. u/v là thành
        # phần gió hướng đông/bắc mà khối khí đang di chuyển tới.
        result["wind_u_10m"] = -raw["wind_speed_10m"] * np.sin(direction_radians)
        result["wind_v_10m"] = -raw["wind_speed_10m"] * np.cos(direction_radians)

    # Với dữ liệu theo giờ, shift(k) dùng đúng k bản ghi quá khứ; main.py còn
    # kiểm tra time gap trước khi giữ cặp train/test hợp lệ.
    for column in POLLUTANT_FEATURE_COLUMNS:
        if column not in raw:
            continue
        values = raw[column]
        for lag in LAG_STEPS_HOURS:
            result[f"{column}_lag_{lag}h"] = values.shift(lag)
        for window in ROLLING_WINDOWS_HOURS:
            result[f"{column}_rolling_{window}h"] = values.rolling(
                window=window, min_periods=window
            ).mean()
        for step in TREND_STEPS_HOURS:
            result[f"{column}_trend_{step}h"] = values - values.shift(step)

    # ``shift(24)`` chỉ thực sự là 24 giờ nếu 24 bản ghi liền trước không có
    # lỗ hổng thời gian. Khi nguồn dữ liệu mất vài giờ, vô hiệu hóa feature
    # lịch sử ở các dòng bị ảnh hưởng thay vì gán nhầm một giá trị quá xa.
    time_deltas = timestamps.diff()
    median_interval = time_deltas.dropna().median()
    if not pd.isna(median_interval):
        tolerance = median_interval * 0.25
        irregular_step = (
            (time_deltas - median_interval).abs() > tolerance
        ).fillna(False)
        invalid_history = (
            irregular_step.astype(int)
            .rolling(MAX_FEATURE_LOOKBACK_STEPS, min_periods=MAX_FEATURE_LOOKBACK_STEPS)
            .sum()
            .gt(0)
        )
        history_columns = [
            column
            for column in result.columns
            if re.search(r"_(?:lag|rolling|trend)_\d+h$", column)
        ]
        if history_columns:
            result.loc[invalid_history, history_columns] = np.nan

    return result


@dataclass
class CityGPRArtifact:
    """Mô hình và thông tin cần thiết để dự đoán cho một thành phố.

    Hỗ trợ 2 chế độ:
    - **Single-horizon**: dùng ``estimator`` (1 model duy nhất) — dùng cho
      GPR Pollutants hoặc artifact cũ.
    - **Multi-horizon**: dùng ``estimators`` dict {horizon_int: GPRModel} —
      mỗi horizon d+1, d+2, ..., d+N có 1 model GPR riêng (Direct
      Multi-Step, giống SVR Daily).
    """

    estimator: Any
    city_id: str
    city_name: str
    target_columns: tuple[str, ...]
    raw_feature_columns: tuple[str, ...]
    feature_columns: tuple[str, ...]
    time_column: str
    backend: str
    trained_at_utc: str
    rows_used: int
    forecast_horizon_steps: int
    median_interval_seconds: float | None = None
    # Multi-horizon: dict mapping horizon (int) → GPRModel
    estimators: dict[int, Any] | None = None

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------
    def _validate_city(self, frame: pd.DataFrame) -> None:
        if "city_id" not in frame.columns:
            raise ValueError("Dữ liệu dự đoán phải có cột 'city_id'.")
        city_ids = frame["city_id"].dropna().astype(str).unique()
        if len(city_ids) != 1 or city_ids[0] != self.city_id:
            raise ValueError(
                f"Artifact này dành cho city_id='{self.city_id}', "
                "nhưng dữ liệu dự đoán không thuộc đúng một thành phố đó."
            )

    def _build_model_features(
        self,
        frame: pd.DataFrame,
        prediction_rows: int | None = None,
    ) -> pd.DataFrame:
        """Tạo feature frame và lấy prediction_rows cuối cùng."""
        features = make_feature_frame(
            frame, self.raw_feature_columns, self.time_column
        )
        if prediction_rows is not None:
            if prediction_rows < 1:
                raise ValueError("prediction_rows phải lớn hơn hoặc bằng 1.")
            features = features.tail(prediction_rows)
        model_features = features.loc[:, list(self.feature_columns)]
        if model_features.isna().any().any():
            lookback = infer_feature_lookback_steps(self.feature_columns)
            raise ValueError(
                "Dữ liệu dự đoán có giá trị thiếu hoặc không phải số. "
                f"Model này cần tối thiểu {lookback} dòng lịch sử liên tiếp "
                "để tạo đặc trưng lag/rolling."
            )
        return model_features

    @property
    def is_multi_horizon(self) -> bool:
        """True nếu artifact chứa nhiều model cho nhiều horizon."""
        return self.estimators is not None and len(self.estimators) > 0

    @property
    def horizon_list(self) -> list[int]:
        """Danh sách các horizon có model, sắp xếp tăng dần."""
        if self.estimators:
            return sorted(self.estimators.keys())
        return [self.forecast_horizon_steps]

    # ------------------------------------------------------------------
    # Single-horizon predict (backward-compatible)
    # ------------------------------------------------------------------
    def predict(
        self,
        frame: pd.DataFrame,
        return_std: bool = True,
        prediction_rows: int | None = None,
    ):
        """Dự đoán các chỉ số sau số bước đã lưu trong artifact.

        Dùng ``estimator`` (single model). Giữ nguyên cho backward
        compatibility và GPR Pollutants.
        """
        self._validate_city(frame)
        model_features = self._build_model_features(frame, prediction_rows)
        return self.estimator.predict(
            model_features.to_numpy(),
            return_std=return_std,
        )

    # ------------------------------------------------------------------
    # Multi-horizon predict (Direct Multi-Step)
    # ------------------------------------------------------------------
    def predict_horizon(
        self,
        frame: pd.DataFrame,
        horizon: int,
        return_std: bool = True,
        prediction_rows: int | None = None,
    ):
        """Dự đoán cho 1 horizon cụ thể (d+horizon).

        Nếu artifact có ``estimators`` dict → dùng model tương ứng.
        Nếu không (single-model) → fallback về ``estimator`` mặc định.
        """
        self._validate_city(frame)
        model_features = self._build_model_features(frame, prediction_rows)

        if self.estimators and horizon in self.estimators:
            est = self.estimators[horizon]
        elif horizon == self.forecast_horizon_steps:
            est = self.estimator
        else:
            raise ValueError(
                f"Không có model cho horizon={horizon}. "
                f"Các horizon khả dụng: {self.horizon_list}"
            )
        return est.predict(model_features.to_numpy(), return_std=return_std)

    def predict_multi_horizon(
        self,
        frame: pd.DataFrame,
        return_std: bool = True,
        prediction_rows: int = 1,
    ) -> dict[int, tuple]:
        """Dự đoán tất cả các horizon có sẵn.

        Returns
        -------
        dict mapping horizon (int) → (mean, std) nếu return_std=True
                                   → mean nếu return_std=False
        """
        self._validate_city(frame)
        model_features = self._build_model_features(frame, prediction_rows)
        X = model_features.to_numpy()

        results: dict[int, tuple] = {}
        for h in self.horizon_list:
            if self.estimators and h in self.estimators:
                est = self.estimators[h]
            else:
                est = self.estimator
            results[h] = est.predict(X, return_std=return_std)
        return results

    # ------------------------------------------------------------------
    # DataFrame output (backward-compatible)
    # ------------------------------------------------------------------
    def predict_frame(
        self,
        frame: pd.DataFrame,
        return_std: bool = True,
        prediction_rows: int | None = None,
    ) -> pd.DataFrame:
        """Trả kết quả dự đoán có tên cột rõ ràng cho mọi chỉ số đầu ra."""
        result = self.predict(
            frame, return_std=return_std, prediction_rows=prediction_rows
        )
        mean, std = result if return_std else (result, None)
        mean_array = np.asarray(mean)
        if mean_array.ndim == 1:
            mean_array = mean_array.reshape(-1, 1)
        output_index = (
            frame.tail(prediction_rows).index
            if prediction_rows is not None
            else frame.index
        )
        output = pd.DataFrame(
            mean_array,
            index=output_index,
            columns=[f"{column}_prediction" for column in self.target_columns],
        )
        if return_std:
            std_array = np.asarray(std)
            if std_array.ndim == 1:
                std_array = std_array.reshape(-1, 1)
            for index, column in enumerate(self.target_columns):
                output[f"{column}_std"] = std_array[:, index]
        return output

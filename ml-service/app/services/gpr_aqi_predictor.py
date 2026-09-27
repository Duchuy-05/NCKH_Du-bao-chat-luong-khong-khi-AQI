"""
GPR AQI Predictor — Dự đoán AQI bằng mô hình GPR đã huấn luyện.

Load artifact gpr_aqi.joblib, đọc dữ liệu mới nhất từ PostgreSQL,
tạo feature frame rồi dự đoán AQI + độ bất định (std).
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from functools import lru_cache

import joblib
import numpy as np
import pandas as pd

from app.algorithms.gpr.model_artifact import (
    CityGPRArtifact,
    infer_feature_lookback_steps,
)
from app.core.config import GPR_AQI_MODEL_PATH, DAILY_HORIZON
from app.data.aqi import LEVELS
from app.data.loaders.adapter import prepare_gpr_dataframe
from app.data.loaders.db_loader import load_pollutants, load_weather
from app.models.schema import DailyForecastPoint, DailyForecastResponse


def aqi_to_level(aqi: float) -> str:
    """Phân loại AQI theo breakpoint Việt Nam."""
    if pd.isna(aqi):
        return "Trung bình"
    for low, high, name in LEVELS:
        if low <= aqi <= high:
            return name
    return "Nguy hại"


class GPRAQIPredictor:
    """Dự đoán AQI bằng mô hình GPR đã train."""

    def __init__(self):
        if not GPR_AQI_MODEL_PATH.exists():
            raise FileNotFoundError(
                f"Không tìm thấy model GPR AQI: {GPR_AQI_MODEL_PATH}. "
                "Hãy chạy `python -m app.training.GPR.train_gpr_aqi` trước."
            )
        self.artifact: CityGPRArtifact = joblib.load(GPR_AQI_MODEL_PATH)
        self.lookback = infer_feature_lookback_steps(self.artifact.feature_columns)

    def _load_latest_data(self) -> pd.DataFrame:
        """Lấy dữ liệu mới nhất từ PostgreSQL, chuẩn hoá cho GPR."""
        df_pol = load_pollutants()
        df_wea = load_weather()
        frame, warnings = prepare_gpr_dataframe(
            df_pol, df_wea,
            city_id=self.artifact.city_id,
            city_name=self.artifact.city_name,
        )
        if warnings:
            for w in warnings:
                print(f"[GPRAQIPredictor] {w}")
        return frame

    def predict(self) -> DailyForecastResponse:
        """Dự đoán AQI cho các bước tiếp theo dùng GPR.

        GPR dự đoán 1 bước tại 1 thời điểm (horizon_steps trong artifact).
        Để tạo dự báo nhiều ngày, ta dự đoán tại dòng cuối cùng — kết quả
        là AQI cho 1 bước thời gian phía trước.

        Lưu ý: Khác với SVR (7 model riêng cho 7 ngày), GPR chỉ có 1 model.
        Với horizon_steps=1 thì chỉ dự báo được 1 bước. Để dự báo nhiều
        bước, ta lấy dòng cuối cùng có dữ liệu và dự đoán.
        """
        frame = self._load_latest_data()

        # Cần lookback + prediction rows dòng lịch sử
        min_rows = self.lookback + 1
        if len(frame) < min_rows:
            raise ValueError(
                f"Dữ liệu chỉ có {len(frame)} dòng, cần tối thiểu "
                f"{min_rows} dòng (lookback={self.lookback} + 1)."
            )

        # Dự đoán AQI
        mean, std = self.artifact.predict(frame, return_std=True, prediction_rows=1)
        aqi_value = round(float(np.atleast_1d(mean)[0]), 1)
        aqi_std = round(float(np.atleast_1d(std)[0]), 2)

        # Xác định thời gian dự báo
        last_time = pd.to_datetime(frame["time"].iloc[-1])
        horizon_steps = self.artifact.forecast_horizon_steps
        interval_seconds = self.artifact.median_interval_seconds or 3600
        forecast_time = last_time + timedelta(seconds=interval_seconds * horizon_steps)

        # Tạo forecast points — GPR chỉ dự đoán 1 bước
        # Nhưng ta có thể tạo 1 point với AQI + std (uncertainty)
        points = [
            DailyForecastPoint(
                date=forecast_time.date(),
                aqi=aqi_value,
                level=aqi_to_level(aqi_value),
            )
        ]

        return DailyForecastResponse(
            city=self.artifact.city_id,
            algo="gpr",
            generated_at=datetime.now(timezone.utc),
            horizon_days=1,
            forecast=points,
        )


@lru_cache(maxsize=1)
def get_gpr_aqi_predictor() -> GPRAQIPredictor:
    """Cache singleton — load model GPR 1 lần, tái sử dụng cho mọi request."""
    return GPRAQIPredictor()

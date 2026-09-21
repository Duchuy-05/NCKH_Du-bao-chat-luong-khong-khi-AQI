"""
Load svr_hourly.joblib (Luồng B) và sinh dự báo 24h tới (8 bước nhảy 3h)
từ dữ liệu clean_3h.parquet mới nhất.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from functools import lru_cache

import joblib
import pandas as pd

from app.core.config import CLEAN_3H_PATH, HOURLY_HORIZON, SVR_HOURLY_MODEL_PATH
from app.data.aqi import LEVELS
from app.features.hourly_features import (
    _add_hourly_calendar_features,
    _add_hourly_lag_features,
    _add_hourly_weather_features,
)
from app.models.schema import HourlyForecastPoint, HourlyForecastResponse


def aqi_to_level(aqi: float) -> str:
    if pd.isna(aqi):
        return "Trung bình"
    for low, high, name in LEVELS:
        if low <= aqi <= high:
            return name
    return "Nguy hại"


class HourlyPredictor:
    def __init__(self):
        bundle = joblib.load(SVR_HOURLY_MODEL_PATH)
        self.model = bundle["model"]
        self.feature_columns = bundle["feature_columns"]
        self.target_columns = bundle["target_columns"]

    def _build_latest_feature_row(self) -> tuple[pd.DataFrame, pd.Timestamp]:
        """
        Dùng logic feature engineering của hourly_features.py, áp lên
        toàn bộ lịch sử rồi lấy dòng cuối cùng làm input dự báo 8 bước 3h tiếp theo.
        """
        df = pd.read_parquet(CLEAN_3H_PATH).sort_index()
        df = _add_hourly_calendar_features(df)
        df = _add_hourly_lag_features(df)
        df = _add_hourly_weather_features(df)

        last_row = df.iloc[[-1]]
        missing = [c for c in self.feature_columns if c not in last_row.columns]
        if missing:
            raise ValueError(f"Thiếu feature so với lúc train hourly: {missing}")

        return last_row[self.feature_columns], df.index[-1]

    def predict(self) -> HourlyForecastResponse:
        X_latest, last_time = self._build_latest_feature_row()
        y_pred = self.model.predict(X_latest)[0]  # shape (HOURLY_HORIZON=8,)

        points = []
        for h in range(1, HOURLY_HORIZON + 1):
            forecast_time = last_time + timedelta(hours=3 * h)
            aqi_val = round(float(y_pred[h - 1]), 1)
            points.append(
                HourlyForecastPoint(
                    timestamp=forecast_time.to_pydatetime() if hasattr(forecast_time, "to_pydatetime") else forecast_time,
                    aqi=aqi_val,
                    level=aqi_to_level(aqi_val),
                )
            )

        return HourlyForecastResponse(
            city="hanoi",
            algo="svr",
            generated_at=datetime.now(timezone.utc),
            horizon_steps=HOURLY_HORIZON,
            step_hours=3,
            forecast=points,
        )


@lru_cache(maxsize=1)
def get_hourly_predictor() -> HourlyPredictor:
    """Cache singleton — load model 1 lần, tái sử dụng cho mọi request."""
    return HourlyPredictor()

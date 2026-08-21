"""
Load svr_daily.joblib (đã train ở GIAI ĐOẠN 2) và sinh dự báo 7 ngày tới
từ dữ liệu clean_daily.parquet mới nhất.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from functools import lru_cache

import joblib
import pandas as pd

from app.core.config import CLEAN_DAILY_PATH, SVR_DAILY_MODEL_PATH, DAILY_HORIZON
from app.features.daily_features import (
    _add_aqi_lag_features,
    _add_calendar_features,
    _add_weather_features,
)
from app.models.schema import DailyForecastPoint, DailyForecastResponse

def aqi_to_level(aqi: float) -> str:
    if aqi <= 50:
        return "Tốt"
    if aqi <= 100:
        return "Trung bình"
    if aqi <= 150:
        return "Kém"
    if aqi <= 200:
        return "Xấu"
    if aqi <= 300:
        return "Rất xấu"
    return "Nguy hại"


class DailyPredictor:
    def __init__(self):
        bundle = joblib.load(SVR_DAILY_MODEL_PATH)
        self.model = bundle["model"]
        self.feature_columns = bundle["feature_columns"]
        self.target_columns = bundle["target_columns"]

    def _build_latest_feature_row(self) -> pd.DataFrame:
        """
        Dùng đúng logic feature engineering của daily_features.py, áp lên
        toàn bộ lịch sử rồi lấy DÒNG CUỐI CÙNG (ngày gần nhất đã có dữ liệu
        thực) làm input để dự báo 7 ngày kế tiếp.
        """
        df = pd.read_parquet(CLEAN_DAILY_PATH).sort_index()
        df = _add_calendar_features(df)
        df = _add_aqi_lag_features(df)
        df = _add_weather_features(df)

        last_row = df.iloc[[-1]]
        missing = [c for c in self.feature_columns if c not in last_row.columns]
        if missing:
            raise ValueError(f"Thiếu feature so với lúc train: {missing}")

        return last_row[self.feature_columns], df.index[-1]

    def predict(self) -> DailyForecastResponse:
        X_latest, last_date = self._build_latest_feature_row()
        y_pred = self.model.predict(X_latest)[0]  # shape (DAILY_HORIZON,)

        points = []
        for h in range(1, DAILY_HORIZON + 1):
            forecast_date = (last_date + timedelta(days=h)).date()
            aqi_value = round(float(y_pred[h - 1]), 1)
            points.append(
                DailyForecastPoint(
                    date=forecast_date,
                    aqi=aqi_value,
                    level=aqi_to_level(aqi_value),
                )
            )

        return DailyForecastResponse(
            city="hanoi",
            algo="svr",
            generated_at=datetime.now(timezone.utc),
            horizon_days=DAILY_HORIZON,
            forecast=points,
        )


@lru_cache(maxsize=1)
def get_daily_predictor() -> DailyPredictor:
    """Cache singleton — load model 1 lần, tái sử dụng cho mọi request."""
    return DailyPredictor()

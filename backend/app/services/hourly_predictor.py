"""Load the hourly SVR model and forecast 24 one-hour steps."""
from __future__ import annotations

from datetime import datetime, timezone
from functools import lru_cache

import joblib
import pandas as pd

from app.core.config import (
    CITY,
    HOURLY_HORIZON,
    STEP_HOURS,
    city_hourly_model_path,
)
from app.data.aqi import LEVELS
from app.data.loaders.db_loader import load_hourly_training_data
from app.features.hourly_features import build_latest_hourly_feature_row
from app.models.schema import HourlyForecastPoint, HourlyForecastResponse


def aqi_to_level(aqi: float) -> str:
    if pd.isna(aqi):
        return "Trung bình"
    aqi = min(500, max(0, int(float(aqi) + 0.5)))
    for low, high, name in LEVELS:
        if low <= aqi <= high:
            return name
    return "Nguy hại"


class HourlyPredictor:
    def __init__(self, city_code: str = CITY):
        self.city = city_code.strip().lower()
        model_path = city_hourly_model_path(self.city)
        bundle = joblib.load(model_path)
        self.model = bundle["model"]
        self.feature_columns = bundle["feature_columns"]
        self.target_columns = bundle["target_columns"]
        if (
            len(bundle.get("aqi_target_columns", [])) != HOURLY_HORIZON
            or bundle.get("step_hours") != STEP_HOURS
            or bundle.get("aqi_standard") != "VN_AQI_QD_1459_2019"
            or bundle.get("data_source") != "processed_postgresql_v1"
        ):
            raise ValueError(
                "Model hourly hiện tại chưa dùng dữ liệu đã xử lý trong PostgreSQL. "
                f"Hãy gọi API /admin/train?target=hourly&city={self.city} để huấn luyện lại."
            )
        if bundle.get("city", self.city) != self.city:
            raise ValueError(f"Model hourly không thuộc thành phố {self.city}; hãy huấn luyện lại.")

    def _build_latest_feature_row(self) -> tuple[pd.DataFrame, pd.Timestamp]:
        """
        Dùng chung logic feature engineering với lúc huấn luyện và lấy dòng mới nhất.
        """
        df = load_hourly_training_data(self.city).sort_index()
        return build_latest_hourly_feature_row(df, self.feature_columns)

    def predict(self) -> HourlyForecastResponse:
        X_latest, last_time = self._build_latest_feature_row()
        y_pred = self.model.predict(X_latest)[0]

        points = []
        for h in range(1, HOURLY_HORIZON + 1):
            forecast_time = last_time + pd.Timedelta(hours=STEP_HOURS * h)
            aqi_val = float(min(500, max(0, int(float(y_pred[h - 1]) + 0.5))))
            points.append(
                HourlyForecastPoint(
                    timestamp=forecast_time.to_pydatetime() if hasattr(forecast_time, "to_pydatetime") else forecast_time,
                    aqi=aqi_val,
                    level=aqi_to_level(aqi_val),
                )
            )

        return HourlyForecastResponse(
            city=self.city,
            algo="svr",
            generated_at=datetime.now(timezone.utc),
            horizon_steps=HOURLY_HORIZON,
            step_hours=STEP_HOURS,
            forecast=points,
        )


@lru_cache(maxsize=5)
def get_hourly_predictor(city_code: str = CITY) -> HourlyPredictor:
    """Cache singleton — load model 1 lần, tái sử dụng cho mọi request."""
    return HourlyPredictor(city_code)

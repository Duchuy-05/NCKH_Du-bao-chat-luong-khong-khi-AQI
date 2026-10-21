"""Load a city's daily SVR bundle and forecast from stored PostgreSQL data."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from functools import lru_cache

import joblib
import pandas as pd

from app.core.config import (
    CITY,
    DAILY_HORIZON,
    DAILY_PREDICTION_HISTORY_DAYS,
    city_daily_model_path,
)
from app.data.loaders.db_loader import load_daily_training_data
from app.features.daily_features import (
    _add_aqi_lag_features,
    _add_calendar_features,
    _add_weather_features,
    prepare_daily_feature_inputs,
)
from app.models.schema import DailyForecastPoint, DailyForecastResponse

def aqi_to_level(aqi: float) -> str:
    aqi = min(500, max(0, int(float(aqi) + 0.5)))
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
    def __init__(self, city_code: str = CITY):
        self.city = city_code.strip().lower()
        model_path = city_daily_model_path(self.city)
        bundle = joblib.load(model_path)
        if (
            bundle.get("aqi_standard") != "VN_AQI_QD_1459_2019"
            or bundle.get("data_source") != "processed_postgresql_v1"
        ):
            raise ValueError(
                "Model daily hiện tại chưa dùng dữ liệu đã xử lý trong PostgreSQL. "
                f"Hãy gọi API /admin/train?target=daily&city={self.city} để huấn luyện lại."
            )
        if bundle.get("city", self.city) != self.city:
            raise ValueError(f"Model daily không thuộc thành phố {self.city}; hãy huấn luyện lại.")
        self.models = bundle.get("models", {})
        expected_models = {f"d_{h}" for h in range(1, DAILY_HORIZON + 1)}
        missing_models = sorted(expected_models - set(self.models))
        if missing_models:
            raise ValueError(f"Daily model bundle missing horizons: {missing_models}")
        self.feature_columns = bundle["feature_columns"]
        self.target_columns = bundle["target_columns"]

    def _build_latest_feature_row(self) -> pd.DataFrame:
        """
        Dùng đúng logic feature engineering của daily_features.py, áp lên
        toàn bộ lịch sử rồi lấy DÒNG CUỐI CÙNG (ngày gần nhất đã có dữ liệu
        thực) làm input để dự báo 7 ngày kế tiếp.
        """
        df = prepare_daily_feature_inputs(
            load_daily_training_data(
                self.city,
                lookback_days=DAILY_PREDICTION_HISTORY_DAYS,
            )
        )
        df = _add_calendar_features(df)
        df = _add_aqi_lag_features(df)
        df = _add_weather_features(df)

        usable = df.dropna(subset=self.feature_columns)
        if usable.empty:
            raise ValueError("Chưa có dòng daily đầy đủ để tạo dự báo.")
        last_row = usable.iloc[[-1]]
        missing = [c for c in self.feature_columns if c not in last_row.columns]
        if missing:
            raise ValueError(f"Thiếu feature so với lúc train: {missing}")

        return last_row[self.feature_columns], usable.index[-1]

    def predict(self) -> DailyForecastResponse:
        X_latest, last_date = self._build_latest_feature_row()

        points = []
        for h in range(1, DAILY_HORIZON + 1):
            forecast_date = (last_date + timedelta(days=h)).date()
            aqi_value = float(min(500, max(0, int(float(self.models[f"d_{h}"].predict(X_latest)[0]) + 0.5))))
            points.append(
                DailyForecastPoint(
                    date=forecast_date,
                    aqi=aqi_value,
                    level=aqi_to_level(aqi_value),
                )
            )

        return DailyForecastResponse(
            city=self.city,
            algo="svr",
            generated_at=datetime.now(timezone.utc),
            horizon_days=DAILY_HORIZON,
            forecast=points,
        )


@lru_cache(maxsize=5)
def get_daily_predictor(city_code: str = CITY) -> DailyPredictor:
    """Cache singleton — load model 1 lần, tái sử dụng cho mọi request."""
    return DailyPredictor(city_code)

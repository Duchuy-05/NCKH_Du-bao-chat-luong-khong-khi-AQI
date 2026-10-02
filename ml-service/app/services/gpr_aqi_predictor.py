"""
GPR AQI Predictor — Dự đoán AQI bằng mô hình GPR đã huấn luyện.

Load artifact gpr_aqi.joblib (multi-horizon: 7 model GPR, mỗi model
cho 1 ngày d+1 → d+7), đọc dữ liệu mới nhất từ PostgreSQL,
tạo feature frame rồi dự đoán AQI + độ bất định (std) cho 7 ngày tới.
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
    """Dự đoán AQI bằng mô hình GPR đã train (multi-horizon).

    Artifact chứa 7 model GPR riêng biệt (Direct Multi-Step):
    - d+1: dự đoán AQI ngày mai
    - d+2: dự đoán AQI ngày kia
    - ...
    - d+7: dự đoán AQI 7 ngày tới

    Mỗi model cho ra mean ± std (uncertainty) riêng.
    """

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
        """Dự đoán AQI cho 7 ngày tới dùng GPR multi-horizon.

        Mỗi horizon d+h có 1 model GPR riêng, dùng cùng feature input
        (dòng cuối cùng của dữ liệu). Kết quả gồm AQI và uncertainty.
        """
        frame = self._load_latest_data()

        # Cần lookback + 1 dòng lịch sử để tạo đặc trưng
        min_rows = self.lookback + 1
        if len(frame) < min_rows:
            raise ValueError(
                f"Dữ liệu chỉ có {len(frame)} dòng, cần tối thiểu "
                f"{min_rows} dòng (lookback={self.lookback} + 1)."
            )

        # Xác định thời gian cơ sở
        last_time = pd.to_datetime(frame["time"].iloc[-1])
        interval_seconds = self.artifact.median_interval_seconds or 3600

        # Dùng multi-horizon predict nếu artifact hỗ trợ
        if self.artifact.is_multi_horizon:
            # Multi-horizon: 7 models, mỗi model predict 1 ngày
            results = self.artifact.predict_multi_horizon(
                frame, return_std=True, prediction_rows=1
            )
            points = []
            for h in sorted(results.keys()):
                mean, std = results[h]
                aqi_value = round(float(np.atleast_1d(mean)[0]), 1)
                aqi_std = round(float(np.atleast_1d(std)[0]), 2)
                forecast_time = last_time + timedelta(
                    seconds=interval_seconds * h
                )
                points.append(
                    DailyForecastPoint(
                        date=forecast_time.date(),
                        aqi=aqi_value,
                        level=aqi_to_level(aqi_value),
                    )
                )
            n_horizons = len(results)
        else:
            # Backward compat: single-horizon artifact (cũ)
            mean, std = self.artifact.predict(
                frame, return_std=True, prediction_rows=1
            )
            aqi_value = round(float(np.atleast_1d(mean)[0]), 1)
            horizon_steps = self.artifact.forecast_horizon_steps
            forecast_time = last_time + timedelta(
                seconds=interval_seconds * horizon_steps
            )
            points = [
                DailyForecastPoint(
                    date=forecast_time.date(),
                    aqi=aqi_value,
                    level=aqi_to_level(aqi_value),
                )
            ]
            n_horizons = 1

        return DailyForecastResponse(
            city=self.artifact.city_id,
            algo="gpr",
            generated_at=datetime.now(timezone.utc),
            horizon_days=n_horizons,
            forecast=points,
        )


@lru_cache(maxsize=1)
def get_gpr_aqi_predictor() -> GPRAQIPredictor:
    """Cache singleton — load model GPR 1 lần, tái sử dụng cho mọi request."""
    return GPRAQIPredictor()


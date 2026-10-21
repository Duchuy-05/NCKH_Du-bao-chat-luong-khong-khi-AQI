"""Feature engineering for the next 24 hourly AQI forecasts."""
from __future__ import annotations

import numpy as np
import pandas as pd

from app.core.config import (
    CITY,
    HOURLY_FEATURES_PATH,
    HOURLY_HORIZON,
    STEP_HOURS,
)
from app.data.aqi import POLLUTANT_COLUMNS
from app.data.loaders.db_loader import load_hourly_training_data

TARGET_COLS_HOURLY = [f"h_{h}" for h in range(1, HOURLY_HORIZON + 1)]


def _drop_meta_columns(df: pd.DataFrame) -> pd.DataFrame:
    non_numeric_meta = ["dominant_pollutant", "level", "city_id", "station_id", "station_name", "time", "id"]
    return df.drop(columns=[c for c in non_numeric_meta if c in df.columns]).copy()


def _prepare_hourly_feature_frame(df: pd.DataFrame) -> pd.DataFrame:
    """Build input features from an hourly frame without changing AQI labels."""
    df = _drop_meta_columns(df.sort_index())

    # Forward-fill at most two missing predictor values. The official AQI labels
    # were computed from original observations and remain untouched.
    for col in [*POLLUTANT_COLUMNS, "temperature", "humidity", "wind_speed", "pressure", "precipitation"]:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce").ffill(limit=2)

    df = _add_hourly_calendar_features(df)
    df = _add_hourly_lag_features(df)
    df = _add_hourly_weather_features(df)

    object_columns = [
        col for col in df.columns
        if df[col].dtype == "object" or not np.issubdtype(df[col].dtype, np.number)
    ]
    if object_columns:
        df = df.drop(columns=object_columns)
    return df


def _add_hourly_calendar_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    dt = df.index
    hour = dt.hour
    df["hour_sin"] = np.sin(2 * np.pi * hour / 24)
    df["hour_cos"] = np.cos(2 * np.pi * hour / 24)

    month = dt.month
    df["month_sin"] = np.sin(2 * np.pi * month / 12)
    df["month_cos"] = np.cos(2 * np.pi * month / 12)
    dow = dt.dayofweek
    df["dow_sin"] = np.sin(2 * np.pi * dow / 7)
    df["dow_cos"] = np.cos(2 * np.pi * dow / 7)
    df["is_weekend"] = dow.isin([5, 6]).astype(int)
    df["is_night"] = ((hour >= 18) | (hour < 6)).astype(int)
    df["is_northeast_monsoon"] = month.isin([11, 12, 1, 2, 3]).astype(int)
    return df


def _add_hourly_lag_features(df: pd.DataFrame) -> pd.DataFrame:
    """Create lag and rolling inputs measured in hourly rows."""
    df = df.copy()
    series = df["aqi"]
    lags = [1, 2, 3, 6, 12, 24, 48, 72, 168]
    for lag in lags:
        df[f"aqi_lag_{lag}h"] = series.shift(lag)

    steps_1y = 365 * 24
    steps_2y = 730 * 24
    steps_3d = 3 * 24
    for base_steps, label in [(steps_1y, "1y"), (steps_2y, "2y")]:
        df[f"aqi_seasonal_lag_{label}"] = series.shift(base_steps)
        df[f"aqi_seasonal_lag_{label}_m3d"] = series.shift(base_steps - steps_3d)
        df[f"aqi_seasonal_lag_{label}_p3d"] = series.shift(base_steps + steps_3d)

    previous = series.shift(1)
    for window, label in [(24, "24h"), (72, "72h"), (168, "7d")]:
        rolling = previous.rolling(window, min_periods=window)
        df[f"aqi_roll_mean_{label}"] = rolling.mean()
        df[f"aqi_roll_std_{label}"] = rolling.std().fillna(0)
        df[f"aqi_roll_min_{label}"] = rolling.min()
        df[f"aqi_roll_max_{label}"] = rolling.max()

    df["aqi_diff_1h_2h"] = df["aqi_lag_1h"] - df["aqi_lag_2h"]
    df["aqi_diff_1h_24h"] = df["aqi_lag_1h"] - df["aqi_lag_24h"]
    return df


def _add_hourly_weather_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    weather_columns = [
        col for col in ["temperature", "humidity", "wind_speed", "pressure", "precipitation"]
        if col in df.columns
    ]

    for col in weather_columns:
        previous = df[col].shift(1)
        df[f"{col}_lag_1h"] = previous
        df[f"{col}_lag_2h"] = df[col].shift(2)
        df[f"{col}_roll_mean_24h"] = previous.rolling(24, min_periods=24).mean()

    if "temperature" in df.columns and "humidity" in df.columns:
        temperature = df["temperature"]
        humidity = df["humidity"].clip(lower=1, upper=100)
        df["temp_dew_diff"] = (100 - humidity) / 5
        df["temp_dew_diff_lag1"] = df["temp_dew_diff"].shift(1)
        df["temperature_lag_1h"] = temperature.shift(1)
    return df


def build_latest_hourly_feature_row(
    hourly_frame: pd.DataFrame,
    feature_columns: list[str],
) -> tuple[pd.DataFrame, pd.Timestamp]:
    """Return the latest inference row using exactly the training feature logic."""
    features = _prepare_hourly_feature_frame(hourly_frame)
    if features.empty:
        raise ValueError("Không có dữ liệu hourly để dự báo.")
    usable = features.dropna(subset=feature_columns)
    if usable.empty:
        raise ValueError("Chưa có dòng dữ liệu hourly đầy đủ để tạo dự báo.")
    latest = usable.iloc[[-1]]
    missing = [col for col in feature_columns if col not in latest.columns]
    if missing:
        raise ValueError(f"Thiếu feature so với lúc train hourly: {missing}")
    row = latest[feature_columns]
    if row.isna().to_numpy().any():
        missing_values = row.columns[row.isna().iloc[0]].tolist()
        raise ValueError(f"Thiếu dữ liệu cho feature dự báo hourly: {missing_values}")
    return row.astype(float), latest.index[-1]


def build_hourly_features(save: bool = True, city_code: str = CITY) -> pd.DataFrame:
    """Build AQI inputs and the next 24 one-hour targets."""
    hourly = load_hourly_training_data(city_code).sort_index()
    df = _prepare_hourly_feature_frame(hourly)
    for horizon in range(1, HOURLY_HORIZON + 1):
        df[f"h_{horizon}"] = df["aqi"].shift(-horizon * STEP_HOURS)

    df_clean = df.dropna().copy()
    if save:
        HOURLY_FEATURES_PATH.parent.mkdir(parents=True, exist_ok=True)
        df_clean.to_parquet(HOURLY_FEATURES_PATH)
        print(f"[build_hourly_features] Saved {df_clean.shape} -> {HOURLY_FEATURES_PATH}")
    return df_clean


if __name__ == "__main__":
    build_hourly_features(save=True)

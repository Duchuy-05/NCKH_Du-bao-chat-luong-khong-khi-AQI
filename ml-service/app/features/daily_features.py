"""
GIAI ĐOẠN 2 — Luồng A (theo ngày)
Build feature/label table từ clean_daily.parquet để train SVR (svr_daily).

Input:  data/hanoi/clean_daily.parquet
          index = ngày (DatetimeIndex, tz=Asia/Ho_Chi_Minh)
          cột tối thiểu: aqi_mean, aqi_max, aqi_min,
                         temperature_2m, relative_humidity_2m,
                         wind_speed_10m, rain, precipitation, surface_pressure

Output: data/features/features_daily.parquet
          các cột feature (X) + d_1..d_7 (y, aqi_mean của 1..7 ngày sau)
"""
from __future__ import annotations

import numpy as np
import pandas as pd

from app.core.config import CLEAN_DAILY_PATH, FEATURES_DAILY_PATH, DAILY_HORIZON

# Các lag (ngày trước) dùng làm feature cho AQI
AQI_LAGS = [1, 2, 3, 5, 7, 14]
# Rolling window (ngày) tính mean/std trên aqi_mean
ROLLING_WINDOWS = [3, 7, 14]
# Thời tiết chỉ lấy lag 1 + rolling 7 ngày
WEATHER_COLS = [
    "temperature_2m",
    "relative_humidity_2m",
    "wind_speed_10m",
    "rain",
    "surface_pressure",
]


def _add_calendar_features(df: pd.DataFrame) -> pd.DataFrame:
    dow = df.index.dayofweek  # 0=Mon..6=Sun
    doy = df.index.dayofyear
    df["dow_sin"] = np.sin(2 * np.pi * dow / 7)
    df["dow_cos"] = np.cos(2 * np.pi * dow / 7)
    df["doy_sin"] = np.sin(2 * np.pi * doy / 365.25)
    df["doy_cos"] = np.cos(2 * np.pi * doy / 365.25)
    df["is_weekend"] = (dow >= 5).astype(int)
    df["month"] = df.index.month
    return df


def _add_aqi_lag_features(df: pd.DataFrame) -> pd.DataFrame:
    for lag in AQI_LAGS:
        df[f"aqi_mean_lag_{lag}"] = df["aqi_mean"].shift(lag)
    for w in ROLLING_WINDOWS:
        # shift(1) trước rồi mới rolling để không rò rỉ giá trị hiện tại (data leakage)
        df[f"aqi_mean_roll_mean_{w}"] = df["aqi_mean"].shift(1).rolling(w).mean()
        df[f"aqi_mean_roll_std_{w}"] = df["aqi_mean"].shift(1).rolling(w).std()
    # biến động ngày hôm trước so với hôm trước nữa
    df["aqi_mean_diff_1"] = df["aqi_mean"].shift(1) - df["aqi_mean"].shift(2)
    # biên độ dao động trong ngày hôm trước (max-min) — proxy cho độ bất ổn
    if {"aqi_max", "aqi_min"}.issubset(df.columns):
        df["aqi_range_lag_1"] = (df["aqi_max"] - df["aqi_min"]).shift(1)
    return df


def _add_weather_features(df: pd.DataFrame) -> pd.DataFrame:
    for col in WEATHER_COLS:
        if col not in df.columns:
            continue
        df[f"{col}_lag_1"] = df[col].shift(1)
        df[f"{col}_roll_mean_7"] = df[col].shift(1).rolling(7).mean()
    return df


def _add_targets(df: pd.DataFrame, horizon: int = DAILY_HORIZON) -> pd.DataFrame:
    for h in range(1, horizon + 1):
        df[f"d_{h}"] = df["aqi_mean"].shift(-h)
    return df


def build_daily_features(save: bool = True) -> pd.DataFrame:
    df = pd.read_parquet(CLEAN_DAILY_PATH)
    df = df.sort_index()

    df = _add_calendar_features(df)
    df = _add_aqi_lag_features(df)
    df = _add_weather_features(df)
    df = _add_targets(df)

    feature_cols = [c for c in df.columns if c not in (
        [f"d_{h}" for h in range(1, DAILY_HORIZON + 1)]
        + ["aqi_max", "aqi_min", "dominant_pollutant", "level", "missing_flag"]
    )]
    target_cols = [f"d_{h}" for h in range(1, DAILY_HORIZON + 1)]

    # Bỏ các dòng thiếu do lag ở đầu chuỗi hoặc target ở cuối chuỗi
    model_df = df[feature_cols + target_cols].dropna()

    if save:
        FEATURES_DAILY_PATH.parent.mkdir(parents=True, exist_ok=True)
        model_df.to_parquet(FEATURES_DAILY_PATH)
        print(f"[daily_features] Saved {model_df.shape[0]} rows x "
              f"{len(feature_cols)} features -> {FEATURES_DAILY_PATH}")

    return model_df


FEATURE_COLUMNS = None  # sẽ được set sau lần build đầu; dùng trong training/predictor


if __name__ == "__main__":
    out = build_daily_features()
    print(out.tail())
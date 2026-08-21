"""
Feature engineering cho Luồng B (Hourly / 3-hour steps — Dự báo 24h tới bước nhảy 3h)
"""
from __future__ import annotations

import numpy as np
import pandas as pd

from app.core.config import CLEAN_3H_PATH, HOURLY_FEATURES_PATH, HOURLY_HORIZON

TARGET_COLS_HOURLY = [f"h_{h}" for h in range(1, HOURLY_HORIZON + 1)]


def _add_hourly_calendar_features(df: pd.DataFrame) -> pd.DataFrame:
    """Tạo các đặc trưng lịch biểu và chu kỳ thời gian trong ngày."""
    df = df.copy()
    dt = df.index

    # Giờ trong ngày (0..23) chu kỳ 24h
    hour = dt.hour
    df["hour_sin"] = np.sin(2 * np.pi * hour / 24)
    df["hour_cos"] = np.cos(2 * np.pi * hour / 24)

    # Tháng (1..12) chu kỳ 12 tháng
    month = dt.month
    df["month_sin"] = np.sin(2 * np.pi * month / 12)
    df["month_cos"] = np.cos(2 * np.pi * month / 12)

    # Thứ trong tuần (0..6)
    dow = dt.dayofweek
    df["dow_sin"] = np.sin(2 * np.pi * dow / 7)
    df["dow_cos"] = np.cos(2 * np.pi * dow / 7)

    df["is_weekend"] = dow.isin([5, 6]).astype(int)

    # Cờ ngày / đêm (đêm từ 18h đến 06h sáng)
    df["is_night"] = ((hour >= 18) | (hour < 6)).astype(int)

    # Cờ mùa gió Đông Bắc (tháng 11 đến tháng 3)
    df["is_northeast_monsoon"] = month.isin([11, 12, 1, 2, 3]).astype(int)

    return df


def _add_hourly_lag_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Tạo các lag theo bước nhảy 3h:
    Lag steps: 1 (3h), 2 (6h), 4 (12h), 8 (24h/1d), 24 (72h/3d), 56 (168h/7d).
    """
    df = df.copy()
    s = df["aqi"]

    # 3h step lags
    lags = [1, 2, 4, 8, 16, 24, 56]
    for lag in lags:
        df[f"aqi_lag_{lag}steps"] = s.shift(lag)

    # Lag mùa vụ cùng thời điểm năm trước (365d = ~2920 steps 3h, 730d) và +- 3 ngày (24 steps)
    steps_1y = int(365 * 24 / 3)  # 2920
    steps_2y = int(730 * 24 / 3)  # 5840
    steps_3d = int(3 * 24 / 3)    # 24

    for base_steps, label in [(steps_1y, "1y"), (steps_2y, "2y")]:
        df[f"aqi_seasonal_lag_{label}"] = s.shift(base_steps)
        df[f"aqi_seasonal_lag_{label}_m3d"] = s.shift(base_steps - steps_3d)
        df[f"aqi_seasonal_lag_{label}_p3d"] = s.shift(base_steps + steps_3d)

    # Rolling 24h (8 steps), 72h (24 steps), 7d (56 steps)
    s_lag1 = s.shift(1)
    for window_steps, name in [(8, "24h"), (24, "72h"), (56, "7d")]:
        df[f"aqi_roll_mean_{name}"] = s_lag1.rolling(window_steps, min_periods=1).mean()
        df[f"aqi_roll_std_{name}"] = s_lag1.rolling(window_steps, min_periods=1).std().fillna(0)
        df[f"aqi_roll_min_{name}"] = s_lag1.rolling(window_steps, min_periods=1).min()
        df[f"aqi_roll_max_{name}"] = s_lag1.rolling(window_steps, min_periods=1).max()

    # Tốc độ thay đổi
    df["aqi_diff_1step_2step"] = df["aqi_lag_1steps"] - df["aqi_lag_2steps"]
    df["aqi_diff_1step_8step"] = df["aqi_lag_1steps"] - df["aqi_lag_8steps"]

    return df


def _add_hourly_weather_features(df: pd.DataFrame) -> pd.DataFrame:
    """Tạo các đặc trưng vi khí hậu thời tiết bước 3h."""
    df = df.copy()

    weather_cols = [c for c in ["temperature", "humidity", "wind_speed", "pressure", "precipitation"] if c in df.columns]

    for col in weather_cols:
        s_lag1 = df[col].shift(1)
        df[f"{col}_lag_1step"] = s_lag1
        df[f"{col}_lag_2step"] = df[col].shift(2)
        df[f"{col}_roll_mean_24h"] = s_lag1.rolling(8, min_periods=1).mean()

    if "temperature" in df.columns and "humidity" in df.columns:
        t = df["temperature"]
        rh = df["humidity"].clip(lower=1, upper=100)
        dew_point = t - ((100 - rh) / 5)
        df["temp_dew_diff"] = t - dew_point
        df["temp_dew_diff_lag1"] = df["temp_dew_diff"].shift(1)

    return df


def build_hourly_features(save: bool = True) -> pd.DataFrame:
    """
    Xây dựng bảng features + target cho Luồng B (24h tới, 8 bước nhảy 3h).
    """
    if not CLEAN_3H_PATH.exists():
        raise FileNotFoundError(f"Chưa tìm thấy {CLEAN_3H_PATH}. Hãy chạy app.data.build_dataset trước!")

    df = pd.read_parquet(CLEAN_3H_PATH).sort_index()

    df = _add_hourly_calendar_features(df)
    df = _add_hourly_lag_features(df)
    df = _add_hourly_weather_features(df)

    # 8 bước target h_1 .. h_8
    for h in range(1, HOURLY_HORIZON + 1):
        df[f"h_{h}"] = df["aqi"].shift(-h)

    df_clean = df.dropna().copy()

    if save:
        HOURLY_FEATURES_PATH.parent.mkdir(parents=True, exist_ok=True)
        df_clean.to_parquet(HOURLY_FEATURES_PATH)
        print(f"[build_hourly_features] Saved {df_clean.shape} -> {HOURLY_FEATURES_PATH}")

    return df_clean


if __name__ == "__main__":
    build_hourly_features(save=True)

"""
Feature engineering cho Luồng A (Daily - 7 ngày tới)
"""
from __future__ import annotations

import numpy as np
import pandas as pd

from app.core.config import CLEAN_DAILY_PATH, DAILY_FEATURES_PATH, DAILY_HORIZON


def _add_calendar_features(df: pd.DataFrame) -> pd.DataFrame:
    """Tạo các đặc trưng lịch biểu và chu kỳ."""
    df = df.copy()
    dt = df.index

    # Month sin/cos
    month = dt.month
    df["month_sin"] = np.sin(2 * np.pi * month / 12)
    df["month_cos"] = np.cos(2 * np.pi * month / 12)

    # Day of week sin/cos
    dow = dt.dayofweek
    df["dow_sin"] = np.sin(2 * np.pi * dow / 7)
    df["dow_cos"] = np.cos(2 * np.pi * dow / 7)

    # Day of year sin/cos
    doy = dt.dayofyear
    df["doy_sin"] = np.sin(2 * np.pi * doy / 365.25)
    df["doy_cos"] = np.cos(2 * np.pi * doy / 365.25)

    df["is_weekend"] = dow.isin([5, 6]).astype(int)

    # Cờ gió mùa Đông Bắc tại Hà Nội (Tháng 11 đến Tháng 3 năm sau)
    df["is_northeast_monsoon"] = month.isin([11, 12, 1, 2, 3]).astype(int)

    return df


def _add_aqi_lag_features(df: pd.DataFrame) -> pd.DataFrame:
    """Tạo các đặc trưng trễ (lags) và rolling stats cho AQI."""
    df = df.copy()
    target_series = df["aqi_mean"] if "aqi_mean" in df.columns else df["aqi"]

    # Lag days
    lags = [1, 2, 3, 5, 7, 14, 21, 30]
    for lag in lags:
        df[f"aqi_lag_{lag}d"] = target_series.shift(lag)

    # Lag cùng thời điểm năm trước (365d, 730d) và +- 3 ngày
    for y_lag in [365, 730]:
        df[f"aqi_seasonal_lag_{y_lag}d"] = target_series.shift(y_lag)
        df[f"aqi_seasonal_lag_{y_lag}d_m3"] = target_series.shift(y_lag - 3)
        df[f"aqi_seasonal_lag_{y_lag}d_p3"] = target_series.shift(y_lag + 3)

    # Rolling statistics (tính từ lag 1 để không bị data leakage)
    s_lag1 = target_series.shift(1)
    for window in [3, 7, 14, 30]:
        df[f"aqi_roll_mean_{window}d"] = s_lag1.rolling(window, min_periods=1).mean()
        df[f"aqi_roll_std_{window}d"] = s_lag1.rolling(window, min_periods=1).std().fillna(0)
        df[f"aqi_roll_min_{window}d"] = s_lag1.rolling(window, min_periods=1).min()
        df[f"aqi_roll_max_{window}d"] = s_lag1.rolling(window, min_periods=1).max()

    # Tốc độ biến thiên (delta)
    df["aqi_diff_1d_2d"] = df["aqi_lag_1d"] - df["aqi_lag_2d"]
    df["aqi_diff_1d_7d"] = df["aqi_lag_1d"] - df["aqi_lag_7d"]

    return df


def _add_weather_features(df: pd.DataFrame) -> pd.DataFrame:
    """Tạo các đặc trưng thời tiết, chênh lệch nhiệt ẩm và rolling."""
    df = df.copy()

    weather_cols = [c for c in ["temperature", "humidity", "wind_speed", "pressure", "precipitation"] if c in df.columns]

    for col in weather_cols:
        s_lag1 = df[col].shift(1)
        df[f"{col}_lag_1d"] = s_lag1
        df[f"{col}_lag_2d"] = df[col].shift(2)
        df[f"{col}_roll_mean_7d"] = s_lag1.rolling(7, min_periods=1).mean()

    if "temperature" in df.columns and "humidity" in df.columns:
        # Xấp xỉ điểm sương / chênh lệch nhiệt độ độ ẩm
        # Magnus formula approximation
        t = df["temperature"]
        rh = df["humidity"].clip(lower=1, upper=100)
        dew_point = t - ((100 - rh) / 5)
        df["temp_dew_diff"] = t - dew_point
        df["temp_dew_diff_lag1"] = df["temp_dew_diff"].shift(1)

    return df


def build_daily_features(save: bool = True) -> pd.DataFrame:
    """
    Xây dựng bảng features + target cho Luồng A (7 ngày).
    """
    if not CLEAN_DAILY_PATH.exists():
        raise FileNotFoundError(f"Chưa tìm thấy {CLEAN_DAILY_PATH}. Hãy chạy app.data.build_dataset trước!")

    df = pd.read_parquet(CLEAN_DAILY_PATH).sort_index()

    df = _add_calendar_features(df)
    df = _add_aqi_lag_features(df)
    df = _add_weather_features(df)

    target_base = df["aqi_mean"] if "aqi_mean" in df.columns else df["aqi"]
    for h in range(1, DAILY_HORIZON + 1):
        df[f"d_{h}"] = target_base.shift(-h)

    # Bỏ các dòng NaN ở tập train
    df_clean = df.dropna().copy()

    if save:
        DAILY_FEATURES_PATH.parent.mkdir(parents=True, exist_ok=True)
        df_clean.to_parquet(DAILY_FEATURES_PATH)
        print(f"[build_daily_features] Saved {df_clean.shape} -> {DAILY_FEATURES_PATH}")

    return df_clean


if __name__ == "__main__":
    build_daily_features(save=True)

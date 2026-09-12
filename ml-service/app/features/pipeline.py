"""
Pipeline đặc trưng và phân chia dữ liệu — app/features/pipeline.py

- build_features(df, city_id, horizon_type) -> (X, y):
  Tạo tập đặc trưng nhất quán, dùng chung cho cả huấn luyện (training) và suy luận (inference).
- split_train_test(X, y, train_years=4, test_years=1):
  Phân chia theo thứ tự thời gian: train 4 năm đầu, test 1 năm cuối (không bao giờ shuffle dữ liệu time-series).
- scale_features(X_train, X_test, y_train, y_test):
  Chuẩn hóa StandardScaler: fit CHỈ trên tập train, sau đó transform test nhằm ngăn chặn rò rỉ dữ liệu (data leakage).
"""
from __future__ import annotations

from typing import Optional, Tuple
import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler

from app.features.rolling import add_rolling_features
from app.features.season import add_seasonal_features
from app.features.weather import add_weather_interaction_features


def _add_calendar_harmonics(df: pd.DataFrame) -> pd.DataFrame:
    """Tạo các đặc trưng điều hòa tuần hoàn sin/cos cho tháng, thứ và giờ."""
    df = df.copy()
    dt = df.index

    # Tháng (1..12)
    month = dt.month
    df["month_sin"] = np.sin(2 * np.pi * month / 12)
    df["month_cos"] = np.cos(2 * np.pi * month / 12)

    # Thứ trong tuần (0..6)
    dow = dt.dayofweek
    df["dow_sin"] = np.sin(2 * np.pi * dow / 7)
    df["dow_cos"] = np.cos(2 * np.pi * dow / 7)
    df["is_weekend"] = dow.isin([5, 6]).astype(int)

    # Ngày trong năm (1..365)
    doy = dt.dayofyear
    df["doy_sin"] = np.sin(2 * np.pi * doy / 365.25)
    df["doy_cos"] = np.cos(2 * np.pi * doy / 365.25)

    # Giờ trong ngày (nếu là dữ liệu hourly)
    if hasattr(dt, "hour") and dt.hour.nunique() > 1:
        hour = dt.hour
        df["hour_sin"] = np.sin(2 * np.pi * hour / 24)
        df["hour_cos"] = np.cos(2 * np.pi * hour / 24)
        df["is_night"] = ((hour >= 18) | (hour < 6)).astype(int)

    return df


def _add_lag_features(df: pd.DataFrame, target_col: str, is_daily: bool = True) -> pd.DataFrame:
    """Tạo các lag quá khứ của chỉ số AQI."""
    df = df.copy()
    s = df[target_col]

    if is_daily:
        lags = [1, 2, 3, 5, 7, 14, 21, 30]
        for lag in lags:
            df[f"aqi_lag_{lag}d"] = s.shift(lag)

        # Lag mùa vụ cùng kỳ năm trước (365d, 730d)
        for y_lag in [365, 730]:
            df[f"aqi_seasonal_lag_{y_lag}d"] = s.shift(y_lag)
            df[f"aqi_seasonal_lag_{y_lag}d_m3"] = s.shift(y_lag - 3)
            df[f"aqi_seasonal_lag_{y_lag}d_p3"] = s.shift(y_lag + 3)
    else:
        # Bước nhảy 3h: 1 bước = 3h, 2 bước = 6h, 8 bước = 24h, 24 bước = 72h, 56 bước = 7d
        lags = [1, 2, 4, 8, 16, 24, 56]
        for lag in lags:
            df[f"aqi_lag_{lag}steps"] = s.shift(lag)

    return df


def build_features(
    df: pd.DataFrame,
    city_id: str = "hanoi",
    horizon_type: str = "daily",
    horizon: int = 7,
    is_training: bool = True,
) -> Tuple[pd.DataFrame, Optional[pd.DataFrame]]:
    """
    Xây dựng ma trận đặc trưng dùng chung cho cả Huấn luyện và Suy luận thực tế.

    Args:
        df: DataFrame chứa các cột ô nhiễm, thời tiết và AQI đã làm sạch.
        city_id: Mã thành phố ('hanoi', 'hcm', 'danang', 'haiphong', 'cantho').
        horizon_type: 'daily' (theo ngày) hoặc 'hourly' (theo bước 3h).
        horizon: Số bước cần dự báo (7 ngày hoặc 8 bước 3h).
        is_training: Nếu True, tạo nhãn target y và loại bỏ các dòng bị khuyết do lag/lead.

    Returns:
        (X, y): X là ma trận đặc trưng đầu vào, y là target (hoặc None nếu inference).
    """
    df = df.copy()
    if not isinstance(df.index, pd.DatetimeIndex):
        df.index = pd.to_datetime(df.index)
    df = df.sort_index()

    # Xác định cột aqi chính
    target_col = "aqi_mean" if ("aqi_mean" in df.columns and horizon_type == "daily") else "aqi"
    if target_col not in df.columns and "pm2_5" in df.columns:
        df["aqi"] = df["pm2_5"]  # Fallback nếu chưa tính cột aqi
        target_col = "aqi"

    is_daily = (horizon_type == "daily")

    # 1. Thêm đặc trưng chu kỳ lịch biểu
    df = _add_calendar_harmonics(df)

    # 2. Thêm đặc trưng mùa vụ & khí hậu (season, NE monsoon, inversion)
    df = add_seasonal_features(df)

    # 3. Thêm đặc trưng tương tác thời tiết (temp x hum, wind u/v, DTR)
    df = add_weather_interaction_features(df)

    # 4. Thêm đặc trưng thống kê trượt (rolling 24h, 72h, 7d)
    df = add_rolling_features(df, is_daily=is_daily)

    # 5. Thêm đặc trưng lag của AQI
    df = _add_lag_features(df, target_col=target_col, is_daily=is_daily)

    # Đánh dấu mã thành phố (one-hot encoding nếu có nhiều thành phố)
    df["city_id"] = city_id.lower()
    df = pd.get_dummies(df, columns=["city_id", "season"], drop_first=False)

    # Loại bỏ các cột không phải số hoặc metadata
    drop_cols = ["id", "time", "station_name", "missing_flag"]
    drop_cols = [c for c in drop_cols if c in df.columns]
    df = df.drop(columns=drop_cols)

    y = None
    if is_training and target_col in df.columns:
        # Xây dựng các cột target trong tương lai
        target_cols = []
        for h in range(1, horizon + 1):
            prefix = "d" if is_daily else "h"
            col_name = f"{prefix}_{h}"
            df[col_name] = df[target_col].shift(-h)
            target_cols.append(col_name)

        # Dropna các dòng chứa NaN do shift lag và lead target
        df_clean = df.dropna()
        X = df_clean.drop(columns=target_cols)
        y = df_clean[target_cols]
    else:
        # Chế độ inference: chỉ dropna trên các cột features của dòng mới nhất
        X = df.ffill().bfill()

    # Đảm bảo toàn bộ kiểu dữ liệu của X là float32/float64
    X = X.astype(float)
    return X, y


def split_train_test(
    X: pd.DataFrame,
    y: pd.DataFrame,
    train_years: int = 4,
    test_years: int = 1,
) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    """
    Phân chia chuỗi thời gian: train các năm đầu, test 1 năm cuối.
    TUYỆT ĐỐI KHÔNG SHUFFLE DỮ LIỆU.
    """
    if not isinstance(X.index, pd.DatetimeIndex):
        raise ValueError("X.index phải là DatetimeIndex để phân chia theo thời gian.")

    years = sorted(X.index.year.unique())
    if len(years) >= (train_years + test_years):
        # Chia rõ ràng theo năm
        test_year_start = years[-test_years]
        train_mask = X.index.year < test_year_start
        test_mask = X.index.year >= test_year_start

        X_train, X_test = X.loc[train_mask], X.loc[test_mask]
        y_train, y_test = y.loc[train_mask], y.loc[test_mask]
    else:
        # Nếu tổng số năm thu thập ít hơn 5 năm, chia 80% train thời gian đầu, 20% test thời gian cuối
        split_idx = int(len(X) * 0.8)
        X_train, X_test = X.iloc[:split_idx], X.iloc[split_idx:]
        y_train, y_test = y.iloc[:split_idx], y.iloc[split_idx:]

    print(f"[split_train_test] Train shape: {X_train.shape}, Test shape: {X_test.shape}")
    print(f"[split_train_test] Train time: {X_train.index.min()} -> {X_train.index.max()}")
    print(f"[split_train_test] Test time:  {X_test.index.min()} -> {X_test.index.max()}")
    return X_train, X_test, y_train, y_test


def scale_features(
    X_train: pd.DataFrame,
    X_test: pd.DataFrame,
    y_train: Optional[pd.DataFrame] = None,
    y_test: Optional[pd.DataFrame] = None,
) -> Tuple[pd.DataFrame, pd.DataFrame, StandardScaler, Optional[pd.DataFrame], Optional[pd.DataFrame], Optional[StandardScaler]]:
    """
    Chuẩn hóa StandardScaler:
    - Fit scaler CHỈ trên X_train và y_train.
    - Transform cho X_test và y_test (ngăn ngừa rò rỉ thông tin tương lai).
    """
    x_scaler = StandardScaler()
    X_train_scaled = pd.DataFrame(
        x_scaler.fit_transform(X_train),
        index=X_train.index,
        columns=X_train.columns,
    )
    X_test_scaled = pd.DataFrame(
        x_scaler.transform(X_test),
        index=X_test.index,
        columns=X_test.columns,
    )

    y_scaler = None
    y_train_scaled = None
    y_test_scaled = None

    if y_train is not None:
        y_scaler = StandardScaler()
        y_train_scaled = pd.DataFrame(
            y_scaler.fit_transform(y_train),
            index=y_train.index,
            columns=y_train.columns,
        )
        if y_test is not None:
            y_test_scaled = pd.DataFrame(
                y_scaler.transform(y_test),
                index=y_test.index,
                columns=y_test.columns,
            )

    return X_train_scaled, X_test_scaled, x_scaler, y_train_scaled, y_test_scaled, y_scaler

"""
Đặc trưng thống kê trượt (Rolling Statistics) — app/features/rolling.py
Tính mean, std, min, max cho các cửa sổ:
- 24h (1 ngày)
- 72h (3 ngày)
- 7d  (7 ngày / 168h)

Lưu ý: Luôn tính trên chuỗi dữ liệu đã trễ shift(1) để chống rò rỉ dữ liệu (data leakage).
"""
from __future__ import annotations

from typing import List, Optional
import numpy as np
import pandas as pd


def add_rolling_features(
    df: pd.DataFrame,
    columns: Optional[List[str]] = None,
    windows: Optional[List[str]] = None,
    is_daily: bool = False,
) -> pd.DataFrame:
    """
    Tính các đặc trưng rolling (mean, std, min, max) cho các cửa sổ 24h, 72h, 7d.

    Args:
        df: DataFrame có DatetimeIndex đã được sắp xếp tăng dần theo thời gian.
        columns: Danh sách các cột cần tính rolling. Mặc định là aqi và các biến ô nhiễm / thời tiết chính.
        windows: Danh sách cửa sổ thời gian (['24h', '72h', '7d']).
        is_daily: Nếu True (dữ liệu theo ngày), tương ứng các cửa sổ 1, 3, 7 ngày.

    Returns:
        DataFrame với các cột rolling mới được gắn thêm.
    """
    df = df.copy()

    # Xác định các cột cần tính
    if columns is None:
        possible_cols = ["aqi", "aqi_mean", "pm2_5", "pm10", "temperature", "humidity", "wind_speed"]
        columns = [c for c in possible_cols if c in df.columns]

    if not columns:
        return df

    # Đảm bảo index là DatetimeIndex đã sort
    if not isinstance(df.index, pd.DatetimeIndex):
        df.index = pd.to_datetime(df.index)
    if not df.index.is_monotonic_increasing:
        df = df.sort_index()

    if is_daily:
        # Cửa sổ theo số ngày (1 ngày ~ 24h, 3 ngày ~ 72h, 7 ngày ~ 7d)
        window_mapping = {"24h": 1, "72h": 3, "7d": 7}
        for col in columns:
            # Shift 1 để không dùng giá trị của chính bước hiện tại
            s_shifted = df[col].shift(1)
            for w_name, w_size in window_mapping.items():
                roll = s_shifted.rolling(window=w_size, min_periods=1)
                df[f"{col}_roll_mean_{w_name}"] = roll.mean()
                df[f"{col}_roll_std_{w_name}"] = roll.std().fillna(0)
                df[f"{col}_roll_min_{w_name}"] = roll.min()
                df[f"{col}_roll_max_{w_name}"] = roll.max()
    else:
        # Cửa sổ thời gian thực tế với pandas time-offset ('24h', '72h', '7d')
        if windows is None:
            windows = ["24h", "72h", "7d"]

        # Để dùng time offset trong rolling, ta shift(1) theo bước index
        for col in columns:
            s_shifted = df[col].shift(1)
            for w in windows:
                try:
                    roll = s_shifted.rolling(w, min_periods=1)
                    df[f"{col}_roll_mean_{w}"] = roll.mean()
                    df[f"{col}_roll_std_{w}"] = roll.std().fillna(0)
                    df[f"{col}_roll_min_{w}"] = roll.min()
                    df[f"{col}_roll_max_{w}"] = roll.max()
                except Exception:
                    # Fallback nếu time-offset gặp chu kỳ cố định
                    step_count = 8 if w == "24h" else (24 if w == "72h" else 56)
                    roll = s_shifted.rolling(window=step_count, min_periods=1)
                    df[f"{col}_roll_mean_{w}"] = roll.mean()
                    df[f"{col}_roll_std_{w}"] = roll.std().fillna(0)
                    df[f"{col}_roll_min_{w}"] = roll.min()
                    df[f"{col}_roll_max_{w}"] = roll.max()

    return df

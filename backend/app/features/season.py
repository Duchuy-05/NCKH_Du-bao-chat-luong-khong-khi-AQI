"""
Đặc trưng mùa vụ và khí hậu (Seasonal & Weather Phenomena Features) — app/features/season.py

Bao gồm:
- Phân chia 4 mùa Việt Nam: Xuân (2, 3, 4), Hạ (5, 6, 7), Thu (8, 9, 10), Đông (11, 12, 1).
- Cờ gió mùa Đông Bắc (tháng 11 - 3).
- Cờ nghịch nhiệt bức xạ (Temperature Inversion Flag) — đặc trưng quan trọng gây ô nhiễm nặng ở miền Bắc.
"""
from __future__ import annotations

import numpy as np
import pandas as pd


def get_season_name(month: int) -> str:
    """Trả về tên mùa theo tháng tại Việt Nam."""
    if month in [2, 3, 4]:
        return "Xuan"
    elif month in [5, 6, 7]:
        return "Ha"
    elif month in [8, 9, 10]:
        return "Thu"
    else:
        return "Dong"


def add_seasonal_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Thêm các đặc trưng mùa vụ, gió mùa đông bắc và cờ nghịch nhiệt.

    Args:
        df: DataFrame có DatetimeIndex.

    Returns:
        DataFrame với các cột đặc trưng mùa bổ sung.
    """
    df = df.copy()
    if not isinstance(df.index, pd.DatetimeIndex):
        df.index = pd.to_datetime(df.index)

    months = df.index.month

    # 1. Bốn mùa
    df["season"] = months.map(get_season_name)
    df["is_spring"] = (months.isin([2, 3, 4])).astype(int)
    df["is_summer"] = (months.isin([5, 6, 7])).astype(int)
    df["is_autumn"] = (months.isin([8, 9, 10])).astype(int)
    df["is_winter"] = (months.isin([11, 12, 1])).astype(int)

    # 2. Cờ gió mùa Đông Bắc (Tháng 11 đến Tháng 3 năm sau)
    is_monsoon_month = months.isin([11, 12, 1, 2, 3])
    df["is_northeast_monsoon"] = is_monsoon_month.astype(int)

    # Nếu có hướng gió, xác định gió hướng Đông - Bắc (0 đến 90 độ hoặc 340-360)
    if "wind_direction" in df.columns:
        wd = df["wind_direction"]
        is_ne_direction = ((wd >= 0) & (wd <= 90)) | ((wd >= 340) & (wd <= 360))
        df["is_northeast_wind"] = (is_monsoon_month & is_ne_direction).astype(int)

    # 3. Cờ nghịch nhiệt bức xạ (Temperature Inversion Flag)
    # Nghịch nhiệt phổ biến vào các tháng lạnh (tháng 11-3), đêm/sáng sớm, gió lặng (< 2.0 m/s), không mưa
    has_hour = hasattr(df.index, "hour") and (df.index.hour.nunique() > 1)
    is_night_time = (df.index.hour.isin([20, 21, 22, 23, 0, 1, 2, 3, 4, 5, 6, 7])) if has_hour else pd.Series(True, index=df.index)

    inversion_cond = is_monsoon_month & is_night_time

    if "wind_speed" in df.columns:
        inversion_cond = inversion_cond & (df["wind_speed"] < 2.0)

    if "precipitation" in df.columns:
        inversion_cond = inversion_cond & (df["precipitation"] <= 0.1)

    df["is_inversion"] = inversion_cond.astype(int)

    return df

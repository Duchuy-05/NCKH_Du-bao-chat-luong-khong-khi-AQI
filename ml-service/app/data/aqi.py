"""
GIAI ĐOẠN 1 — Bước 4: Tính AQI (app/data/aqi.py)

Công thức nội suy tuyến tính trong từng khoảng breakpoint:
    AQI = (I_high - I_low) / (BP_high - BP_low) * (C - BP_low) + I_low

Thời gian trung bình hoá theo đúng quy định trước khi tra bảng:
    PM2.5, PM10, SO2, NO2 -> trung bình 24h
    O3, CO                -> trung bình 8h
"""
from __future__ import annotations

import numpy as np
import pandas as pd

# (BP_low, BP_high, I_low, I_high) — đơn vị: µg/m³ (riêng CO: mg/m³)
BREAKPOINTS = {
    "pm2_5": [
        (0, 25, 0, 50), (25.1, 50, 51, 100), (50.1, 80, 101, 150),
        (80.1, 150, 151, 200), (150.1, 250, 201, 300),
        (250.1, 350, 301, 400), (350.1, 500, 401, 500),
    ],
    "pm10": [
        (0, 50, 0, 50), (51, 150, 51, 100), (151, 250, 101, 150),
        (251, 350, 151, 200), (351, 420, 201, 300),
        (421, 500, 301, 400), (501, 600, 401, 500),
    ],
    "so2": [
        (0, 125, 0, 50), (126, 350, 51, 100), (351, 500, 101, 150),
        (501, 650, 151, 200), (651, 800, 201, 300),
        (801, 1000, 301, 400), (1001, 1200, 401, 500),
    ],
    "no2": [
        (0, 100, 0, 50), (101, 200, 51, 100), (201, 300, 101, 150),
        (301, 400, 151, 200), (401, 800, 201, 300),
        (801, 1200, 301, 400), (1201, 2000, 401, 500),
    ],
    "o3": [
        (0, 100, 0, 50), (101, 160, 51, 100), (161, 180, 101, 150),
        (181, 240, 151, 200), (241, 360, 201, 300),
        (361, 420, 301, 400), (421, 500, 401, 500),
    ],
    "co": [  # đơn vị mg/m3
        (0, 10, 0, 50), (10.1, 30, 51, 100), (30.1, 45, 101, 150),
        (45.1, 60, 151, 200), (60.1, 90, 201, 300),
        (90.1, 120, 301, 400), (120.1, 150, 401, 500),
    ],
}

AVG_WINDOW = {
    "pm2_5": "24h", "pm10": "24h", "so2": "24h", "no2": "24h",
    "o3": "8h", "co": "8h",
}

LEVELS = [
    (0, 50, "Tốt"),
    (51, 100, "Trung bình"),
    (101, 150, "Kém"),
    (151, 200, "Xấu"),
    (201, 300, "Rất xấu"),
    (301, 500, "Nguy hại"),
]


def _sub_index(conc: float, table: list[tuple]) -> float | None:
    if pd.isna(conc) or conc < 0:
        return None
    for bp_low, bp_high, i_low, i_high in table:
        if bp_low <= conc <= bp_high:
            return (i_high - i_low) / (bp_high - bp_low) * (conc - bp_low) + i_low
    # vượt khung cao nhất -> cấp giá trị cao nhất của bảng (tránh None làm gãy pipeline)
    if conc > table[-1][1]:
        return float(table[-1][3])
    return None


def _averaged_series(df: pd.DataFrame, col: str) -> pd.Series:
    window = AVG_WINDOW[col]
    series = df[col]
    if col == "co":
        series = series / 1000.0  # µg/m3 -> mg/m3
    return series.rolling(window, min_periods=1).mean()


def compute_aqi(df: pd.DataFrame) -> pd.DataFrame:
    """
    Input: df có DatetimeIndex (đã sort) và các cột pollutant thô (µg/m3).
    Output: df + cột aqi, dominant_pollutant, level.
    """
    df = df.sort_index().copy()
    sub_indices = {}

    for col, table in BREAKPOINTS.items():
        if col not in df.columns:
            continue
        avg_series = _averaged_series(df, col)
        sub_indices[col] = avg_series.apply(lambda c: _sub_index(c, table))

    sub_df = pd.DataFrame(sub_indices)
    df["aqi"] = sub_df.max(axis=1, skipna=True)
    df["dominant_pollutant"] = sub_df.idxmax(axis=1, skipna=True)

    def _to_level(aqi_val):
        if pd.isna(aqi_val):
            return None
        for low, high, name in LEVELS:
            if low <= aqi_val <= high:
                return name
        return "Nguy hại"

    df["level"] = df["aqi"].apply(_to_level)
    return df
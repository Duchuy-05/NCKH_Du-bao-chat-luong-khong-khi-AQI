"""
GIAI ĐOẠN 1 — Bước 1: Đọc dữ liệu (app/data/loaders/db_loader.py)

Đọc trực tiếp từ PostgreSQL
"""
from __future__ import annotations

import pandas as pd

from app.core.config import hanoi_pollutions, hanoi_weather
from app.core.db import read_table

POLLUTANT_COLUMNS = ["pm10", "pm2_5", "co", "no2", "o3", "so2", "co2"]
WEATHER_COLUMNS = [
    "temperature_2m",
    "dew_point_2m",
    "relative_humidity_2m",
    "rain",
    "precipitation",
    "surface_pressure",
    "wind_speed_10m",
]


def load_pollutants() -> pd.DataFrame:
    df = read_table(hanoi_pollutants)
    df["time"] = pd.to_datetime(df["time"])
    missing = [c for c in POLLUTANT_COLUMNS if c not in df.columns]
    if missing:
        print(f"[db_loader] Cảnh báo: bảng {hanoi_pollutants} thiếu cột {missing}")
    keep = ["time"] + [c for c in POLLUTANT_COLUMNS if c in df.columns]
    return df[keep]


def load_weather() -> pd.DataFrame:
    df = read_table(hanoi_weather)
    df["time"] = pd.to_datetime(df["time"])
    missing = [c for c in WEATHER_COLUMNS if c not in df.columns]
    if missing:
        print(f"[db_loader] Cảnh báo: bảng {hanoi_weather} thiếu cột {missing}")
    keep = ["time"] + [c for c in WEATHER_COLUMNS if c in df.columns]
    return df[keep]


if __name__ == "__main__":
    pol = load_pollutants()
    wea = load_weather()
    print("Pollutants:", pol.shape, list(pol.columns))
    print(pol.head())
    print("Weather:", wea.shape, list(wea.columns))
    print(wea.head())
"""
Module đọc dữ liệu quan trắc ô nhiễm và thời tiết từ PostgreSQL database.
"""
from __future__ import annotations

import os
import pandas as pd
from sqlalchemy import create_engine, text
from app.core.config import (
    DATABASE_URL,
    TIMEZONE,
    TABLE_POLLUTANTS,
    TABLE_WEATHER,
    hanoi_pollutions,
    hanoi_weather,
)

POLLUTANT_COLUMNS = ["pm2_5", "pm10", "so2", "no2", "co", "o3", "co2"]
WEATHER_COLUMNS = [
    "temperature",
    "humidity",
    "wind_speed",
    "wind_direction",
    "pressure",
    "precipitation",
]


def get_engine():
    """Tạo SQLAlchemy engine kết nối PostgreSQL."""
    return create_engine(DATABASE_URL, pool_pre_ping=True)


def _normalize_df_columns(df: pd.DataFrame) -> pd.DataFrame:
    """Chuẩn hóa tên cột về chữ thường và ánh xạ các tên cột phổ biến."""
    df.columns = [c.strip().lower() for c in df.columns]
    
    # Chuẩn hoá cột thời gian
    for time_col in ["datetime", "date", "timestamp", "date_time"]:
        if time_col in df.columns and "time" not in df.columns:
            df = df.rename(columns={time_col: "time"})
            break
            
    # Chuẩn hoá các cột ô nhiễm phổ biến nếu có tên hơi khác
    alias_map = {
        "pm25": "pm2_5",
        "pm_25": "pm2_5",
        "pm_2_5": "pm2_5",
        "pm_10": "pm10",
        "temp": "temperature",
        "temp_2m": "temperature",
        "rh": "humidity",
        "ws": "wind_speed",
        "wd": "wind_direction",
        "press": "pressure",
        "precip": "precipitation",
    }
    for old_col, new_col in alias_map.items():
        if old_col in df.columns and new_col not in df.columns:
            df = df.rename(columns={old_col: new_col})
            
    return df


def load_pollutants() -> pd.DataFrame:
    """
    Đọc bảng pollutants từ PostgreSQL.
    """
    engine = get_engine()
    candidate_tables = [
        TABLE_POLLUTANTS,
        "hanoi_pollutions",
        "hanoi_pollution",
        "pollutants",
        "pollution",
        "air_quality",
    ]
    
    last_err = None
    for tbl in candidate_tables:
        try:
            query = f'SELECT * FROM "{tbl}" ORDER BY 1 ASC'
            df = pd.read_sql_query(query, engine)
            if not df.empty:
                df = _normalize_df_columns(df)
                if "time" in df.columns:
                    df["time"] = pd.to_datetime(df["time"])
                return df
        except Exception as e:
            last_err = e
            continue
            
    raise RuntimeError(f"Không thể đọc bảng ô nhiễm không khí từ PostgreSQL (đã thử: {candidate_tables}). Lỗi: {last_err}")


def load_weather() -> pd.DataFrame:
    """
    Đọc bảng weather từ PostgreSQL (thử hanoi_weather, weather, meteorology,...).
    """
    engine = get_engine()
    candidate_tables = [
        TABLE_WEATHER,
        "hanoi_weather",
        "weather",
        "meteorology",
        "hanoi_meteorology",
    ]
    
    last_err = None
    for tbl in candidate_tables:
        try:
            query = f'SELECT * FROM "{tbl}" ORDER BY 1 ASC'
            df = pd.read_sql_query(query, engine)
            if not df.empty:
                df = _normalize_df_columns(df)
                if "time" in df.columns:
                    df["time"] = pd.to_datetime(df["time"])
                return df
        except Exception as e:
            last_err = e
            continue
            
    raise RuntimeError(f"Không thể đọc bảng thời tiết từ PostgreSQL (đã thử: {candidate_tables}). Lỗi: {last_err}")


def test_connection():
    """Hàm kiểm tra kết nối DB và in ra shape + head của 2 bảng."""
    print("=" * 60)
    print(f"[*] Đang kết nối tới DB: {DATABASE_URL.split('@')[-1] if '@' in DATABASE_URL else DATABASE_URL}")
    print("=" * 60)

    try:
        df_pol = load_pollutants()
        print(f"[✓] Bảng Pollutants: Shape = {df_pol.shape}")
        print(df_pol.tail())
        print("-" * 60)

        df_wea = load_weather()
        print(f"[✓] Bảng Weather: Shape = {df_wea.shape}")
        print(df_wea.tail())
        print("=" * 60)
        print("[✓] Kết nối và nạp dữ liệu PostgreSQL thành công!")
    except Exception as err:
        print(f"[!] Lỗi khi kết nối hoặc đọc DB: {err}")
        print("[*] Gợi ý: Kiểm tra biến môi trường DATABASE_URL hoặc chạy PostgreSQL.")


if __name__ == "__main__":
    test_connection()

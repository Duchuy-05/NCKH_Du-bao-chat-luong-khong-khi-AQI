"""
Module đọc dữ liệu quan trắc ô nhiễm và thời tiết từ PostgreSQL database.
"""
from __future__ import annotations

import os
import pandas as pd
from sqlalchemy import create_engine, text
from app.core.config import DATABASE_URL, TIMEZONE

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


def load_pollutants() -> pd.DataFrame:
    """
    Đọc bảng pollutants từ PostgreSQL.
    Cột mong đợi: time (hoặc datetime/timestamp), pm2_5, pm10, so2, no2, co, o3, (co2).
    """
    engine = get_engine()
    query = """
        SELECT 
            time,
            pm2_5,
            pm10,
            so2,
            no2,
            co,
            o3,
            co2
        FROM pollutants
        ORDER BY time ASC
    """
    try:
        df = pd.read_sql_query(query, engine)
    except Exception as e:
        # Fallback thử bảng thay thế nếu tên bảng khác (ví dụ: air_quality, quan_trac)
        try:
            alt_query = "SELECT * FROM air_quality ORDER BY time ASC"
            df = pd.read_sql_query(alt_query, engine)
        except Exception:
            raise RuntimeError(f"Không thể đọc bảng pollutants từ PostgreSQL: {e}")

    df["time"] = pd.to_datetime(df["time"])
    return df


def load_weather() -> pd.DataFrame:
    """
    Đọc bảng weather từ PostgreSQL.
    Cột mong đợi: time, temperature, humidity, wind_speed, wind_direction, pressure, precipitation.
    """
    engine = get_engine()
    query = """
        SELECT 
            time,
            temperature,
            humidity,
            wind_speed,
            wind_direction,
            pressure,
            precipitation
        FROM weather
        ORDER BY time ASC
    """
    try:
        df = pd.read_sql_query(query, engine)
    except Exception as e:
        try:
            alt_query = "SELECT * FROM meteorology ORDER BY time ASC"
            df = pd.read_sql_query(alt_query, engine)
        except Exception:
            raise RuntimeError(f"Không thể đọc bảng weather từ PostgreSQL: {e}")

    df["time"] = pd.to_datetime(df["time"])
    return df


def test_connection():
    """Hàm kiểm tra kết nối DB và in ra shape + head của 2 bảng."""
    print("=" * 60)
    print(f"[*] Đang kết nối tới DB: {DATABASE_URL.split('@')[-1] if '@' in DATABASE_URL else DATABASE_URL}")
    print("=" * 60)

    try:
        df_pol = load_pollutants()
        print(f"[✓] Bảng Pollutants: Shape = {df_pol.shape}")
        print(df_pol.head(3))
        print("-" * 60)

        df_wea = load_weather()
        print(f"[✓] Bảng Weather: Shape = {df_wea.shape}")
        print(df_wea.head(3))
        print("=" * 60)
        print("[✓] Kết nối và nạp dữ liệu PostgreSQL thành công!")
    except Exception as err:
        print(f"[!] Lỗi khi kết nối hoặc đọc DB: {err}")
        print("[*] Gợi ý: Kiểm tra biến môi trường DATABASE_URL hoặc chạy PostgreSQL.")


if __name__ == "__main__":
    test_connection()

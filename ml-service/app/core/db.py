"""
Kết nối PostgreSQL
"""
from __future__ import annotations

import os
from functools import lru_cache

import pandas as pd
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.engine import Engine

load_dotenv()  # đọc file .env ở thư mục đang chạy


def _build_database_url() -> str:
    url = os.getenv("DATABASE_URL")
    if url:
        return url

    host = os.getenv("DB_HOST", "localhost")
    port = os.getenv("DB_PORT", "5432")
    name = os.getenv("DB_NAME", "aqi_prediction")
    user = os.getenv("DB_USER", "postgres")
    password = os.getenv("DB_PASSWORD", "")

    return f"postgresql+psycopg2://{user}:{password}@{host}:{port}/{name}"


@lru_cache(maxsize=1)
def get_engine() -> Engine:
    return create_engine(_build_database_url())


def read_table(table_name: str) -> pd.DataFrame:
    """Đọc nguyên bảng, sort theo time — dùng cho hanoi_pollutants / hanoi_weather."""
    engine = get_engine()
    query = f'SELECT * FROM "{table_name}" ORDER BY time'
    return pd.read_sql(query, engine)


def read_query(sql: str) -> pd.DataFrame:
    engine = get_engine()
    return pd.read_sql(sql, engine)
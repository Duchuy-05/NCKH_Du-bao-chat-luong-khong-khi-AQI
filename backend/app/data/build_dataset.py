"""Compatibility wrappers for loading processed observations from PostgreSQL.

Processing now happens in ``app.data.ingest_open_meteo`` before records are
upserted. Training and inference read those stored observations directly.
"""
from __future__ import annotations

import pandas as pd

from app.core.config import CITY
from app.data.loaders.db_loader import load_daily_training_data, load_hourly_training_data


def join_and_trim(city_code: str = CITY) -> pd.DataFrame:
    """Return stored hourly AQI and weather; retained for older call sites."""
    return load_hourly_training_data(city_code)


def build_clean_hourly(city_code: str = CITY) -> pd.DataFrame:
    """Return hourly rows already processed and persisted during ingestion."""
    return load_hourly_training_data(city_code)


def build_clean_daily(
    df_hourly: pd.DataFrame | None = None,
    city_code: str = CITY,
) -> pd.DataFrame:
    """Return daily rows already computed and persisted during ingestion."""
    del df_hourly  # Kept only for source compatibility with earlier versions.
    return load_daily_training_data(city_code)


if __name__ == "__main__":
    hourly = build_clean_hourly()
    daily = build_clean_daily()
    print(f"Loaded stored hourly rows: {hourly.shape}")
    print(f"Loaded stored daily rows: {daily.shape}")

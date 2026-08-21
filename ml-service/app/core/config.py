from __future__ import annotations

import os
from pathlib import Path

# Base directories
BASE_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = BASE_DIR / "data"
MODELS_DIR = BASE_DIR / "models"

DATA_DIR.mkdir(parents=True, exist_ok=True)
MODELS_DIR.mkdir(parents=True, exist_ok=True)

# File paths
CLEAN_3H_PATH = DATA_DIR / "clean_3h.parquet"
CLEAN_DAILY_PATH = DATA_DIR / "clean_daily.parquet"
DAILY_FEATURES_PATH = DATA_DIR / "daily_features.parquet"
HOURLY_FEATURES_PATH = DATA_DIR / "hourly_features.parquet"

# Models
SVR_DAILY_MODEL_PATH = MODELS_DIR / "svr_daily.joblib"
SVR_HOURLY_MODEL_PATH = MODELS_DIR / "svr_hourly.joblib"

# Forecast settings
DAILY_HORIZON = 7        # 7 ngày tới
HOURLY_HORIZON = 8       # 8 bước 3h = 24h tới
STEP_HOURS = 3           # Bước 3h
CITY = "hanoi"
STATION_NAME = "Hoàn Kiếm"
TIMEZONE = "Asia/Ho_Chi_Minh"

# Database Configuration
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "123456")
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "aqi_prediction")

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
)

from __future__ import annotations

import os
from pathlib import Path
from dotenv import load_dotenv

# Base directories
BASE_DIR = Path(__file__).resolve().parent.parent.parent

# Load environment variables from .env at project root
load_dotenv(dotenv_path=BASE_DIR / ".env")
load_dotenv()  # Fallback to current working directory if different

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

# Database Configuration from environment variables
DB_HOST = os.getenv("DB_HOST", "")
DB_PORT = os.getenv("DB_PORT", "")
DB_NAME = os.getenv("DB_NAME", "")
DB_USER = os.getenv("DB_USER", "")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")

# Build DATABASE_URL dynamically from env or use custom DATABASE_URL if defined
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    if DB_PASSWORD:
        DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    else:
        DATABASE_URL = f"postgresql://{DB_USER}@{DB_HOST}:{DB_PORT}/{DB_NAME}"


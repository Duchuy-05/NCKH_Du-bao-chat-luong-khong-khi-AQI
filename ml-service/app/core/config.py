import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[2]  # -> ml-service/

# ---- Dữ liệu ----
DATA_DIR = Path(os.getenv("ML_DATA_DIR", BASE_DIR / "data"))
RAW_BACKUP_DIR = DATA_DIR / "raw"     
CLEAN_DIR = DATA_DIR / "hanoi"        # clean_3h.parquet, clean_daily.parquet
FEATURE_DIR = DATA_DIR / "features"

CLEAN_DAILY_PATH = CLEAN_DIR / "clean_daily.parquet"
CLEAN_3H_PATH = CLEAN_DIR / "clean_3h.parquet"

FEATURES_DAILY_PATH = FEATURE_DIR / "features_daily.parquet"
FEATURES_HOURLY_PATH = FEATURE_DIR / "features_hourly.parquet"  # Luồng B sau

# ---- Tên bảng trong PostgreSQL ----
POLLUTANTS_TABLE = "hanoi_pollutants"
WEATHER_TABLE = "hanoi_weather"

# ---- Model ----
MODEL_DIR = Path(os.getenv("ML_MODEL_DIR", BASE_DIR / "app" / "ml"))
SVR_DAILY_MODEL_PATH = MODEL_DIR / "svr_daily.joblib"
SVR_HOURLY_MODEL_PATH = MODEL_DIR / "svr_hourly.joblib"  # Luồng B sau

# ---- Nghiệp vụ ----
CITY = "hanoi"
TIMEZONE = "Asia/Ho_Chi_Minh"

DAILY_HORIZON = 7
HOURLY_HORIZON = 8
HOURLY_STEP_HOURS = 3

for d in (CLEAN_DIR, FEATURE_DIR, MODEL_DIR):
    d.mkdir(parents=True, exist_ok=True)
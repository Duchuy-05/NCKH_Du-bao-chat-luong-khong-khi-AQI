"""
Đọc biến môi trường + định nghĩa các đường dẫn dùng chung cho ml-service.
"""
import os
from pathlib import Path

# Gốc thư mục ml-service (…/ml-service)
BASE_DIR = Path(__file__).resolve().parents[2]

# ---- Dữ liệu ----
DATA_DIR = Path(os.getenv("ML_DATA_DIR", BASE_DIR / "data"))
RAW_DIR = DATA_DIR / "hanoi"
FEATURE_DIR = DATA_DIR / "features"

CLEAN_DAILY_PATH = RAW_DIR / "clean_daily.parquet"
CLEAN_3H_PATH = RAW_DIR / "clean_3h.parquet"

FEATURES_DAILY_PATH = FEATURE_DIR / "features_daily.parquet"
FEATURES_HOURLY_PATH = FEATURE_DIR / "features_hourly.parquet"  # dùng ở Luồng B sau

# ---- Model ----
MODEL_DIR = Path(os.getenv("ML_MODEL_DIR", BASE_DIR / "app" / "ml"))
SVR_DAILY_MODEL_PATH = MODEL_DIR / "svr_daily.joblib"
SVR_HOURLY_MODEL_PATH = MODEL_DIR / "svr_hourly.joblib"  # dùng ở Luồng B sau

# ---- Nghiệp vụ ----
CITY = "hanoi"
TIMEZONE = "Asia/Ho_Chi_Minh"

DAILY_HORIZON = 7          # d_1..d_7
HOURLY_HORIZON = 8         # h_1..h_8 (mỗi bước 3h)
HOURLY_STEP_HOURS = 3

for d in (FEATURE_DIR, MODEL_DIR):
    d.mkdir(parents=True, exist_ok=True)
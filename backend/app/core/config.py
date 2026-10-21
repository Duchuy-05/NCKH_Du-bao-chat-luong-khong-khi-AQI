from __future__ import annotations

import os
from datetime import date, datetime
from pathlib import Path
from uuid import UUID
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
CLEAN_HOURLY_PATH = DATA_DIR / "clean_hourly.parquet"
CLEAN_DAILY_PATH = DATA_DIR / "clean_daily.parquet"
DAILY_FEATURES_PATH = DATA_DIR / "daily_features.parquet"
HOURLY_FEATURES_PATH = DATA_DIR / "hourly_features.parquet"

# Models — SVR
SVR_DAILY_MODEL_PATH = MODELS_DIR / "svr_daily.joblib"
SVR_HOURLY_MODEL_PATH = MODELS_DIR / "svr_hourly.joblib"

SUPPORTED_CITIES = ("hanoi", "haiphong", "danang", "hochiminh", "cantho")


def city_model_path(base_path: Path, city_code: str) -> Path:
    """Keep Hanoi's legacy artifact path and give each other city its own model."""
    normalized = city_code.strip().lower()
    if normalized not in SUPPORTED_CITIES:
        raise ValueError(f"Mã thành phố không hỗ trợ: {city_code}")
    if normalized == "hanoi":
        return base_path
    return base_path.with_name(f"{base_path.stem}_{normalized}{base_path.suffix}")


def _date_key(data_date: date | str) -> str:
    if isinstance(data_date, date):
        return data_date.strftime("%Y%m%d")
    date_key = str(data_date).replace("-", "")
    if len(date_key) != 8 or not date_key.isdigit():
        raise ValueError("data_date phải có định dạng YYYYMMDD hoặc YYYY-MM-DD")
    return date_key


def _run_code_key(run_code: str) -> str:
    try:
        return UUID(str(run_code)).hex
    except (TypeError, ValueError, AttributeError) as exc:
        raise ValueError("run_code phải là UUID hợp lệ") from exc


def city_daily_model_path(
    city_code: str,
    data_date: date | str | None = None,
    run_code: str | None = None,
) -> Path:
    """Build a unique dated artifact path or resolve the latest daily artifact."""
    normalized = city_code.strip().lower()
    if normalized not in SUPPORTED_CITIES:
        raise ValueError(f"Mã thành phố không hỗ trợ: {city_code}")

    if run_code is not None:
        if data_date is None:
            raise ValueError("Cần truyền data_date khi tạo tên file daily mới")
        return MODELS_DIR / (
            f"{normalized}-daily-{_date_key(data_date)}-{_run_code_key(run_code)}.joblib"
        )
    if data_date is not None:
        return MODELS_DIR / f"{normalized}-daily-{_date_key(data_date)}.joblib"

    candidates = list(MODELS_DIR.glob(f"{normalized}-daily-????????*.joblib"))
    if candidates:
        return max(candidates, key=lambda path: path.stat().st_mtime)

    # Return the expected new-format path so the caller reports a missing model.
    return MODELS_DIR / f"{normalized}-daily-{date.today():%Y%m%d}.joblib"


def city_hourly_model_path(
    city_code: str,
    data_date: date | str | None = None,
    run_code: str | None = None,
) -> Path:
    """Build a unique hourly artifact path or resolve the latest available model."""
    normalized = city_code.strip().lower()
    if normalized not in SUPPORTED_CITIES:
        raise ValueError(f"Mã thành phố không hỗ trợ: {city_code}")

    if run_code is not None:
        if data_date is None:
            raise ValueError("Cần truyền data_date khi tạo tên file hourly mới")
        return MODELS_DIR / (
            f"{normalized}-hourly-{_date_key(data_date)}-{_run_code_key(run_code)}.joblib"
        )

    candidates = list(MODELS_DIR.glob(f"{normalized}-hourly-????????-*.joblib"))
    if candidates:
        return max(candidates, key=lambda path: path.stat().st_mtime)

    # Keep existing hourly artifacts usable until each city has a new training run.
    return city_model_path(SVR_HOURLY_MODEL_PATH, normalized)

# Forecast settings
DAILY_HORIZON = 7        # 7 ngày tới
DAILY_TRAIN_WINDOW_DAYS = 30
DAILY_MIN_TRAIN_SAMPLES = 30
# The longest daily feature lag is 733 days. Keep a margin so inference can
# still find a usable row if the newest observations are incomplete.
DAILY_PREDICTION_HISTORY_DAYS = 900
HOURLY_HORIZON = 24      # 24 bước 1h = 24h tới
STEP_HOURS = 1           # Bước 1h
# Số ngày mẫu hourly được dùng để train; lịch sử dài hơn vẫn được dùng tạo lag.
HOURLY_TRAIN_WINDOW_DAYS = 365
CITY = os.getenv("CITY", "hanoi").strip().lower()
STATION_NAME = "Hoàn Kiếm"
TIMEZONE = "Asia/Ho_Chi_Minh"

DATA_SYNC_ENABLED = os.getenv("DATA_SYNC_ENABLED", "true").strip().lower() in {
    "1", "true", "yes", "on",
}
_default_data_sync_times = ("06:00", "18:00")
_default_data_sync_clock_times = tuple(
    datetime.strptime(value, "%H:%M").time()
    for value in _default_data_sync_times
)
_configured_data_sync_times = os.getenv(
    "DATA_SYNC_TIMES",
    ",".join(_default_data_sync_times),
)
try:
    DATA_SYNC_TIMES = tuple(
        sorted(
            {
                datetime.strptime(value.strip(), "%H:%M").time()
                for value in _configured_data_sync_times.split(",")
                if value.strip()
            }
        )
    ) or _default_data_sync_clock_times
except ValueError:
    DATA_SYNC_TIMES = _default_data_sync_clock_times

# Database Configuration from environment variables
DB_HOST = os.getenv("DB_HOST", "")
DB_PORT = os.getenv("DB_PORT", "")
DB_NAME = os.getenv("DB_NAME", "")
DB_USER = os.getenv("DB_USER", "")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")

# Internal API Key for Backend <-> ML Service communication
INTERNAL_API_KEY = os.getenv("INTERNAL_API_KEY", "")

# Build DATABASE_URL dynamically from env or use custom DATABASE_URL if defined
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    if DB_PASSWORD:
        DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    else:
        DATABASE_URL = f"postgresql://{DB_USER}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

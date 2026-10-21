"""Load processed city observations from PostgreSQL."""
from __future__ import annotations

import pandas as pd
from sqlalchemy import create_engine, text

from app.core.config import CITY, DATABASE_URL, TIMEZONE


def get_engine():
    """Create a SQLAlchemy engine for the configured PostgreSQL database."""
    return create_engine(DATABASE_URL, pool_pre_ping=True)


def _load_city_frame(
    query: str,
    city_code: str,
    extra_params: dict | None = None,
) -> pd.DataFrame:
    supported = {"hanoi", "haiphong", "danang", "hochiminh", "cantho"}
    normalized_city = city_code.strip().lower()
    if normalized_city not in supported:
        raise ValueError(
            f"Mã thành phố không hỗ trợ: {city_code}. Chọn một trong {sorted(supported)}."
        )

    engine = get_engine()
    try:
        with engine.connect() as connection:
            frame = pd.read_sql_query(
                text(query),
                connection,
                params={"city_code": normalized_city, **(extra_params or {})},
            )
    finally:
        engine.dispose()

    if frame.empty:
        raise RuntimeError(
            f"Database chưa có dữ liệu cho thành phố '{normalized_city}'. "
            "Hãy chạy migration và app.data.ingest_open_meteo trước."
        )

    frame["time"] = pd.to_datetime(frame["time"])
    frame = frame.set_index("time").sort_index()
    if frame.index.tz is None:
        frame.index = frame.index.tz_localize(TIMEZONE)
    else:
        frame.index = frame.index.tz_convert(TIMEZONE)
    return frame


def load_hourly_training_data(city_code: str = CITY) -> pd.DataFrame:
    """Load processed hourly observations and stored VN_AQI for one city."""
    frame = _load_city_frame(
        """
        SELECT aq.time, aq.pm2_5, aq.pm10, aq.so2, aq.no2, aq.co, aq.o3,
               aq.aqi, aq.dominant_pollutant, aq.level,
               w.temperature_2m AS temperature,
               w.relative_humidity_2m AS humidity,
               w.wind_speed_10m AS wind_speed,
               w.wind_direction_10m AS wind_direction,
               w.surface_pressure AS pressure,
               w.precipitation, w.missing_flag
        FROM air_quality_observations AS aq
        LEFT JOIN weather_observations AS w
          ON w.city_code = aq.city_code AND w.time = aq.time
        WHERE aq.city_code = :city_code
        ORDER BY aq.time
        """,
        city_code,
    )
    expected = pd.date_range(frame.index[0], frame.index[-1], freq="h")
    if not frame.index.equals(expected):
        raise RuntimeError(
            f"Dữ liệu giờ của {city_code} bị thiếu slot hoặc không đúng bước 1 giờ. "
            "Hãy chạy lại app.data.ingest_open_meteo cho khoảng ngày cần dùng."
        )
    return frame


def load_daily_training_data(
    city_code: str = CITY,
    lookback_days: int | None = None,
) -> pd.DataFrame:
    """Load precomputed daily observations, optionally limiting inference history."""
    if lookback_days is not None and lookback_days < 1:
        raise ValueError("lookback_days phải lớn hơn 0")

    lookback_filter = ""
    extra_params = None
    if lookback_days is not None:
        lookback_filter = """
          AND time >= (
            SELECT MAX(time) - (:lookback_days * INTERVAL '1 day')
            FROM aqi_daily_observations
            WHERE city_code = :city_code
          )
        """
        extra_params = {"lookback_days": lookback_days}

    frame = _load_city_frame(
        f"""
        SELECT time, pm2_5, pm10, so2, no2, co, o3, aqi,
               dominant_pollutant, level, temperature, humidity,
               wind_speed, wind_direction, pressure, precipitation, missing_flag
        FROM aqi_daily_observations
        WHERE city_code = :city_code
        {lookback_filter}
        ORDER BY time
        """,
        city_code,
        extra_params=extra_params,
    )
    expected = pd.date_range(frame.index[0], frame.index[-1], freq="D")
    if not frame.index.equals(expected):
        raise RuntimeError(
            f"Dữ liệu ngày của {city_code} không liên tục. "
            "Hãy chạy lại app.data.ingest_open_meteo cho khoảng ngày cần dùng."
        )
    return frame


def test_connection() -> None:
    """Check database connectivity and hourly data for the default city."""
    target = DATABASE_URL.split("@")[-1] if "@" in DATABASE_URL else DATABASE_URL
    print("=" * 60)
    print(f"[*] Đang kết nối tới DB: {target}")
    print("=" * 60)

    try:
        frame = load_hourly_training_data(CITY)
        print(f"[✓] Dữ liệu giờ của {CITY}: Shape = {frame.shape}")
        print(frame.head(3))
        print("=" * 60)
        print("[✓] Kết nối và nạp dữ liệu PostgreSQL thành công!")
    except Exception as err:
        print(f"[!] Lỗi khi kết nối hoặc đọc DB: {err}")
        print("[*] Gợi ý: Kiểm tra DATABASE_URL, chạy PostgreSQL và chạy ingest dữ liệu.")


if __name__ == "__main__":
    test_connection()

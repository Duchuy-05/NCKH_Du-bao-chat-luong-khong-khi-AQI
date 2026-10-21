"""Fetch hourly Open-Meteo observations, process them, and upsert them in PostgreSQL.

Run from ``backend`` with ``python -m app.data.ingest_open_meteo``.
"""
from __future__ import annotations

import argparse
import json
import time
from datetime import date, datetime, timedelta
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from zoneinfo import ZoneInfo

import numpy as np
import pandas as pd
from sqlalchemy import text

from app.core.config import DATABASE_URL, TIMEZONE
from app.core.cities import CITIES
from app.data.aqi import compute_aqi_daily, compute_aqi_hourly
from app.data.loaders.db_loader import get_engine
from app.data.quality import clean_dataset


AIR_QUALITY_URL = "https://air-quality-api.open-meteo.com/v1/air-quality"
WEATHER_URL = "https://archive-api.open-meteo.com/v1/archive"
WEATHER_FORECAST_URL = "https://api.open-meteo.com/v1/forecast"
AIR_QUALITY_VARS = (
    "pm2_5", "pm10", "carbon_monoxide", "nitrogen_dioxide",
    "sulphur_dioxide", "ozone",
)
WEATHER_VARS = (
    "temperature_2m", "relative_humidity_2m", "wind_speed_10m",
    "wind_direction_10m", "surface_pressure", "precipitation",
)
POLLUTANT_RENAMES = {
    "carbon_monoxide": "co",
    "nitrogen_dioxide": "no2",
    "sulphur_dioxide": "so2",
    "ozone": "o3",
}
WEATHER_RENAMES = {
    "temperature_2m": "temperature",
    "relative_humidity_2m": "humidity",
    "wind_speed_10m": "wind_speed",
    "wind_direction_10m": "wind_direction",
    "surface_pressure": "pressure",
}
POLLUTANT_COLUMNS = ("pm10", "pm2_5", "co", "o3", "no2", "so2")
WEATHER_COLUMNS = (
    "temperature", "humidity", "wind_speed", "wind_direction", "pressure", "precipitation",
)
CHUNK_DAYS = 365
MAX_RETRIES = 3


def date_chunks(start: date, end: date, chunk_days: int = CHUNK_DAYS):
    current = start
    while current <= end:
        chunk_end = min(current + timedelta(days=chunk_days - 1), end)
        yield current, chunk_end
        current = chunk_end + timedelta(days=1)


def _request_json(url: str, params: dict[str, str | float]) -> dict[str, Any]:
    request_url = f"{url}?{urlencode(params)}"
    last_error: Exception | None = None
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            request = Request(request_url, headers={"User-Agent": "AirVision/1.0"})
            with urlopen(request, timeout=90) as response:
                payload = json.loads(response.read().decode("utf-8"))
            if payload.get("error"):
                raise RuntimeError(payload.get("reason", "Open-Meteo trả lỗi không xác định."))
            return payload
        except HTTPError as exc:
            response_body = exc.read().decode("utf-8", errors="replace").strip()
            detail = f"HTTP {exc.code}: {exc.reason}"
            if response_body:
                detail = f"{detail}; phản hồi: {response_body}"
            last_error = RuntimeError(detail)
            if 400 <= exc.code < 500 and exc.code not in (408, 429):
                raise last_error from exc
            if attempt < MAX_RETRIES:
                delay = 2 * attempt
                print(
                    f"  [!] Open-Meteo lỗi: {last_error}; "
                    f"thử lại sau {delay}s ({attempt}/{MAX_RETRIES})"
                )
                time.sleep(delay)
        except (URLError, TimeoutError, json.JSONDecodeError, RuntimeError) as exc:
            last_error = exc
            if attempt < MAX_RETRIES:
                delay = 2 * attempt
                print(f"  [!] Open-Meteo lỗi: {exc}; thử lại sau {delay}s ({attempt}/{MAX_RETRIES})")
                time.sleep(delay)
    raise RuntimeError(
        f"Không thể lấy dữ liệu Open-Meteo "
        f"(lần thử {MAX_RETRIES}/{MAX_RETRIES}): {last_error}"
    )


def _hourly_frame(payload: dict[str, Any]) -> pd.DataFrame:
    hourly = payload.get("hourly") or {}
    frame = pd.DataFrame(hourly)
    if frame.empty or "time" not in frame:
        return pd.DataFrame()
    frame["time"] = pd.to_datetime(frame["time"], errors="coerce")
    return frame.dropna(subset=["time"]).set_index("time").sort_index()


def _fetch_hourly(
    url: str,
    variables: tuple[str, ...],
    city: dict[str, Any],
    start: date,
    end: date,
) -> pd.DataFrame:
    payload = _request_json(
        url,
        {
            "latitude": city["latitude"],
            "longitude": city["longitude"],
            "hourly": ",".join(variables),
            "start_date": start.isoformat(),
            "end_date": end.isoformat(),
            "timezone": TIMEZONE,
        },
    )
    return _hourly_frame(payload)


def _fetch_current_day_weather(city: dict[str, Any], today: date) -> pd.DataFrame:
    """Use the forecast endpoint for today; the archive endpoint is for past data."""
    payload = _request_json(
        WEATHER_FORECAST_URL,
        {
            "latitude": city["latitude"],
            "longitude": city["longitude"],
            "hourly": ",".join(WEATHER_VARS),
            "forecast_days": "1",
            "timezone": TIMEZONE,
        },
    )
    frame = _hourly_frame(payload)
    if frame.empty:
        return frame
    return frame.loc[frame.index.date == today]


def fetch_city_hourly(city_code: str, start: date, end: date) -> pd.DataFrame:
    city = CITIES[city_code]
    today = datetime.now(ZoneInfo(TIMEZONE)).date()
    air_frames: list[pd.DataFrame] = []
    weather_frames: list[pd.DataFrame] = []
    for chunk_start, chunk_end in date_chunks(start, end):
        print(f"  -> {city['name']}: {chunk_start} đến {chunk_end}")
        air = _fetch_hourly(AIR_QUALITY_URL, AIR_QUALITY_VARS, city, chunk_start, chunk_end)
        if not air.empty:
            air_frames.append(air)

        # The archive endpoint serves completed dates. Fetch today's weather from
        # the live forecast endpoint so local dates ahead of UTC are not rejected.
        archive_end = min(chunk_end, today - timedelta(days=1))
        if chunk_start <= archive_end:
            weather_archive = _fetch_hourly(
                WEATHER_URL,
                WEATHER_VARS,
                city,
                chunk_start,
                archive_end,
            )
            if not weather_archive.empty:
                weather_frames.append(weather_archive)
        if chunk_start <= today <= chunk_end:
            current_weather = _fetch_current_day_weather(city, today)
            current_weather = current_weather.loc[
                (current_weather.index.date >= chunk_start)
                & (current_weather.index.date <= chunk_end)
            ]
            if not current_weather.empty:
                weather_frames.append(current_weather)
        time.sleep(0.5)

    if not air_frames and not weather_frames:
        raise ValueError(f"Open-Meteo không trả dữ liệu cho thành phố {city_code}.")

    air = (
        pd.concat(air_frames).loc[lambda frame: ~frame.index.duplicated(keep="last")]
        if air_frames else pd.DataFrame()
    )
    weather = (
        pd.concat(weather_frames).loc[lambda frame: ~frame.index.duplicated(keep="last")]
        if weather_frames else pd.DataFrame()
    )
    if air.empty and not weather.empty:
        air = pd.DataFrame(index=weather.index)
    if weather.empty and not air.empty:
        weather = pd.DataFrame(index=air.index)
    air = air.rename(columns=POLLUTANT_RENAMES)
    weather = weather.rename(columns=WEATHER_RENAMES)
    frame = weather.join(air, how="outer").sort_index()
    if not isinstance(frame.index, pd.DatetimeIndex):
        raise TypeError("Open-Meteo cần trả timestamp theo giờ.")
    if frame.index.tz is not None:
        frame.index = frame.index.tz_convert(TIMEZONE).tz_localize(None)
    if not (frame.index == frame.index.floor("h")).all():
        raise ValueError("Open-Meteo trả timestamp không nằm đúng đầu giờ.")
    hourly_index = pd.date_range(frame.index.min(), frame.index.max(), freq="h")
    frame = frame.reindex(hourly_index)
    frame.index.name = "time"
    return frame


def process_city_data(raw: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Clean measurements and calculate stored hourly and daily AQI values."""
    available_pollutants = [column for column in POLLUTANT_COLUMNS if column in raw.columns]
    available_weather = [column for column in WEATHER_COLUMNS if column in raw.columns]
    if not any(column in available_pollutants for column in ("pm2_5", "pm10")):
        raise ValueError("Open-Meteo không trả PM2.5 hoặc PM10 nên không thể tính VN_AQI.")

    values = available_pollutants + available_weather
    cleaned = clean_dataset(raw, values, available_pollutants)
    hourly = compute_aqi_hourly(cleaned)

    daily = compute_aqi_daily(cleaned)
    if available_weather:
        daily_weather_source = cleaned[available_weather].copy()
        daily_weather_source.index = daily_weather_source.index - pd.Timedelta(hours=1)
        daily_weather = daily_weather_source.resample("1D").mean()
        daily = daily.join(daily_weather, how="left")
    daily["missing_flag"] = daily[available_weather].isna().any(axis=1) if available_weather else True
    return hourly, daily


def _python_value(value: Any, column: str) -> Any:
    if pd.isna(value):
        return None
    if isinstance(value, pd.Timestamp):
        return value.to_pydatetime()
    if isinstance(value, np.generic):
        value = value.item()
    if column == "aqi":
        return int(round(float(value)))
    return value


def _records(frame: pd.DataFrame, city_code: str, columns: tuple[str, ...]) -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []
    source = frame.rename_axis("time").reset_index()
    for row in source.to_dict(orient="records"):
        record = {"city_code": city_code}
        for column in columns:
            record[column] = _python_value(row.get(column), column)
        record["time"] = _python_value(row["time"], "time")
        records.append(record)
    return records


def _upsert(
    connection,
    table: str,
    columns: tuple[str, ...],
    records: list[dict[str, Any]],
    batch_size: int = 1000,
) -> None:
    if not records:
        return
    all_columns = ("city_code", "time", *columns)
    bind_list = ", ".join(f":{column}" for column in all_columns)
    column_list = ", ".join(all_columns)
    updates = ", ".join(
        f"{column} = EXCLUDED.{column}" for column in columns
    )
    statement = text(
        f"INSERT INTO {table} ({column_list}) VALUES ({bind_list}) "
        f"ON CONFLICT (city_code, time) DO UPDATE SET {updates}"
    )
    for offset in range(0, len(records), batch_size):
        connection.execute(statement, records[offset : offset + batch_size])


def store_city_data(city_code: str, hourly: pd.DataFrame, daily: pd.DataFrame) -> None:
    air_columns = (*POLLUTANT_COLUMNS, "aqi", "dominant_pollutant", "level")
    weather_map = {
        "temperature": "temperature_2m",
        "humidity": "relative_humidity_2m",
        "wind_speed": "wind_speed_10m",
        "wind_direction": "wind_direction_10m",
        "pressure": "surface_pressure",
        "precipitation": "precipitation",
    }
    weather_values = [column for column in WEATHER_COLUMNS if column in hourly.columns]
    weather = hourly[weather_values].rename(
        columns=weather_map
    )
    weather["missing_flag"] = (
        hourly[weather_values].isna().any(axis=1) if weather_values else True
    )
    weather_columns = (*weather_map.values(), "missing_flag")

    daily_map = {
        "temperature": "temperature",
        "humidity": "humidity",
        "wind_speed": "wind_speed",
        "wind_direction": "wind_direction",
        "pressure": "pressure",
        "precipitation": "precipitation",
    }
    daily_columns = (
        *POLLUTANT_COLUMNS, "aqi", "dominant_pollutant", "level",
        *daily_map.values(), "missing_flag",
    )

    engine = get_engine()
    try:
        with engine.begin() as connection:
            air_records = _records(hourly, city_code, air_columns)
            weather_records = _records(weather, city_code, weather_columns)
            daily_records = _records(daily, city_code, daily_columns)
            _upsert(connection, "air_quality_observations", air_columns, air_records)
            _upsert(connection, "weather_observations", weather_columns, weather_records)
            _upsert(connection, "aqi_daily_observations", daily_columns, daily_records)
    finally:
        engine.dispose()


def ingest_city(
    city_code: str,
    start: date,
    end: date,
    cutoff: datetime | None = None,
) -> dict[str, int]:
    """Fetch, process, and store one city's data, optionally capped at local time."""
    print(f"[{city_code}] Bắt đầu lấy dữ liệu từ {start} đến {end}...")
    raw = fetch_city_hourly(city_code, start, end)
    if cutoff is not None:
        cutoff_ts = pd.Timestamp(cutoff)
        if cutoff_ts.tzinfo is not None:
            cutoff_ts = cutoff_ts.tz_convert(TIMEZONE).tz_localize(None)
        raw = raw.loc[raw.index <= cutoff_ts]
        if raw.empty:
            raise ValueError(f"Không có dữ liệu Open-Meteo trước mốc {cutoff_ts} cho {city_code}.")
    hourly, daily = process_city_data(raw)
    # A daily VN_AQI value represents a complete calendar day. Keep today's
    # hourly observations for hourly use, but do not persist a partial daily AQI.
    local_today = datetime.now(ZoneInfo(TIMEZONE)).date()
    daily = daily.loc[daily.index.date < local_today]
    store_city_data(city_code, hourly, daily)
    result = {"hourly": len(hourly), "daily": len(daily)}
    print(f"[{city_code}] Đã upsert {result['hourly']} bản ghi giờ và {result['daily']} bản ghi ngày.")
    return result


def main() -> None:
    parser = argparse.ArgumentParser(description="Nạp Open-Meteo hourly data cho 5 thành phố vào PostgreSQL.")
    parser.add_argument("--start-date", type=date.fromisoformat, default=date(2022, 10, 1))
    parser.add_argument("--end-date", type=date.fromisoformat, default=date.today() - timedelta(days=1))
    parser.add_argument("--city", choices=tuple(CITIES), action="append", help="Lặp lại để chọn nhiều thành phố; mặc định là cả 5.")
    args = parser.parse_args()
    if args.end_date < args.start_date:
        parser.error("--end-date phải bằng hoặc sau --start-date")
    if not DATABASE_URL or DATABASE_URL.endswith("@/"):
        parser.error("Chưa cấu hình DATABASE_URL trong backend/.env")

    selected_cities = args.city or list(CITIES)
    for city_code in selected_cities:
        ingest_city(city_code, args.start_date, args.end_date)


if __name__ == "__main__":
    main()

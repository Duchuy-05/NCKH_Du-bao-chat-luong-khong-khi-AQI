"""Fetch current modeled pollutant concentrations and calculate VN_AQI."""
from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode
from urllib.request import Request, urlopen

import pandas as pd

from app.core.cities import CITIES
from app.core.config import TIMEZONE
from app.data.aqi import compute_aqi_hourly


AIR_QUALITY_URL = "https://air-quality-api.open-meteo.com/v1/air-quality"
POLLUTANTS = {
    "pm2_5": "pm2_5",
    "pm10": "pm10",
    "carbon_monoxide": "co",
    "nitrogen_dioxide": "no2",
    "sulphur_dioxide": "so2",
    "ozone": "o3",
}


def get_current_aqi(city_code: str) -> dict:
    """Return the latest hourly modeled VN_AQI for a supported city.

    Open-Meteo's global CAMS data is natively 3-hourly in Vietnam. Asking for
    ``temporal_resolution=hourly`` returns an hourly interpolated series, which
    lets the project's existing 12-hour PM NowCast calculation run consistently.
    """
    city = CITIES.get(city_code)
    if city is None:
        raise ValueError(f"Thành phố không hỗ trợ: {city_code}")

    params = {
        "latitude": city["latitude"],
        "longitude": city["longitude"],
        "hourly": ",".join(POLLUTANTS),
        "past_hours": 12,
        "forecast_hours": 1,
        "temporal_resolution": "hourly",
        "timezone": TIMEZONE,
        "domains": "cams_global",
    }
    request = Request(
        f"{AIR_QUALITY_URL}?{urlencode(params)}",
        headers={"Accept": "application/json", "User-Agent": "AirVision/1.0"},
    )

    try:
        with urlopen(request, timeout=12) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except Exception as exc:
        raise RuntimeError(f"Không thể lấy dữ liệu chất lượng không khí từ Open-Meteo: {exc}") from exc

    if payload.get("error"):
        raise RuntimeError(payload.get("reason", "Open-Meteo trả lỗi không xác định."))

    hourly = payload.get("hourly") or {}
    times = hourly.get("time") or []
    if not times:
        raise RuntimeError("Open-Meteo không trả về chuỗi dữ liệu theo giờ.")

    local_timezone = timezone(timedelta(seconds=int(payload.get("utc_offset_seconds", 7 * 3600))))
    timestamps = []
    for value in times:
        timestamp = pd.Timestamp(value)
        if timestamp.tzinfo is None:
            timestamp = timestamp.tz_localize(local_timezone)
        else:
            timestamp = timestamp.tz_convert(local_timezone)
        timestamps.append(timestamp)

    frame = pd.DataFrame(index=pd.DatetimeIndex(timestamps))
    for source_name, target_name in POLLUTANTS.items():
        values = hourly.get(source_name)
        if values is not None:
            if len(values) != len(times):
                raise RuntimeError(f"Dữ liệu {source_name} từ Open-Meteo không đồng bộ thời gian.")
            frame[target_name] = pd.to_numeric(pd.Series(values, index=frame.index), errors="coerce")

    if not any(column in frame for column in ("pm2_5", "pm10")):
        raise RuntimeError("Open-Meteo không trả nồng độ PM2.5 hoặc PM10 để tính VN_AQI.")

    calculated = compute_aqi_hourly(frame)
    now_local = datetime.now(local_timezone)
    latest_allowed = pd.Timestamp(now_local).floor("h")
    available = calculated.loc[calculated.index <= latest_allowed]
    available = available.loc[available["aqi"].notna()]
    if available.empty:
        raise RuntimeError(
            "Chưa đủ dữ liệu theo giờ để tính VN_AQI (PM cần ít nhất 2 trong 3 giờ gần nhất)."
        )

    row = available.iloc[-1]
    timestamp = available.index[-1]
    return {
        "city": city_code,
        "aqi": int(row["aqi"]),
        "level": row["level"],
        "dominant_pollutant": row["dominant_pollutant"],
        "as_of": timestamp.to_pydatetime(),
        "generated_at": now_local,
        "source": "Open-Meteo CAMS Global; VN_AQI tính từ nồng độ chất ô nhiễm",
    }

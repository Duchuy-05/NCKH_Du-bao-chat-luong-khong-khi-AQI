"""
GIAI ĐOẠN 1 — Bước 2 + 5: Join, cắt phạm vi, xuất clean_3h.parquet / clean_daily.parquet
Đọc dữ liệu từ PostgreSQ
"""
from __future__ import annotations

import pandas as pd

from app.core.config import CLEAN_3H_PATH, CLEAN_DAILY_PATH, TIMEZONE
from app.data.aqi import compute_aqi
from app.data.loaders.db_loader import (
    POLLUTANT_COLUMNS,
    WEATHER_COLUMNS,
    load_pollutants,
    load_weather,
)
from app.data.quality import clean_dataset

def _find_first_continuous_timestamp(df: pd.DataFrame, columns: list[str]) -> pd.Timestamp:
    """Dò timestamp đầu tiên mà toàn bộ cột pollutant không rỗng."""
    valid_mask = df[columns].notna().all(axis=1)
    first_valid_idx = valid_mask.idxmax() if valid_mask.any() else df.index.min()
    return first_valid_idx

def join_and_trim() -> pd.DataFrame:
    pol = load_pollutants().set_index("time")
    wea = load_weather().set_index("time")

    # Loại bỏ các cột id/metadata bị trùng giữa 2 bảng
    for col in ["id", "id_pol", "id_wea", "station_id", "created_at", "updated_at"]:
        if col in pol.columns:
            pol = pol.drop(columns=[col])
        if col in wea.columns:
            wea = wea.drop(columns=[col])

    # Chỉ giữ các cột thuộc POLLUTANT_COLUMNS và WEATHER_COLUMNS nếu có
    avail_pol_cols = [c for c in pol.columns if c in POLLUTANT_COLUMNS]
    if avail_pol_cols:
        pol = pol[avail_pol_cols]

    avail_wea_cols = [c for c in wea.columns if c in WEATHER_COLUMNS]
    if avail_wea_cols:
        wea = wea[avail_wea_cols]

    # Join 2 bảng theo index time
    df = pol.join(wea, how="inner", lsuffix="_pol", rsuffix="_wea")
    df.index = pd.to_datetime(df.index)
    if df.index.tz is None:
        df.index = df.index.tz_localize(TIMEZONE)
    else:
        df.index = df.index.tz_convert(TIMEZONE)

    if "co2" in df.columns:
        df = df.drop(columns=["co2"])
        print("[build_dataset] Đã drop cột co2 (thiếu ~64%, không dùng được)")

    pollutant_cols = [c for c in POLLUTANT_COLUMNS if c in df.columns and c != "co2"]
    start_ts = _find_first_continuous_timestamp(df, pollutant_cols)
    print(f"[build_dataset] Cắt dữ liệu từ {start_ts}")
    df = df.loc[df.index >= start_ts]
    return df

def build_clean_3h() -> pd.DataFrame:
    df = join_and_trim()

    pollutant_cols = [c for c in POLLUTANT_COLUMNS if c in df.columns and c != "co2"]
    weather_cols = [c for c in WEATHER_COLUMNS if c in df.columns]
    value_cols = pollutant_cols + weather_cols

    df = clean_dataset(df, value_cols)
    df = compute_aqi(df)

    CLEAN_3H_PATH.parent.mkdir(parents=True, exist_ok=True)
    df.to_parquet(CLEAN_3H_PATH)
    print(f"[build_dataset] Saved {df.shape} -> {CLEAN_3H_PATH}")
    return df

def build_clean_daily(df_3h: pd.DataFrame) -> pd.DataFrame:
    weather_cols = [c for c in WEATHER_COLUMNS if c in df_3h.columns]

    agg = {"aqi": ["mean", "max", "min"]}
    for col in weather_cols:
        agg[col] = "mean"

    daily = df_3h.resample("1D").agg(agg)
    daily.columns = [
        "aqi_mean" if c == ("aqi", "mean") else
        "aqi_max" if c == ("aqi", "max") else
        "aqi_min" if c == ("aqi", "min") else
        c[0]
        for c in daily.columns
    ]
    daily = daily.dropna(subset=["aqi_mean"])

    CLEAN_DAILY_PATH.parent.mkdir(parents=True, exist_ok=True)
    daily.to_parquet(CLEAN_DAILY_PATH)
    print(f"[build_dataset] Saved {daily.shape} -> {CLEAN_DAILY_PATH}")
    return daily

if __name__ == "__main__":
    df_3h = build_clean_3h()
    build_clean_daily(df_3h)
"""Calculate hourly and daily VN_AQI using Decision 1459/QĐ-TCMT (2019)."""
from __future__ import annotations

import math

import numpy as np
import pandas as pd


# AQI levels and pollutant concentration breakpoints from Table 2 of QĐ 1459.
AQI_BREAKPOINTS = (0, 50, 100, 150, 200, 300, 400, 500)
CONCENTRATION_BREAKPOINTS = {
    "pm2_5": (0, 25, 50, 80, 150, 250, 350, 500),
    "pm10": (0, 50, 150, 250, 350, 420, 500, 600),
    "so2": (0, 125, 350, 550, 800, 1600, 2100, 2630),
    "no2": (0, 100, 200, 700, 1200, 2350, 3100, 3850),
    "co": (0, 10000, 30000, 45000, 60000, 90000, 120000, 150000),
}
O3_1H_BREAKPOINTS = (0, 160, 200, 300, 400, 800, 1000, 1200)
O3_8H_BREAKPOINTS = (0, 100, 120, 170, 210, 400)


def _make_table(concentrations: tuple[int, ...], aqi_values: tuple[int, ...] = AQI_BREAKPOINTS):
    return [
        (concentrations[i], concentrations[i + 1], aqi_values[i], aqi_values[i + 1])
        for i in range(min(len(concentrations), len(aqi_values)) - 1)
    ]


BREAKPOINTS = {
    pollutant: _make_table(points)
    for pollutant, points in CONCENTRATION_BREAKPOINTS.items()
}
BREAKPOINTS["o3"] = _make_table(O3_1H_BREAKPOINTS)
O3_8H_TABLE = _make_table(O3_8H_BREAKPOINTS, AQI_BREAKPOINTS[: len(O3_8H_BREAKPOINTS)])

LEVELS = [
    (0, 50, "Tốt"),
    (51, 100, "Trung bình"),
    (101, 150, "Kém"),
    (151, 200, "Xấu"),
    (201, 300, "Rất xấu"),
    (301, 500, "Nguy hại"),
]

POLLUTANT_COLUMNS = ("pm2_5", "pm10", "so2", "no2", "o3", "co")
PARTICULATE_COLUMNS = ("pm2_5", "pm10")


def _sub_index(concentration: float, table: list[tuple]) -> float | None:
    """Interpolate one pollutant sub-index between adjacent VN_AQI breakpoints."""
    if pd.isna(concentration) or concentration < 0:
        return None

    value = float(concentration)
    for bp_low, bp_high, index_low, index_high in table:
        if bp_low <= value <= bp_high:
            return (index_high - index_low) / (bp_high - bp_low) * (value - bp_low) + index_low

    # The general AQI table ends at 500. O3 8-hour has no breakpoints above 400.
    if value > table[-1][1] and table[-1][3] == 500:
        return 500.0
    return None


def _round_aqi(value: float) -> float:
    """Round non-negative AQI values to the nearest integer, preserving NaN."""
    if pd.isna(value):
        return np.nan
    return float(math.floor(float(value) + 0.5))


def _level(value: float) -> str | None:
    if pd.isna(value):
        return None
    for low, high, name in LEVELS:
        if low <= value <= high:
            return name
    return "Nguy hại"


def _require_hourly_frame(df: pd.DataFrame) -> pd.DataFrame:
    """Return a sorted, complete hourly index, leaving absent observations as NaN."""
    if not isinstance(df.index, pd.DatetimeIndex):
        raise TypeError("VN_AQI cần DataFrame có DatetimeIndex theo giờ.")
    if df.empty:
        return df.copy()

    frame = df.sort_index().copy()
    if frame.index.has_duplicates:
        raise ValueError("Dữ liệu AQI có timestamp trùng; cần gộp bản ghi trước khi tính.")
    if not (frame.index == frame.index.floor("h")).all():
        raise ValueError("Timestamp đầu vào phải nằm đúng đầu giờ (HH:00).")

    hourly_index = pd.date_range(frame.index[0], frame.index[-1], freq="h")
    return frame.reindex(hourly_index)


def _nowcast_series(series: pd.Series) -> pd.Series:
    """VN_AQI Nowcast for PM, using the latest 12 hourly values at each hour."""
    values = pd.to_numeric(series, errors="coerce").astype("float64").to_numpy()
    values[values < 0] = np.nan
    result = np.full(len(values), np.nan, dtype=float)

    for end in range(len(values)):
        # c1 is the current hour; c12 is the oldest value in this 12-value window.
        window = np.full(12, np.nan, dtype=float)
        start = max(0, end - 11)
        recent = values[start : end + 1][::-1]
        window[: len(recent)] = recent

        if np.isfinite(window[:3]).sum() < 2:
            continue

        present = window[np.isfinite(window)]
        if not len(present):
            continue

        maximum = float(present.max())
        minimum = float(present.min())
        weight_star = minimum / maximum if maximum > 0 else 1.0
        weight = max(0.5, weight_star)
        weights = np.power(weight, np.arange(12, dtype=float))
        weights[~np.isfinite(window)] = 0.0
        weight_sum = weights.sum()
        if weight_sum > 0:
            result[end] = float(np.nansum(window * weights) / weight_sum)

    return pd.Series(result, index=series.index, name=series.name)


def _combined_aqi(sub_indices: pd.DataFrame) -> tuple[pd.Series, pd.Series]:
    """Combine pollutant sub-indices and enforce the required PM input."""
    particulate = [column for column in PARTICULATE_COLUMNS if column in sub_indices]
    if not particulate:
        invalid = pd.Series(np.nan, index=sub_indices.index, dtype=float)
        return invalid, pd.Series(None, index=sub_indices.index, dtype=object)

    has_particulate = sub_indices[particulate].notna().any(axis=1)
    raw = sub_indices.max(axis=1, skipna=True)
    raw = raw.where(has_particulate)
    dominant = pd.Series(None, index=sub_indices.index, dtype=object)
    if has_particulate.any():
        valid_rows = sub_indices.loc[has_particulate]
        dominant.loc[has_particulate] = valid_rows.idxmax(axis=1, skipna=True)
    return raw, dominant


def compute_aqi_hourly(df: pd.DataFrame) -> pd.DataFrame:
    """Add official hourly VN_AQI (Nowcast for PM, 1-hour values for gases)."""
    frame = _require_hourly_frame(df)
    sub_indices: dict[str, pd.Series] = {}

    for pollutant in POLLUTANT_COLUMNS:
        if pollutant not in frame.columns:
            continue
        values = pd.to_numeric(frame[pollutant], errors="coerce")
        values = values.where(values >= 0)
        if pollutant in PARTICULATE_COLUMNS:
            values = _nowcast_series(values)
        sub_indices[pollutant] = values.apply(lambda value: _sub_index(value, BREAKPOINTS[pollutant]))

    sub_frame = pd.DataFrame(sub_indices, index=frame.index)
    raw_aqi, dominant = _combined_aqi(sub_frame)
    frame["aqi"] = raw_aqi.map(_round_aqi)
    frame["dominant_pollutant"] = dominant
    frame["level"] = frame["aqi"].map(_level)
    return frame


def compute_aqi_daily(df: pd.DataFrame) -> pd.DataFrame:
    """Calculate daily VN_AQI from hourly observations as prescribed by QĐ 1459."""
    frame = _require_hourly_frame(df)
    if frame.empty:
        return pd.DataFrame(index=frame.index)

    # QĐ 1459 defines a day from 01:00 through 00:00 the following day.
    # Shift hour-ending timestamps back one hour before calendar grouping.
    daily_clock = frame.copy()
    daily_clock.index = daily_clock.index - pd.Timedelta(hours=1)
    daily_index = daily_clock.resample("1D").size().index
    daily = pd.DataFrame(index=daily_index)
    hourly_o3_8h = None

    for pollutant in POLLUTANT_COLUMNS:
        if pollutant not in frame.columns:
            continue
        series = pd.to_numeric(frame[pollutant], errors="coerce").where(lambda s: s >= 0)
        grouped_series = series.copy()
        grouped_series.index = grouped_series.index - pd.Timedelta(hours=1)
        count = grouped_series.resample("1D").count()

        if pollutant in PARTICULATE_COLUMNS:
            # A full day's 24 hourly means are required for the 24-hour value.
            daily[pollutant] = grouped_series.resample("1D").mean().where(count == 24)
        elif pollutant == "o3":
            daily["o3_max_1h"] = grouped_series.resample("1D").max().where(count == 24)
            hourly_o3_8h = series.rolling(8, min_periods=8).mean()
            hourly_o3_8h.index = hourly_o3_8h.index - pd.Timedelta(hours=1)
            o3_count = hourly_o3_8h.resample("1D").count()
            daily["o3_max_8h"] = hourly_o3_8h.resample("1D").max().where(o3_count > 0)
            # Keep a useful daily feature alongside the AQI-specific maxima.
            daily["o3"] = daily["o3_max_1h"]
        else:
            daily[pollutant] = grouped_series.resample("1D").max().where(count == 24)

    sub_indices: dict[str, pd.Series] = {}
    for pollutant in PARTICULATE_COLUMNS:
        if pollutant in daily:
            sub_indices[pollutant] = daily[pollutant].apply(
                lambda value: _sub_index(value, BREAKPOINTS[pollutant])
            )
    for pollutant in ("so2", "no2", "co"):
        if pollutant in daily:
            sub_indices[pollutant] = daily[pollutant].apply(
                lambda value: _sub_index(value, BREAKPOINTS[pollutant])
            )

    o3_indices = []
    if "o3_max_1h" in daily:
        o3_indices.append(
            daily["o3_max_1h"].apply(lambda value: _sub_index(value, BREAKPOINTS["o3"]))
        )
    if "o3_max_8h" in daily:
        # QĐ 1459 says to omit the 8-hour O3 AQI when its maximum is above 400.
        valid_8h = daily["o3_max_8h"].where(daily["o3_max_8h"] <= 400)
        o3_indices.append(valid_8h.apply(lambda value: _sub_index(value, O3_8H_TABLE)))
    if o3_indices:
        sub_indices["o3"] = pd.concat(o3_indices, axis=1).max(axis=1, skipna=True)

    sub_frame = pd.DataFrame(sub_indices, index=daily.index)
    raw_aqi, dominant = _combined_aqi(sub_frame)
    daily["aqi"] = raw_aqi.map(_round_aqi)
    daily["dominant_pollutant"] = dominant
    daily["level"] = daily["aqi"].map(_level)
    return daily


def compute_aqi(df: pd.DataFrame) -> pd.DataFrame:
    """Backward-compatible alias for the hourly VN_AQI calculation."""
    return compute_aqi_hourly(df)

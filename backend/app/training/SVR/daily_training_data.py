"""Chọn dữ liệu huấn luyện daily theo cửa sổ lịch và mùa của target."""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from typing import Any

import pandas as pd

from app.core.config import DAILY_MIN_TRAIN_SAMPLES, DAILY_TRAIN_WINDOW_DAYS
from app.features.season import get_season_name


class InsufficientTrainingDataError(ValueError):
    """Raised when a horizon has too few valid samples after filtering."""


@dataclass(frozen=True)
class HorizonTrainingData:
    X: pd.DataFrame
    y: pd.Series
    metadata: dict[str, Any]


def _replace_year(value: pd.Timestamp, year: int) -> pd.Timestamp | None:
    try:
        return value.replace(year=year)
    except ValueError:
        return None


def build_calendar_window_dates(
    anchor_date: pd.Timestamp,
    window_days: int = DAILY_TRAIN_WINDOW_DAYS,
) -> list[pd.Timestamp]:
    """Return exact calendar dates from ``anchor_date - window_days + 1`` to anchor."""
    if window_days < 1:
        raise ValueError("window_days must be at least 1")
    anchor_date = pd.Timestamp(anchor_date).normalize()
    return [
        anchor_date - pd.Timedelta(days=offset)
        for offset in range(window_days - 1, -1, -1)
    ]


def _mapped_historical_dates(
    forecast_date: pd.Timestamp,
    available_years: list[int],
    window_days: int,
) -> list[pd.Timestamp]:
    """Map each date in the forecast-year window to each historical calendar year."""
    forecast_date = pd.Timestamp(forecast_date).normalize()
    source_dates = build_calendar_window_dates(forecast_date, window_days)
    mapped: list[pd.Timestamp] = []
    for year in available_years:
        for source_date in source_dates:
            year_offset = source_date.year - forecast_date.year
            candidate = _replace_year(source_date, year + year_offset)
            if candidate is not None:
                mapped.append(candidate)
    return mapped


def _season_months(season: str) -> set[int]:
    return {
        "Xuan": {2, 3, 4},
        "Ha": {5, 6, 7},
        "Thu": {8, 9, 10},
        "Dong": {1, 11, 12},
    }[season]


def _feature_columns(df: pd.DataFrame, target_column: str) -> list[str]:
    excluded = {target_column} | {
        column for column in df.columns if column.startswith("d_")
    }
    excluded.update({
        "dominant_pollutant",
        "level",
        "city_id",
        "station_id",
        "station_name",
        "time",
        "id",
    })
    return [
        column
        for column in df.columns
        if column not in excluded and pd.api.types.is_numeric_dtype(df[column])
    ]


def select_horizon_training_data(
    df: pd.DataFrame,
    forecast_date: pd.Timestamp,
    horizon: int,
    window_days: int = DAILY_TRAIN_WINDOW_DAYS,
    min_samples: int = DAILY_MIN_TRAIN_SAMPLES,
) -> HorizonTrainingData:
    """Select one horizon's samples from exact calendar windows and matching seasons."""
    if not isinstance(df.index, pd.DatetimeIndex):
        raise TypeError("df must have a DatetimeIndex")
    if horizon < 1:
        raise ValueError("horizon must be at least 1")
    if min_samples < 1:
        raise ValueError("min_samples must be at least 1")

    frame = df.sort_index().copy()
    forecast_date = pd.Timestamp(forecast_date).normalize()
    target_column = f"d_{horizon}"
    if target_column not in frame.columns:
        raise KeyError(f"Missing target column: {target_column}")

    available_years = sorted({
        timestamp.year
        for timestamp in frame.index
        if timestamp.year <= forecast_date.year
    })
    candidate_dates = _mapped_historical_dates(
        forecast_date, available_years, window_days
    )
    target_season = get_season_name((forecast_date + pd.Timedelta(days=horizon)).month)
    seasonal_months = _season_months(target_season)
    seasonal_dates = [
        timestamp
        for timestamp in frame.index
        if timestamp.year <= forecast_date.year
        and timestamp <= forecast_date
        and timestamp.month in seasonal_months
    ]
    candidate_dates = list(dict.fromkeys(candidate_dates + seasonal_dates))
    feature_columns = _feature_columns(frame, target_column)

    selected_dates: list[pd.Timestamp] = []
    missing_dates: list[str] = []
    season_filtered = 0
    valid_rows: list[pd.Timestamp] = []

    index_dates = set(frame.index)
    for anchor_date in candidate_dates:
        if anchor_date not in index_dates:
            missing_dates.append(anchor_date.date().isoformat())
            continue
        target_history_date = anchor_date + pd.Timedelta(days=horizon)
        if target_history_date not in index_dates:
            missing_dates.append(target_history_date.date().isoformat())
            continue
        if get_season_name(target_history_date.month) != target_season:
            season_filtered += 1
            continue
        row = frame.loc[anchor_date]
        if isinstance(row, pd.DataFrame):
            raise ValueError(f"Duplicate anchor date: {anchor_date.isoformat()}")
        if row[feature_columns + [target_column]].isna().any():
            missing_dates.append(anchor_date.date().isoformat())
            continue
        valid_rows.append(anchor_date)
        selected_dates.append(anchor_date)

    metadata: dict[str, Any] = {
        "horizon": horizon,
        "target_date": (forecast_date + pd.Timedelta(days=horizon)).date().isoformat(),
        "target_season": target_season,
        "window_days": window_days,
        "seasonal_months": sorted(seasonal_months),
        "available_years": available_years,
        "candidate_count": len(candidate_dates),
        "season_filtered_count": season_filtered,
        "missing_count": len(missing_dates),
        "selected_count": len(valid_rows),
        "selected_anchor_dates": [value.date().isoformat() for value in selected_dates],
        "missing_dates": sorted(set(missing_dates)),
        "feature_columns": feature_columns,
    }
    if len(valid_rows) < min_samples:
        raise InsufficientTrainingDataError(
            f"horizon={horizon} target_date={metadata['target_date']} "
            f"season={target_season} has {len(valid_rows)} samples; "
            f"minimum is {min_samples}"
        )

    selected = frame.loc[valid_rows]
    return HorizonTrainingData(
        X=selected[feature_columns].astype(float),
        y=selected[target_column].astype(float),
        metadata=metadata,
    )

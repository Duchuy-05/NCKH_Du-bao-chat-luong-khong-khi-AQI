from datetime import timedelta

import numpy as np
import pandas as pd
import pytest

from app.training.SVR.daily_training_data import (
    InsufficientTrainingDataError,
    build_calendar_window_dates,
    select_horizon_training_data,
)


def make_feature_frame(dates: pd.DatetimeIndex) -> pd.DataFrame:
    frame = pd.DataFrame(index=dates)
    frame["temperature"] = np.arange(len(dates), dtype=float)
    frame["humidity"] = 60.0
    for horizon in range(1, 8):
        frame[f"d_{horizon}"] = 100.0 + horizon
    return frame


def test_calendar_window_is_30_dates_per_year_without_nearest_fill():
    dates = pd.date_range("2022-02-01", "2024-03-10", freq="D")
    dates = dates[dates != pd.Timestamp("2023-02-15")]
    selected = select_horizon_training_data(
        make_feature_frame(dates),
        forecast_date=pd.Timestamp("2024-03-10"),
        horizon=1,
        min_samples=1,
    )

    assert selected.metadata["window_days"] == 30
    assert "2023-02-15" not in selected.metadata["selected_anchor_dates"]
    assert all(
        pd.Timestamp(value).month in {2, 3}
        for value in selected.metadata["selected_anchor_dates"]
    )


def test_filter_uses_target_history_season_not_anchor_season():
    dates = pd.date_range("2020-04-01", "2024-05-10", freq="D")
    selected = select_horizon_training_data(
        make_feature_frame(dates),
        forecast_date=pd.Timestamp("2024-05-10"),
        horizon=1,
        min_samples=1,
    )

    assert selected.metadata["target_season"] == "Ha"
    assert all(
        pd.Timestamp(value) + timedelta(days=1)
        and (pd.Timestamp(value) + timedelta(days=1)).month in {5, 6, 7}
        for value in selected.metadata["selected_anchor_dates"]
    )


def test_february_29_is_skipped_for_non_leap_years():
    dates = pd.date_range("2020-01-01", "2024-03-01", freq="D")
    selected = select_horizon_training_data(
        make_feature_frame(dates),
        forecast_date=pd.Timestamp("2024-03-01"),
        horizon=1,
        min_samples=1,
    )

    assert "2023-02-29" not in selected.metadata["selected_anchor_dates"]
    assert "2023-02-29" not in selected.metadata["missing_dates"]


def test_year_boundary_window_maps_december_to_previous_historical_year():
    dates = pd.date_range("2020-12-01", "2024-01-10", freq="D")
    mapped = build_calendar_window_dates(pd.Timestamp("2024-01-10"), window_days=30)
    selected = select_horizon_training_data(
        make_feature_frame(dates),
        forecast_date=pd.Timestamp("2024-01-10"),
        horizon=1,
        min_samples=1,
    )

    assert mapped[0] == pd.Timestamp("2023-12-12")
    assert "2022-12-12" in selected.metadata["selected_anchor_dates"]


def test_insufficient_samples_reports_horizon_and_season():
    dates = pd.date_range("2024-01-01", "2024-01-10", freq="D")
    with pytest.raises(InsufficientTrainingDataError, match=r"horizon=3.*season"):
        select_horizon_training_data(
            make_feature_frame(dates),
            forecast_date=pd.Timestamp("2024-01-10"),
            horizon=3,
            min_samples=30,
        )

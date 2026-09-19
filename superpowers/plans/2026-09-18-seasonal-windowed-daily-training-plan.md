# Seasonal Windowed Daily Training Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current single multi-output daily SVR with seven horizon-specific SVR models trained only on the corresponding 30-day calendar windows and matching target seasons.

**Architecture:** Keep feature engineering and the daily API contract stable, but add a focused training-data selector that returns `X_h`, `y_h`, and metadata for each horizon. Train and validate one scalar-output SVR pipeline per horizon, then save all seven models and their metrics in one atomically written bundle that `DailyPredictor` loads and calls by horizon.

**Tech Stack:** Python 3.10+, pandas, NumPy, scikit-learn (`Pipeline`, `SVR`, `GridSearchCV`, `TimeSeriesSplit`, `TransformedTargetRegressor`), joblib, pytest.

## Global Constraints

- Use the existing Vietnamese season mapping: Xuân = February-April, Hạ = May-July, Thu = August-October, Đông = November-January.
- Use `[D - 29 days, D]` and the same calendar interval in each available historical year; do not replace missing calendar dates with the nearest available row.
- Filter by `season(t + h) == season(target_date(h))`, where `t` is the historical anchor date.
- Train seven independent one-output models; do not use the intersection of all seven horizon datasets.
- Preserve the existing daily API response shape and do not change the hourly pipeline.
- Do not fall back silently to all history, another season, a larger window, or a partial seven-model bundle.
- Keep feature construction causal: features at anchor `t` may use data through `t` only; `t+h` is the label.
- Use a configurable minimum sample count. The initial implementation recommendation is `DAILY_MIN_TRAIN_SAMPLES = 30`, with `TimeSeriesSplit` using no more folds than the available chronological samples support.
- Do not save or replace the production model file until all seven horizons train, validate, and produce complete metadata successfully.

---

## File and Responsibility Map

- Create `ml-service/app/training/SVR/daily_training_data.py`: pure calendar-window and season-aware sample selection, validation, and metadata.
- Modify `ml-service/app/core/config.py`: add the 30-day window and minimum-sample configuration.
- Modify `ml-service/app/training/SVR/train_svr_daily.py`: scalar-output pipeline, per-horizon training/evaluation, bundle assembly, and atomic persistence.
- Modify `ml-service/app/services/daily_predictor.py`: load the seven-model bundle and predict with `d_1` through `d_7`.
- Modify `ml-service/README.md`: document seven horizon-specific models and the selected-data policy.
- Create `ml-service/tests/test_daily_training_data.py`: selector tests for windows, seasons, missing dates, leap years, and leakage-related boundaries.
- Create `ml-service/tests/test_daily_training_bundle.py`: bundle/predictor contract and all-or-nothing failure tests.

## Task 1: Add configuration and the pure training-data selector

**Files:**
- Create: `ml-service/app/training/SVR/daily_training_data.py`
- Modify: `ml-service/app/core/config.py`
- Test: `ml-service/tests/test_daily_training_data.py`

**Interfaces:**
- Consumes: a feature DataFrame indexed by `DatetimeIndex`, `D`, `h`, and the existing `get_season_name`.
- Produces: `select_horizon_training_data(df, forecast_date, horizon, window_days=30, min_samples=30) -> HorizonTrainingData`, where `HorizonTrainingData` contains `X`, `y`, and serializable `metadata`.
- Produces: `build_calendar_window_dates(anchor_date, window_days=30) -> list[pd.Timestamp]`.

- [ ] **Step 1: Write failing tests for calendar-window selection**

Create a synthetic daily frame spanning multiple years. Assert that the selector includes `[D-29, D]`, includes the same month/day interval for each historical year, excludes dates outside that interval, and returns no substitute for a missing date.

```python
def test_calendar_window_is_30_dates_per_year_without_nearest_fill():
    forecast_date = pd.Timestamp("2024-03-10")
    dates = pd.date_range("2022-02-01", "2024-03-10", freq="D")
    dates = dates[dates != pd.Timestamp("2023-02-15")]
    df = make_feature_frame(dates)

    selected = select_horizon_training_data(
        df, forecast_date=forecast_date, horizon=1, min_samples=1
    )

    assert "2023-02-15" not in selected.metadata["selected_anchor_dates"]
    assert selected.metadata["window_days"] == 30
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run from `ml-service`:

```powershell
python -m pytest tests/test_daily_training_data.py -q
```

Expected: FAIL because the selector and result type do not exist.

- [ ] **Step 3: Implement the selector and configuration**

Add constants:

```python
DAILY_TRAIN_WINDOW_DAYS = 30
DAILY_MIN_TRAIN_SAMPLES = 30
```

Implement a typed result object and a selector that:

1. Builds exact month/day candidates for `D-29` through `D` in every available year.
2. Skips invalid dates such as February 29 in non-leap years.
3. Computes `target_history_date = anchor_date + horizon days`.
4. Keeps only rows whose target season matches `get_season_name(forecast_date.month)`.
5. Requires complete feature and target values.
6. Records candidate count, season-filtered count, missing-date count, selected years, target date, target season, and selected anchor dates.
7. Raises a specific `InsufficientTrainingDataError` containing the horizon, target date, season, actual count, and configured minimum when the result is too small.

- [ ] **Step 4: Add tests for season filtering and boundary dates**

Add `test_filter_uses_target_history_season_not_anchor_season` and assert that an anchor from one season is excluded when `anchor + horizon` belongs to a different season than the forecast target. Add `test_forecast_week_crossing_season_builds_different_target_seasons` and assert that selectors for the two horizons report different target seasons. Add `test_february_29_is_skipped_for_non_leap_years` and assert that no invalid timestamp is generated. Add `test_insufficient_samples_reports_horizon_and_season` and assert that `InsufficientTrainingDataError` includes the horizon number, target date, season, actual sample count, and minimum.

- [ ] **Step 5: Run the selector test suite**

Run:

```powershell
python -m pytest tests/test_daily_training_data.py -q
```

Expected: PASS with all selector tests passing.

- [ ] **Step 6: Commit the selector**

```powershell
git add app/core/config.py app/training/SVR/daily_training_data.py tests/test_daily_training_data.py
git commit -m "feat: add seasonal daily training data selector"
```

## Task 2: Refactor daily training into seven scalar-output models

**Files:**
- Modify: `ml-service/app/training/SVR/train_svr_daily.py`
- Test: `ml-service/tests/test_daily_training_bundle.py`

**Interfaces:**
- Consumes: `build_daily_features`, `select_horizon_training_data`, `DAILY_HORIZON`, `DAILY_MIN_TRAIN_SAMPLES`, and `SVR_DAILY_MODEL_PATH`.
- Produces: `build_pipeline() -> TransformedTargetRegressor` for one scalar target.
- Produces: `train_horizon(df, forecast_date, horizon) -> HorizonTrainingResult`.
- Produces: `train_from_frame(df, forecast_date) -> dict` for deterministic tests and the production `train()` wrapper.
- Produces: bundle keys `models`, `feature_columns`, `target_columns`, `horizon`, `window_days`, `last_data_date`, `training_metadata`, `metrics`, `trained_at`.

- [ ] **Step 1: Write failing tests for the bundle contract**

Mock the selector and estimator so the test does not require a real database or parquet file. Assert that seven distinct model keys are created, each result has one target, and the bundle contains per-horizon metrics and sample metadata.

```python
def test_train_builds_one_model_for_each_horizon(monkeypatch):
    dates = pd.date_range("2020-01-01", "2024-12-31", freq="D")
    bundle = train_from_frame(make_feature_frame(dates), forecast_date=pd.Timestamp("2024-06-30"))

    assert set(bundle["models"]) == {f"d_{h}" for h in range(1, 8)}
    assert set(bundle["metrics"]) == {f"d_{h}" for h in range(1, 8)}
    assert all(item["train_samples"] >= 30 for item in bundle["training_metadata"].values())
```

- [ ] **Step 2: Run the test and verify it fails**

Run:

```powershell
python -m pytest tests/test_daily_training_bundle.py::test_train_builds_one_model_for_each_horizon -q
```

Expected: FAIL because the current trainer returns one `model` key and uses `MultiOutputRegressor`.

- [ ] **Step 3: Implement scalar pipeline and horizon training**

Remove `MultiOutputRegressor` from the daily trainer. Keep the existing scaler/target-transform/SVR parameter grid, changing the parameter paths to the scalar pipeline. For each horizon:

1. Call the selector.
2. Sort selected rows by anchor date.
3. Create a chronological train/test split without shuffling.
4. Choose `n_splits = min(5, len(X_train) - 1)` and raise `InsufficientTrainingDataError` if fewer than 2 splits are possible.
5. Run `GridSearchCV` with `TimeSeriesSplit`.
6. Compute MAE and RMSE for that horizon.
7. Fit a final scalar pipeline using the selected horizon data and the best parameters.
8. Return the model, feature columns, best parameters, metrics, and selector metadata.

Do not call `GridSearchCV` on a combined seven-target frame.

- [ ] **Step 4: Implement all-or-nothing bundle creation**

Build all seven horizon results in memory first. If any selector, split, grid search, or final fit raises, propagate an explicit error including the horizon and target date. Only after all seven results succeed, construct the bundle and write it to a temporary file in the model directory, then replace `SVR_DAILY_MODEL_PATH` with `Path.replace`.

- [ ] **Step 5: Add tests for failure behavior and leakage boundaries**

Add `test_failed_horizon_does_not_replace_existing_model_file` and compare the existing file bytes before and after a forced horizon failure. Add `test_each_horizon_receives_only_its_own_selected_rows` and inspect the selector calls for distinct horizon datasets. Add `test_training_uses_chronological_split_without_shuffle` and assert that the last training date precedes the first test date. Add `test_bundle_has_no_partial_model_keys_after_failure` and assert that the failing call raises before any replacement write.

- [ ] **Step 6: Run the focused trainer tests**

Run:

```powershell
python -m pytest tests/test_daily_training_bundle.py -q
```

Expected: PASS with seven-model and failure-atomicity tests passing.

- [ ] **Step 7: Commit the trainer refactor**

```powershell
git add app/training/SVR/train_svr_daily.py tests/test_daily_training_bundle.py
git commit -m "feat: train daily SVR per forecast horizon"
```

## Task 3: Update the daily predictor for the seven-model bundle

**Files:**
- Modify: `ml-service/app/services/daily_predictor.py`
- Test: `ml-service/tests/test_daily_training_bundle.py`

**Interfaces:**
- Consumes: bundle key `models[d_h]`, shared `feature_columns`, and `target_columns`.
- Produces: the existing `DailyForecastResponse` with exactly seven `DailyForecastPoint` values.

- [ ] **Step 1: Write failing predictor tests**

Mock `joblib.load`, parquet loading, and seven model objects. Assert that model `d_h` is called for forecast day `D+h`, that output order is `d_1` through `d_7`, and that the response schema remains unchanged.

```python
def test_predictor_calls_models_in_horizon_order(monkeypatch):
    response = DailyPredictor().predict()

    assert len(response.forecast) == 7
    assert [point.date for point in response.forecast] == expected_dates
    assert called_models == [f"d_{h}" for h in range(1, 8)]
```

- [ ] **Step 2: Run the test and verify it fails**

Run:

```powershell
python -m pytest tests/test_daily_training_bundle.py::test_predictor_calls_models_in_horizon_order -q
```

Expected: FAIL because the predictor currently reads the single `model` key.

- [ ] **Step 3: Implement bundle validation and per-horizon prediction**

At initialization, require all seven `d_h` keys and raise `ValueError` listing missing keys. In `predict`, reuse the existing latest-feature-row logic, call the matching scalar model for each horizon, convert each output with `aqi_to_level`, and preserve `DailyForecastResponse`.

- [ ] **Step 4: Add missing-model and response tests**

Add `test_predictor_rejects_bundle_missing_one_horizon` and assert that the error names the missing `d_h` key. Add `test_predictor_preserves_existing_daily_response_shape` and assert that the response has seven dated points and the same `city`, `algo`, `generated_at`, `horizon_days`, `date`, `aqi`, and `level` fields as before.

- [ ] **Step 5: Run predictor tests**

Run:

```powershell
python -m pytest tests/test_daily_training_bundle.py -q
```

Expected: PASS.

- [ ] **Step 6: Commit the predictor update**

```powershell
git add app/services/daily_predictor.py tests/test_daily_training_bundle.py
git commit -m "feat: predict daily forecast with horizon models"
```

## Task 4: Update documentation and integration checks

**Files:**
- Modify: `ml-service/README.md`
- Test: `ml-service/tests/test_daily_training_data.py`
- Test: `ml-service/tests/test_daily_training_bundle.py`

- [ ] **Step 1: Update the ML service documentation**

Replace the description of one multi-output daily model with:

- Seven scalar SVR models, `d_1` through `d_7`.
- Exact 30-day calendar-window selection.
- Matching target-season filtering.
- No cross-season or all-history fallback.
- Bundle validation and failure behavior.
- Per-horizon metrics and sample counts.

- [ ] **Step 2: Add end-to-end fixture coverage**

Use a deterministic synthetic frame containing:

- A date range spanning at least three years.
- A summer-to-autumn forecast boundary.
- A February 29 in one source year.
- One missing feature row and one missing target row.

Assert selected dates, season labels, sample counts, and seven-model bundle metadata.

- [ ] **Step 3: Run all targeted tests**

Run:

```powershell
python -m pytest tests/test_daily_training_data.py tests/test_daily_training_bundle.py -q
```

Expected: PASS with no partial bundle, season mismatch, leap-year, or response-contract failures.

- [ ] **Step 4: Run syntax and import validation**

Run:

```powershell
python -m compileall app
python -c "from app.training.SVR.daily_training_data import select_horizon_training_data; from app.training.SVR.train_svr_daily import build_pipeline; from app.services.daily_predictor import DailyPredictor; print('imports ok')"
```

Expected: compilation succeeds and the import command prints `imports ok`.

- [ ] **Step 5: Review the final diff and working tree**

Run:

```powershell
git diff --check
git status --short
git --no-pager diff HEAD~4..HEAD --stat
```

Confirm only the planned training, predictor, configuration, tests, and documentation files changed.

- [ ] **Step 6: Commit documentation and integration coverage**

```powershell
git add README.md tests/test_daily_training_data.py tests/test_daily_training_bundle.py
git commit -m "docs: document seasonal daily training policy"
```

## Verification Checklist

- [ ] Every horizon `d_1` through `d_7` has an independent scalar SVR.
- [ ] Every selected anchor is in an exact 30-day calendar window for the current or corresponding historical year.
- [ ] Every selected target history date has the forecast target's season.
- [ ] Missing calendar dates are skipped rather than nearest-filled.
- [ ] February 29 behavior is deterministic.
- [ ] Feature construction remains causal and does not use future AQI.
- [ ] A failed horizon cannot replace a valid production bundle.
- [ ] Predictor returns the existing seven-point daily response.
- [ ] Per-horizon sample counts, seasons, params, MAE, and RMSE are persisted.
- [ ] Hourly training and API behavior remain unchanged.

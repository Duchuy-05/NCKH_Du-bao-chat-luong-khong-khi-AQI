"""
Train seven horizon-specific SVR models for the daily AQI forecast.

Run:
    cd ml-service
    python -m app.training.SVR.train_svr_daily
"""
from __future__ import annotations

import json
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd
from sklearn.compose import TransformedTargetRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error
from sklearn.model_selection import GridSearchCV, TimeSeriesSplit
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.svm import SVR

from app.core.config import (
    CLEAN_DAILY_PATH,
    DAILY_HORIZON,
    DAILY_MIN_TRAIN_SAMPLES,
    DAILY_TRAIN_WINDOW_DAYS,
    SVR_DAILY_MODEL_PATH,
)
from app.features.daily_features import build_daily_features
from app.training.SVR.daily_training_data import (
    HorizonTrainingData,
    InsufficientTrainingDataError,
    select_horizon_training_data,
)

TARGET_COLS = [f"d_{h}" for h in range(1, DAILY_HORIZON + 1)]

PARAM_GRID = {
    "regressor__svr__kernel": ["rbf"],
    "regressor__svr__C": [1, 5, 10, 50, 100],
    "regressor__svr__epsilon": [0.01, 0.05, 0.1, 0.2],
    "regressor__svr__gamma": ["scale", "auto", 0.001, 0.01, 0.1],
}


def build_pipeline() -> TransformedTargetRegressor:
    inner_pipeline = Pipeline([
        ("scaler", StandardScaler()),
        ("svr", SVR()),
    ])
    return TransformedTargetRegressor(
        regressor=inner_pipeline,
        transformer=StandardScaler(),
    )


def evaluate(y_true: pd.Series, y_pred: np.ndarray) -> dict[str, float]:
    return {
        "mae": round(float(mean_absolute_error(y_true, y_pred)), 3),
        "rmse": round(float(np.sqrt(mean_squared_error(y_true, y_pred))), 3),
    }


def _split_chronologically(
    X: pd.DataFrame,
    y: pd.Series,
) -> tuple[pd.DataFrame, pd.DataFrame, pd.Series, pd.Series]:
    split_idx = int(len(X) * 0.85)
    if split_idx < 2 or split_idx >= len(X):
        raise ValueError(f"Cannot create chronological train/test split for {len(X)} rows")
    return X.iloc[:split_idx], X.iloc[split_idx:], y.iloc[:split_idx], y.iloc[split_idx:]


def train_horizon(
    df: pd.DataFrame,
    forecast_date: pd.Timestamp,
    horizon: int,
) -> dict[str, Any]:
    """Train and evaluate one scalar-output horizon model."""
    selected: HorizonTrainingData = select_horizon_training_data(
        df,
        forecast_date=forecast_date,
        horizon=horizon,
        window_days=DAILY_TRAIN_WINDOW_DAYS,
        min_samples=DAILY_MIN_TRAIN_SAMPLES,
    )
    X = selected.X.sort_index()
    y = selected.y.loc[X.index]
    X_train, X_test, y_train, y_test = _split_chronologically(X, y)

    n_splits = min(5, len(X_train) - 1)
    if n_splits < 2:
        raise InsufficientTrainingDataError(
            f"horizon={horizon} cannot use TimeSeriesSplit with {len(X_train)} train samples"
        )

    grid = GridSearchCV(
        build_pipeline(),
        PARAM_GRID,
        cv=TimeSeriesSplit(n_splits=n_splits),
        scoring="neg_mean_absolute_error",
        n_jobs=-1,
    )
    grid.fit(X_train, y_train)

    y_pred = grid.best_estimator_.predict(X_test)
    metrics = evaluate(y_test, y_pred)
    final_model = build_pipeline().set_params(**grid.best_params_)
    final_model.fit(X, y)

    metadata = dict(selected.metadata)
    metadata.update({
        "train_samples": len(X_train),
        "test_samples": len(X_test),
        "total_samples": len(X),
        "train_start": X_train.index.min().date().isoformat(),
        "train_end": X_train.index.max().date().isoformat(),
        "test_start": X_test.index.min().date().isoformat(),
        "test_end": X_test.index.max().date().isoformat(),
    })
    return {
        "model": final_model,
        "feature_columns": list(X.columns),
        "best_params": grid.best_params_,
        "metrics": metrics,
        "metadata": metadata,
    }


def build_forecast(
    models: dict[str, Any],
    X_latest: pd.DataFrame,
    last_date: pd.Timestamp,
) -> list[dict[str, Any]]:
    forecast_rows = []
    for horizon in range(1, DAILY_HORIZON + 1):
        value = models[f"d_{horizon}"].predict(X_latest)[0]
        forecast_rows.append({
            "date": (last_date + pd.Timedelta(days=horizon)).strftime("%Y-%m-%d"),
            "aqi_predicted": round(float(value), 1),
        })
    return forecast_rows


def train_from_frame(
    df: pd.DataFrame,
    forecast_date: pd.Timestamp | None = None,
) -> dict[str, Any]:
    """Train all seven models in memory without replacing the production bundle."""
    if not isinstance(df.index, pd.DatetimeIndex):
        raise TypeError("df must have a DatetimeIndex")
    frame = df.sort_index()
    last_date = pd.Timestamp(forecast_date or frame.index.max()).normalize()
    results: dict[str, dict[str, Any]] = {}

    for horizon in range(1, DAILY_HORIZON + 1):
        try:
            results[f"d_{horizon}"] = train_horizon(frame, last_date, horizon)
        except Exception as exc:
            raise RuntimeError(
                f"Failed to train horizon d_{horizon} for "
                f"{(last_date + pd.Timedelta(days=horizon)).date()}: {exc}"
            ) from exc

    models = {key: result["model"] for key, result in results.items()}
    feature_columns = results["d_1"]["feature_columns"]
    bundle: dict[str, Any] = {
        "models": models,
        "feature_columns": feature_columns,
        "target_columns": TARGET_COLS,
        "horizon": DAILY_HORIZON,
        "window_days": DAILY_TRAIN_WINDOW_DAYS,
        "last_data_date": last_date.isoformat(),
        "training_metadata": {
            key: result["metadata"] for key, result in results.items()
        },
        "metrics": {key: result["metrics"] for key, result in results.items()},
        "best_params": {key: result["best_params"] for key, result in results.items()},
        "trained_at": datetime.now(timezone.utc).isoformat(),
    }
    latest = frame.loc[[frame.index.max()], feature_columns].astype(float)
    bundle["forecast"] = build_forecast(models, latest, last_date)
    return bundle


def _save_bundle_atomically(bundle: dict[str, Any]) -> None:
    SVR_DAILY_MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(
        dir=SVR_DAILY_MODEL_PATH.parent,
        prefix=f"{SVR_DAILY_MODEL_PATH.stem}.",
        suffix=".tmp",
        delete=False,
    ) as temporary:
        temporary_path = Path(temporary.name)
    try:
        joblib.dump(bundle, temporary_path)
        temporary_path.replace(SVR_DAILY_MODEL_PATH)
    finally:
        if temporary_path.exists():
            temporary_path.unlink()


def train() -> None:
    df = build_daily_features(save=True)
    clean_df = pd.read_parquet(CLEAN_DAILY_PATH).sort_index()
    last_date = clean_df.index.max()
    print(f"[train_svr_daily] Last data date: {last_date.date()}")
    bundle = train_from_frame(df, forecast_date=last_date)
    print("[train_svr_daily] Metrics:", json.dumps(bundle["metrics"], indent=2, ensure_ascii=False))
    print(
        f"[train_svr_daily] Forecast next {DAILY_HORIZON} days "
        f"(from {last_date.date()}):"
    )
    print(json.dumps(bundle["forecast"], indent=2, ensure_ascii=False))
    _save_bundle_atomically(bundle)
    print(f"[train_svr_daily] Saved model -> {SVR_DAILY_MODEL_PATH}")


if __name__ == "__main__":
    train()

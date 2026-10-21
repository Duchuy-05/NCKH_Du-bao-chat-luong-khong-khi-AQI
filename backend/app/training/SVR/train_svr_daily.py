"""
Train seven horizon-specific SVR models for the daily AQI forecast.

Run:
    cd backend
    python -m app.training.SVR.train_svr_daily
"""
from __future__ import annotations

import argparse
import json
import tempfile
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any
from uuid import uuid4

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
    CITY,
    DAILY_HORIZON,
    DAILY_MIN_TRAIN_SAMPLES,
    DAILY_TRAIN_WINDOW_DAYS,
    SVR_DAILY_MODEL_PATH,
    city_daily_model_path,
)
from app.features.daily_features import build_daily_features
from app.training.SVR.daily_training_data import (
    HorizonTrainingData,
    InsufficientTrainingDataError,
    select_horizon_training_data,
)
from app.services.training_runs import (
    complete_training_run,
    fail_training_run,
    start_training_run,
    update_training_run_context,
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


def train_from_frame(
    df: pd.DataFrame,
    forecast_date: pd.Timestamp | None = None,
    city_code: str = CITY,
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
        "aqi_standard": "VN_AQI_QD_1459_2019",
        "city": city_code,
        "data_source": "processed_postgresql_v1",
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
    return bundle


def _save_bundle_atomically(
    bundle: dict[str, Any],
    model_path: Path | None = None,
) -> None:
    if model_path is None:
        model_path = city_daily_model_path(
            str(bundle.get("city", CITY)),
            bundle.get("last_data_date", date.today().isoformat()),
            str(bundle.get("run_code") or uuid4()),
        )
    model_path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(
        dir=model_path.parent,
        prefix=f"{model_path.stem}.",
        suffix=".tmp",
        delete=False,
    ) as temporary:
        temporary_path = Path(temporary.name)
    try:
        joblib.dump(bundle, temporary_path)
        temporary_path.replace(model_path)
    finally:
        if temporary_path.exists():
            temporary_path.unlink()


def train(city_code: str = CITY) -> dict[str, Any]:
    run_code = start_training_run(
        city_code,
        "daily",
        "app.training.SVR.train_svr_daily",
    )
    last_date = None
    model_path = None
    try:
        df = build_daily_features(save=True, city_code=city_code)
        if df.empty:
            raise ValueError(f"Không có dòng daily đủ dữ liệu để huấn luyện cho {city_code}.")
        last_date = df.index.max()
        print(f"[train_svr_daily] Last data date: {last_date.date()}")
        model_path = city_daily_model_path(
            city_code,
            last_date.date(),
            run_code,
        )
        update_training_run_context(run_code, last_date.date(), model_path.name)

        bundle = train_from_frame(df, forecast_date=last_date, city_code=city_code)
        print("[train_svr_daily] Metrics:", json.dumps(bundle["metrics"], indent=2, ensure_ascii=False))
        _save_bundle_atomically(bundle, model_path)
        complete_training_run(
            run_code,
            last_date.date(),
            bundle["metrics"],
            bundle["best_params"],
            model_path.name,
        )
        print(f"[train_svr_daily] Saved model -> {model_path}")
        return {
            "run_code": run_code,
            "model_path": str(model_path),
            "metrics": bundle["metrics"],
            "trained_at": bundle["trained_at"],
        }
    except Exception as exc:
        try:
            fail_training_run(
                run_code,
                str(exc),
                last_date.date() if last_date is not None else None,
                model_path.name if model_path is not None else None,
            )
        except Exception as tracking_error:
            print(f"[train_svr_daily] Could not update failed run status: {tracking_error}")
        raise


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Huấn luyện SVR AQI ngày từ PostgreSQL.")
    parser.add_argument("--city", choices=("hanoi", "haiphong", "danang", "hochiminh", "cantho"), default=CITY)
    train(parser.parse_args().city)

"""
Train svr_hourly (Luồng B, 24 mốc hourly kế tiếp)

Chạy:
    cd backend
    python -m app.training.SVR.train_svr_hourly
"""
from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone

import joblib
import numpy as np
import pandas as pd
from sklearn.base import clone
from sklearn.compose import TransformedTargetRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error
from sklearn.model_selection import ParameterSampler, TimeSeriesSplit
from sklearn.multioutput import MultiOutputRegressor
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.svm import SVR

from app.core.config import (
    CITY,
    HOURLY_HORIZON,
    HOURLY_TRAIN_WINDOW_DAYS,
    STEP_HOURS,
    city_hourly_model_path,
)
from app.data.loaders.db_loader import load_hourly_training_data
from app.features.hourly_features import (
    TARGET_COLS_HOURLY,
    build_hourly_features,
)
from app.services.training_runs import (
    complete_training_run,
    fail_training_run,
    start_training_run,
    update_training_run_context,
)

PARAM_GRID = {
    "regressor__svr__estimator__kernel": ["rbf"],
    "regressor__svr__estimator__C": [1, 5, 10, 50, 100],
    "regressor__svr__estimator__epsilon": [0.01, 0.05, 0.1, 0.2],
    "regressor__svr__estimator__gamma": ["scale", "auto", 0.001, 0.01],
}
PARAM_SEARCH_ITERATIONS = 40
PARAM_SEARCH_RANDOM_STATE = 42


def build_pipeline() -> TransformedTargetRegressor:
    inner_pipeline = Pipeline([
        ("scaler", StandardScaler()),
        ("svr", MultiOutputRegressor(SVR())),
    ])
    return TransformedTargetRegressor(
        regressor=inner_pipeline,
        transformer=StandardScaler(),
    )


def _fit_and_score_cv_fold(
    candidate_index: int,
    params: dict,
    split_index: int,
    train_indices: np.ndarray,
    validation_indices: np.ndarray,
    pipeline: TransformedTargetRegressor,
    X: pd.DataFrame,
    y: pd.DataFrame,
) -> tuple[int, int, float]:
    """Fit one parameter candidate on one chronological CV fold."""
    model = clone(pipeline).set_params(**params)
    model.fit(X.iloc[train_indices], y.iloc[train_indices])
    predictions = model.predict(X.iloc[validation_indices])
    score = -mean_absolute_error(y.iloc[validation_indices], predictions)
    return candidate_index, split_index, float(score)


def evaluate(y_true: pd.DataFrame, y_pred: np.ndarray, target_cols: list[str]) -> dict:
    metrics = {}
    for i, col in enumerate(target_cols):
        mae = mean_absolute_error(y_true[col], y_pred[:, i])
        rmse = np.sqrt(mean_squared_error(y_true[col], y_pred[:, i]))
        metrics[col] = {"mae": round(float(mae), 3), "rmse": round(float(rmse), 3)}
    metrics["overall"] = {
        "mae": round(float(mean_absolute_error(y_true.values, y_pred)), 3),
        "rmse": round(float(np.sqrt(mean_squared_error(y_true.values, y_pred))), 3),
    }
    return metrics


def _train_hourly(city_code: str, run_code: str):
    # Build features from the full database history first, so 1y/2y lag columns
    # remain available for the recent training window.
    df = build_hourly_features(save=True, city_code=city_code)

    # Hourly model serves AQI only: fit one output for each horizon h+1..h+24.
    target_cols = TARGET_COLS_HOURLY
    df = df.dropna(subset=target_cols)
    if df.empty:
        raise ValueError(f"Không có mẫu hourly đầy đủ để huấn luyện cho {city_code}.")

    latest_sample_time = df.index.max()
    window_start = latest_sample_time - pd.Timedelta(days=HOURLY_TRAIN_WINDOW_DAYS)
    df = df.loc[df.index > window_start].copy()
    if df.empty:
        raise ValueError(
            f"Không có mẫu hourly trong cửa sổ {HOURLY_TRAIN_WINDOW_DAYS} ngày "
            f"cho {city_code}."
        )
    window_end = df.index.max()
    print(
        f"[train_svr_hourly] Cửa sổ mẫu: {df.index.min()} đến {window_end}; "
        f"{len(df)} mẫu ({HOURLY_TRAIN_WINDOW_DAYS} ngày gần nhất)",
        flush=True,
    )

    non_features = set(
        target_cols
        + ["dominant_pollutant", "level", "city_id", "station_id", "station_name", "time", "id"]
    )
    feature_cols = [c for c in df.columns if c not in non_features and pd.api.types.is_numeric_dtype(df[c])]

    X = df[feature_cols].astype(float)
    y = df[target_cols].astype(float)

    history = load_hourly_training_data(city_code).sort_index()
    last_time = history.index.max()
    model_path = city_hourly_model_path(city_code, last_time.date(), run_code)
    print(f"[train_svr_hourly] Mốc thời gian cuối cùng trong DB: {last_time}")
    update_training_run_context(run_code, last_time.date(), model_path.name)

    split_idx = int(len(df) * 0.85)
    gap_steps = HOURLY_HORIZON * STEP_HOURS
    train_end_idx = split_idx - gap_steps
    if train_end_idx <= 0 or split_idx >= len(df):
        raise ValueError(
            f"Không đủ {len(df)} mẫu hourly để chia train/test với khoảng cách "
            f"{gap_steps} giờ."
        )
    X_train, X_test = X.iloc[:train_end_idx], X.iloc[split_idx:]
    y_train, y_test = y.iloc[:train_end_idx], y.iloc[split_idx:]

    tscv = TimeSeriesSplit(n_splits=5, gap=gap_steps)
    pipeline = build_pipeline()

    # Sample a fixed, reproducible half of the 80 possible combinations.
    param_candidates = list(ParameterSampler(
        PARAM_GRID,
        n_iter=PARAM_SEARCH_ITERATIONS,
        random_state=PARAM_SEARCH_RANDOM_STATE,
    ))
    cv_splits = list(tscv.split(X_train))
    total_cv_fits = len(param_candidates) * len(cv_splits)
    candidate_scores: list[list[float]] = [[] for _ in param_candidates]

    print(
        f"[train_svr_hourly] Bắt đầu kiểm định: 0/{total_cv_fits} folds "
        f"({len(param_candidates)} tổ hợp × {len(cv_splits)} folds)",
        flush=True,
    )

    completed_cv_fits = 0
    cv_results = joblib.Parallel(
        n_jobs=-1,
        pre_dispatch="2*n_jobs",
        batch_size=1,
        return_as="generator_unordered",
    )(
        joblib.delayed(_fit_and_score_cv_fold)(
            candidate_index,
            params,
            split_index,
            train_indices,
            validation_indices,
            pipeline,
            X_train,
            y_train,
        )
        for candidate_index, params in enumerate(param_candidates)
        for split_index, (train_indices, validation_indices) in enumerate(cv_splits)
    )

    for candidate_index, _split_index, score in cv_results:
        candidate_scores[candidate_index].append(score)
        completed_cv_fits += 1
        percentage = completed_cv_fits / total_cv_fits * 100
        print(
            f"[train_svr_hourly] CV progress: {completed_cv_fits}/{total_cv_fits} "
            f"folds ({percentage:.1f}%)",
            flush=True,
        )

    mean_scores = np.asarray([np.mean(scores) for scores in candidate_scores])
    best_candidate_index = int(np.argmax(mean_scores))
    best_params = param_candidates[best_candidate_index]
    best_cv_score = float(mean_scores[best_candidate_index])

    print(f"[train_svr_hourly] Best params: {best_params}")
    print(f"[train_svr_hourly] Best CV MAE: {-best_cv_score:.3f}")

    best_model = build_pipeline().set_params(**best_params)
    best_model.fit(X_train, y_train)
    y_pred_test = best_model.predict(X_test)
    test_metrics = evaluate(y_test, y_pred_test, target_cols)
    print(
        "[train_svr_hourly] Test MAE/RMSE theo từng giờ dự báo:",
        json.dumps(test_metrics, indent=2, ensure_ascii=False),
    )

    final_model = build_pipeline().set_params(**best_params)
    final_model.fit(X, y)

    model_path.parent.mkdir(parents=True, exist_ok=True)
    trained_at = datetime.now(timezone.utc).isoformat()
    joblib.dump(
        {
            "model": final_model,
            "feature_columns": feature_cols,
            "target_columns": target_cols,
            "aqi_target_columns": TARGET_COLS_HOURLY,
            "horizon_steps": HOURLY_HORIZON,
            "step_hours": STEP_HOURS,
            "aqi_standard": "VN_AQI_QD_1459_2019",
            "city": city_code,
            "data_source": "processed_postgresql_v1",
            "prediction_target": "vn_aqi",
            "training_window_days": HOURLY_TRAIN_WINDOW_DAYS,
            "training_window_start": df.index.min().isoformat(),
            "training_window_end": window_end.isoformat(),
            "validation_gap_steps": gap_steps,
            "trained_at": trained_at,
            "best_params": best_params,
            "test_metrics": test_metrics,
            "last_data_time": last_time.isoformat(),
        },
        model_path,
    )
    complete_training_run(
        run_code,
        last_time.date(),
        test_metrics,
        best_params,
        model_path.name,
    )
    print(f"[train_svr_hourly] Saved model -> {model_path}")
    return {
        "run_code": run_code,
        "model_path": str(model_path),
        "metrics": test_metrics,
        "trained_at": trained_at,
    }


def train(city_code: str = CITY):
    run_code = start_training_run(
        city_code,
        "hourly",
        "app.training.SVR.train_svr_hourly",
    )
    try:
        return _train_hourly(city_code, run_code)
    except Exception as exc:
        try:
            fail_training_run(run_code, str(exc))
        except Exception as tracking_error:
            print(f"[train_svr_hourly] Could not update failed run status: {tracking_error}")
        raise


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Huấn luyện SVR AQI giờ từ PostgreSQL.")
    parser.add_argument("--city", choices=("hanoi", "haiphong", "danang", "hochiminh", "cantho"), default=CITY)
    train(parser.parse_args().city)

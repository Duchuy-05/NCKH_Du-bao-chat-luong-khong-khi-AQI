"""
GIAI ĐOẠN 2 — Train svr_daily (Luồng A, 7 ngày tới, 1 điểm/ngày)

Chạy:
    cd ml-service
    python -m app.training.train_svr_daily
"""
from __future__ import annotations

import json
from datetime import datetime, timezone

import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import mean_absolute_error, mean_squared_error
from sklearn.model_selection import GridSearchCV, TimeSeriesSplit
from sklearn.multioutput import MultiOutputRegressor
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.svm import SVR

from app.core.config import DAILY_HORIZON, SVR_DAILY_MODEL_PATH
from app.features.daily_features import build_daily_features

TARGET_COLS = [f"d_{h}" for h in range(1, DAILY_HORIZON + 1)]

# Lưới tham số nhỏ gọn — SVR khá nhạy với C/epsilon/gamma, không cần quá rộng
PARAM_GRID = {
    "svr__estimator__kernel": ["rbf"],
    "svr__estimator__C": [1, 10, 50, 100],
    "svr__estimator__epsilon": [0.1, 0.5, 1.0],
    "svr__estimator__gamma": ["scale", 0.01, 0.1],
}


def build_pipeline() -> Pipeline:
    return Pipeline([
        ("scaler", StandardScaler()),
        ("svr", MultiOutputRegressor(SVR())),
    ])


def evaluate(y_true: pd.DataFrame, y_pred: np.ndarray) -> dict:
    metrics = {}
    for i, col in enumerate(TARGET_COLS):
        mae = mean_absolute_error(y_true[col], y_pred[:, i])
        rmse = np.sqrt(mean_squared_error(y_true[col], y_pred[:, i]))
        metrics[col] = {"mae": round(float(mae), 3), "rmse": round(float(rmse), 3)}
    metrics["overall"] = {
        "mae": round(float(mean_absolute_error(y_true.values, y_pred)), 3),
        "rmse": round(float(np.sqrt(mean_squared_error(y_true.values, y_pred))), 3),
    }
    return metrics


def train():
    df = build_daily_features(save=True)
    feature_cols = [c for c in df.columns if c not in TARGET_COLS]

    X = df[feature_cols]
    y = df[TARGET_COLS]

    # Time-based split: 85% train (theo thời gian), 15% cuối để test giữ nguyên thứ tự
    split_idx = int(len(df) * 0.85)
    X_train, X_test = X.iloc[:split_idx], X.iloc[split_idx:]
    y_train, y_test = y.iloc[:split_idx], y.iloc[split_idx:]

    tscv = TimeSeriesSplit(n_splits=5)
    pipeline = build_pipeline()

    grid = GridSearchCV(
        pipeline,
        PARAM_GRID,
        cv=tscv,
        scoring="neg_mean_absolute_error",
        n_jobs=-1,
    )
    grid.fit(X_train, y_train)

    print(f"[train_svr_daily] Best params: {grid.best_params_}")
    print(f"[train_svr_daily] Best CV MAE: {-grid.best_score_:.3f}")

    best_model = grid.best_estimator_
    y_pred_test = best_model.predict(X_test)
    test_metrics = evaluate(y_test, y_pred_test)
    print("[train_svr_daily] Test metrics:", json.dumps(test_metrics, indent=2))

    # Fit lại trên toàn bộ dữ liệu (train+test) với best params để dùng cho production
    final_model = build_pipeline().set_params(**grid.best_params_)
    final_model.fit(X, y)

    SVR_DAILY_MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(
        {
            "model": final_model,
            "feature_columns": feature_cols,
            "target_columns": TARGET_COLS,
            "trained_at": datetime.now(timezone.utc).isoformat(),
            "best_params": grid.best_params_,
            "test_metrics": test_metrics,
        },
        SVR_DAILY_MODEL_PATH,
    )
    print(f"[train_svr_daily] Saved model -> {SVR_DAILY_MODEL_PATH}")


if __name__ == "__main__":
    train()
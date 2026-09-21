"""
GIAI ĐOẠN 2 — Train svr_hourly (Luồng B, 24h tới, 8 bước nhảy 3h)

Chạy:
    cd ml-service
    python -m app.training.SVR.train_svr_hourly
"""
from __future__ import annotations

import json
from datetime import datetime, timezone

import joblib
import numpy as np
import pandas as pd
from sklearn.compose import TransformedTargetRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error
from sklearn.model_selection import GridSearchCV, TimeSeriesSplit
from sklearn.multioutput import MultiOutputRegressor
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.svm import SVR

from app.core.config import HOURLY_HORIZON, SVR_HOURLY_MODEL_PATH
from app.data.aqi import BREAKPOINTS, _sub_index
from app.features.hourly_features import TARGET_COLS_HOURLY, build_hourly_features

# Các chất ô nhiễm dùng để tính AQI (khớp app/data/aqi.py)
POLLUTANT_COLS = list(BREAKPOINTS.keys())  # ['pm2_5', 'pm10', 'so2', 'no2', 'o3', 'co']
STEP_HOURS = 3  # mỗi bước target cách nhau 3h

PARAM_GRID = {
    "regressor__svr__estimator__kernel": ["rbf"],
    "regressor__svr__estimator__C": [1, 5, 10, 50, 100],
    "regressor__svr__estimator__epsilon": [0.01, 0.05, 0.1, 0.2],
    "regressor__svr__estimator__gamma": ["scale", "auto", 0.001, 0.01],
}


def build_pipeline() -> TransformedTargetRegressor:
    inner_pipeline = Pipeline([
        ("scaler", StandardScaler()),
        ("svr", MultiOutputRegressor(SVR())),
    ])
    return TransformedTargetRegressor(
        regressor=inner_pipeline,
        transformer=StandardScaler(),
    )


def add_pollutant_targets(df: pd.DataFrame) -> tuple[pd.DataFrame, list[str], list[str]]:
    """
    Tạo thêm các cột target dự báo nồng độ từng chất ô nhiễm cho h_1..h_8,
    song song với target AQI gốc. Chỉ tạo cho những chất thực sự có mặt
    trong df (an toàn nếu build_hourly_features chưa giữ lại cột nồng độ).
    """
    df = df.copy()
    pollutant_cols_present = [c for c in POLLUTANT_COLS if c in df.columns]
    pollutant_target_cols: list[str] = []

    n_steps = len(TARGET_COLS_HOURLY)
    for col in pollutant_cols_present:
        for h in range(1, n_steps + 1):
            tcol = f"{col}_h{h}"
            df[tcol] = df[col].shift(-h)
            pollutant_target_cols.append(tcol)

    if not pollutant_cols_present:
        print(
            "[train_svr_hourly] CẢNH BÁO: không tìm thấy cột nồng độ nào "
            f"({POLLUTANT_COLS}) trong build_hourly_features(). "
            "Bỏ qua phần dự báo nồng độ — chỉ train AQI như cũ. "
            "Cần sửa app/features/hourly_features.py để giữ lại các cột này."
        )

    return df, pollutant_cols_present, pollutant_target_cols


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


def build_forecast(
    final_model,
    X: pd.DataFrame,
    all_target_cols: list[str],
    pollutant_cols_present: list[str],
    last_time: pd.Timestamp,
) -> list[dict]:
    """
    Dùng dòng dữ liệu MỚI NHẤT (mốc thời gian cuối cùng thực sự có trong DB)
    để dự báo các bước 3h TIẾP THEO mốc đó — không phải giờ bất kỳ đã có sẵn.
    """
    X_last = X.iloc[[-1]]
    y_pred_last = final_model.predict(X_last)[0]

    forecast_rows = []
    for h in range(1, len(TARGET_COLS_HOURLY) + 1):
        forecast_time = last_time + pd.Timedelta(hours=STEP_HOURS * h)

        aqi_col = TARGET_COLS_HOURLY[h - 1]
        aqi_pred_direct = float(y_pred_last[all_target_cols.index(aqi_col)])

        pollutant_values = {}
        for col in pollutant_cols_present:
            tcol = f"{col}_h{h}"
            idx = all_target_cols.index(tcol)
            pollutant_values[col] = float(y_pred_last[idx])

        aqi_from_conc = None
        dominant = None
        if pollutant_values:
            sub_indices = {
                col: _sub_index(val, BREAKPOINTS[col])
                for col, val in pollutant_values.items()
            }
            sub_indices = {k: v for k, v in sub_indices.items() if v is not None}
            if sub_indices:
                dominant = max(sub_indices, key=sub_indices.get)
                aqi_from_conc = sub_indices[dominant]

        row = {
            "time": forecast_time.strftime("%Y-%m-%d %H:%M"),
            "step": f"t+{STEP_HOURS * h}h",
            "aqi_predicted_direct": round(aqi_pred_direct, 1),
            "aqi_from_concentration": round(aqi_from_conc, 1) if aqi_from_conc is not None else None,
            "dominant_pollutant": dominant,
        }
        row.update({f"{k}_forecast": round(v, 2) for k, v in pollutant_values.items()})
        forecast_rows.append(row)

    return forecast_rows


def train():
    df = build_hourly_features(save=True)

    df, pollutant_cols_present, pollutant_target_cols = add_pollutant_targets(df)
    all_target_cols = TARGET_COLS_HOURLY + pollutant_target_cols

    df = df.dropna(subset=all_target_cols)

    non_features = set(
        all_target_cols
        + ["dominant_pollutant", "level", "city_id", "station_id", "station_name", "time", "id"]
    )
    feature_cols = [c for c in df.columns if c not in non_features and pd.api.types.is_numeric_dtype(df[c])]

    X = df[feature_cols].astype(float)
    y = df[all_target_cols].astype(float)

    last_time = df.index.max()
    print(f"[train_svr_hourly] Mốc thời gian cuối cùng trong DB: {last_time}")

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

    print(f"[train_svr_hourly] Best params: {grid.best_params_}")
    print(f"[train_svr_hourly] Best CV MAE: {-grid.best_score_:.3f}")

    best_model = grid.best_estimator_
    y_pred_test = best_model.predict(X_test)
    test_metrics = evaluate(y_test, y_pred_test, all_target_cols)
    print("[train_svr_hourly] Test metrics:", json.dumps(test_metrics, indent=2, ensure_ascii=False))

    final_model = build_pipeline().set_params(**grid.best_params_)
    final_model.fit(X, y)

    forecast_rows = build_forecast(
        final_model, X, all_target_cols, pollutant_cols_present, last_time
    )
    print(f"[train_svr_hourly] Dự báo 24h tiếp theo (từ {last_time}):")
    print(json.dumps(forecast_rows, indent=2, ensure_ascii=False))

    SVR_HOURLY_MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(
        {
            "model": final_model,
            "feature_columns": feature_cols,
            "target_columns": all_target_cols,
            "aqi_target_columns": TARGET_COLS_HOURLY,
            "pollutant_columns": pollutant_cols_present,
            "trained_at": datetime.now(timezone.utc).isoformat(),
            "best_params": grid.best_params_,
            "test_metrics": test_metrics,
            "last_data_time": last_time.isoformat(),
            "forecast": forecast_rows,
        },
        SVR_HOURLY_MODEL_PATH,
    )
    print(f"[train_svr_hourly] Saved model -> {SVR_HOURLY_MODEL_PATH}")


if __name__ == "__main__":
    train()
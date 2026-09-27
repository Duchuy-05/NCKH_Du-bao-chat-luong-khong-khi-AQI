"""
Đánh giá mô hình GPR (AQI hoặc pollutants) trên tập test chưa từng thấy.

Tách dữ liệu theo THỜI GIAN: phần SỚM train, phần MỚI test — mô hình
không thấy các dòng test lúc fit. Tính RMSE, MAE, R², nRMSE.

Chạy:
    cd ml-service
    python -m app.training.GPR.evaluate_gpr
    python -m app.training.GPR.evaluate_gpr --target aqi --train-ratio 0.85
"""
from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Sequence

import numpy as np
import pandas as pd
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

from app.algorithms.gpr.gpr_model import GPRModel
from app.algorithms.gpr.model_artifact import POLLUTANT_FEATURE_COLUMNS
from app.core.config import CITY, STATION_NAME, MODELS_DIR
from app.data.loaders.adapter import prepare_gpr_dataframe
from app.data.loaders.db_loader import load_pollutants, load_weather
from app.training.GPR.train_gpr_aqi import (
    add_aqi_column_vn,
    aqi_to_level,
    build_training_pairs,
    resolve_raw_feature_columns,
)


EVAL_OUTPUT_DIR = MODELS_DIR / "evaluations"


def compute_metrics(y_true: np.ndarray, y_pred: np.ndarray) -> dict[str, float]:
    """Tính các chỉ số đánh giá cho một cột target."""
    rmse = float(np.sqrt(mean_squared_error(y_true, y_pred)))
    mae = float(mean_absolute_error(y_true, y_pred))
    r2 = float(r2_score(y_true, y_pred))
    std_true = float(np.std(y_true))
    nrmse = rmse / std_true if std_true > 0 else float("inf")
    # MAPE (avoid div by zero)
    nonzero = np.abs(y_true) > 1e-8
    if nonzero.sum() > 0:
        mape = float(np.mean(np.abs((y_true[nonzero] - y_pred[nonzero]) / y_true[nonzero])) * 100)
    else:
        mape = float("inf")

    return {
        "rmse": round(rmse, 4),
        "mae": round(mae, 4),
        "r2": round(r2, 4),
        "nrmse": round(nrmse, 4),
        "mape_percent": round(mape, 2),
    }


def evaluate(
    target: str = "aqi",
    train_ratio: float = 0.8,
    max_train_size: int = 1000,
    recent_ratio: float = 0.7,
    horizon_steps: int = 1,
    n_restarts_optimizer: int = 3,
    random_state: int = 42,
) -> dict:
    """Đánh giá GPR trên tập test theo thời gian.

    Parameters
    ----------
    target : "aqi" hoặc "pollutants"
    train_ratio : Tỷ lệ dữ liệu dùng cho train (phần sớm nhất)

    Returns
    -------
    dict chứa metrics, train/test info, và preview dự đoán
    """
    print("=" * 60)
    print(f"[evaluate_gpr] Đánh giá GPR — target: {target}")
    print("=" * 60)

    # 1. Load và chuẩn bị dữ liệu
    print("[1/4] Tải dữ liệu...")
    df_pol = load_pollutants()
    df_wea = load_weather()
    frame, warnings = prepare_gpr_dataframe(
        df_pol, df_wea, city_id=CITY, city_name=STATION_NAME,
    )

    if target == "aqi":
        frame = add_aqi_column_vn(frame)
        target_columns: tuple[str, ...] = ("aqi",)
    else:
        target_columns = POLLUTANT_FEATURE_COLUMNS

    raw_feature_columns = resolve_raw_feature_columns(frame)
    feature_frame, target_frame, timestamps, pair_info = build_training_pairs(
        frame, "time", raw_feature_columns, target_columns, horizon_steps,
    )
    print(f"  Dòng hợp lệ: {len(feature_frame)}")

    # 2. Tách train/test theo thời gian
    print(f"[2/4] Tách train/test (ratio={train_ratio})...")
    split_idx = int(len(feature_frame) * train_ratio)
    if split_idx < 2 or split_idx >= len(feature_frame):
        raise ValueError(f"Không đủ dữ liệu để tách train/test ({len(feature_frame)} dòng)")

    X_train = feature_frame.iloc[:split_idx].to_numpy()
    X_test = feature_frame.iloc[split_idx:].to_numpy()
    y_train = target_frame.iloc[:split_idx]
    y_test = target_frame.iloc[split_idx:]
    ts_train = timestamps[:split_idx]
    print(f"  Train: {len(X_train)} dòng, Test: {len(X_test)} dòng")

    # 3. Huấn luyện trên train, dự đoán trên test
    print("[3/4] Huấn luyện và dự đoán...")
    estimator = GPRModel(
        max_train_size=max_train_size,
        recent_ratio=recent_ratio,
        random_state=random_state,
        n_restarts_optimizer=n_restarts_optimizer,
        n_jobs=1,
        inner_n_threads=1,
    )
    y_train_np = y_train.iloc[:, 0].to_numpy() if len(target_columns) == 1 else y_train.to_numpy()
    estimator.fit(X_train, y_train_np, timestamps=ts_train)

    y_pred_mean, y_pred_std = estimator.predict(X_test, return_std=True)
    y_pred_mean = np.atleast_2d(y_pred_mean) if y_pred_mean.ndim == 1 else y_pred_mean
    if y_pred_mean.ndim == 1:
        y_pred_mean = y_pred_mean.reshape(-1, 1)

    # 4. Tính metrics
    print("[4/4] Tính metrics...")
    metrics_per_target = {}
    for i, col in enumerate(target_columns):
        y_true_col = y_test.iloc[:, i].to_numpy()
        y_pred_col = y_pred_mean[:, i] if y_pred_mean.ndim == 2 else y_pred_mean
        metrics_per_target[col] = compute_metrics(y_true_col, y_pred_col)

    # Macro average
    if len(target_columns) > 1:
        macro = {}
        for key in metrics_per_target[target_columns[0]]:
            values = [metrics_per_target[col][key] for col in target_columns]
            macro[key] = round(float(np.mean(values)), 4)
        metrics_per_target["macro_average"] = macro

    # Preview (đầu + cuối test)
    preview_count = min(3, len(X_test))
    preview = []
    for idx in list(range(preview_count)) + list(range(max(0, len(X_test) - preview_count), len(X_test))):
        entry = {"test_index": idx}
        for i, col in enumerate(target_columns):
            pred_val = float(y_pred_mean[idx, i]) if y_pred_mean.ndim == 2 else float(y_pred_mean[idx])
            entry[f"{col}_actual"] = round(float(y_test.iloc[idx, i]), 2)
            entry[f"{col}_predicted"] = round(pred_val, 2)
        preview.append(entry)

    # Lưu kết quả
    EVAL_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    ts_str = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    output_path = EVAL_OUTPUT_DIR / f"eval_gpr_{target}__{ts_str}.json"

    result = {
        "target": target,
        "target_columns": list(target_columns),
        "aqi_standard": "Breakpoint Việt Nam (QCVN)" if target == "aqi" else None,
        "train_ratio": train_ratio,
        "train_samples": len(X_train),
        "test_samples": len(X_test),
        "max_train_size": max_train_size,
        "horizon_steps": horizon_steps,
        "metrics": metrics_per_target,
        "kernel_params": estimator.get_kernel_params(),
        "prediction_preview": preview,
        "evaluated_at_utc": datetime.now(timezone.utc).isoformat(),
    }
    output_path.write_text(
        json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8",
    )

    # In kết quả
    print("\n" + "=" * 60)
    print("📊 Kết quả đánh giá:")
    for col, m in metrics_per_target.items():
        print(f"\n  {col}:")
        for k, v in m.items():
            print(f"    {k}: {v}")
    print(f"\n  Kết quả đã lưu: {output_path}")
    print("=" * 60)

    return result


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Đánh giá GPR trên tập test")
    parser.add_argument("--target", choices=("aqi", "pollutants"), default="aqi")
    parser.add_argument("--train-ratio", type=float, default=0.8)
    parser.add_argument("--max-train-size", type=int, default=1000)
    parser.add_argument("--recent-ratio", type=float, default=0.7)
    parser.add_argument("--horizon-steps", type=int, default=1)
    parser.add_argument("--n-restarts-optimizer", type=int, default=3)
    parser.add_argument("--random-state", type=int, default=42)
    return parser


if __name__ == "__main__":
    parser = build_parser()
    args = parser.parse_args()
    evaluate(
        target=args.target,
        train_ratio=args.train_ratio,
        max_train_size=args.max_train_size,
        recent_ratio=args.recent_ratio,
        horizon_steps=args.horizon_steps,
        n_restarts_optimizer=args.n_restarts_optimizer,
        random_state=args.random_state,
    )

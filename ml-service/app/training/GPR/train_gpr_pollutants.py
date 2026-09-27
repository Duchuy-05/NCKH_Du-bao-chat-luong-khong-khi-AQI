"""
Huấn luyện GPR với target = 6 chất ô nhiễm (multi-output).

Khác với train_gpr_aqi.py (target = AQI đơn), file này huấn luyện GPR
dự đoán đồng thời 6 nồng độ ô nhiễm: PM2.5, PM10, CO, NO2, SO2, O3
ở bước thời gian kế tiếp.

Chạy:
    cd ml-service
    python -m app.training.GPR.train_gpr_pollutants
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

from app.algorithms.gpr.gpr_model import GPRModel
from app.algorithms.gpr.model_artifact import (
    CityGPRArtifact,
    POLLUTANT_FEATURE_COLUMNS,
    make_feature_frame,
)
from app.algorithms.gpr.training_selection import TRAINING_SELECTION_DESCRIPTION
from app.core.config import CITY, STATION_NAME, MODELS_DIR
from app.data.loaders.adapter import OPTIONAL_COLS_GPR, prepare_gpr_dataframe
from app.data.loaders.db_loader import load_pollutants, load_weather
from app.training.GPR.train_gpr_aqi import (
    INPUT_FEATURE_COLUMNS_GPR,
    build_training_pairs,
    resolve_raw_feature_columns,
)


GPR_POLLUTANTS_MODEL_PATH = MODELS_DIR / "gpr_pollutants.joblib"
GPR_POLLUTANTS_METADATA_PATH = MODELS_DIR / "gpr_pollutants.json"


def train(
    max_train_size: int = 1000,
    recent_ratio: float = 0.7,
    horizon_steps: int = 1,
    n_restarts_optimizer: int = 3,
    random_state: int = 42,
    n_jobs: int = 1,
    inner_n_threads: int = 1,
    overwrite: bool = True,
    output_path: Path | None = None,
) -> dict:
    """Huấn luyện GPR multi-output: dự đoán 6 chất ô nhiễm.

    Returns
    -------
    dict với keys: model_path, metadata_path, warnings
    """
    print("=" * 60)
    print("[train_gpr_pollutants] Huấn luyện GPR cho 6 chất ô nhiễm")
    print("=" * 60)

    # 1. Lấy dữ liệu từ PostgreSQL
    print("[1/6] Đang tải dữ liệu từ PostgreSQL...")
    df_pol = load_pollutants()
    df_wea = load_weather()
    print(f"  Pollutants: {df_pol.shape}, Weather: {df_wea.shape}")

    # 2. Merge và chuẩn hoá
    print("[2/6] Chuẩn hoá và merge dữ liệu...")
    frame, data_warnings = prepare_gpr_dataframe(
        df_pol, df_wea, city_id=CITY, city_name=STATION_NAME,
    )
    print(f"  Merged frame: {frame.shape}")

    if data_warnings:
        print("\n  ⚠️ Cảnh báo dữ liệu:")
        for w in data_warnings:
            print(f"    {w}")
        critical = [w for w in data_warnings if w.startswith("❌")]
        if critical:
            raise ValueError(
                "Dữ liệu thiếu cột bắt buộc.\n" + "\n".join(critical)
            )
        print()

    # 3. Resolve feature columns
    print("[3/6] Xác định feature columns...")
    raw_feature_columns = resolve_raw_feature_columns(frame)

    # 4. Build training pairs (target = 6 pollutants)
    target_columns = POLLUTANT_FEATURE_COLUMNS
    print(f"[4/6] Tạo training pairs cho {len(target_columns)} chất ô nhiễm...")
    feature_frame, target_frame, timestamps, pair_info = build_training_pairs(
        frame, "time", raw_feature_columns, target_columns, horizon_steps,
    )
    discarded = pair_info["rows_discarded_missing_values"] + pair_info["gap_rows_dropped"]
    print(f"  Dòng hợp lệ: {pair_info['rows_valid']}, loại bỏ: {discarded}")

    if len(feature_frame) < 2:
        raise ValueError("Cần ít nhất 2 dòng dữ liệu hợp lệ để huấn luyện.")

    # 5. Fit GPR model (multi-output)
    print(f"[5/6] Đang huấn luyện GPR multi-output ({len(target_columns)} outputs)...")
    estimator = GPRModel(
        max_train_size=max_train_size,
        recent_ratio=recent_ratio,
        random_state=random_state,
        n_restarts_optimizer=n_restarts_optimizer,
        n_jobs=n_jobs,
        inner_n_threads=inner_n_threads,
    )
    y = target_frame.to_numpy()
    estimator.fit(feature_frame.to_numpy(), y, timestamps=timestamps)
    rows_available = len(feature_frame)
    rows_used = int(estimator.n_training_samples_ or rows_available)
    print(f"  Đã fit GPR: {rows_used} mẫu")

    # 6. Lưu artifact
    print("[6/6] Lưu model artifact...")
    trained_at_utc = datetime.now(timezone.utc).isoformat()
    model_path = output_path or GPR_POLLUTANTS_MODEL_PATH
    metadata_path = model_path.with_suffix(".json")

    if model_path.exists() and not overwrite:
        raise FileExistsError(f"File đã tồn tại: {model_path}")

    model_path.parent.mkdir(parents=True, exist_ok=True)

    artifact = CityGPRArtifact(
        estimator=estimator,
        city_id=CITY,
        city_name=STATION_NAME,
        target_columns=target_columns,
        raw_feature_columns=raw_feature_columns,
        feature_columns=tuple(feature_frame.columns),
        time_column="time",
        backend="sklearn",
        trained_at_utc=trained_at_utc,
        rows_used=rows_used,
        forecast_horizon_steps=horizon_steps,
        median_interval_seconds=pair_info["median_interval_seconds"],
    )
    joblib.dump(artifact, model_path, compress=3)

    # Preview
    count = min(5, len(feature_frame))
    sample_mean, sample_std = estimator.predict(
        feature_frame.tail(count).to_numpy(), return_std=True,
    )
    sample_mean = np.atleast_2d(sample_mean)
    sample_std = np.atleast_2d(sample_std)
    preview = []
    for i in range(count):
        preview.append({
            "input_time": pd.Timestamp(timestamps[-count + i]).isoformat(),
            "prediction": {
                col: round(float(sample_mean[i, j]), 2)
                for j, col in enumerate(target_columns)
            },
            "std": {
                col: round(float(sample_std[i, j]), 2)
                for j, col in enumerate(target_columns)
            },
        })

    metadata = {
        "city_id": CITY,
        "city_name": STATION_NAME,
        "algorithm": "GPR (Gaussian Process Regression)",
        "purpose": "pollutant_prediction_model",
        "target_columns": list(target_columns),
        "input_feature_columns": list(raw_feature_columns),
        "feature_columns": list(feature_frame.columns),
        "rows_available": rows_available,
        "rows_used": rows_used,
        "rows_discarded": discarded,
        "training_sample_selection": TRAINING_SELECTION_DESCRIPTION,
        "forecast_horizon_steps": horizon_steps,
        "max_train_size": max_train_size,
        "trained_at_utc": trained_at_utc,
        "kernel_params": estimator.get_kernel_params(),
        "prediction_preview": preview,
        "artifact": model_path.name,
    }
    metadata_path.write_text(
        json.dumps(metadata, ensure_ascii=False, indent=2), encoding="utf-8",
    )

    print("\n" + "=" * 60)
    print(f"✅ Đã huấn luyện GPR Pollutants thành công!")
    print(f"  Target: {', '.join(target_columns)}")
    print(f"  Mẫu: {rows_used}/{rows_available} | Loại: {discarded}")
    print(f"  Model: {model_path}")
    print("=" * 60)

    return {
        "model_path": str(model_path),
        "metadata_path": str(metadata_path),
        "rows_used": rows_used,
        "warnings": data_warnings,
    }


if __name__ == "__main__":
    train()

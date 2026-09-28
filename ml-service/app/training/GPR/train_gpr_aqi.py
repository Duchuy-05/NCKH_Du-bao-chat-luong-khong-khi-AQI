"""
Huấn luyện GPR với target = AQI (breakpoint Việt Nam).

Luồng:
  1. Đọc dữ liệu pollutants + weather từ PostgreSQL
  2. Chuẩn hoá tên cột sang format GPR (adapter)
  3. Tính AQI theo breakpoint Việt Nam (app.data.aqi)
  4. Tạo feature frame (85 features: lag, rolling, trend, chu kỳ, gió u/v)
  5. Build training pairs: X(t) → AQI(t + horizon)
  6. Fit GPR model (scikit-learn)
  7. Lưu artifact .joblib + metadata .json

Chạy:
    cd ml-service
    python -m app.training.GPR.train_gpr_aqi
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Sequence

import joblib
import numpy as np
import pandas as pd

from app.algorithms.gpr.gpr_model import GPRModel
from app.algorithms.gpr.model_artifact import (
    CityGPRArtifact,
    POLLUTANT_FEATURE_COLUMNS,
    WIND_DIRECTION_COLUMN,
    make_feature_frame,
)
from app.algorithms.gpr.training_selection import TRAINING_SELECTION_DESCRIPTION
from app.core.config import (
    DATABASE_URL,
    CITY,
    STATION_NAME,
    MODELS_DIR,
)
from app.data.aqi import compute_aqi, LEVELS
from app.data.loaders.adapter import (
    ALL_REQUIRED_GPR_INPUT_COLS,
    OPTIONAL_COLS_GPR,
    prepare_gpr_dataframe,
    validate_data,
)
from app.data.loaders.db_loader import load_pollutants, load_weather


# =====================================================================
# Config
# =====================================================================

GPR_AQI_MODEL_PATH = MODELS_DIR / "gpr_aqi.joblib"
GPR_AQI_METADATA_PATH = MODELS_DIR / "gpr_aqi.json"

# Tên cột meteorological + pollutant cho GPR input (format GPR)
METEOROLOGICAL_COLUMNS_GPR = (
    "temperature_2m",
    "relative_humidity_2m",
    "wind_speed_10m",
    "surface_pressure",
    "precipitation",
)
INPUT_FEATURE_COLUMNS_GPR = METEOROLOGICAL_COLUMNS_GPR + POLLUTANT_FEATURE_COLUMNS


def aqi_to_level(aqi: float) -> str:
    """Phân loại AQI theo breakpoint Việt Nam."""
    for low, high, name in LEVELS:
        if low <= aqi <= high:
            return name
    return "Nguy hại"


# =====================================================================
# Hàm trợ giúp (tương tự ml_test/main.py nhưng dùng dữ liệu từ DB)
# =====================================================================

def resolve_raw_feature_columns(frame: pd.DataFrame) -> tuple[str, ...]:
    """Chọn cột gốc bắt buộc và bổ sung hướng gió nếu dataset có."""
    missing_features = set(INPUT_FEATURE_COLUMNS_GPR).difference(frame.columns)
    if missing_features:
        raise ValueError(
            "Thiếu cột đầu vào cần thiết: " + ", ".join(sorted(missing_features))
        )
    optional_columns = tuple(
        column for column in OPTIONAL_COLS_GPR if column in frame.columns
    )
    return INPUT_FEATURE_COLUMNS_GPR + optional_columns


def build_time_gap_mask(
    time_series: pd.Series, horizon_steps: int, tolerance_ratio: float = 0.25
) -> tuple[np.ndarray, dict[str, object]]:
    """Chỉ giữ lại cặp (t, t+horizon) mà khoảng cách thời gian thực tế khớp."""
    timestamps = pd.to_datetime(time_series).reset_index(drop=True)
    deltas = timestamps.diff().dropna()
    if deltas.empty:
        mask = np.ones(len(timestamps), dtype=bool)
        return mask, {"median_interval_seconds": None, "tolerance_seconds": None, "gap_rows_dropped": 0}

    median_interval = deltas.median()
    tolerance = median_interval * tolerance_ratio
    future_timestamps = timestamps.shift(-horizon_steps)
    expected_future_timestamps = timestamps + median_interval * horizon_steps
    diff = (future_timestamps - expected_future_timestamps).abs()
    mask = (diff <= tolerance).fillna(False).to_numpy()

    return mask, {
        "median_interval_seconds": median_interval.total_seconds(),
        "tolerance_seconds": tolerance.total_seconds(),
        "gap_rows_dropped": int((~mask).sum()),
    }


def build_training_pairs(
    frame: pd.DataFrame,
    time_column: str,
    raw_feature_columns: Sequence[str],
    target_columns: Sequence[str],
    horizon_steps: int,
) -> tuple[pd.DataFrame, pd.DataFrame, np.ndarray, dict[str, object]]:
    """Xây (feature_frame, target_frame dịch tới tương lai, timestamps)."""
    feature_frame = make_feature_frame(frame, raw_feature_columns, time_column)
    target_frame = frame.loc[:, list(target_columns)].apply(pd.to_numeric, errors="coerce")
    future_target_frame = target_frame.shift(-horizon_steps)

    nan_mask = ~(feature_frame.isna().any(axis=1) | future_target_frame.isna().any(axis=1))
    gap_mask, gap_info = build_time_gap_mask(frame[time_column], horizon_steps)
    gap_mask_series = pd.Series(gap_mask, index=frame.index)
    valid_rows = nan_mask & gap_mask_series

    gap_info["gap_rows_dropped"] = int((~gap_mask_series & nan_mask).sum())
    info = {
        "rows_available_before_filter": int(len(frame)),
        "rows_discarded_missing_values": int((~nan_mask).sum()),
        **gap_info,
        "rows_valid": int(valid_rows.sum()),
    }

    feature_frame = feature_frame.loc[valid_rows].reset_index(drop=True)
    target_frame = future_target_frame.loc[valid_rows].reset_index(drop=True)
    timestamps = frame.loc[valid_rows, time_column].to_numpy()
    return feature_frame, target_frame, timestamps, info


def add_aqi_column_vn(frame: pd.DataFrame) -> pd.DataFrame:
    """Tính AQI theo breakpoint Việt Nam dùng compute_aqi từ app.data.aqi.

    compute_aqi cần DatetimeIndex và các cột pollutant dưới dạng tên DB
    (pm2_5, pm10, so2, no2, co, o3). Vì frame đã rename sang tên GPR,
    ta cần tạm rename lại, tính AQI, rồi gán kết quả.
    """
    from app.data.loaders.adapter import GPR_TO_DB_COLUMN_MAP

    # Tạo bản copy với tên cột DB tạm thời
    temp = frame.copy()
    reverse_map = {v: k for k, v in GPR_TO_DB_COLUMN_MAP.items() if v in temp.columns}
    temp_renamed = temp.rename(columns=reverse_map)

    # compute_aqi cần DatetimeIndex
    if "time" in temp_renamed.columns:
        temp_renamed = temp_renamed.set_index(pd.to_datetime(temp_renamed["time"]))

    # Tính AQI
    temp_with_aqi = compute_aqi(temp_renamed)

    # Gán kết quả vào frame gốc
    frame = frame.copy()
    frame["aqi"] = temp_with_aqi["aqi"].values
    if "level" in temp_with_aqi.columns:
        frame["level"] = temp_with_aqi["level"].values
    if "dominant_pollutant" in temp_with_aqi.columns:
        frame["dominant_pollutant"] = temp_with_aqi["dominant_pollutant"].values

    return frame


# =====================================================================
# Training chính — Multi-horizon (Direct Multi-Step)
# =====================================================================

def train(
    max_train_size: int = 1000,
    recent_ratio: float = 0.7,
    horizon_days: int | None = None,
    n_restarts_optimizer: int = 3,
    random_state: int = 42,
    n_jobs: int = 1,
    inner_n_threads: int = 1,
    overwrite: bool = True,
    output_path: Path | None = None,
) -> dict:
    """Huấn luyện GPR multi-horizon với target = AQI (breakpoint Việt Nam).

    Train ``horizon_days`` model GPR riêng biệt (Direct Multi-Step),
    mỗi model dự đoán AQI cho 1 ngày cụ thể: d+1, d+2, ..., d+N.
    Chiến lược giống SVR Daily (7 model riêng cho 7 horizon).

    Parameters
    ----------
    horizon_days : int | None
        Số ngày dự báo. Mặc định dùng ``DAILY_HORIZON`` (7).

    Returns
    -------
    dict với keys: model_path, metadata_path, metrics, warnings
    """
    from app.core.config import DAILY_HORIZON

    n_horizons = horizon_days or DAILY_HORIZON

    print("=" * 60)
    print(f"[train_gpr_aqi] Bắt đầu huấn luyện GPR AQI — {n_horizons} horizon (d+1 → d+{n_horizons})")
    print("=" * 60)

    # 1. Lấy dữ liệu từ PostgreSQL
    print("[1/7] Đang tải dữ liệu từ PostgreSQL...")
    df_pol = load_pollutants()
    df_wea = load_weather()
    print(f"  Pollutants: {df_pol.shape}, Weather: {df_wea.shape}")

    # 2. Merge và chuẩn hoá tên cột
    print("[2/7] Chuẩn hoá tên cột và merge dữ liệu...")
    frame, data_warnings = prepare_gpr_dataframe(
        df_pol, df_wea,
        city_id=CITY,
        city_name=STATION_NAME,
    )
    print(f"  Merged frame: {frame.shape}")

    # Kiểm tra warnings
    if data_warnings:
        print("\n  ⚠️ Cảnh báo dữ liệu:")
        for w in data_warnings:
            print(f"    {w}")

        # Nếu thiếu cột bắt buộc → không thể tiếp tục
        critical = [w for w in data_warnings if w.startswith("❌")]
        if critical:
            raise ValueError(
                "Dữ liệu thiếu cột bắt buộc, không thể huấn luyện GPR. "
                "Vui lòng kiểm tra và bổ sung dữ liệu trong PostgreSQL.\n"
                + "\n".join(critical)
            )
        print()

    # 3. Tính AQI theo breakpoint Việt Nam
    print("[3/7] Tính AQI theo breakpoint Việt Nam...")
    frame = add_aqi_column_vn(frame)
    aqi_valid = frame["aqi"].notna().sum()
    aqi_nan = frame["aqi"].isna().sum()
    print(f"  AQI tính được: {aqi_valid} dòng hợp lệ, {aqi_nan} dòng thiếu.")

    # 4. Resolve feature columns
    print("[4/7] Xác định feature columns...")
    raw_feature_columns = resolve_raw_feature_columns(frame)
    print(f"  Raw feature columns: {len(raw_feature_columns)} cột")

    # 5–6. Train 1 GPR model cho mỗi horizon
    target_columns = ("aqi",)
    estimators: dict[int, GPRModel] = {}
    all_metrics: dict[str, dict] = {}
    all_pair_info: dict[int, dict] = {}
    shared_feature_columns: tuple[str, ...] | None = None

    for h in range(1, n_horizons + 1):
        print(f"\n[5/7] ━━━ Horizon d+{h} ━━━")
        print(f"  Tạo training pairs X(t) → AQI(t+{h})...")
        feature_frame, target_frame, timestamps, pair_info = build_training_pairs(
            frame, "time", raw_feature_columns, target_columns, horizon_steps=h,
        )
        discarded = pair_info["rows_discarded_missing_values"] + pair_info["gap_rows_dropped"]
        if pair_info["gap_rows_dropped"] > 0:
            print(
                f"  ⚠️ Loại {pair_info['gap_rows_dropped']} dòng do khoảng "
                "trống thời gian không khớp với horizon dự đoán."
            )
        print(f"  Dòng hợp lệ: {pair_info['rows_valid']}, loại bỏ: {discarded}")

        if len(feature_frame) < 2:
            raise ValueError(
                f"Horizon d+{h}: Cần ít nhất 2 dòng dữ liệu hợp lệ để huấn luyện. "
                "Vui lòng kiểm tra dữ liệu trong PostgreSQL."
            )

        # Đảm bảo tất cả horizon dùng cùng feature columns
        if shared_feature_columns is None:
            shared_feature_columns = tuple(feature_frame.columns)
        else:
            assert tuple(feature_frame.columns) == shared_feature_columns, (
                f"Feature columns không nhất quán giữa các horizon!"
            )

        print(f"  Đang huấn luyện GPR d+{h} (max_train_size={max_train_size})...")
        estimator = GPRModel(
            max_train_size=max_train_size,
            recent_ratio=recent_ratio,
            random_state=random_state,
            n_restarts_optimizer=n_restarts_optimizer,
            n_jobs=n_jobs,
            inner_n_threads=inner_n_threads,
        )
        y = target_frame.iloc[:, 0].to_numpy()
        estimator.fit(feature_frame.to_numpy(), y, timestamps=timestamps)
        rows_used = int(estimator.n_training_samples_ or len(feature_frame))
        print(f"  ✅ Đã fit GPR d+{h}: {rows_used} mẫu (từ {len(feature_frame)} dòng hợp lệ)")

        estimators[h] = estimator
        all_pair_info[h] = pair_info
        all_metrics[f"d+{h}"] = {
            "rows_available": len(feature_frame),
            "rows_used": rows_used,
            "rows_discarded": discarded,
        }

    # 7. Lưu artifact
    print(f"\n[7/7] Lưu model artifact ({n_horizons} models)...")
    trained_at_utc = datetime.now(timezone.utc).isoformat()
    model_path = output_path or GPR_AQI_MODEL_PATH
    metadata_path = model_path.with_suffix(".json")

    if model_path.exists() and not overwrite:
        raise FileExistsError(
            f"File đã tồn tại: {model_path}. Dùng overwrite=True để ghi đè."
        )

    model_path.parent.mkdir(parents=True, exist_ok=True)

    # Dùng median_interval_seconds từ horizon d+1 (đại diện)
    representative_pair_info = all_pair_info[1]
    total_rows_used = sum(
        int(est.n_training_samples_ or 0) for est in estimators.values()
    )

    artifact = CityGPRArtifact(
        estimator=estimators[1],  # d+1 là default (backward compat)
        estimators=estimators,    # dict {1: GPRModel, 2: GPRModel, ..., 7: GPRModel}
        city_id=CITY,
        city_name=STATION_NAME,
        target_columns=target_columns,
        raw_feature_columns=raw_feature_columns,
        feature_columns=shared_feature_columns,
        time_column="time",
        backend="sklearn",
        trained_at_utc=trained_at_utc,
        rows_used=total_rows_used,
        forecast_horizon_steps=n_horizons,
        median_interval_seconds=representative_pair_info["median_interval_seconds"],
    )
    joblib.dump(artifact, model_path, compress=3)

    # Vài dự đoán mẫu cuối cùng (dùng tất cả horizon)
    # Lấy feature frame từ horizon d+1 (dài nhất, nhiều valid rows nhất)
    last_feature_frame, _, last_timestamps, _ = build_training_pairs(
        frame, "time", raw_feature_columns, target_columns, horizon_steps=1,
    )
    count = min(3, len(last_feature_frame))
    preview: dict[str, list] = {}
    for h in range(1, n_horizons + 1):
        est = estimators[h]
        sample_mean, sample_std = est.predict(
            last_feature_frame.tail(count).to_numpy(), return_std=True,
        )
        sample_mean = np.atleast_1d(sample_mean)
        sample_std = np.atleast_1d(sample_std)
        horizon_preview = []
        for i in range(count):
            aqi_val = float(sample_mean[i])
            horizon_preview.append({
                "input_time": pd.Timestamp(last_timestamps[-count + i]).isoformat(),
                "aqi_prediction": round(aqi_val, 1),
                "aqi_std": round(float(sample_std[i]), 2),
                "level": aqi_to_level(aqi_val),
            })
        preview[f"d+{h}"] = horizon_preview

    metadata = {
        "city_id": CITY,
        "city_name": STATION_NAME,
        "algorithm": "GPR (Gaussian Process Regression) — Direct Multi-Step",
        "implementation": "app.algorithms.gpr.gpr_model.GPRModel",
        "purpose": "aqi_prediction_model",
        "aqi_standard": "Breakpoint Việt Nam (QCVN)",
        "strategy": f"Direct Multi-Step: {n_horizons} model GPR riêng (d+1 → d+{n_horizons})",
        "n_horizons": n_horizons,
        "target_columns": list(target_columns),
        "input_feature_columns": list(raw_feature_columns),
        "feature_columns": list(shared_feature_columns),
        "total_rows_used": total_rows_used,
        "horizon_metrics": all_metrics,
        "median_interval_seconds": representative_pair_info["median_interval_seconds"],
        "training_sample_selection": TRAINING_SELECTION_DESCRIPTION,
        "max_train_size": max_train_size,
        "recent_ratio": recent_ratio,
        "trained_at_utc": trained_at_utc,
        "kernel_params": {
            f"d+{h}": est.get_kernel_params() for h, est in estimators.items()
        },
        "prediction_preview": preview,
        "artifact": model_path.name,
    }
    metadata_path.write_text(
        json.dumps(metadata, ensure_ascii=False, indent=2), encoding="utf-8",
    )

    # In kết quả
    print("\n" + "=" * 60)
    print(f"✅ Đã huấn luyện GPR AQI Multi-Horizon thành công!")
    print(f"  Thành phố: {STATION_NAME} ({CITY})")
    print(f"  Target: AQI (breakpoint Việt Nam)")
    print(f"  Horizons: {n_horizons} models (d+1 → d+{n_horizons})")
    for h_key, h_metrics in all_metrics.items():
        print(f"    {h_key}: {h_metrics['rows_used']}/{h_metrics['rows_available']} mẫu dùng")
    print(f"  Model: {model_path}")
    print(f"  Metadata: {metadata_path}")
    print("\n  Dự đoán mẫu (cuối tập train):")
    for h_key, h_preview in preview.items():
        print(f"    --- {h_key} ---")
        for p in h_preview:
            print(f"      {p['input_time']}: AQI={p['aqi_prediction']} "
                  f"±{p['aqi_std']} → {p['level']}")
    print("=" * 60)

    return {
        "model_path": str(model_path),
        "metadata_path": str(metadata_path),
        "n_horizons": n_horizons,
        "horizon_metrics": all_metrics,
        "total_rows_used": total_rows_used,
        "warnings": data_warnings,
        "preview": preview,
    }


if __name__ == "__main__":
    train()


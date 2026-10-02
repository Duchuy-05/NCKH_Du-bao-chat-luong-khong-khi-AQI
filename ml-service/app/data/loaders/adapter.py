"""
Adapter chuẩn hoá tên cột giữa PostgreSQL (ml-service) và GPR (ml_test),
đồng thời kiểm tra tính đầy đủ / chất lượng dữ liệu trước khi huấn luyện.
"""
from __future__ import annotations

from typing import Optional

import numpy as np
import pandas as pd


# =====================================================================
# Ánh xạ tên cột: PostgreSQL (ml-service) → GPR format (ml_test)
# =====================================================================

# Tên cột trong PostgreSQL → tên cột mà GPR model_artifact.py kỳ vọng
DB_TO_GPR_COLUMN_MAP: dict[str, str] = {
    "co": "carbon_monoxide",
    "no2": "nitrogen_dioxide",
    "so2": "sulphur_dioxide",
    "o3": "ozone",
    "temperature": "temperature_2m",
    "humidity": "relative_humidity_2m",
    "wind_speed": "wind_speed_10m",
    "wind_direction": "wind_direction_10m",
    "pressure": "surface_pressure",
    # pm2_5, pm10, precipitation giữ nguyên tên
}

# Chiều ngược lại: GPR → PostgreSQL
GPR_TO_DB_COLUMN_MAP: dict[str, str] = {v: k for k, v in DB_TO_GPR_COLUMN_MAP.items()}

# Tên cột bắt buộc (dưới dạng tên DB) mà GPR cần để tạo feature
REQUIRED_POLLUTANT_COLS_DB = ["pm2_5", "pm10", "co", "no2", "so2", "o3"]
REQUIRED_WEATHER_COLS_DB = [
    "temperature", "humidity", "wind_speed", "pressure", "precipitation",
]
OPTIONAL_COLS_DB = ["wind_direction"]

# Tên cột GPR tương ứng
REQUIRED_POLLUTANT_COLS_GPR = [
    "pm2_5", "pm10", "carbon_monoxide", "nitrogen_dioxide",
    "sulphur_dioxide", "ozone",
]
REQUIRED_WEATHER_COLS_GPR = [
    "temperature_2m", "relative_humidity_2m", "wind_speed_10m",
    "surface_pressure", "precipitation",
]
OPTIONAL_COLS_GPR = ["wind_direction_10m"]

# Tất cả cột input GPR (bắt buộc)
ALL_REQUIRED_GPR_INPUT_COLS = tuple(REQUIRED_WEATHER_COLS_GPR + REQUIRED_POLLUTANT_COLS_GPR)

# Minimum history cần cho feature lag/rolling (168h hourly data)
MIN_HISTORY_HOURS = 168


# =====================================================================
# Chuyển đổi tên cột
# =====================================================================

def rename_db_to_gpr(df: pd.DataFrame) -> pd.DataFrame:
    """Đổi tên cột từ format PostgreSQL sang format GPR.

    Chỉ đổi các cột có trong mapping, giữ nguyên các cột khác.
    """
    rename_map = {
        old: new for old, new in DB_TO_GPR_COLUMN_MAP.items()
        if old in df.columns
    }
    return df.rename(columns=rename_map)


def rename_gpr_to_db(df: pd.DataFrame) -> pd.DataFrame:
    """Đổi tên cột từ format GPR sang format PostgreSQL."""
    rename_map = {
        old: new for old, new in GPR_TO_DB_COLUMN_MAP.items()
        if old in df.columns
    }
    return df.rename(columns=rename_map)


# =====================================================================
# Kiểm tra và xác thực dữ liệu
# =====================================================================

def check_required_columns(
    df: pd.DataFrame,
    use_gpr_names: bool = False,
) -> list[str]:
    """Kiểm tra các cột bắt buộc, trả về danh sách cột bị thiếu.

    Parameters
    ----------
    df : DataFrame đã được rename (hoặc chưa)
    use_gpr_names : True nếu df đã dùng tên GPR, False nếu còn tên DB
    """
    if use_gpr_names:
        required = REQUIRED_POLLUTANT_COLS_GPR + REQUIRED_WEATHER_COLS_GPR
    else:
        required = REQUIRED_POLLUTANT_COLS_DB + REQUIRED_WEATHER_COLS_DB
    return [col for col in required if col not in df.columns]


def detect_time_gaps(
    df: pd.DataFrame,
    time_column: str = "time",
    expected_interval_hours: Optional[float] = None,
    tolerance_ratio: float = 0.5,
) -> list[dict]:
    """Phát hiện các khoảng trống thời gian trong dữ liệu.

    Returns
    -------
    list[dict]: Mỗi phần tử chứa 'start', 'end', 'gap_hours' của gap.
    """
    if time_column not in df.columns and not isinstance(df.index, pd.DatetimeIndex):
        return []

    if time_column in df.columns:
        timestamps = pd.to_datetime(df[time_column]).sort_values()
    else:
        timestamps = pd.Series(df.index).sort_values()

    if len(timestamps) < 2:
        return []

    deltas = timestamps.diff().dropna()
    if expected_interval_hours is None:
        median_interval = deltas.median()
    else:
        median_interval = pd.Timedelta(hours=expected_interval_hours)

    tolerance = median_interval * (1 + tolerance_ratio)
    gaps = []

    for i, delta in enumerate(deltas):
        if delta > tolerance:
            gap_start = timestamps.iloc[i]
            gap_end = timestamps.iloc[i + 1] if (i + 1) < len(timestamps) else None
            gaps.append({
                "start": str(gap_start),
                "end": str(gap_end),
                "gap_hours": round(delta.total_seconds() / 3600, 1),
            })

    return gaps


def validate_data(
    df: pd.DataFrame,
    time_column: str = "time",
    min_history_hours: int = MIN_HISTORY_HOURS,
    use_gpr_names: bool = False,
) -> list[str]:
    """Kiểm tra dữ liệu và trả về danh sách cảnh báo/lỗi.

    Nếu danh sách rỗng → dữ liệu OK để huấn luyện.
    """
    warnings_list: list[str] = []

    # 1. Kiểm tra số dòng
    if len(df) < min_history_hours:
        warnings_list.append(
            f"⚠️ Dữ liệu chỉ có {len(df)} dòng, cần tối thiểu "
            f"{min_history_hours} dòng liên tiếp để tạo feature lịch sử cho GPR."
        )

    # 2. Kiểm tra cột thiếu
    missing_cols = check_required_columns(df, use_gpr_names=use_gpr_names)
    if missing_cols:
        warnings_list.append(
            f"❌ Thiếu cột bắt buộc: {', '.join(missing_cols)}"
        )

    # 3. Kiểm tra time gaps
    gaps = detect_time_gaps(df, time_column)
    if gaps:
        total_gap_hours = sum(g["gap_hours"] for g in gaps)
        warnings_list.append(
            f"⚠️ Phát hiện {len(gaps)} khoảng trống thời gian "
            f"(tổng ~{total_gap_hours:.0f}h). GPR có thể không tạo "
            "được feature lịch sử tại các vùng này."
        )

    # 4. Kiểm tra NaN ratio
    if use_gpr_names:
        value_cols = REQUIRED_POLLUTANT_COLS_GPR + REQUIRED_WEATHER_COLS_GPR
    else:
        value_cols = REQUIRED_POLLUTANT_COLS_DB + REQUIRED_WEATHER_COLS_DB
    available_value_cols = [c for c in value_cols if c in df.columns]
    if available_value_cols:
        nan_ratio = df[available_value_cols].isna().mean().mean()
        if nan_ratio > 0.3:
            warnings_list.append(
                f"⚠️ Tỷ lệ giá trị thiếu (NaN) trung bình: {nan_ratio:.1%}. "
                "Có thể ảnh hưởng đến chất lượng mô hình."
            )

    return warnings_list


# =====================================================================
# Pipeline chuẩn bị dữ liệu cho GPR
# =====================================================================

def prepare_gpr_dataframe(
    df_pollutants: pd.DataFrame,
    df_weather: pd.DataFrame,
    time_column: str = "time",
    city_id: str = "hanoi",
    city_name: str = "Hà Nội",
) -> tuple[pd.DataFrame, list[str]]:
    """Merge và chuẩn hoá dữ liệu từ PostgreSQL cho GPR training.

    Returns
    -------
    (DataFrame đã chuẩn hoá với tên cột GPR, danh sách warnings)
    """
    # Merge pollutants + weather trên cột time
    if time_column in df_pollutants.columns:
        df_pollutants = df_pollutants.set_index(time_column)
    if time_column in df_weather.columns:
        df_weather = df_weather.set_index(time_column)

    # Loại bỏ cột id/metadata bị trùng
    for col in ["id", "id_pol", "id_wea", "station_id", "created_at", "updated_at"]:
        if col in df_pollutants.columns:
            df_pollutants = df_pollutants.drop(columns=[col])
        if col in df_weather.columns:
            df_weather = df_weather.drop(columns=[col])

    df = df_pollutants.join(df_weather, how="inner", lsuffix="_pol", rsuffix="_wea")
    df.index = pd.to_datetime(df.index)
    df = df.sort_index().reset_index()
    df = df.rename(columns={"index": time_column})

    # Bỏ cột co2 nếu có (thường thiếu nhiều)
    if "co2" in df.columns:
        df = df.drop(columns=["co2"])

    # Đổi tên cột sang format GPR
    df = rename_db_to_gpr(df)

    # Thêm city_id, city_name cho CityGPRArtifact
    df.insert(0, "city_id", city_id)
    df.insert(1, "city_name", city_name)

    # Validate
    warnings_list = validate_data(df, time_column=time_column, use_gpr_names=True)

    return df, warnings_list

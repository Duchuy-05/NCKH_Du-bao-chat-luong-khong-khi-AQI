"""Data quality handling for hourly model inputs.

Pollutant observations are not interpolated or IQR-filtered before VN_AQI is
calculated. Missing pollutant hours therefore remain missing for the Nowcast
and daily completeness checks. Weather features may interpolate gaps up to
two hours; they do not affect the AQI calculation.
"""
from __future__ import annotations

import numpy as np
import pandas as pd

MAX_INTERP_GAP_STEPS = 2  # Tối đa 2 giờ liên tiếp, chỉ áp dụng cho thời tiết
IQR_MULTIPLIER = 3.0

# Cột lệch mạnh về 0 — loại khỏi lọc IQR theo tháng, xử lý riêng bằng ngưỡng vật lý
ZERO_INFLATED_COLUMNS = {"precipitation"}
CIRCULAR_COLUMNS = {"wind_direction"}

# Ngưỡng vật lý (lower, upper) cho các biến không phù hợp với IQR.
# precipitation: mm/giờ; wind_direction: độ, miền hợp lệ 0..360.
PHYSICAL_BOUNDS = {
    "precipitation": (0.0, 150.0),
    "wind_direction": (0.0, 360.0),
}


def interpolate_short_gaps(df: pd.DataFrame, columns: list[str]) -> pd.DataFrame:
    """Nội suy tuyến tính cho khoảng trống <= MAX_INTERP_GAP_STEPS bước."""
    df = df.copy()
    for col in columns:
        df[col] = df[col].interpolate(
            method="linear",
            limit=MAX_INTERP_GAP_STEPS,
            limit_area="inside",  # không ngoại suy ở đầu/cuối chuỗi
        )
    return df


def flag_remaining_missing(df: pd.DataFrame, columns: list[str]) -> pd.DataFrame:
    """Sau khi nội suy gap ngắn, đánh dấu các dòng còn thiếu (gap dài)."""
    df = df.copy()
    df["missing_flag"] = df[columns].isna().any(axis=1)
    return df


def remove_outliers_iqr_by_month(df: pd.DataFrame, columns: list[str]) -> pd.DataFrame:
    """
    Với mỗi cột, mỗi tháng: tính Q1/Q3 riêng, loại giá trị ngoài
    [Q1 - k*IQR, Q3 + k*IQR] bằng cách gán NaN (không xoá dòng, để giữ
    tính liên tục thời gian cho bước resample/feature sau này).

    KHÔNG áp dụng cho cột trong ZERO_INFLATED_COLUMNS — xem
    remove_outliers_physical_bounds() cho các cột đó.
    """
    df = df.copy()
    month_key = df.index.to_period("M")

    for col in columns:
        if col in ZERO_INFLATED_COLUMNS:
            continue
        for period, idx in df.groupby(month_key).groups.items():
            values = df.loc[idx, col]
            q1, q3 = values.quantile(0.25), values.quantile(0.75)
            iqr = q3 - q1
            if iqr == 0 or np.isnan(iqr):
                continue
            lower = q1 - IQR_MULTIPLIER * iqr
            upper = q3 + IQR_MULTIPLIER * iqr
            mask_outlier = (values < lower) | (values > upper)
            n_out = mask_outlier.sum()
            if n_out > 0:
                df.loc[idx[mask_outlier], col] = np.nan
                print(f"[quality] {col} - {period}: loại {n_out} outlier "
                      f"(ngoài [{lower:.1f}, {upper:.1f}])")
    return df


def remove_outliers_physical_bounds(df: pd.DataFrame, columns: list[str]) -> pd.DataFrame:
    """
    Lọc outlier bằng ngưỡng vật lý cố định (không phải thống kê phân vị) —
    dùng cho các cột trong ZERO_INFLATED_COLUMNS, nơi IQR theo tháng dễ
    loại nhầm giá trị thật do phân bố lệch mạnh về 0.
    """
    df = df.copy()
    for col in columns:
        if col not in PHYSICAL_BOUNDS:
            continue
        lower, upper = PHYSICAL_BOUNDS[col]
        mask_outlier = (df[col] < lower) | (df[col] > upper)
        n_out = mask_outlier.sum()
        if n_out > 0:
            df.loc[mask_outlier, col] = np.nan
            print(f"[quality] {col}: loại {n_out} outlier "
                  f"(ngoài [{lower}, {upper}], theo ngưỡng vật lý)")
    return df


def clean_dataset(
    df: pd.DataFrame,
    value_columns: list[str],
    pollutant_columns: list[str] | None = None,
) -> pd.DataFrame:
    """
    Pipeline làm sạch đầy đủ, thứ tự quan trọng:
    1. Loại outlier thời tiết (gán NaN); giữ nguyên các đỉnh ô nhiễm để AQI
       không bị giảm bởi bộ lọc thống kê chung.
    2. Nội suy tối đa hai giờ cho các biến thời tiết, không nội suy pollutant.
    3. Đánh missing_flag khi còn thiếu giá trị.
    """
    pollutant_columns = set(pollutant_columns or [])
    weather_columns = [c for c in value_columns if c not in pollutant_columns]
    bounded_columns = [c for c in weather_columns if c in PHYSICAL_BOUNDS]
    regular_columns = [
        c for c in weather_columns
        if c not in ZERO_INFLATED_COLUMNS and c not in CIRCULAR_COLUMNS
    ]

    df = remove_outliers_iqr_by_month(df, regular_columns)
    df = remove_outliers_physical_bounds(df, bounded_columns)
    # Negative pollutant concentrations are invalid; retain missing values so
    # they cannot be mistaken for measured values in hourly/daily VN_AQI.
    for col in pollutant_columns.intersection(df.columns):
        df[col] = pd.to_numeric(df[col], errors="coerce").where(lambda values: values >= 0)
    df = interpolate_short_gaps(df, weather_columns)
    df = flag_remaining_missing(df, value_columns)
    return df

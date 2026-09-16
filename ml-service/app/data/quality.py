"""
GIAI ĐOẠN 1 — Bước 3: Làm sạch dữ liệu (app/data/quality.py)

Lưới dữ liệu là 3h/bước, nên:
- Nội suy tuyến tính nếu khoảng trống <= 2 bước = 6h.
- Khoảng trống dài hơn 6h -> đánh missing_flag=True
- Loại outlier theo IQR tính riêng từng THÁNG, hệ số x3 (rộng hơn chuẩn 1.5
  vì dữ liệu ô nhiễm môi trường có đỉnh tự nhiên, x1.5 dễ loại nhầm giá trị thật).
- RIÊNG các cột lệch mạnh về 0 (zero-inflated, ví dụ precipitation): IQR
  không phù hợp — đa số giá trị = 0 khiến Q1≈Q3≈0, IQR≈0, ngưỡng lọc ra
  quá hẹp (chỉ 0.x mm) và loại nhầm chính các trận mưa thật. Các cột này
  được lọc theo NGƯỠNG VẬT LÝ cố định thay vì thống kê phân vị.
"""
from __future__ import annotations

import numpy as np
import pandas as pd

MAX_INTERP_GAP_STEPS = 2  # 2 bước x 3h = 6h
IQR_MULTIPLIER = 3.0

# Cột lệch mạnh về 0 — loại khỏi lọc IQR theo tháng, xử lý riêng bằng ngưỡng vật lý
ZERO_INFLATED_COLUMNS = {"precipitation"}

# Ngưỡng vật lý (lower, upper) cho các cột trong ZERO_INFLATED_COLUMNS.
# precipitation: đơn vị mm/3h. Chỉ loại giá trị âm (không hợp lệ vật lý)
# hoặc vượt xa mức mưa cực đoan từng ghi nhận (150mm/3h là ngưỡng rất
# rộng rãi cho Hà Nội, tránh loại nhầm mưa lớn thật).
PHYSICAL_BOUNDS = {
    "precipitation": (0.0, 150.0),
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


def clean_dataset(df: pd.DataFrame, value_columns: list[str]) -> pd.DataFrame:
    """
    Pipeline làm sạch đầy đủ, thứ tự quan trọng:
    1. Loại outlier trước (gán NaN) — để không lấy outlier làm điểm neo nội suy.
       - Cột thường: IQR theo tháng, hệ số x3.
       - Cột zero-inflated (precipitation...): ngưỡng vật lý cố định.
    2. Nội suy gap ngắn (<=6h).
    3. Đánh missing_flag cho phần còn thiếu (gap dài, không bịa số).
    """
    zero_inflated_present = [c for c in value_columns if c in ZERO_INFLATED_COLUMNS]
    regular_columns = [c for c in value_columns if c not in ZERO_INFLATED_COLUMNS]

    df = remove_outliers_iqr_by_month(df, regular_columns)
    df = remove_outliers_physical_bounds(df, zero_inflated_present)
    df = interpolate_short_gaps(df, value_columns)
    df = flag_remaining_missing(df, value_columns)
    return df
"""
GIAI ĐOẠN 1 — Bước 3: Làm sạch dữ liệu (app/data/quality.py)

Lưới dữ liệu là 3h/bước, nên:
- Nội suy tuyến tính nếu khoảng trống <= 2 bước = 6h.
- Khoảng trống dài hơn 6h -> đánh missing_flag=True
- Loại outlier theo IQR tính riêng từng THÁNG, hệ số x3 (rộng hơn chuẩn 1.5
  vì dữ liệu ô nhiễm môi trường có đỉnh tự nhiên, x1.5 dễ loại nhầm giá trị thật).
"""
from __future__ import annotations

import numpy as np
import pandas as pd

MAX_INTERP_GAP_STEPS = 2  # 2 bước x 3h = 6h
IQR_MULTIPLIER = 3.0


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
    """
    df = df.copy()
    month_key = df.index.to_period("M")

    for col in columns:
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


def clean_dataset(df: pd.DataFrame, value_columns: list[str]) -> pd.DataFrame:
    """
    Pipeline làm sạch đầy đủ, thứ tự quan trọng:
    1. Loại outlier trước (gán NaN) — để không lấy outlier làm điểm neo nội suy.
    2. Nội suy gap ngắn (<=6h).
    3. Đánh missing_flag cho phần còn thiếu (gap dài, không bịa số).
    """
    df = remove_outliers_iqr_by_month(df, value_columns)
    df = interpolate_short_gaps(df, value_columns)
    df = flag_remaining_missing(df, value_columns)
    return df
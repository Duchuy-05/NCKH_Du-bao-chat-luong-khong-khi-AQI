"""
So sánh svr_daily với baseline "persistence" (dự báo ngày mai = AQI hôm nay,
lặp lại cho cả 7 ngày). Nếu SVR không thắng rõ baseline này ở phần lớn các
horizon thì model chưa có giá trị thực tế — cần biết trước khi viết báo cáo.
"""
from __future__ import annotations

import numpy as np
import pandas as pd
from sklearn.metrics import mean_absolute_error, mean_squared_error

from app.core.config import DAILY_HORIZON, FEATURES_DAILY_PATH

TARGET_COLS = [f"d_{h}" for h in range(1, DAILY_HORIZON + 1)]


def baseline_persistence_predict(df: pd.DataFrame) -> np.ndarray:
    """y_pred[h] = aqi_mean tại thời điểm hiện tại (lặp lại cho mọi horizon)."""
    current = df["aqi_mean"].values.reshape(-1, 1)
    return np.repeat(current, DAILY_HORIZON, axis=1)


def main():
    df = pd.read_parquet(FEATURES_DAILY_PATH)
    split_idx = int(len(df) * 0.85)
    test_df = df.iloc[split_idx:]

    y_true = test_df[TARGET_COLS]
    y_pred_baseline = baseline_persistence_predict(test_df)

    print(f"{'Horizon':<10}{'Baseline MAE':<15}{'Baseline RMSE':<15}")
    for i, col in enumerate(TARGET_COLS):
        mae = mean_absolute_error(y_true[col], y_pred_baseline[:, i])
        rmse = np.sqrt(mean_squared_error(y_true[col], y_pred_baseline[:, i]))
        print(f"{col:<10}{mae:<15.3f}{rmse:<15.3f}")

    overall_mae = mean_absolute_error(y_true.values, y_pred_baseline)
    overall_rmse = np.sqrt(mean_squared_error(y_true.values, y_pred_baseline))
    print(f"{'overall':<10}{overall_mae:<15.3f}{overall_rmse:<15.3f}")

    print("\n>> So sánh với test_metrics đã in ra lúc train_svr_daily.py để biết "
          "SVR có thắng baseline không, ở từng horizon.")


if __name__ == "__main__":
    main()
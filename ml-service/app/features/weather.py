"""
Đặc trưng thời tiết và tương tác vi khí hậu — app/features/weather.py

Bao gồm:
- Tương tác nhiệt độ x độ ẩm (temperature x humidity)
- Năng lượng và thành phần gió (u, v components, cờ gió lặng)
- Chênh nhiệt ngày/đêm (Diurnal Temperature Range) và điểm sương (Dew Point Depression)
"""
from __future__ import annotations

import numpy as np
import pandas as pd


def add_weather_interaction_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Tính các đặc trưng tương tác khí tượng:
    1. Tương tác nhiệt độ x độ ẩm (ảnh hưởng đến ngưng tụ sol khí và chuyển hóa quang hóa).
    2. Năng lượng khuếch tán của gió (u, v vectors, cờ gió lặng).
    3. Chênh nhiệt ngày/đêm (DTR) và độ lệch nhiệt độ - điểm sương.
    """
    df = df.copy()

    # 1. Tương tác Nhiệt độ x Độ ẩm
    if "temperature" in df.columns and "humidity" in df.columns:
        df["temp_x_humidity"] = df["temperature"] * df["humidity"] / 100.0

        # Ước lượng nhiệt độ điểm sương (Dew point) theo công thức Magnus xấp xỉ
        # T_dew = T - (100 - RH) / 5
        df["dew_point"] = df["temperature"] - ((100.0 - df["humidity"].clip(0, 100)) / 5.0)
        # Chênh lệch nhiệt độ - điểm sương (càng nhỏ thì sương mù ngưng tụ càng dày)
        df["dew_point_depression"] = (df["temperature"] - df["dew_point"]).clip(lower=0)

    # 2. Tốc độ gió và thành phần gió
    if "wind_speed" in df.columns:
        # Năng lượng động lực học phát tán gió
        df["wind_speed_sq"] = df["wind_speed"] ** 2

        # Cờ gió lặng (stagnant air: tốc độ gió < 1.5 m/s khiến ô nhiễm tích tụ cục bộ)
        df["is_calm_wind"] = (df["wind_speed"] < 1.5).astype(int)

        # Vector thành phần gió U (Tây -> Đông) và V (Nam -> Bắc)
        if "wind_direction" in df.columns:
            rad = np.radians(df["wind_direction"])
            df["wind_u"] = -df["wind_speed"] * np.sin(rad)
            df["wind_v"] = -df["wind_speed"] * np.cos(rad)

    # 3. Chênh nhiệt ngày/đêm (Diurnal Temperature Range)
    if "temperature" in df.columns:
        # Nếu đã có cột temp_max và temp_min theo ngày
        if "temp_max" in df.columns and "temp_min" in df.columns:
            df["diurnal_temp_range"] = df["temp_max"] - df["temp_min"]
        else:
            # Tính biên độ nhiệt độ trong 24h trượt gần nhất (tính từ shift 1 để không leak)
            temp_shift = df["temperature"].shift(1)
            # Đối với dữ liệu 3h -> 8 bước = 24h; nếu dữ liệu daily -> 3 ngày
            step_window = 8 if hasattr(df.index, "hour") and df.index.hour.nunique() > 1 else 3
            t_max_24h = temp_shift.rolling(window=step_window, min_periods=1).max()
            t_min_24h = temp_shift.rolling(window=step_window, min_periods=1).min()
            t_mean_24h = temp_shift.rolling(window=step_window, min_periods=1).mean()

            df["diurnal_temp_range"] = (t_max_24h - t_min_24h).fillna(0)
            df["temp_diff_from_24h_mean"] = (df["temperature"] - t_mean_24h).fillna(0)

    return df

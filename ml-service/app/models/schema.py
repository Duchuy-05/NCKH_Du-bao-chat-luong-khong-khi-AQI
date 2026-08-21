from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel, Field


class DailyForecastPoint(BaseModel):
    date: date
    aqi: float = Field(..., description="AQI trung bình dự báo cho ngày này")
    level: Optional[str] = Field(
        None, description="Mức cảnh báo suy ra từ AQI (Tốt/Trung bình/Kém/Xấu/Rất xấu/Nguy hại)"
    )


class DailyForecastResponse(BaseModel):
    city: str = "hanoi"
    algo: str = "svr"
    generated_at: datetime
    horizon_days: int = 7
    forecast: List[DailyForecastPoint]


# Dùng lại ở Luồng B (trong ngày) sau này
class HourlyForecastPoint(BaseModel):
    timestamp: datetime
    aqi: float
    level: Optional[str] = None


class HourlyForecastResponse(BaseModel):
    city: str = "hanoi"
    algo: str = "svr"
    generated_at: datetime
    horizon_steps: int = 8
    step_hours: int = 3
    forecast: List[HourlyForecastPoint]
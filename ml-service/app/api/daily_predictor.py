"""Compatibility exports for the daily predictor service."""
from app.services.daily_predictor import (
    DailyPredictor,
    aqi_to_level,
    get_daily_predictor,
)

__all__ = ["DailyPredictor", "aqi_to_level", "get_daily_predictor"]

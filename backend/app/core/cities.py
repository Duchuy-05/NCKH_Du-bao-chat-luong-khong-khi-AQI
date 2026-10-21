"""Shared display names and representative coordinates for supported cities."""
from __future__ import annotations

from typing import Any


CITIES: dict[str, dict[str, Any]] = {
    "hanoi": {"name": "Hà Nội", "latitude": 21.0285, "longitude": 105.8542},
    "haiphong": {"name": "Hải Phòng", "latitude": 20.8449, "longitude": 106.6881},
    "danang": {"name": "Đà Nẵng", "latitude": 16.0544, "longitude": 108.2022},
    "hochiminh": {"name": "TP. Hồ Chí Minh", "latitude": 10.8231, "longitude": 106.6297},
    "cantho": {"name": "Cần Thơ", "latitude": 10.0452, "longitude": 105.7469},
}

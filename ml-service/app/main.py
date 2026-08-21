"""
FastAPI Service phục vụ dự báo chất lượng không khí (Hà Nội - Hoàn Kiếm)
bằng thuật toán Support Vector Regression (SVR).
"""
from __future__ import annotations

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from app.models.schema import DailyForecastResponse, HourlyForecastResponse
from app.services.daily_predictor import get_daily_predictor
from app.services.hourly_predictor import get_hourly_predictor

app = FastAPI(
    title="AirVision ML Service - Hanoi AQI Forecast (SVR)",
    description="Dịch vụ AI/ML dự báo chỉ số chất lượng không khí AQI khu vực Hoàn Kiếm, Hà Nội",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "ok", "service": "airvision-ml-service", "algo": "SVR"}


@app.get("/forecast/daily", response_model=DailyForecastResponse, tags=["Forecast"])
def forecast_daily(
    algo: str = Query("svr", description="Thuật toán dự báo (mặc định: svr)")
):
    """
    Luồng A: Dự báo AQI 7 ngày tới (1 điểm/ngày).
    """
    if algo.lower() != "svr":
        raise HTTPException(
            status_code=400,
            detail=f"Hệ thống hiện tại chỉ sử dụng thuật toán SVR (nhận được: '{algo}')"
        )
    try:
        predictor = get_daily_predictor()
        return predictor.predict()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi dự báo Daily: {str(e)}")


@app.get("/forecast/hourly", response_model=HourlyForecastResponse, tags=["Forecast"])
def forecast_hourly(
    algo: str = Query("svr", description="Thuật toán dự báo (mặc định: svr)")
):
    """
    Luồng B: Dự báo AQI 24h tới bước nhảy 3h (8 bước nhảy: t+3h, t+6h, ..., t+24h, tự động tràn sang ngày tiếp theo).
    Tần suất chạy: mỗi 3h.
    """
    if algo.lower() != "svr":
        raise HTTPException(
            status_code=400,
            detail=f"Hệ thống hiện tại chỉ sử dụng thuật toán SVR (nhận được: '{algo}')"
        )
    try:
        predictor = get_hourly_predictor()
        return predictor.predict()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi dự báo Hourly: {str(e)}")

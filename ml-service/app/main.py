"""
FastAPI Service phục vụ dự báo chất lượng không khí (Hà Nội - Hoàn Kiếm)
bằng thuật toán SVR (Support Vector Regression) và GPR (Gaussian Process Regression).
"""
from __future__ import annotations

import os
from typing import Optional
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query, Header, Depends
from fastapi.middleware.cors import CORSMiddleware

from app.models.schema import DailyForecastResponse, HourlyForecastResponse
from app.services.daily_predictor import get_daily_predictor
from app.services.hourly_predictor import get_hourly_predictor

# Load environment variables
load_dotenv()

INTERNAL_API_KEY = os.getenv("INTERNAL_API_KEY", "")

SUPPORTED_ALGOS = ("svr", "gpr")


def verify_internal_key(x_internal_api_key: Optional[str] = Header(None)):
    """Kiểm tra API Key nội bộ giữa Backend và ML Service."""
    if INTERNAL_API_KEY:
        if not x_internal_api_key or x_internal_api_key != INTERNAL_API_KEY:
            raise HTTPException(
                status_code=401,
                detail="Unauthorized: Khóa xác thực nội bộ (X-Internal-Api-Key) không đúng hoặc bị thiếu."
            )


app = FastAPI(
    title="AirVision ML Service - Hanoi AQI Forecast (SVR + GPR)",
    description="Dịch vụ AI/ML dự báo chỉ số chất lượng không khí AQI khu vực Hoàn Kiếm, Hà Nội. Hỗ trợ SVR và GPR.",
    version="2.0.0",
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
    from app.core.config import GPR_AQI_MODEL_PATH, SVR_DAILY_MODEL_PATH
    return {
        "status": "ok",
        "service": "airvision-ml-service",
        "supported_algos": list(SUPPORTED_ALGOS),
        "models": {
            "svr_daily": SVR_DAILY_MODEL_PATH.exists(),
            "gpr_aqi": GPR_AQI_MODEL_PATH.exists(),
        },
    }


@app.get(
    "/forecast/daily",
    response_model=DailyForecastResponse,
    tags=["Forecast"],
    dependencies=[Depends(verify_internal_key)],
)
def forecast_daily(
    algo: str = Query("svr", description="Thuật toán dự báo: svr hoặc gpr")
):
    """
    Luồng A: Dự báo AQI 7 ngày tới (1 điểm/ngày).
    Hỗ trợ algo=svr (mặc định) hoặc algo=gpr (Gaussian Process Regression).
    """
    algo_lower = algo.lower()
    if algo_lower not in SUPPORTED_ALGOS:
        raise HTTPException(
            status_code=400,
            detail=f"Thuật toán không hỗ trợ: '{algo}'. Chọn: {', '.join(SUPPORTED_ALGOS)}"
        )
    try:
        if algo_lower == "gpr":
            from app.services.gpr_aqi_predictor import get_gpr_aqi_predictor
            predictor = get_gpr_aqi_predictor()
        else:
            predictor = get_daily_predictor()
        return predictor.predict()
    except FileNotFoundError as e:
        raise HTTPException(
            status_code=503,
            detail=f"Model {algo} chưa được huấn luyện. {str(e)}"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi dự báo Daily ({algo}): {str(e)}")


@app.get(
    "/forecast/hourly",
    response_model=HourlyForecastResponse,
    tags=["Forecast"],
    dependencies=[Depends(verify_internal_key)],
)
def forecast_hourly(
    algo: str = Query("svr", description="Thuật toán dự báo: svr hoặc gpr")
):
    """
    Luồng B: Dự báo AQI 24h tới bước nhảy 3h.
    Hiện tại chỉ SVR hỗ trợ hourly; GPR sẽ trả lỗi 400.
    """
    algo_lower = algo.lower()
    if algo_lower == "gpr":
        raise HTTPException(
            status_code=400,
            detail="GPR hiện chỉ hỗ trợ dự báo daily. Hourly chỉ dùng SVR."
        )
    if algo_lower != "svr":
        raise HTTPException(
            status_code=400,
            detail=f"Thuật toán không hỗ trợ: '{algo}'. Chọn: svr"
        )
    try:
        predictor = get_hourly_predictor()
        return predictor.predict()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi dự báo Hourly: {str(e)}")


@app.post(
    "/admin/train",
    tags=["Admin"],
    dependencies=[Depends(verify_internal_key)],
)
def trigger_training(
    algo: str = Query("gpr", description="Thuật toán cần huấn luyện: gpr"),
    target: str = Query("aqi", description="Target: aqi hoặc pollutants"),
):
    """
    Trigger huấn luyện lại model GPR.
    Endpoint này sẽ mất vài phút tuỳ theo lượng dữ liệu.
    """
    if algo.lower() != "gpr":
        raise HTTPException(
            status_code=400,
            detail="Hiện chỉ hỗ trợ huấn luyện GPR qua API. SVR dùng script riêng."
        )
    try:
        if target.lower() == "aqi":
            from app.training.GPR.train_gpr_aqi import train
            result = train()
        elif target.lower() == "pollutants":
            from app.training.GPR.train_gpr_pollutants import train
            result = train()
        else:
            raise HTTPException(
                status_code=400,
                detail=f"Target không hỗ trợ: '{target}'. Chọn: aqi, pollutants"
            )
        # Xoá cache predictor cũ để load model mới
        from app.services.gpr_aqi_predictor import get_gpr_aqi_predictor
        get_gpr_aqi_predictor.cache_clear()
        return {"status": "ok", "result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi huấn luyện: {str(e)}")

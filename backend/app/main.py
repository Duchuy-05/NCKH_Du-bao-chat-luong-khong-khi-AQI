"""FastAPI for AQI model training, inference, and model evaluation workflows."""
from __future__ import annotations

import asyncio
import logging
import os
from contextlib import asynccontextmanager, suppress
from datetime import datetime, timezone
from typing import Optional

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, Header, HTTPException, Query
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

load_dotenv()

from app.models.schema import CurrentAQIResponse, DailyForecastResponse, HourlyForecastResponse  # noqa: E402
from app.core.config import (  # noqa: E402
    CITY,
    DATA_SYNC_ENABLED,
    DATA_SYNC_TIMES,
    TIMEZONE,
    SUPPORTED_CITIES,
    city_daily_model_path,
    city_hourly_model_path,
)
from app.services.daily_predictor import get_daily_predictor  # noqa: E402
from app.services.health_advice import get_health_advice  # noqa: E402
from app.services.hourly_predictor import get_hourly_predictor  # noqa: E402
from app.services.open_meteo_aqi import get_current_aqi  # noqa: E402
from app.services.open_meteo_sync import run_data_sync_loop  # noqa: E402


logger = logging.getLogger("airvision-ml")
SUPPORTED_ALGOS = ("svr",)
INTERNAL_API_KEY = os.getenv("INTERNAL_API_KEY", "")


@asynccontextmanager
async def lifespan(_app: FastAPI):
    sync_task = None
    if DATA_SYNC_ENABLED:
        sync_times = ", ".join(value.strftime("%H:%M") for value in DATA_SYNC_TIMES)
        logger.info(
            "Open-Meteo background sync enabled at %s (%s)",
            sync_times,
            TIMEZONE,
        )
        sync_task = asyncio.create_task(
            run_data_sync_loop(),
            name="open-meteo-background-sync",
        )
    else:
        logger.info("Open-Meteo background sync disabled")

    try:
        yield
    finally:
        if sync_task is not None:
            sync_task.cancel()
            with suppress(asyncio.CancelledError):
                await sync_task


app = FastAPI(
    title="AirVision ML API",
    description="AQI model training, prediction, and evaluation service.",
    version="3.1.0",
    lifespan=lifespan,
)

cors_origins = [
    origin.strip()
    for origin in os.getenv("CORS_ALLOW_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")
    if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "X-Internal-Api-Key"],
)


@app.exception_handler(HTTPException)
async def http_error_handler(_, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        headers=exc.headers,
        content={"success": False, "message": str(exc.detail)},
    )


@app.exception_handler(RequestValidationError)
async def validation_error_handler(_, exc: RequestValidationError):
    return JSONResponse(
        status_code=400,
        content={"success": False, "message": "Dữ liệu yêu cầu không hợp lệ.", "errors": jsonable_encoder(exc.errors())},
    )


@app.exception_handler(Exception)
async def unhandled_error_handler(_, exc: Exception):
    logger.error("Unhandled API error: %s", exc, exc_info=(type(exc), exc, exc.__traceback__))
    return JSONResponse(status_code=500, content={"success": False, "message": "Lỗi máy chủ nội bộ."})


def verify_internal_key(x_internal_api_key: Optional[str] = Header(default=None)) -> None:
    """Check an internal key when one is configured for ML-only routes."""
    if INTERNAL_API_KEY and x_internal_api_key != INTERNAL_API_KEY:
        raise HTTPException(
            status_code=401,
            detail="Unauthorized: Khóa xác thực nội bộ (X-Internal-Api-Key) không đúng hoặc bị thiếu.",
        )


def verify_admin_key(x_internal_api_key: Optional[str] = Header(default=None)) -> None:
    if not INTERNAL_API_KEY:
        raise HTTPException(status_code=503, detail="Chưa cấu hình INTERNAL_API_KEY cho API huấn luyện.")
    if x_internal_api_key != INTERNAL_API_KEY:
        raise HTTPException(status_code=401, detail="Khóa xác thực nội bộ không đúng hoặc bị thiếu.")


def _city_code(city: str) -> str:
    normalized = city.strip().lower()
    if normalized not in SUPPORTED_CITIES:
        raise HTTPException(
            status_code=400,
            detail=f"Thành phố không hỗ trợ: '{city}'. Chọn một trong: {', '.join(SUPPORTED_CITIES)}",
        )
    return normalized


def _predict_daily(algo: str, city: str = CITY) -> DailyForecastResponse:
    normalized = algo.lower()
    if normalized not in SUPPORTED_ALGOS:
        raise HTTPException(status_code=400, detail=f"Thuật toán không hỗ trợ: '{algo}'. Chọn: svr")
    try:
        return get_daily_predictor(_city_code(city)).predict()
    except FileNotFoundError as exc:
        raise HTTPException(status_code=503, detail=f"Model {normalized} chưa được huấn luyện. {exc}") from exc
    except ValueError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Daily forecast failed (algo=%s)", normalized)
        raise HTTPException(status_code=500, detail=f"Lỗi dự báo Daily ({normalized}): {exc}") from exc


def _predict_hourly(algo: str, city: str = CITY) -> HourlyForecastResponse:
    normalized = algo.lower()
    if normalized != "svr":
        raise HTTPException(status_code=400, detail=f"Thuật toán không hỗ trợ: '{algo}'. Chọn: svr")
    try:
        return get_hourly_predictor(_city_code(city)).predict()
    except FileNotFoundError as exc:
        raise HTTPException(status_code=503, detail=f"Model hourly chưa được huấn luyện. {exc}") from exc
    except ValueError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Hourly forecast failed")
        raise HTTPException(status_code=500, detail=f"Lỗi dự báo Hourly: {exc}") from exc


def _as_json(value):
    return jsonable_encoder(value)


def _public_envelope(value) -> dict:
    return {"success": True, "data": _as_json(value)}


@app.get("/health", tags=["Health"])
def health() -> dict:
    return {
        "status": "ok",
        "service": "airvision-ml-api",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "supported_algos": list(SUPPORTED_ALGOS),
        "models": {
            "svr_daily": city_daily_model_path(CITY).exists(),
            "svr_hourly": city_hourly_model_path(CITY).exists(),
        },
        "city_models": {
            city: {
                "daily": city_daily_model_path(city).exists(),
                "hourly": city_hourly_model_path(city).exists(),
            }
            for city in SUPPORTED_CITIES
        },
    }


@app.get("/api/air-quality/health", tags=["Forecast"])
def public_health() -> dict:
    return {"success": True, "mlService": health()}


@app.get("/api/air-quality/current", tags=["AQI"])
def public_current_aqi(city: str = Query(CITY)) -> dict:
    selected_city = _city_code(city)
    try:
        result = CurrentAQIResponse(**get_current_aqi(selected_city))
        return _public_envelope(result)
    except Exception as exc:
        logger.exception("Loading current Open-Meteo AQI failed (city=%s)", selected_city)
        raise HTTPException(
            status_code=503,
            detail="Chưa lấy được dữ liệu AQI hiện tại từ Open-Meteo.",
        ) from exc


@app.get("/api/health-advice", tags=["Health"])
def public_health_advice() -> dict:
    try:
        return _public_envelope(get_health_advice())
    except Exception as exc:
        logger.exception("Loading health advice from PostgreSQL failed")
        raise HTTPException(
            status_code=503,
            detail="Dữ liệu khuyến cáo sức khỏe hiện chưa sẵn sàng.",
        ) from exc


@app.get("/forecast/daily", response_model=DailyForecastResponse, tags=["Forecast"], dependencies=[Depends(verify_internal_key)])
def forecast_daily(algo: str = Query("svr"), city: str = Query(CITY)) -> DailyForecastResponse:
    return _predict_daily(algo, city)


@app.get("/api/air-quality/predict/daily", tags=["Forecast"])
def public_daily_forecast(algo: str = Query("svr"), city: str = Query(CITY)) -> dict:
    return _public_envelope(_predict_daily(algo, city))


@app.get("/forecast/hourly", response_model=HourlyForecastResponse, tags=["Forecast"], dependencies=[Depends(verify_internal_key)])
def forecast_hourly(algo: str = Query("svr"), city: str = Query(CITY)) -> HourlyForecastResponse:
    return _predict_hourly(algo, city)


@app.get("/api/air-quality/predict/hourly", tags=["Forecast"])
def public_hourly_forecast(algo: str = Query("svr"), city: str = Query(CITY)) -> dict:
    return _public_envelope(_predict_hourly(algo, city))


@app.post("/admin/train", tags=["Training"], dependencies=[Depends(verify_admin_key)])
def trigger_training(target: str = Query("all"), city: str = Query(CITY)) -> dict:
    normalized_target = target.lower().strip()
    selected_city = _city_code(city)
    if normalized_target not in {"daily", "hourly", "all"}:
        raise HTTPException(
            status_code=400,
            detail=f"Target không hỗ trợ: '{target}'. Chọn: daily, hourly, all",
        )
    try:
        results = {}
        if normalized_target in {"daily", "all"}:
            from app.training.SVR.train_svr_daily import train as train_daily

            results["daily"] = train_daily(selected_city)
            get_daily_predictor.cache_clear()
        if normalized_target in {"hourly", "all"}:
            from app.training.SVR.train_svr_hourly import train as train_hourly

            results["hourly"] = train_hourly(selected_city)
            get_hourly_predictor.cache_clear()

        return {
            "status": "ok",
            "algorithm": "svr",
            "target": normalized_target,
            "city": selected_city,
            "result": results,
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Model training failed")
        raise HTTPException(status_code=500, detail=f"Lỗi huấn luyện: {exc}") from exc


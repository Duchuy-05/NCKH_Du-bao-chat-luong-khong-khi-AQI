from fastapi import FastAPI

from app.api import forecast, predict

app = FastAPI(title="AQI Forecast ML Service", version="0.1.0")

app.include_router(forecast.router)   # GET /forecast/daily, /forecast/hourly (sau)
app.include_router(predict.router)    


@app.get("/health")
def health():
    return {"status": "ok"}
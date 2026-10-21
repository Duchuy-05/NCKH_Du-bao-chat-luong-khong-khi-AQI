# AirVision ML API

This FastAPI service contains the Open-Meteo ingestion pipeline, VN_AQI calculation, SVR training and prediction, plus the database-backed health-advice endpoint. Account registration, login/JWT, and forecast-history storage are not included.

## Setup

Use Python 3.10 or later. Create `.env` from `.env.example`; set `DATABASE_URL` to the PostgreSQL database. Install packages and start the API:

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --port 3000
```

## Database migrations

The schema is versioned with Alembic. Set `DATABASE_URL` in `.env` first, then run migrations and load processed hourly data from the `backend/` directory:

```powershell
python -m pip install -r requirements.txt
python -m alembic upgrade head
python -m alembic current
python -m app.data.ingest_open_meteo
```

`alembic upgrade head` works with a new empty database and with the existing schema created from `aqi_prediction_table.sql`. It creates city-aware hourly observation tables, hourly AQI columns, a precomputed daily AQI table, and the health-advice tables. Migration `20261021_0005` copies any remaining legacy Hanoi observations into the city-aware tables, then drops `hanoi_pollutants` and `hanoi_weather`. The ingestion command fetches hourly Open-Meteo data for Hanoi, Hai Phong, Da Nang, Ho Chi Minh City, and Can Tho, cleans weather values, calculates hourly and daily VN_AQI, then upserts all results into PostgreSQL. Its one-time full import defaults to `2022-10-01` through yesterday. Rerunning it updates existing city/time rows.

After the API starts, a background task refreshes the previous full month and current month-to-date for all five cities, processes the readings, and upserts them into PostgreSQL. It runs once at startup, then at 06:00 and 18:00 Vietnam time by default. These fixed times follow the twice-daily CAMS Global update cycle with a buffer for data publication. The weather archive is queried through yesterday; today's weather is fetched from the forecast endpoint. Hourly observations for today are stored, while a daily AQI row is stored only after that calendar day is complete. A PostgreSQL advisory lock prevents multiple API workers from making the same refresh concurrently. It refreshes recent data only; run the full import above once after creating a new database. Set `DATA_SYNC_ENABLED=false` to disable the task, or set `DATA_SYNC_TIMES` in `.env` to comma-separated 24-hour times (for example, `05:30,17:30`). Sync failures are logged per city and do not stop the API. The current AQI route continues to fetch its latest hourly values directly from Open-Meteo.

To load a smaller date range or selected cities, for example:

```powershell
python -m app.data.ingest_open_meteo --start-date 2024-01-01 --end-date 2026-10-20
python -m app.data.ingest_open_meteo --city hanoi --city danang
```

The database URL may also be built from `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, and `DB_PASSWORD`. For Docker, use a database hostname reachable from the container instead of `localhost`.

## API

| Route | Purpose |
| --- | --- |
| `GET /health` | Service, supported algorithms, and model artifact availability |
| `GET /forecast/daily?algo=svr&city=hanoi` | Daily forecast using a city's SVR model |
| `GET /forecast/hourly?algo=svr&city=hanoi` | 24 one-hour forecasts using a city's SVR model |
| `POST /admin/train?target=all&city=hanoi` | Train daily and hourly models from stored observations; requires `X-Internal-Api-Key` |
| `GET /api/air-quality/predict/daily?algo=svr&city=hanoi` | Frontend-compatible daily response envelope |
| `GET /api/air-quality/predict/hourly?algo=svr&city=hanoi` | Frontend-compatible hourly response envelope |
| `GET /api/air-quality/current?city=hanoi` | Current modeled concentrations from Open-Meteo, calculated as VN_AQI |
| `GET /api/air-quality/health` | Frontend-compatible health response envelope |
| `GET /api/health-advice` | Health-advice topics and rotating recommendations from PostgreSQL |

SVR supports daily and hourly predictions for all five city codes: `hanoi`, `haiphong`, `danang`, `hochiminh`, and `cantho`. `/admin/train` accepts `target=daily`, `target=hourly`, or `target=all`, and trains only the selected city's model from PostgreSQL. Dated model artifacts use names such as `danang-hourly-YYYYMMDD-<run-id>.joblib`. The endpoint is protected and requires a non-empty `INTERNAL_API_KEY`; do not put that key in browser code. Training runs during the request, so allow enough time for the response.

To train every currently supported model (5 cities × daily/hourly), run this from `backend/`:

```powershell
python -m app.training.SVR.train_all_cities
```

The script trains sequentially, continues to the remaining jobs if one fails, prints each artifact path and a final summary, and exits with code `1` if any job failed. To narrow the run:

```powershell
python -m app.training.SVR.train_all_cities --city hanoi --city danang
python -m app.training.SVR.train_all_cities --target daily
```

Example PowerShell request to train both models:

```powershell
$headers = @{ "X-Internal-Api-Key" = "your-INTERNAL_API_KEY" }
Invoke-RestMethod -Method Post -Uri "http://localhost:3000/admin/train?target=all&city=hanoi" -Headers $headers
```

## Data preparation and SVR training

The importer applies the existing cleaning rules before insertion: invalid negative pollutant readings stay missing; weather outliers are removed and short weather gaps are interpolated; AQI is calculated before the database upsert. Hourly PM uses the 12-hour Nowcast, daily PM uses 24-hour averages, and daily gaseous pollutant/O3 values use the prescribed hourly and 8-hour maxima. `air_quality_observations.aqi` stores the hourly value; `aqi_daily_observations.aqi` stores the daily value. Training reads historical observations from PostgreSQL. Inference reads the latest 900 days, enough for the longest daily feature lag plus a margin, then applies the stored model to the latest usable feature row.

Hourly SVR forecasts cover the next 24 hours (one output per hour). Existing model artifacts must be retrained after applying the migration and importing data. Train models for each city as needed:

```powershell
python -m app.training.SVR.train_svr_daily --city hanoi
python -m app.training.SVR.train_svr_hourly --city hanoi
python -m app.training.SVR.train_svr_daily --city danang
python -m app.training.SVR.train_svr_hourly --city danang
```

The API supports the same selection through `/admin/train?target=all&city=danang`. Feature lags and forecast targets are generated from the already processed database rows during model training. SVR training performs chronological validation and stores its metrics and forecast preview with each city model artifact.

## Docker

Use Docker Compose from the repository root; it builds the FastAPI and frontend images, starts PostgreSQL, applies migrations, and waits for the API health check before starting the frontend. The root `README.md` documents first-time data import and model training. Compose keeps the database in the `pgdata` volume and model artifacts in `backend/models/`.

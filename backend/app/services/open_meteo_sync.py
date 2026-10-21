"""Periodic background refresh of processed Open-Meteo observations."""
from __future__ import annotations

import asyncio
import logging
from datetime import date, datetime, timedelta
from typing import Any
from zoneinfo import ZoneInfo

from sqlalchemy import text

from app.core.cities import CITIES
from app.core.config import DATA_SYNC_TIMES, TIMEZONE
from app.data.ingest_open_meteo import ingest_city
from app.data.loaders.db_loader import get_engine


logger = logging.getLogger("airvision-data-sync")
SYNC_LOCK_KEY = 736921008413


def _refresh_start_date(today: date) -> date:
    """Reprocess the previous full month and the current month-to-date."""
    this_month = today.replace(day=1)
    previous_month_last_day = this_month - timedelta(days=1)
    return previous_month_last_day.replace(day=1)


def sync_recent_data() -> dict[str, Any]:
    """Fetch recent data for every city and persist processed AQI in PostgreSQL."""
    lock_engine = get_engine()
    lock_connection = None
    lock_acquired = False
    try:
        lock_connection = lock_engine.connect()
        lock_acquired = bool(
            lock_connection.execute(
                text("SELECT pg_try_advisory_lock(:lock_key)"),
                {"lock_key": SYNC_LOCK_KEY},
            ).scalar()
        )
        lock_connection.commit()
        if not lock_acquired:
            logger.info("Skipping Open-Meteo refresh; another API worker holds the sync lock")
            return {"status": "skipped", "reason": "another_worker_syncing"}

        return _sync_recent_data_locked()
    finally:
        if lock_acquired and lock_connection is not None:
            try:
                lock_connection.execute(
                    text("SELECT pg_advisory_unlock(:lock_key)"),
                    {"lock_key": SYNC_LOCK_KEY},
                )
                lock_connection.commit()
            except Exception:
                logger.exception("Could not explicitly release Open-Meteo sync lock")
        if lock_connection is not None:
            lock_connection.close()
        lock_engine.dispose()


def _sync_recent_data_locked() -> dict[str, Any]:
    now = datetime.now(ZoneInfo(TIMEZONE))
    cutoff = now.replace(minute=0, second=0, microsecond=0)
    start_date = _refresh_start_date(now.date())
    end_date = now.date()
    results: dict[str, Any] = {}

    logger.info(
        "Starting Open-Meteo refresh for %s..%s (through %s)",
        start_date,
        end_date,
        cutoff.isoformat(),
    )
    for city_code in CITIES:
        try:
            results[city_code] = ingest_city(
                city_code,
                start_date,
                end_date,
                cutoff=cutoff,
            )
        except Exception as exc:
            results[city_code] = {"error": str(exc)}
            logger.exception("Open-Meteo refresh failed for city=%s", city_code)

    failures = [
        city for city, result in results.items()
        if isinstance(result, dict) and "error" in result
    ]
    if failures:
        logger.warning(
            "Open-Meteo refresh finished with failures for: %s",
            ", ".join(failures),
        )
    else:
        logger.info("Open-Meteo refresh completed for all %d cities", len(results))
    return results


async def run_data_sync_loop() -> None:
    """Refresh on startup, then at each configured local clock time."""
    timezone = ZoneInfo(TIMEZONE)
    configured_times = DATA_SYNC_TIMES
    while True:
        try:
            await asyncio.to_thread(sync_recent_data)
        except asyncio.CancelledError:
            raise
        except Exception:
            logger.exception("Unexpected error in Open-Meteo background refresh")

        now = datetime.now(timezone)
        next_runs = [
            datetime.combine(now.date(), run_time, tzinfo=timezone)
            for run_time in configured_times
        ]
        next_run = min((run for run in next_runs if run > now), default=None)
        if next_run is None:
            next_run = datetime.combine(
                now.date() + timedelta(days=1),
                configured_times[0],
                tzinfo=timezone,
            )
        sleep_seconds = max(0, (next_run - now).total_seconds())
        logger.info(
            "Next Open-Meteo refresh scheduled at %s (%s)",
            next_run.isoformat(),
            TIMEZONE,
        )
        await asyncio.sleep(sleep_seconds)

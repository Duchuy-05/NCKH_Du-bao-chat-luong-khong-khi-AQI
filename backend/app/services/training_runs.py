"""Persist model training run metadata and metrics in PostgreSQL."""
from __future__ import annotations

import json
from datetime import date
from typing import Any
from uuid import uuid4

from sqlalchemy import text

from app.core.db import get_engine


def _execute(statement: str, params: dict[str, Any]) -> int:
    engine = get_engine()
    try:
        with engine.begin() as connection:
            result = connection.execute(text(statement), params)
            return int(result.rowcount or 0)
    finally:
        engine.dispose()


def _json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, default=str)


def start_training_run(city_code: str, model_type: str, module_name: str) -> str:
    run_code = str(uuid4())
    _execute(
        """
        INSERT INTO model_training_runs
            (run_code, city_code, model_type, module_name, status)
        VALUES
            (CAST(:run_code AS UUID), :city_code, :model_type, :module_name, 'running')
        """,
        {
            "run_code": run_code,
            "city_code": city_code,
            "model_type": model_type,
            "module_name": module_name,
        },
    )
    return run_code


def update_training_run_context(
    run_code: str,
    last_data_date: date,
    file_name: str,
) -> None:
    updated = _execute(
        """
        UPDATE model_training_runs
        SET last_data_date = :last_data_date, file_name = :file_name
        WHERE run_code = CAST(:run_code AS UUID) AND status = 'running'
        """,
        {
            "run_code": run_code,
            "last_data_date": last_data_date,
            "file_name": file_name,
        },
    )
    if updated != 1:
        raise RuntimeError(f"Không tìm thấy training run đang chạy: {run_code}")


def complete_training_run(
    run_code: str,
    last_data_date: date,
    metrics: dict[str, Any],
    best_params: dict[str, Any],
    file_name: str,
) -> None:
    mae = {
        target: float(values["mae"])
        for target, values in metrics.items()
        if isinstance(values, dict) and "mae" in values
    }
    rmse = {
        target: float(values["rmse"])
        for target, values in metrics.items()
        if isinstance(values, dict) and "rmse" in values
    }
    if not mae or not rmse:
        raise ValueError("Metrics cần có ít nhất một giá trị MAE và RMSE.")

    updated = _execute(
        """
        UPDATE model_training_runs
        SET last_data_date = :last_data_date,
            mae = CAST(:mae AS JSONB),
            rmse = CAST(:rmse AS JSONB),
            best_params = CAST(:best_params AS JSONB),
            file_name = :file_name,
            status = 'completed',
            finished_at = NOW(),
            error_message = NULL
        WHERE run_code = CAST(:run_code AS UUID) AND status = 'running'
        """,
        {
            "run_code": run_code,
            "last_data_date": last_data_date,
            "mae": _json(mae),
            "rmse": _json(rmse),
            "best_params": _json(best_params),
            "file_name": file_name,
        },
    )
    if updated != 1:
        raise RuntimeError(f"Không tìm thấy training run đang chạy: {run_code}")


def fail_training_run(
    run_code: str,
    error_message: str,
    last_data_date: date | None = None,
    file_name: str | None = None,
) -> None:
    _execute(
        """
        UPDATE model_training_runs
        SET last_data_date = COALESCE(:last_data_date, last_data_date),
            file_name = COALESCE(:file_name, file_name),
            status = 'failed',
            finished_at = NOW(),
            error_message = :error_message
        WHERE run_code = CAST(:run_code AS UUID) AND status = 'running'
        """,
        {
            "run_code": run_code,
            "last_data_date": last_data_date,
            "file_name": file_name,
            "error_message": error_message[:4000],
        },
    )

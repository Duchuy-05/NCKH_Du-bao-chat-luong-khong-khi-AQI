from pathlib import Path

import numpy as np
import pandas as pd
import pytest

from app.services import daily_predictor
from app.training.SVR import train_svr_daily


class FakeModel:
    def __init__(self, value: float):
        self.value = value
        self.calls = 0

    def predict(self, X):
        self.calls += 1
        return np.array([self.value])


def make_feature_frame() -> pd.DataFrame:
    dates = pd.date_range("2020-01-01", "2024-12-31", freq="D")
    frame = pd.DataFrame(index=dates)
    frame["temperature"] = np.arange(len(dates), dtype=float)
    frame["humidity"] = 60.0
    for horizon in range(1, 8):
        frame[f"d_{horizon}"] = 100.0 + horizon
    return frame


def test_train_builds_one_model_for_each_horizon(monkeypatch):
    def fake_train_horizon(df, forecast_date, horizon):
        model = FakeModel(float(horizon))
        return {
            "model": model,
            "feature_columns": ["temperature", "humidity"],
            "best_params": {"horizon": horizon},
            "metrics": {"mae": 1.0, "rmse": 1.5},
            "metadata": {"horizon": horizon, "train_samples": 30},
        }

    monkeypatch.setattr(train_svr_daily, "train_horizon", fake_train_horizon)
    bundle = train_svr_daily.train_from_frame(
        make_feature_frame(), forecast_date=pd.Timestamp("2024-06-30")
    )

    assert set(bundle["models"]) == {f"d_{h}" for h in range(1, 8)}
    assert set(bundle["metrics"]) == {f"d_{h}" for h in range(1, 8)}
    assert all(
        item["train_samples"] >= 30
        for item in bundle["training_metadata"].values()
    )


def test_failed_horizon_does_not_replace_existing_model_file(monkeypatch, tmp_path):
    model_path = tmp_path / "svr_daily.joblib"
    model_path.write_bytes(b"old-model")
    monkeypatch.setattr(train_svr_daily, "SVR_DAILY_MODEL_PATH", model_path)

    def fail_dump(bundle, path):
        raise RuntimeError("forced save failure")

    monkeypatch.setattr(train_svr_daily.joblib, "dump", fail_dump)
    with pytest.raises(RuntimeError, match="forced save failure"):
        train_svr_daily._save_bundle_atomically({})

    assert model_path.read_bytes() == b"old-model"


def test_predictor_rejects_bundle_missing_one_horizon(monkeypatch):
    monkeypatch.setattr(
        daily_predictor,
        "SVR_DAILY_MODEL_PATH",
        Path("missing-model.joblib"),
    )
    monkeypatch.setattr(
        daily_predictor.joblib,
        "load",
        lambda path: {
            "models": {f"d_{h}": FakeModel(h) for h in range(1, 7)},
            "feature_columns": ["temperature"],
            "target_columns": [f"d_{h}" for h in range(1, 8)],
        },
    )

    with pytest.raises(ValueError, match="d_7"):
        daily_predictor.DailyPredictor()


def test_predictor_preserves_existing_daily_response_shape(monkeypatch):
    models = {f"d_{h}": FakeModel(float(h)) for h in range(1, 8)}
    monkeypatch.setattr(
        daily_predictor.joblib,
        "load",
        lambda path: {
            "models": models,
            "feature_columns": ["temperature"],
            "target_columns": [f"d_{h}" for h in range(1, 8)],
        },
    )
    predictor = daily_predictor.DailyPredictor()
    last_date = pd.Timestamp("2024-06-30")
    monkeypatch.setattr(
        predictor,
        "_build_latest_feature_row",
        lambda: (
            pd.DataFrame({"temperature": [20.0]}, index=[last_date]),
            last_date,
        ),
    )

    response = predictor.predict()

    assert response.city == "hanoi"
    assert response.algo == "svr"
    assert response.horizon_days == 7
    assert len(response.forecast) == 7
    assert [point.aqi for point in response.forecast] == [
        float(h) for h in range(1, 8)
    ]

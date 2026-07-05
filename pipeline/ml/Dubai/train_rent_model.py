"""
Train Rent Model — Dubai Rental Yield
======================================
Fits a Prophet model on mock historical rental data and serializes
the artifact to ``dubai_rent_model.pkl``.

Usage (standalone):
    python train_rent_model.py

The resulting pickle is consumed by ``generate_forecast.py``.
"""

import logging
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from prophet import Prophet

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

# ── Constants ────────────────────────────────────────────────────────────────
MODEL_DIR = Path(__file__).resolve().parent / "artifacts"
MODEL_PATH = MODEL_DIR / "dubai_rent_model.pkl"


def _generate_mock_data() -> pd.DataFrame:
    """
    Produce synthetic Dubai rental-yield data for training.

    In production this would be replaced by a SQL query against the
    ``fact_rental_yields`` table filtered to ``region = 'Dubai'``.

    Returns:
        DataFrame with columns ``ds``, ``y``.
    """
    np.random.seed(99)
    dates = pd.date_range(start="2015-01-01", periods=120, freq="MS")

    # Simulate annual rent in AED with a gradual uptrend
    base_rent = 85_000  # AED / year
    trend = np.linspace(0, 35_000, len(dates))
    seasonal = 5_000 * np.sin(np.linspace(0, 8 * np.pi, len(dates)))
    noise = np.random.normal(0, 3_000, len(dates))
    rents = base_rent + trend + seasonal + noise

    return pd.DataFrame({"ds": dates, "y": rents})


def train() -> None:
    """Fit the Prophet model for Dubai Rental Yield."""

    logger.info("Generating mock rental training data …")
    df = _generate_mock_data()

    logger.info("Initialising Prophet model …")
    model = Prophet(
        yearly_seasonality=True,
        weekly_seasonality=False,
        daily_seasonality=False,
        changepoint_prior_scale=0.1,
    )

    logger.info("Fitting model on %d observations …", len(df))
    model.fit(df)

    # Persist
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, MODEL_PATH)
    logger.info("Model saved → %s", MODEL_PATH)


if __name__ == "__main__":
    train()

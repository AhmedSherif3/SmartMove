"""
Train Price Model — Dubai Capital Appreciation
================================================
Queries mock historical transaction data, adds ``exchange_rate`` as an
extra Prophet regressor, fits the model, and serializes the trained
artifact to ``dubai_price_model.pkl``.

Usage (standalone):
    python train_price_model.py

The resulting pickle is consumed by ``generate_forecast.py``.
"""

import logging
import os
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from prophet import Prophet

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

# ── Constants ────────────────────────────────────────────────────────────────
MODEL_DIR = Path(__file__).resolve().parent / "artifacts"
MODEL_PATH = MODEL_DIR / "dubai_price_model.pkl"


def _generate_mock_data() -> pd.DataFrame:
    """
    Produce synthetic Dubai property-price data for training.

    In production this would be replaced by a SQL query against the
    ``fact_transactions`` table filtered to ``region = 'Dubai'``.

    Returns:
        DataFrame with columns ``ds``, ``y``, ``exchange_rate``.
    """
    np.random.seed(42)
    dates = pd.date_range(start="2015-01-01", periods=120, freq="MS")

    # Simulate a steadily appreciating market with seasonal noise
    base_price = 1_200_000  # AED
    trend = np.linspace(0, 400_000, len(dates))
    seasonal = 50_000 * np.sin(np.linspace(0, 8 * np.pi, len(dates)))
    noise = np.random.normal(0, 25_000, len(dates))
    prices = base_price + trend + seasonal + noise

    # Simulate AED/USD exchange-rate fluctuations
    exchange_rate = 3.6725 + np.random.normal(0, 0.005, len(dates)).cumsum()

    return pd.DataFrame({"ds": dates, "y": prices, "exchange_rate": exchange_rate})


def train() -> None:
    """Fit the Prophet model for Dubai Capital Appreciation."""

    logger.info("Generating mock training data …")
    df = _generate_mock_data()

    logger.info("Initialising Prophet model with exchange_rate regressor …")
    model = Prophet(
        yearly_seasonality=True,
        weekly_seasonality=False,
        daily_seasonality=False,
        changepoint_prior_scale=0.05,
    )
    model.add_regressor("exchange_rate")

    logger.info("Fitting model on %d observations …", len(df))
    model.fit(df)

    # Persist
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, MODEL_PATH)
    logger.info("Model saved → %s", MODEL_PATH)


if __name__ == "__main__":
    train()

"""
Generate Forecast — Dubai 10-Year Projection
==============================================
Loads both the price and rent ``.pkl`` models, generates a 120-month
future dataframe, predicts outcomes (``yhat``, ``yhat_lower``,
``yhat_upper``), and calculates a 10-year **Projected ROI %**.
"""

import logging
import os
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sqlalchemy import create_engine

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

# ── Constants ────────────────────────────────────────────────────────────────
ARTIFACTS_DIR = Path(__file__).resolve().parent / "artifacts"
PRICE_MODEL_PATH = ARTIFACTS_DIR / "dubai_price_model.pkl"
RENT_MODEL_PATH = ARTIFACTS_DIR / "dubai_rent_model.pkl"
FORECAST_HORIZON_MONTHS = 120  # 10 years


def _build_future_df(model, periods: int) -> pd.DataFrame:
    future = model.make_future_dataframe(periods=periods, freq="MS")
    for regressor in model.extra_regressors:
        if regressor not in future.columns:
            future[regressor] = 3.6725  # AED/USD baseline
    return future


def generate() -> pd.DataFrame:
    # ── Load models ──────────────────────────────────────────────────────
    if not PRICE_MODEL_PATH.exists():
        raise FileNotFoundError(f"Price model not found at {PRICE_MODEL_PATH}.")
    if not RENT_MODEL_PATH.exists():
        raise FileNotFoundError(f"Rent model not found at {RENT_MODEL_PATH}.")

    price_model = joblib.load(PRICE_MODEL_PATH)
    rent_model = joblib.load(RENT_MODEL_PATH)
    logger.info("Both models loaded successfully.")

    # ── Price forecast ───────────────────────────────────────────────────
    price_future = _build_future_df(price_model, FORECAST_HORIZON_MONTHS)
    price_forecast = price_model.predict(price_future)
    price_forecast = price_forecast.tail(FORECAST_HORIZON_MONTHS).reset_index(drop=True)

    # ── Rent forecast ────────────────────────────────────────────────────
    rent_future = _build_future_df(rent_model, FORECAST_HORIZON_MONTHS)
    rent_forecast = rent_model.predict(rent_future)
    rent_forecast = rent_forecast.tail(FORECAST_HORIZON_MONTHS).reset_index(drop=True)

    # ── Combine into a single dataframe ──────────────────────────────────
    combined = pd.DataFrame(
        {
            "ds": price_forecast["ds"],
            "price_yhat": price_forecast["yhat"],
            "price_lower": price_forecast["yhat_lower"],
            "price_upper": price_forecast["yhat_upper"],
            "rent_yhat": rent_forecast["yhat"],
            "rent_lower": rent_forecast["yhat_lower"],
            "rent_upper": rent_forecast["yhat_upper"],
        }
    )

    # ── Calculate 10-year Projected ROI % ────────────────────────────────
    initial_price = combined["price_yhat"].iloc[0]
    final_price = combined["price_yhat"].iloc[-1]
    capital_appreciation = final_price - initial_price
    cumulative_rent = combined["rent_yhat"].sum()

    total_return = capital_appreciation + cumulative_rent
    projected_roi_pct = (total_return / initial_price) * 100 if initial_price else 0.0

    combined["projected_roi_pct"] = round(projected_roi_pct, 2)

    logger.info(
        "10-Year Projected ROI: %.2f%% (Capital Appreciation: %.0f AED, Cumulative Rent: %.0f AED)",
        projected_roi_pct,
        capital_appreciation,
        cumulative_rent,
    )

    # ── 1. Calculate Admin/DW Keys ───────────────────────────────────────
    combined['prediction_id'] = combined['ds'].dt.strftime('%Y%m') + "_" + pd.Timestamp.now().strftime('%Y%m%d%H%M')
    combined['target_date_id'] = combined['ds'].dt.strftime('%Y%m%d').astype(int)
    combined['is_latest_forecast'] = 1
    combined['generated_at'] = pd.Timestamp.now()

    # ── 2. Persist to Azure Synapse Data Warehouse ───────────────────────
    azure_conn_str = os.environ.get("AZURE_SQL_CONN") 
    
    if azure_conn_str:
        logger.info("Connecting to Azure Synapse...")
        engine = create_engine(azure_conn_str, fast_executemany=True)
        
        logger.info("Pushing 120-month forecast to fact_predictions_dubai...")
        combined.to_sql(
            'fact_predictions_dubai', 
            con=engine, 
            if_exists='append', 
            index=False
        )
        logger.info("Database insertion complete.")
    else:
        output_path = ARTIFACTS_DIR / "dubai_forecast_120m.csv"
        combined.to_csv(output_path, index=False)
        logger.warning(f"No AZURE_SQL_CONN found. Saved locally to {output_path}")

    return combined


if __name__ == "__main__":
    result = generate()
    print("\n" + result.head().to_string(index=False))
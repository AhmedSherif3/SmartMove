import logging
import os
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sqlalchemy import create_engine

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

ARTIFACTS_DIR = Path(__file__).resolve().parent / "artifacts"
PRICE_MODEL_PATH = ARTIFACTS_DIR / "egypt_price_model.pkl"
RENT_MODEL_PATH = ARTIFACTS_DIR / "egypt_rent_model.pkl"
FORECAST_HORIZON_MONTHS = 120  # 10 years

def _build_future_df(model, periods: int) -> pd.DataFrame:
    return model.make_future_dataframe(periods=periods, freq="MS")

def generate() -> pd.DataFrame:
    if not PRICE_MODEL_PATH.exists() or not RENT_MODEL_PATH.exists():
        raise FileNotFoundError("Egypt models not found in artifacts directory.")

    price_model = joblib.load(PRICE_MODEL_PATH)
    rent_model = joblib.load(RENT_MODEL_PATH)
    logger.info("Egypt models loaded successfully.")

    price_forecast = price_model.predict(_build_future_df(price_model, FORECAST_HORIZON_MONTHS))
    price_forecast = price_forecast.tail(FORECAST_HORIZON_MONTHS).reset_index(drop=True)

    rent_forecast = rent_model.predict(_build_future_df(rent_model, FORECAST_HORIZON_MONTHS))
    rent_forecast = rent_forecast.tail(FORECAST_HORIZON_MONTHS).reset_index(drop=True)

    combined = pd.DataFrame({
        "ds": price_forecast["ds"],
        "price_yhat": price_forecast["yhat"],
        "price_lower": price_forecast["yhat_lower"],
        "price_upper": price_forecast["yhat_upper"],
        "rent_yhat": rent_forecast["yhat"],
        "rent_lower": rent_forecast["yhat_lower"],
        "rent_upper": rent_forecast["yhat_upper"],
    })

    initial_price = combined["price_yhat"].iloc[0]
    final_price = combined["price_yhat"].iloc[-1]
    capital_appreciation = final_price - initial_price
    cumulative_rent = combined["rent_yhat"].sum()

    total_return = capital_appreciation + cumulative_rent
    projected_roi_pct = (total_return / initial_price) * 100 if initial_price else 0.0
    combined["projected_roi_pct"] = round(projected_roi_pct, 2)

    logger.info(
        "10-Year Projected ROI: %.2f%% (Capital Appreciation: %.0f EGP, Cumulative Rent: %.0f EGP)",
        projected_roi_pct, capital_appreciation, cumulative_rent,
    )

    combined['prediction_id'] = combined['ds'].dt.strftime('%Y%m') + "_" + pd.Timestamp.now().strftime('%Y%m%d%H%M')
    combined['target_date_id'] = combined['ds'].dt.strftime('%Y%m%d').astype(int)
    combined['is_latest_forecast'] = 1
    combined['generated_at'] = pd.Timestamp.now()

    azure_conn_str = os.environ.get("AZURE_SQL_CONN") 
    
    if azure_conn_str:
        logger.info("Connecting to Azure Synapse...")
        engine = create_engine(azure_conn_str, fast_executemany=True)
        logger.info("Pushing 120-month forecast to fact_predictions_egypt...")
        combined.to_sql('fact_predictions_egypt', con=engine, if_exists='append', index=False)
        logger.info("Database insertion complete.")
    else:
        output_path = ARTIFACTS_DIR / "egypt_forecast_120m.csv"
        combined.to_csv(output_path, index=False)
        logger.warning(f"No AZURE_SQL_CONN found. Saved locally to {output_path}")

    return combined

if __name__ == "__main__":
    result = generate()
    print("\n" + result.head().to_string(index=False))

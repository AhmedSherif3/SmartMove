import pandas as pd
import numpy as np
from prophet import Prophet
import joblib
from pathlib import Path
import logging

logging.basicConfig(level=logging.INFO)
ARTIFACTS_DIR = Path(__file__).resolve().parent / "artifacts"
ARTIFACTS_DIR.mkdir(exist_ok=True)

def train():
    logging.info("Generating placeholder UK Rent data...")
    # Generate dummy data for the UK market (GBP)
    dates = pd.date_range(start="2015-01-01", end="2025-01-01", freq="MS")
    rents = np.linspace(1200, 1800, len(dates)) + np.random.normal(0, 50, len(dates))
    
    df = pd.DataFrame({'ds': dates, 'y': rents})
    
    logging.info("Training placeholder UK Rent model...")
    model = Prophet()
    model.fit(df)
    
    output_path = ARTIFACTS_DIR / "england_rent_model.pkl"
    joblib.dump(model, output_path)
    logging.info(f"Model saved -> {output_path}")

if __name__ == "__main__":
    train()

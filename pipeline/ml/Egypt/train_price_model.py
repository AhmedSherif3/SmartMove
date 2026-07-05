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
    logging.info("Generating placeholder Egypt Price data...")
    dates = pd.date_range(start="2015-01-01", end="2025-01-01", freq="MS")
    # Base price ~ 3.5M EGP
    prices = np.linspace(2000000, 5000000, len(dates)) + np.random.normal(0, 50000, len(dates))
    
    df = pd.DataFrame({'ds': dates, 'y': prices})
    
    logging.info("Training placeholder Egypt Price model...")
    model = Prophet()
    model.fit(df)
    
    output_path = ARTIFACTS_DIR / "egypt_price_model.pkl"
    joblib.dump(model, output_path)
    logging.info(f"Model saved -> {output_path}")

if __name__ == "__main__":
    train()

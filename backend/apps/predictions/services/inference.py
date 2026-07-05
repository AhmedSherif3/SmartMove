"""
Inference Service — apps.predictions.services
===============================================
Production implementation of live "what-if" scenario inference using
pre-trained Prophet ``.pkl`` models.

Architecture:
    1. Models are loaded from disk (``pipeline/ml/<region>/artifacts/``).
    2. A thread-safe in-memory cache (``_MODEL_CACHE``) prevents redundant
       deserialization on every request.
    3. A future dataframe is built with user-specified regressor overrides
       (e.g. exchange_rate adjustments, demand shocks).
    4. ``model.predict()`` produces ``yhat``, ``yhat_lower``, ``yhat_upper``.
    5. A projected ROI % is derived from capital appreciation + cumulative
       rental income over the forecast horizon.

Security:
    • Only pre-trained, serialized models are loaded — no user-supplied code
      is ever executed.
    • Region names are validated against an allow-list before constructing
      filesystem paths, preventing path-traversal attacks.
"""

import logging
import threading
from decimal import Decimal
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd
from prophet import Prophet  # type: ignore[import-untyped]

logger = logging.getLogger(__name__)

# ──────────────────────────────────────────────────────────────────────────────
# Constants
# ──────────────────────────────────────────────────────────────────────────────

# Root of the ML pipeline artifacts — relative to the monorepo root.
# In production this would be replaced by an Azure Blob download layer.
_ML_PIPELINE_ROOT = Path(__file__).resolve().parents[4] / 'pipeline' / 'ml'

# Regions for which we have trained models.  Used as an allow-list to
# prevent path-traversal via a malicious ``region`` parameter.
_SUPPORTED_REGIONS: dict[str, str] = {
    'dubai': 'Dubai',
    'egypt': 'Egypt',
    'england': 'England',
}

# Default regressor baselines (used when the caller doesn't override).
_DEFAULT_REGRESSORS: dict[str, float] = {
    'exchange_rate': 3.6725,  # AED/USD baseline
}

# ──────────────────────────────────────────────────────────────────────────────
# Thread-safe in-memory model cache
# ──────────────────────────────────────────────────────────────────────────────
_MODEL_CACHE: dict[str, Prophet] = {}
_CACHE_LOCK = threading.Lock()


def _get_model(model_path: Path) -> Prophet:
    """
    Load a Prophet model from disk with in-memory caching.

    The cache key is the absolute string path.  The lock ensures
    thread-safety when multiple Django request-threads hit this
    concurrently.
    """
    cache_key = str(model_path)

    # Fast path: already cached (no lock required for reads on dicts)
    if cache_key in _MODEL_CACHE:
        return _MODEL_CACHE[cache_key]

    with _CACHE_LOCK:
        # Double-check after acquiring lock
        if cache_key in _MODEL_CACHE:
            return _MODEL_CACHE[cache_key]

        if not model_path.exists():
            raise FileNotFoundError(
                f"Model artifact not found at {model_path}. "
                "Ensure the Airflow training DAG has run for this region."
            )

        model = joblib.load(model_path)
        _MODEL_CACHE[cache_key] = model
        logger.info(
            "Model loaded and cached: %s",
            model_path.name,
            extra={'event': 'model_cache_load', 'path': str(model_path)},
        )
        return model


def _build_future_df(
    model: Prophet,
    periods: int,
    regressor_overrides: dict[str, float],
) -> pd.DataFrame:
    """
    Build a future dataframe compatible with the given model.

    For each extra regressor the model was trained with, inject the
    caller's override value (or the default baseline if not specified).
    """
    future = model.make_future_dataframe(periods=periods, freq='MS')

    for regressor in model.extra_regressors:
        value = regressor_overrides.get(
            regressor, _DEFAULT_REGRESSORS.get(regressor, 0.0)
        )
        future[regressor] = value

    return future


# ──────────────────────────────────────────────────────────────────────────────
# Public API
# ──────────────────────────────────────────────────────────────────────────────

def run_live_what_if_scenario(
    region: str,
    parameters: dict[str, Any],
) -> dict[str, Any]:
    """
    Execute a live what-if scenario using the trained Prophet model
    for the specified region.

    Args:
        region: Target region (``Dubai``, ``Egypt``, ``England``).
        parameters: Dict of scenario knobs, for example::

            {
                "exchange_rate_delta": 0.05,
                "demand_shock_pct": -10,
                "months_ahead": 60,
                "property_type": "Apartment",
            }

    Returns:
        A dictionary with predicted outcomes under the given parameters::

            {
                "region": "Dubai",
                "parameters": {...},
                "status": "success",
                "forecast": {
                    "months_ahead": 60,
                    "projected_price": 1650000.00,
                    "projected_rent": 95000.00,
                    "projected_roi_pct": 72.5,
                    "price_lower": 1480000.00,
                    "price_upper": 1820000.00,
                    "rent_lower": 82000.00,
                    "rent_upper": 108000.00,
                },
                "time_series": [...],  # per-month predictions
                "message": "...",
            }

    Raises:
        ValueError: If the region is not supported.
        FileNotFoundError: If the model artifact hasn't been trained.
    """
    # ── 1. Validate region ───────────────────────────────────────────────
    region_key = region.strip().lower()
    if region_key not in _SUPPORTED_REGIONS:
        raise ValueError(
            f"Unsupported region '{region}'. "
            f"Supported: {', '.join(_SUPPORTED_REGIONS.values())}"
        )

    region_label = _SUPPORTED_REGIONS[region_key]
    region_dir = _ML_PIPELINE_ROOT / region_label

    # ── 2. Resolve model paths ───────────────────────────────────────────
    price_model_path = region_dir / 'artifacts' / f'{region_key}_price_model.pkl'
    rent_model_path = region_dir / 'artifacts' / f'{region_key}_rent_model.pkl'

    # ── 3. Load models (with cache) ──────────────────────────────────────
    try:
        price_model = _get_model(price_model_path)
        rent_model = _get_model(rent_model_path)
    except FileNotFoundError as exc:
        logger.error(
            "Model loading failed for region '%s': %s",
            region_label, exc,
            extra={'event': 'inference_model_missing', 'region': region_label},
        )
        raise

    # ── 4. Extract parameters ────────────────────────────────────────────
    months_ahead: int = int(parameters.get('months_ahead', 60))
    exchange_rate_delta: float = float(parameters.get('exchange_rate_delta', 0.0))

    # Build regressor overrides from parameters
    regressor_overrides: dict[str, float] = {}
    baseline_exchange_rate = _DEFAULT_REGRESSORS.get('exchange_rate', 3.6725)
    regressor_overrides['exchange_rate'] = baseline_exchange_rate + exchange_rate_delta

    # Apply demand shock as a post-prediction multiplier
    demand_shock_pct: float = float(parameters.get('demand_shock_pct', 0.0))
    demand_multiplier: float = 1.0 + (demand_shock_pct / 100.0)

    # ── 5. Build future dataframes ───────────────────────────────────────
    price_future = _build_future_df(price_model, months_ahead, regressor_overrides)
    rent_future = _build_future_df(rent_model, months_ahead, regressor_overrides)

    # ── 6. Predict ───────────────────────────────────────────────────────
    price_forecast = price_model.predict(price_future)
    rent_forecast = rent_model.predict(rent_future)

    # Keep only the future portion (exclude historical fit)
    price_forecast = price_forecast.tail(months_ahead).reset_index(drop=True)
    rent_forecast = rent_forecast.tail(months_ahead).reset_index(drop=True)

    # Apply demand shock multiplier to price predictions
    price_forecast['yhat'] *= demand_multiplier
    price_forecast['yhat_lower'] *= demand_multiplier
    price_forecast['yhat_upper'] *= demand_multiplier

    # ── 7. Calculate Projected ROI % ─────────────────────────────────────
    initial_price = float(price_forecast['yhat'].iloc[0])
    final_price = float(price_forecast['yhat'].iloc[-1])
    capital_appreciation = final_price - initial_price
    cumulative_rent = float(rent_forecast['yhat'].sum())

    total_return = capital_appreciation + cumulative_rent
    projected_roi_pct = round(
        (total_return / initial_price) * 100 if initial_price > 0 else 0.0,
        2,
    )

    # ── 8. Build time-series payload ─────────────────────────────────────
    time_series = [
        {
            'date': row['ds'].strftime('%Y-%m-%d'),
            'price_yhat': round(float(row['yhat']), 2),
            'price_lower': round(float(row['yhat_lower']), 2),
            'price_upper': round(float(row['yhat_upper']), 2),
            'rent_yhat': round(float(rent_forecast.loc[idx, 'yhat']), 2),
            'rent_lower': round(float(rent_forecast.loc[idx, 'yhat_lower']), 2),
            'rent_upper': round(float(rent_forecast.loc[idx, 'yhat_upper']), 2),
        }
        for idx, row in price_forecast.iterrows()
    ]

    logger.info(
        "What-if inference complete: region=%s, months=%d, ROI=%.2f%%",
        region_label, months_ahead, projected_roi_pct,
        extra={
            'event': 'inference_complete',
            'region': region_label,
            'months_ahead': months_ahead,
            'roi_pct': projected_roi_pct,
        },
    )

    # ── 9. Return structured result ──────────────────────────────────────
    return {
        'region': region_label,
        'parameters': parameters,
        'status': 'success',
        'forecast': {
            'months_ahead': months_ahead,
            'projected_price': round(final_price, 2),
            'projected_rent': round(cumulative_rent / max(months_ahead, 1) * 12, 2),
            'projected_roi_pct': projected_roi_pct,
            'price_lower': round(float(price_forecast['yhat_lower'].iloc[-1]), 2),
            'price_upper': round(float(price_forecast['yhat_upper'].iloc[-1]), 2),
            'rent_lower': round(float(rent_forecast['yhat_lower'].iloc[-1]), 2),
            'rent_upper': round(float(rent_forecast['yhat_upper'].iloc[-1]), 2),
        },
        'time_series': time_series,
        'message': (
            f'Live {months_ahead}-month what-if scenario for {region_label} '
            f'completed successfully (Projected ROI: {projected_roi_pct}%).'
        ),
    }

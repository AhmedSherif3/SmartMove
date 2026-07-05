{{ config(as_columnstore=False, 
    materialized='incremental',
    unique_key='prediction_id'
) }}

-- This query creates the empty schema on the first dbt run.
-- The Kubernetes ML Pod (generate_forecast.py) will populate it using SQLAlchemy.

SELECT 
    CAST(NULL AS VARCHAR(255)) AS prediction_id,     -- e.g., '202606_20301201'
    CAST(NULL AS INT) AS target_date_id,             -- e.g., 20301201 (Links to dim_date_predicted)
    CAST(NULL AS DATETIME) AS ds,                    -- Raw forecast date from Prophet
    
    -- Price Forecast Outputs
    CAST(NULL AS FLOAT) AS price_yhat,
    CAST(NULL AS FLOAT) AS price_lower,
    CAST(NULL AS FLOAT) AS price_upper,
    
    -- Rent Forecast Outputs
    CAST(NULL AS FLOAT) AS rent_yhat,
    CAST(NULL AS FLOAT) AS rent_lower,
    CAST(NULL AS FLOAT) AS rent_upper,
    
    -- ROI Output
    CAST(NULL AS FLOAT) AS projected_roi_pct,
    
    -- Admin Tracking
    CAST(NULL AS INT) AS is_latest_forecast,         -- 1 for current, 0 for historical predictions
    CAST(NULL AS DATETIME) AS generated_at           -- Timestamp of the ML run
WHERE 1 = 0
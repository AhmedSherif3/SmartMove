{{ config(as_columnstore=False, 
    materialized='table'
) }}

WITH 
-- 1. Cascading CTE to generate exact numbers without SQL loops
L0   AS (SELECT c FROM (VALUES(1),(1)) AS D(c)),
L1   AS (SELECT 1 AS c FROM L0 AS A CROSS JOIN L0 AS B),
L2   AS (SELECT 1 AS c FROM L1 AS A CROSS JOIN L1 AS B),
L3   AS (SELECT 1 AS c FROM L2 AS A CROSS JOIN L2 AS B),
L4   AS (SELECT 1 AS c FROM L3 AS A CROSS JOIN L3 AS B),
Nums AS (SELECT ROW_NUMBER() OVER(ORDER BY (SELECT NULL)) - 1 AS n FROM L4),

-- 2. Dynamically define Start (Current Month) and End (+120 Months / 10 Years)
DateBoundaries AS (
    SELECT 
        -- Start: The first day of the current month
        DATEADD(month, DATEDIFF(month, 0, GETDATE()), 0) AS start_date, 
        -- End: The last day of the month, exactly 10 years from now
        EOMONTH(DATEADD(year, 10, GETDATE())) AS end_date 
),

-- 3. Generate the sequence of exact dates
DateSequence AS (
    SELECT 
        DATEADD(day, t.n, b.start_date) AS full_date
    FROM Nums t
    CROSS JOIN DateBoundaries b
    WHERE DATEADD(day, t.n, b.start_date) <= b.end_date
)

-- 4. Build the final dimension columns for the Power BI Prediction Perspective
SELECT 
    CAST(FORMAT(full_date, 'yyyyMMdd') AS INT) AS date_id,
    full_date AS date,
    YEAR(full_date) AS year,
    MONTH(full_date) AS month_number,
    DATENAME(month, full_date) AS month_name,
    DAY(full_date) AS day_of_month,
    DATEPART(quarter, full_date) AS quarter
FROM DateSequence
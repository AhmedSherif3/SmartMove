{{ config(as_columnstore=False, materialized='table') }}

with d as (
    select distinct instance_date_parsed as full_date
    from {{ ref('stg_dubai') }}
    where instance_date_parsed is not null
)
select
    cast(format(full_date, 'yyyyMMdd') as int) as date_id,
    full_date,
    datepart(day, full_date) as [day],
    datepart(month, full_date) as [month],
    datename(month, full_date) as month_name,
    datepart(quarter, full_date) as [quarter],
    datepart(year, full_date) as [year]
from d
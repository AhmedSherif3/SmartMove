{{ config(materialized='view') }}

select
    *,
    try_cast(full_date as date) as instance_date_parsed
from {{ source('raw', 'raw_egypt_transactions') }}

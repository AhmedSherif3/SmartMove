{{ config(materialized='view') }}

select
    *,
    {{ parse_ddmmyyyy_to_date('instance_date') }} as instance_date_parsed
from {{ source('raw', 'raw_dubai_transactions') }}

{{ config(materialized='table', as_columnstore=false) }}

with loc as (
    select distinct
        city,
        governorate
    from {{ ref('stg_egy') }}
    where city is not null and governorate is not null
)

select
    {{ dbt_utils.generate_surrogate_key(['city','governorate']) }} as location_id,
    city,
    governorate
from loc
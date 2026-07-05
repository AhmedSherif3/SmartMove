{{ config(materialized='table', as_columnstore=false) }}

with years as (
    select distinct listing_year
    from {{ ref('stg_egy') }}
    where listing_year is not null
)

select
    listing_year as date_id,
    listing_year,
    cast(null as int) as month,
    cast(null as int) as quarter
from years
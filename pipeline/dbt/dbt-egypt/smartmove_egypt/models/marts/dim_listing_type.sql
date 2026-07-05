{{ config(materialized='table', as_columnstore=false) }}

with lt as (
    select distinct listing_type
    from {{ ref('stg_egy') }}
    where listing_type is not null
)

select
    {{ dbt_utils.generate_surrogate_key(['listing_type']) }} as listing_type_key,
    listing_type as listing_type_name,
    cast(null as varchar(100)) as listing_type_description
from lt
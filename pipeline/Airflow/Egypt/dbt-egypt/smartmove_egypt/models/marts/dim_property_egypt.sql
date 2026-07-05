{{ config(as_columnstore=False, materialized='table') }}

with p as (
    select distinct
        property_type_id,
        property_type_en,
        property_usage_en,
        has_parking
    from {{ ref('stg_egypt') }}
    where property_type_id is not null
)
select
    cast(property_type_id as int) as property_type_id,
    property_type_en,
    property_usage_en,
    has_parking
from p
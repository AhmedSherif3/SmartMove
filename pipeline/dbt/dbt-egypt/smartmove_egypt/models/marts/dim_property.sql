{{ config(materialized='table', as_columnstore=false) }}

with p as (
    select distinct
        property_type,
        property_category,
        listing_type,
        furnished,
        compound_name
    from {{ ref('stg_egy') }}
)

select
    {{ dbt_utils.generate_surrogate_key([
      'property_type',
      'property_category',
      'listing_type',
      'furnished',
      'compound_name'
    ]) }} as property_id,
    property_type,
    property_category,
    listing_type,
    furnished,
    compound_name
from p
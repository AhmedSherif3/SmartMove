{{ config(materialized='table', as_columnstore=false) }}

with base as (
    select * from {{ ref('stg_egy') }}
),

dim_location as (
    select * from {{ ref('dim_location') }}
),

dim_listing_type as (
    select * from {{ ref('dim_listing_type') }}
),

dim_property as (
    select * from {{ ref('dim_property') }}
)

select
    row_number() over (order by (select null)) as listing_id,
    b.listing_year as date_id,

    l.location_id,
    p.property_id,
    lt.listing_type_key,

    b.price_total,
    b.price_per_sqm,
    b.area_sqm

from base b
left join dim_location l
  on b.city = l.city
 and b.governorate = l.governorate
left join dim_listing_type lt
  on b.listing_type = lt.listing_type_name
left join dim_property p
  on b.property_type = p.property_type
 and b.property_category = p.property_category
 and b.listing_type = p.listing_type
 and b.furnished = p.furnished
 and (
      (b.compound_name is null and p.compound_name is null)
   or (b.compound_name = p.compound_name)
 )
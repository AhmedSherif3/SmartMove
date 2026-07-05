{{ config(materialized='view') }}

select
    try_cast(id as bigint) as listing_id,

    try_cast(area_sqm as float) as area_sqm,

    -- Egypt "date" is a YEAR in your file
    try_cast([date] as int) as listing_year,

    try_cast(price_total as float) as price_total,
    cast(price_currency as varchar(10)) as price_currency,
    try_cast(price_per_sqm as float) as price_per_sqm,

    ltrim(rtrim(cast(listing_type as varchar(100)))) as listing_type,
    ltrim(rtrim(cast(property_type as varchar(100)))) as property_type,
    ltrim(rtrim(cast(property_category as varchar(100)))) as property_category,
    ltrim(rtrim(cast(compound_name as varchar(200)))) as compound_name,

    try_cast(floor_number as int) as floor_number,

    ltrim(rtrim(cast(furnished as varchar(50)))) as furnished,

    ltrim(rtrim(cast(city as varchar(100)))) as city,
    ltrim(rtrim(cast(governorate as varchar(100)))) as governorate

from {{ source('raw', 'egypt_raw') }}
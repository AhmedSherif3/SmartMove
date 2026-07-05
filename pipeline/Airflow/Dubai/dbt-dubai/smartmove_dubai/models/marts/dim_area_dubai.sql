{{ config(as_columnstore=False, materialized='table') }}

with a as (
    select distinct area_id, area_name_en
    from {{ ref('stg_dubai') }}
    where area_id is not null
)
select
    cast(area_id as int) as area_id,
    area_name_en
from a
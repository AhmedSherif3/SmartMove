{{ config(as_columnstore=False, materialized='table') }}

with r as (
    select distinct reg_type_id, reg_type_en
    from {{ ref('stg_dubai') }}
    where reg_type_id is not null
)
select
    cast(reg_type_id as int) as reg_type_id,
    reg_type_en
from r
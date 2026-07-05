{{ config(as_columnstore=False, materialized='table') }}

with pr as (
    select distinct
        procedure_id,
        procedure_name_en,
        trans_group_id,
        trans_group_en
    from {{ ref('stg_egypt') }}
    where procedure_id is not null
)
select
    cast(procedure_id as int) as procedure_id,
    procedure_name_en,
    trans_group_id,
    trans_group_en
from pr
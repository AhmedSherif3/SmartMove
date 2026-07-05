{{ config(as_columnstore=False, materialized='table') }}

select
    transaction_id,

    cast(format(instance_date_parsed, 'yyyyMMdd') as int) as date_id,

    cast(property_type_id as int) as property_type_id,
    cast(area_id as int) as area_id,
    cast(procedure_id as int) as procedure_id,
    cast(reg_type_id as int) as reg_type_id,

    procedure_area,
    actual_worth,
    meter_sale_price,
    no_of_parties_role_1,
    no_of_parties_role_2

from {{ ref('stg_dubai') }}
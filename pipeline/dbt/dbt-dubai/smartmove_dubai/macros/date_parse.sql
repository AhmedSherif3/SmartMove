{% macro parse_ddmmyyyy_to_date(col) %}
    try_convert(date, {{ col }}, 105)
{% endmacro %}
"""
SQL Tool — Text-to-SQL on Azure SQL Data Warehouse
==========================================
CRITICAL SECURITY RULES:
    1. TOP 500 is automatically enforced on every query.
    2. Only SELECT statements are permitted — DDL/DML is blocked.
"""

import logging
import re

from django.db import connections  # type: ignore[import-untyped]
from langchain_core.tools import tool

logger = logging.getLogger(__name__)

# Patterns that indicate destructive SQL
_DANGEROUS_PATTERNS = re.compile(
    r'\b(DROP|DELETE|UPDATE|INSERT|ALTER|TRUNCATE|CREATE|GRANT|REVOKE|EXEC)\b',
    re.IGNORECASE,
)

MAX_ROW_LIMIT = 500


def _validate_and_sanitize(sql: str) -> str:
    """
    Validate that the SQL is a safe SELECT (MSSQL syntax).

    Raises ValueError on any policy violation.
    """
    stripped = sql.strip().rstrip(';')

    # Block destructive statements
    if _DANGEROUS_PATTERNS.search(stripped):
        raise ValueError(
            'Query rejected: only SELECT statements are permitted.'
        )

    # Must start with SELECT
    if not stripped.upper().startswith('SELECT'):
        raise ValueError('Query rejected: must be a SELECT statement.')

    # Auto-inject TOP if missing
    if not re.search(r'SELECT\s+TOP\b', stripped, re.IGNORECASE):
        stripped = re.sub(
            r'^SELECT\s+',
            f'SELECT TOP {MAX_ROW_LIMIT} ',
            stripped,
            flags=re.IGNORECASE,
        )
    else:
        # Enforce max limit
        top_match = re.search(r'SELECT\s+TOP\s+(\d+)', stripped, re.IGNORECASE)
        if top_match and int(top_match.group(1)) > MAX_ROW_LIMIT:
            stripped = re.sub(
                r'SELECT\s+TOP\s+\d+',
                f'SELECT TOP {MAX_ROW_LIMIT}',
                stripped,
                flags=re.IGNORECASE,
            )

    return stripped


@tool
def sql_query_tool(query: str) -> str:
    """
    Execute a read-only SQL query against the SmartMove Azure SQL Data Warehouse.

    IMPORTANT:
    - You are querying the raw Azure SQL database (MSSQL).
    - CRITICAL: The database contains over 34 million rows. You MUST aggregate data 
      at the database level (using SUM, AVG, COUNT, GROUP BY) whenever possible.
    - CRITICAL: You MUST use TRY_CAST(column_name AS FLOAT) whenever you use AVG() or SUM() on any column that is 'nvarchar' or 'varchar' (especially 'price').
    - IMPORTANT: If you use a GROUP BY clause, every column in your SELECT list and ORDER BY clause MUST either be inside an aggregate function (like SUM, AVG, COUNT) or be explicitly listed in the GROUP BY clause. You cannot select raw, unaggregated columns that are missing from the GROUP BY clause.
    - DYNAMIC FAST EXECUTION RULE: To prevent full-table scans on 34 million rows:
      - DO NOT USE TABLESAMPLE! It is not supported on these views and will crash the query with a syntax error.
      - Instead, rely on WHERE filters (like date ranges or specific regions) to reduce rows before aggregating.
      - SINGLE COUNTRY: If asked about ONE specific country (e.g. Egypt only), use 'SELECT TOP 1000' and include a WHERE clause for that country.
      - MULTIPLE COUNTRIES (COMPARISON): If asked to COMPARE countries or for ALL countries, filter the query to the most recent 6 months using a WHERE clause on the date column.
    - STRICT SCHEMA COMPLIANCE: You MUST ONLY query the tables and columns explicitly listed in the schema.
    - CRITICAL DATE TABLE RULE: For Dubai use `dim_date_dubai`, for Egypt use `dim_date_egypt`. For England, there is NO `dim_date_england` — you MUST use `dim_date` instead.
    - EXACT REGION VALUES: When filtering by country in the 'region' column, you MUST use exactly one of these string values: 'Dubai', 'Egypt', 'England'.
    - Only SELECT statements are allowed.
    - Results are automatically limited to 500 rows using TOP.
    - All monetary values are stored in their local currency.

    Args:
        query: A valid MSSQL SELECT statement.

    Returns:
        JSON string of the query results (list of dicts), or an error message.
    """
    import json

    try:
        safe_sql = _validate_and_sanitize(query)
    except ValueError as exc:
        return f'SECURITY ERROR: {exc}'

    try:
        if 'azure' not in connections.databases:
            return 'DATABASE ERROR: Azure SQL connection is not configured. Set USE_AZURE_DB=True in .env and ensure ODBC Driver 18 for SQL Server is installed.'

        with connections['azure'].cursor() as cursor:
            cursor.execute(safe_sql)
            columns = [col[0] for col in cursor.description]
            rows = cursor.fetchall()

        results = [dict(zip(columns, row)) for row in rows]

        logger.info(
            f'SQL tool: {len(results)} rows returned',
            extra={'event': 'sql_tool_success', 'row_count': len(results)},
        )

        return json.dumps(results, default=str)

    except Exception as exc:
        exc_str = str(exc)
        if 'not allowed to access the server' in exc_str or '40615' in exc_str:
            # Extract IP if possible
            ip_match = re.search(r"Client with IP address '([^']+)'", exc_str)
            ip_addr = ip_match.group(1) if ip_match else 'your current IP'
            logger.error(f"SQL tool blocked by Azure Firewall. IP: {ip_addr}")
            return f'DATABASE ERROR: Azure Firewall blocked the connection. Instruct the user that they must whitelist their IP address ({ip_addr}) in the Azure Management Portal for smartmove-sql-server.'
        
        logger.error(f"SQL tool execution failed: {exc_str} | Query: {safe_sql if 'safe_sql' in locals() else query}")
        return f'DATABASE ERROR: {exc_str}'

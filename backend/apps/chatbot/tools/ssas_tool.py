"""
SSAS Tool — Azure Analysis Services DAX Queries
================================================
Connects to Azure Analysis Services (AAS) via pyodbc and executes
DAX queries for OLAP-style analytics (cube aggregations, KPIs).
"""

import json
import logging
import os

from langchain_core.tools import tool

logger = logging.getLogger(__name__)

SSAS_CONNECTION_STRING = os.getenv(
    'SSAS_CONNECTION_STRING',
    'Provider=MSOLAP;Data Source={server};Initial Catalog={database};'
    'User ID={uid};Password={pwd};Persist Security Info=True;',
)
SSAS_SERVER = os.getenv('SSAS_SERVER', '')
SSAS_DATABASE = os.getenv('SSAS_DATABASE', '')
SSAS_UID = os.getenv('SSAS_UID', '')
SSAS_PWD = os.getenv('SSAS_PWD', '')


def _get_connection_string() -> str:
    """Build the SSAS OLEDB connection string from env vars."""
    return SSAS_CONNECTION_STRING.format(
        server=SSAS_SERVER,
        database=SSAS_DATABASE,
        uid=SSAS_UID,
        pwd=SSAS_PWD,
    )


@tool
def ssas_dax_tool(dax_query: str) -> str:
    """
    Execute a DAX query against the Azure Analysis Services cube.

    Use this tool for OLAP-style analytics: aggregated KPIs, year-over-year
    comparisons, and multi-dimensional roll-ups that are pre-computed in
    the Analysis Services model.

    Args:
        dax_query: A valid DAX EVALUATE or DEFINE+EVALUATE statement.

    Returns:
        JSON string of the query results, or an error message.
    """
    import pyodbc

    if not SSAS_SERVER:
        return (
            'SSAS is not configured. Please contact your administrator '
            'to set up Azure Analysis Services credentials.'
        )

    # Basic safety: block potentially dangerous operations
    dax_upper = dax_query.strip().upper()
    blocked = ['ALTER', 'DELETE', 'DROP', 'CREATE', 'PROCESS']
    for keyword in blocked:
        if keyword in dax_upper:
            return f'SECURITY ERROR: {keyword} operations are not permitted.'

    try:
        conn_str = _get_connection_string()
        conn = pyodbc.connect(conn_str)
        cursor = conn.cursor()
        cursor.execute(dax_query)

        columns = [col[0] for col in cursor.description]
        rows = cursor.fetchall()
        cursor.close()
        conn.close()

        results = [dict(zip(columns, row)) for row in rows]

        logger.info(
            f'SSAS tool: {len(results)} rows returned',
            extra={'event': 'ssas_tool_success', 'row_count': len(results)},
        )

        return json.dumps(results, default=str)

    except pyodbc.Error as exc:
        logger.exception('SSAS DAX query failed')
        return f'SSAS ERROR: {exc}'
    except Exception as exc:
        logger.exception('SSAS tool unexpected error')
        return f'ERROR: {exc}'

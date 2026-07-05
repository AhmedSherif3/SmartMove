# Secure, read-only Azure SQL executor
import re
from django.db import connections
from apps.agentic_ai.exceptions import AzureSandboxError

class AzureSQLSandbox:
    """
    Secure execution environment for the GPT-4o Data Engineer.
    Enforces read-only operations against the Azure Data Warehouse.
    """
    
    # The application-level firewall. 
    # Blocks destructive commands before they even hit the Azure network.
    FORBIDDEN_KEYWORDS = re.compile(
        r'\b(INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE|EXEC|EXECUTE|CREATE|GRANT|REVOKE)\b',
        re.IGNORECASE
    )

    @classmethod
    def get_database_schema(cls) -> str:
        """
        Dynamically fetches the schema of all tables in the Azure Data Warehouse,
        including actuals and fact_forecasts.
        """
        schema_info = []
        try:
            with connections['azure'].cursor() as cursor:
                # Query the information schema
                cursor.execute("""
                    SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE
                    FROM INFORMATION_SCHEMA.COLUMNS
                    WHERE TABLE_SCHEMA = 'dbo'
                    ORDER BY TABLE_NAME, ORDINAL_POSITION;
                """)
                rows = cursor.fetchall()
                
                tables = {}
                for row in rows:
                    table_name = row[0]
                    column_name = row[1]
                    data_type = row[2]
                    
                    if table_name not in tables:
                        tables[table_name] = []
                    tables[table_name].append(f"{column_name} ({data_type})")
                    
                for table, cols in tables.items():
                    schema_info.append(f"Table: {table}")
                    schema_info.append("Columns: " + ", ".join(cols))
                    schema_info.append("")
                    
            return "\n".join(schema_info)
        except Exception:
            # Fallback if DB is not reachable during development
            return (
                "Table: fact_forecasts\nColumns: region (varchar), property_type (varchar), price_forecast (float), date (date)\n\n"
                "Table: dim_properties\nColumns: id (int), region (varchar), price (float), date (date)\n"
            )

    @classmethod
    def execute_read_only_query(cls, sql_query: str) -> list[dict]:
        """
        Validates and executes a SELECT query against the 'azure' database connection.
        Returns the results as a list of dictionaries for the AI to read.
        """
        # 1. Application-Level Security Check
        if cls.FORBIDDEN_KEYWORDS.search(sql_query):
            raise AzureSandboxError(
                "Security Violation: The Data Engineer attempted to execute a mutating query. "
                "Only SELECT operations are permitted."
            )
            
        # 2. Execution via dedicated read-only connection tunnel
        try:
            # Assumes you have an 'azure' connection defined in settings.DATABASES
            with connections['azure'].cursor() as cursor:
                cursor.execute(sql_query)
                
                # If no columns are returned (e.g., an empty result set)
                if not cursor.description:
                    return []
                    
                columns = [col[0] for col in cursor.description]
                results = [
                    dict(zip(columns, row))
                    for row in cursor.fetchall()
                ]
                
            return results
            
        except Exception as e:
            # Catching PyODBC/SQL Server errors and routing them to our custom exception
            raise AzureSandboxError(f"Azure SQL Execution Failed: {str(e)}")
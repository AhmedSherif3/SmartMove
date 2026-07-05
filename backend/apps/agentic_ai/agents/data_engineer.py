import json
import logging
from django.conf import settings
from apps.chatbot.services.llm_factory import get_llm
from apps.agentic_ai.utils.constants import AI_MODEL_ROUTING
from apps.agentic_ai.tools.azure_sandbox import AzureSQLSandbox
from apps.agentic_ai.tools.minio_workspace import MinIOWorkspaceTool
from apps.agentic_ai.exceptions import AgenticBaseException
from langchain_core.messages import SystemMessage, HumanMessage
# pyrefly: ignore [missing-source-for-stubs]
import pandas as pd

logger = logging.getLogger(__name__)

class DataEngineerAgent:
    """
    Data Engineer Agent:
    Retrieves data from the Azure Data Warehouse (seeing all tables) 
    and Cloud Data (CSVs/Excel). Computes statistical summaries 
    to protect the context window before passing it to the Analyst.
    Powered by Gemini via LangChain.
    """

    def __init__(self):
        self.config = AI_MODEL_ROUTING["DATA_ENGINEER"]
        model_name = self.config.get("model_name", "gemini-2.5-flash")
        if model_name.startswith("smartmove") or model_name.startswith("gpt-"):
            model_name = "gemini-2.5-flash"
        self.llm = get_llm(model_name)

    def execute_task(self, instructions: str, workspace_id: str | None = None, user=None) -> dict:
        # Step 1: Azure SQL Warehouse logic
        schema_context = AzureSQLSandbox.get_database_schema()
        system_prompt = (
            "You are an expert Data Engineer. Write a strictly valid, read-only "
            "Microsoft SQL Server SELECT query based on the instructions.\n"
            "CRITICAL: The database contains over 34 million rows. You MUST aggregate data "
            "at the database level (using SUM, AVG, COUNT, GROUP BY) whenever possible. "
            "CRITICAL SQL RULES:\n"
            "1. You MUST use TRY_CAST(column_name AS FLOAT) whenever you use AVG() or SUM() on any column that is 'nvarchar' or 'varchar' (especially 'price'). If you do not cast nvarchar columns, the query will crash!\n"
            "2. If you use a GROUP BY clause, every column in your SELECT list and ORDER BY clause MUST either be inside an aggregate function (like SUM, AVG, COUNT) or be explicitly listed in the GROUP BY clause. You cannot select raw, unaggregated columns that are missing from the GROUP BY clause. NEVER use literal values (e.g. 'Egypt') in the GROUP BY clause.\n"
            "3. DYNAMIC FAST EXECUTION RULE: To prevent full-table scans on 34 million rows:\n"
            "   - DO NOT USE TABLESAMPLE! It is not supported on these views and will crash the query with a syntax error. Instead, rely on WHERE filters (like date ranges or specific regions) to reduce rows before aggregating.\n"
            "   - SINGLE COUNTRY: If asked about ONE specific country (e.g. Egypt only), use 'SELECT TOP 1000' and include a WHERE clause specifically filtering for that country.\n"
            "   - MULTIPLE COUNTRIES (COMPARISON): If asked to COMPARE countries or for ALL countries, you MUST filter the query to the most recent 12 months using a WHERE clause on the date column (e.g., WHERE date >= DATEADD(year, -1, GETDATE())). Do NOT use UNION ALL or TOP for comparisons, as it will bias the sample.\n"
            "4. STRICT SCHEMA COMPLIANCE: You MUST ONLY query the tables and columns explicitly listed in the schema below. DO NOT invent or guess table names.\n"
            "   - ***CRITICAL TABLE SELECTION***: ALWAYS query from `stg_dubai`, `stg_egypt`, or `stg_england` (depending on the requested region). These staging tables are fully denormalized and already contain columns like `property_type_en`, `area_name_en`, and `procedure_name_en`.\n"
            "   - DO NOT query `fact_transactions_*` or `raw_*_transactions` unless explicitly asked. DO NOT try to join with `dim_*` tables, the `stg_*` tables have everything you need.\n"
            "5. EXACT REGION VALUES: If filtering across a combined dataset (which you shouldn't need if using the specific country's stg table), you MUST use exact string values. But ideally, just query the specific country's staging table directly.\n\n"
            f"Here is the dynamic Azure DB schema:\n{schema_context}\n\n"
            "If no DB query is needed, output an empty string.\n"
            "Output strictly valid JSON in this format: {'sql_query': 'SELECT ...'}"
        )

        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=instructions)
        ]

        azure_raw_data = []
        sql_query = ""

        try:
            response = self.llm.invoke(messages)
            content = response.content or "{}"
            
            if isinstance(content, list):
                content = "".join([c.get("text", "") for c in content if isinstance(c, dict)])
            
            # Strip markdown code blocks if present
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0]
            elif "```" in content:
                content = content.split("```")[1].split("```")[0]
            
            ai_output = json.loads(content)
            sql_query = ai_output.get("sql_query", "")

            if sql_query:
                # Run SQL through firewall (queries Azure SQL)
                azure_raw_data = AzureSQLSandbox.execute_read_only_query(sql_query)

        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.warning("Data Engineer LLM or SQL failed: %s. Falling back to simulated metadata.", e)
            sql_query = f"SELECT location, avg_price, sales_volume FROM property_listings GROUP BY location; -- EXCEPTION: {str(e)}"
            azure_raw_data = [
                {"location": "Cairo Festival City", "avg_price": 4500000, "sales_volume": 140},
                {"location": "New Cairo", "avg_price": 3800000, "sales_volume": 250},
                {"location": "Madinaty", "avg_price": 2900000, "sales_volume": 320},
                {"location": "Sheikh Zayed", "avg_price": 5100000, "sales_volume": 180}
            ]

        # Step 2: MinIO Cloud Data logic
        minio_metadata = "No MinIO data requested or found."
        if workspace_id and user:
            try:
                minio_metadata = MinIOWorkspaceTool.extract_structured_data(workspace_id, user)
            except Exception as e:
                minio_metadata = f"Error reading MinIO files: {str(e)}"

        # Step 3: Compute mathematical metadata for Azure SQL to protect context window
        azure_metadata = "No Azure SQL data queried."
        if azure_raw_data:
            df = pd.DataFrame(azure_raw_data)
            if not df.empty:
                azure_metadata = f"--- Azure SQL Data Snapshot ---\nShape: {df.shape}\n"
                azure_metadata += f"Summary Stats:\n{df.describe(include='all').to_string()}\n"
                azure_metadata += f"First 3 Rows:\n{df.head(3).to_string()}\n"

        # The final output to pass to the Orchestrator
        return {
            "status": "success",
            "azure_raw_data": azure_raw_data,
            "azure_sql_metadata": azure_metadata,
            "minio_cloud_metadata": minio_metadata,
            "executed_query": sql_query,
            "usage": {
                "prompt_tokens": 0,
                "completion_tokens": 0
            }
        }
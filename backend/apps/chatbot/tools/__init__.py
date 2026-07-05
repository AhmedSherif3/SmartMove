"""
Chatbot Tools Package
=====================
Exports the ``get_tools()`` function that returns the list of
LangChain tools available to the SmartMove agent.

Tools:
    • sql_tool  — Text-to-SQL on sanitized views (LIMIT 1000 enforced).
    • ssas_tool — Azure Analysis Services DAX queries.
    • rag_tool  — pgvector semantic search over property embeddings.
"""

from .sql_tool import sql_query_tool
from .ssas_tool import ssas_dax_tool
from .rag_tool import rag_search_tool


def get_tools() -> list:
    """Return the ordered list of tools for the agent."""
    return [sql_query_tool, rag_search_tool, ssas_dax_tool]

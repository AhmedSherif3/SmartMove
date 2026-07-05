"""
RAG Tool — pgvector Semantic Search
====================================
Performs semantic similarity search over property embeddings stored
in pgvector using Azure text-embedding-3-small (1536 dimensions).
"""

import json
import logging
import os

from django.db import connection
from langchain_core.tools import tool

logger = logging.getLogger(__name__)

EMBEDDING_MODEL = 'text-embedding-3-small'
EMBEDDINGS_TABLE = 'chatbot_property_embeddings'
TOP_K = 10


def _get_query_embedding(text: str) -> list[float]:
    """Generate an embedding vector for the search query."""
    import openai

    client = openai.AzureOpenAI(
        api_key=os.getenv('AZURE_OPENAI_API_KEY', ''),
        azure_endpoint=os.getenv('AZURE_OPENAI_ENDPOINT', ''),
        api_version=os.getenv('AZURE_OPENAI_API_VERSION', '2024-12-01-preview'),
    )
    response = client.embeddings.create(model=EMBEDDING_MODEL, input=text)
    return response.data[0].embedding


@tool
def rag_search_tool(query: str) -> str:
    """
    Search the SmartMove property knowledge base using semantic similarity.

    This tool finds property listings, descriptions, and market data
    that are semantically related to the user's natural-language query.
    Use it when the user asks about specific property features, area
    descriptions, or qualitative market insights.

    Args:
        query: Natural-language search query about properties or markets.

    Returns:
        JSON string with the top matching documents and similarity scores.
    """
    try:
        embedding = _get_query_embedding(query)
        embedding_str = json.dumps(embedding)

        sql = f"""
            SELECT
                content,
                metadata,
                1 - (embedding <=> %s::vector) AS similarity
            FROM {EMBEDDINGS_TABLE}
            WHERE 1 - (embedding <=> %s::vector) > 0.70
            ORDER BY similarity DESC
            LIMIT %s;
        """

        with connection.cursor() as cursor:
            cursor.execute(sql, [embedding_str, embedding_str, TOP_K])
            columns = [col[0] for col in cursor.description]
            rows = cursor.fetchall()

        results = []
        for row in rows:
            doc = dict(zip(columns, row))
            # Parse metadata JSON if stored as string
            if isinstance(doc.get('metadata'), str):
                try:
                    doc['metadata'] = json.loads(doc['metadata'])
                except (json.JSONDecodeError, TypeError):
                    pass
            results.append(doc)

        logger.info(
            f'RAG tool: {len(results)} documents found',
            extra={'event': 'rag_tool_success', 'doc_count': len(results)},
        )

        if not results:
            return 'No relevant property data found for your query.'

        return json.dumps(results, default=str)

    except Exception as exc:
        logger.exception('RAG search failed')
        return f'RAG SEARCH ERROR: {exc}'

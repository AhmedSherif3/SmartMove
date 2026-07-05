"""
Semantic Cache — pgvector cosine-similarity response cache
==========================================================
Before invoking the (expensive) agent pipeline, we embed the
incoming query and check pgvector for a previous answer whose
cosine similarity exceeds **0.95**.

If a cache hit is found, the cached response is returned
immediately — saving LLM tokens and ~2-5 seconds of latency.
"""

import json
import logging
import os

from django.db import connection

logger = logging.getLogger(__name__)

SIMILARITY_THRESHOLD = 0.95
EMBEDDING_MODEL = 'text-embedding-3-small'
EMBEDDING_DIMENSIONS = 1536
CACHE_TABLE = 'chatbot_semantic_cache'


def _get_embedding(text: str) -> list[float]:
    """
    Generate an embedding vector using Azure text-embedding-3-small.

    Returns a list of floats (1536 dimensions).
    """
    import openai

    client = openai.AzureOpenAI(
        api_key=os.getenv('AZURE_OPENAI_API_KEY', ''),
        azure_endpoint=os.getenv('AZURE_OPENAI_ENDPOINT', ''),
        api_version=os.getenv('AZURE_OPENAI_API_VERSION', '2024-12-01-preview'),
    )
    response = client.embeddings.create(
        model=EMBEDDING_MODEL,
        input=text,
    )
    return response.data[0].embedding


def check_semantic_cache(query: str) -> dict | None:
    """
    Check if a semantically similar query has been answered before.

    Args:
        query: The user's natural-language input.

    Returns:
        A dict ``{"text": ..., "charts": ..., "follow_up_chips": ...}``
        if cosine similarity > 0.95, else ``None``.
    """
    try:
        embedding = _get_embedding(query)
        embedding_str = json.dumps(embedding)

        sql = f"""
            SELECT response_payload,
                   1 - (embedding <=> %s::vector) AS similarity
            FROM {CACHE_TABLE}
            WHERE 1 - (embedding <=> %s::vector) > %s
            ORDER BY similarity DESC
            LIMIT 1;
        """

        with connection.cursor() as cursor:
            cursor.execute(sql, [embedding_str, embedding_str, SIMILARITY_THRESHOLD])
            row = cursor.fetchone()

        if row:
            payload = json.loads(row[0]) if isinstance(row[0], str) else row[0]
            similarity = row[1]
            logger.info(
                f'Semantic cache HIT (similarity={similarity:.4f})',
                extra={'event': 'cache_hit', 'similarity': similarity},
            )
            return payload

        logger.debug('Semantic cache MISS', extra={'event': 'cache_miss'})
        return None

    except Exception as exc:
        # Cache failures must never block the agent pipeline
        logger.warning(
            f'Semantic cache check failed (non-fatal): {exc}',
            extra={'event': 'cache_error'},
        )
        return None


def store_in_cache(query: str, response_payload: dict) -> None:
    """
    Persist a query-response pair in the semantic cache.

    Called after a successful agent run so future similar queries
    can be short-circuited.
    """
    try:
        embedding = _get_embedding(query)
        embedding_str = json.dumps(embedding)
        payload_json = json.dumps(response_payload)

        sql = f"""
            INSERT INTO {CACHE_TABLE} (query_text, embedding, response_payload, created_at)
            VALUES (%s, %s::vector, %s, NOW())
            ON CONFLICT (query_text) DO UPDATE
                SET response_payload = EXCLUDED.response_payload,
                    embedding = EXCLUDED.embedding,
                    created_at = NOW();
        """

        with connection.cursor() as cursor:
            cursor.execute(sql, [query, embedding_str, payload_json])

        logger.info('Semantic cache STORE', extra={'event': 'cache_store'})

    except Exception as exc:
        logger.warning(
            f'Semantic cache store failed (non-fatal): {exc}',
            extra={'event': 'cache_store_error'},
        )

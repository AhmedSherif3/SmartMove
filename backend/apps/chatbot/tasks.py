"""
Celery Tasks for the Chatbot App
=================================
Background jobs that maintain the vector store and support the RAG pipeline.
"""

import json
import logging
import os
import io

from celery import shared_task
from django.db import connection
from django.core.cache import cache
import openai

logger = logging.getLogger(__name__)

EMBEDDING_MODEL = 'text-embedding-3-small'
EMBEDDINGS_TABLE = 'chatbot_property_embeddings'


def _embed_text(text: str) -> list[float]:
    """Generate an embedding via Azure text-embedding-3-small."""
    import openai

    client = openai.AzureOpenAI(
        api_key=os.getenv('AZURE_OPENAI_API_KEY', ''),
        azure_endpoint=os.getenv('AZURE_OPENAI_ENDPOINT', ''),
        api_version=os.getenv('AZURE_OPENAI_API_VERSION', '2024-12-01-preview'),
    )
    response = client.embeddings.create(model=EMBEDDING_MODEL, input=text)
    return response.data[0].embedding


@shared_task(
    bind=True,
    name='apps.chatbot.tasks.sync_new_properties_to_pgvector',
    max_retries=3,
    default_retry_delay=60,
    acks_late=True,
)
def sync_new_properties_to_pgvector(self, property_ids: list[int] | None = None):
    """
    Embed newly-added real estate rows and upsert them into pgvector.

    This task is triggered after new properties are uploaded via the
    upload pipeline. It:
        1. Fetches unembedded rows from the property tables.
        2. Constructs a rich text representation of each property.
        3. Embeds the text using Azure text-embedding-3-small.
        4. Upserts the embedding + metadata into the pgvector table.

    Args:
        property_ids: Optional list of specific IDs to process.
                      If None, processes all unembedded rows.
    """
    try:
        # Fetch properties that need embedding
        if property_ids:
            placeholders = ','.join(['%s'] * len(property_ids))
            fetch_sql = f"""
                SELECT id, area, property_type, bedrooms, price,
                       size_sqft, description, region
                FROM upload_property
                WHERE id IN ({placeholders})
            """
            params = property_ids
        else:
            # Find properties not yet in the embeddings table
            fetch_sql = """
                SELECT p.id, p.area, p.property_type, p.bedrooms,
                       p.price, p.size_sqft, p.description, p.region
                FROM upload_property p
                LEFT JOIN chatbot_property_embeddings e
                    ON e.property_id = p.id
                WHERE e.property_id IS NULL
                LIMIT 500
            """
            params = []

        with connection.cursor() as cursor:
            cursor.execute(fetch_sql, params)
            columns = [col[0] for col in cursor.description]
            rows = cursor.fetchall()

        if not rows:
            logger.info('No new properties to embed')
            return {'embedded': 0}

        embedded_count = 0

        for row in rows:
            prop = dict(zip(columns, row))

            # Build rich text representation for embedding
            text = (
                f"Property in {prop.get('area', 'N/A')}, "
                f"{prop.get('region', 'N/A')}. "
                f"Type: {prop.get('property_type', 'N/A')}. "
                f"Bedrooms: {prop.get('bedrooms', 'N/A')}. "
                f"Price: {prop.get('price', 'N/A')}. "
                f"Size: {prop.get('size_sqft', 'N/A')} sqft. "
                f"Description: {prop.get('description', '')[:500]}"
            )

            metadata = {
                'property_id': prop['id'],
                'area': prop.get('area'),
                'region': prop.get('region'),
                'property_type': prop.get('property_type'),
                'price': str(prop.get('price', '')),
            }

            try:
                embedding = _embed_text(text)
                embedding_str = json.dumps(embedding)
                metadata_str = json.dumps(metadata)

                upsert_sql = f"""
                    INSERT INTO {EMBEDDINGS_TABLE}
                        (property_id, content, embedding, metadata, created_at)
                    VALUES (%s, %s, %s::vector, %s, NOW())
                    ON CONFLICT (property_id) DO UPDATE SET
                        content = EXCLUDED.content,
                        embedding = EXCLUDED.embedding,
                        metadata = EXCLUDED.metadata,
                        created_at = NOW();
                """

                with connection.cursor() as cursor:
                    cursor.execute(upsert_sql, [
                        prop['id'], text, embedding_str, metadata_str,
                    ])

                embedded_count += 1

            except Exception as exc:
                logger.error(
                    f"Failed to embed property {prop['id']}: {exc}",
                    extra={'event': 'embed_error', 'property_id': prop['id']},
                )
                continue

        logger.info(
            f'Embedded {embedded_count}/{len(rows)} properties into pgvector',
            extra={'event': 'embedding_sync_complete', 'count': embedded_count},
        )

        return {'embedded': embedded_count, 'total': len(rows)}

    except Exception as exc:
        logger.exception('sync_new_properties_to_pgvector failed')
        raise self.retry(exc=exc)

@shared_task(
    bind=True,
    name='apps.chatbot.tasks.process_audio_transcription',
    rate_limit='3/m',
    autoretry_for=(openai.RateLimitError,),
    retry_backoff=True,
    retry_kwargs={'max_retries': 5},
)
def process_audio_transcription(self, cache_key: str, user_id: int | None, session_id: str):
    """
    Fetch audio from Redis, transcribe using Azure OpenAI Whisper,
    and dispatch the result back to the user's WebSocket consumer.
    """
    audio_bytes = cache.get(cache_key)
    
    from apps.chatbot.services.pusher_service import get_pusher_client
    pusher = get_pusher_client()
    channel_name = f'private-chat-{user_id}' if user_id else None
    
    if not audio_bytes:
        logger.error(f"Audio bytes not found in cache for key {cache_key}")
        if channel_name and pusher is not None:
            pusher.trigger(
                channel_name,
                'audio-transcription-ready',
                {
                    'error': 'Audio data expired or lost in cache.',
                }
            )
        return
        
    try:
        client = openai.AzureOpenAI(
            api_key=os.getenv('AZURE_OPENAI_API_KEY', ''),
            azure_endpoint=os.getenv('AZURE_OPENAI_ENDPOINT', ''),
            api_version=os.getenv('AZURE_OPENAI_API_VERSION', '2024-02-01'),
        )

        audio_file = io.BytesIO(audio_bytes)
        audio_file.name = 'recording.webm'

        response = client.audio.transcriptions.create(
            model='smartmove-whisper',
            file=audio_file,
            language='en',
            response_format='text',
        )

        transcript = response.strip() if isinstance(response, str) else str(response).strip()

        if transcript:
            logger.info(
                f'Whisper transcription: {len(transcript)} chars',
                extra={'event': 'whisper_success', 'length': len(transcript)},
            )
            
            if channel_name and pusher is not None:
                pusher.trigger(
                    channel_name,
                    'audio-transcription-ready',
                    {
                        'transcript': transcript,
                    }
                )
        else:
            logger.warning('Whisper returned empty transcript')
            if channel_name and pusher is not None:
                pusher.trigger(
                    channel_name,
                    'audio-transcription-ready',
                    {
                        'error': 'Transcription was empty.',
                    }
                )

    except openai.RateLimitError as exc:
        logger.warning(f"Rate limit hit for {cache_key}. Retrying...")
        raise self.retry(exc=exc)
    except Exception as exc:
        logger.exception(f'Whisper transcription failed: {exc}')
        if channel_name and pusher is not None:
            pusher.trigger(
                channel_name,
                'audio-transcription-ready',
                {
                    'error': str(exc),
                }
            )
    finally:
        # Clean up the Redis cache key immediately after processing completes
        cache.delete(cache_key)

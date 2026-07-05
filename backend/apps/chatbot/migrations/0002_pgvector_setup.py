"""
Custom Django migration: pgvector extension and tables.

Creates the vector extension and the two pgvector-backed tables
used by the chatbot semantic cache and RAG pipeline.

This is idempotent — IF NOT EXISTS guards every statement.
"""

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('chatbot', '0001_initial'),
    ]

    operations = [
        # ── 1. Enable the pgvector extension ─────────────────────────────
        migrations.RunSQL(
            sql='CREATE EXTENSION IF NOT EXISTS vector;',
            reverse_sql='DROP EXTENSION IF EXISTS vector;',
        ),

        # ── 2. Semantic Cache table ──────────────────────────────────────
        migrations.RunSQL(
            sql="""
                CREATE TABLE IF NOT EXISTS chatbot_semantic_cache (
                    id          BIGSERIAL    PRIMARY KEY,
                    query_text  TEXT         UNIQUE NOT NULL,
                    embedding   vector(1536) NOT NULL,
                    response_payload JSONB   NOT NULL,
                    created_at  TIMESTAMPTZ  DEFAULT NOW()
                );
            """,
            reverse_sql='DROP TABLE IF EXISTS chatbot_semantic_cache;',
        ),

        # ── 3. IVFFlat index on semantic cache embeddings ────────────────
        migrations.RunSQL(
            sql="""
                CREATE INDEX IF NOT EXISTS idx_semantic_cache_embedding
                ON chatbot_semantic_cache
                USING ivfflat (embedding vector_cosine_ops)
                WITH (lists = 100);
            """,
            reverse_sql='DROP INDEX IF EXISTS idx_semantic_cache_embedding;',
        ),

        # ── 4. Property Embeddings table (RAG) ──────────────────────────
        migrations.RunSQL(
            sql="""
                CREATE TABLE IF NOT EXISTS chatbot_property_embeddings (
                    id          BIGSERIAL    PRIMARY KEY,
                    property_id INTEGER      UNIQUE NOT NULL,
                    content     TEXT         NOT NULL,
                    embedding   vector(1536) NOT NULL,
                    metadata    JSONB        DEFAULT '{}',
                    created_at  TIMESTAMPTZ  DEFAULT NOW()
                );
            """,
            reverse_sql='DROP TABLE IF EXISTS chatbot_property_embeddings;',
        ),

        # ── 5. IVFFlat index on property embeddings ─────────────────────
        migrations.RunSQL(
            sql="""
                CREATE INDEX IF NOT EXISTS idx_property_embeddings_embedding
                ON chatbot_property_embeddings
                USING ivfflat (embedding vector_cosine_ops)
                WITH (lists = 100);
            """,
            reverse_sql='DROP INDEX IF EXISTS idx_property_embeddings_embedding;',
        ),
    ]

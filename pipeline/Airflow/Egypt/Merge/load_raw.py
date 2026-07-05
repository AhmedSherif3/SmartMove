# ============================================================
# Merge/load_raw.py
#
# Loads a cleaned CSV into dbo.egypt_raw in Azure SQL Database.
# This is the ONLY table Airflow writes to directly.
# DBT then reads from dbo.egypt_raw and builds all star-schema
# tables (dims + fact) via `dbt run`.
#
# Uses a staging-table MERGE on id so re-running
# the same file is safe (idempotent).
# ============================================================

from __future__ import annotations

import logging
import os
from pathlib import Path

import pandas as pd
import pyodbc

logger = logging.getLogger(__name__)

RAW_TABLE  = "dbo.egypt_raw"
MERGE_KEY  = "id"
CHUNKSIZE  = 10_000


def _get_conn() -> pyodbc.Connection:
    conn_str = (
        f"DRIVER={{ODBC Driver 18 for SQL Server}};"
        f"SERVER={os.environ['SYNAPSE_SERVER']};"
        f"DATABASE={os.environ['SYNAPSE_DATABASE']};"
        f"UID={os.environ['SYNAPSE_USERNAME']};"
        f"PWD={os.environ['SYNAPSE_PASSWORD']};"
        "Encrypt=yes;TrustServerCertificate=no;Connection Timeout=30;"
    )
    return pyodbc.connect(conn_str, autocommit=False)


def load_cleaned_csv_to_raw(cleaned_csv: Path) -> int:
    """
    Upsert all rows from *cleaned_csv* into dbo.egypt_raw.
    Returns number of rows upserted.
    """
    logger.info("Reading cleaned CSV: %s", cleaned_csv)
    df = pd.read_csv(cleaned_csv, encoding="utf-8-sig")
    row_count = len(df)

    if df.empty:
        logger.warning("Empty CSV — nothing to load.")
        return 0

    if MERGE_KEY not in df.columns:
        raise KeyError(
            f"Merge key '{MERGE_KEY}' not found in CSV columns: {list(df.columns)}"
        )

    cols        = list(df.columns)
    update_cols = [c for c in cols if c != MERGE_KEY]
    set_clause  = ", ".join(f"T.[{c}] = S.[{c}]" for c in update_cols)
    insert_cols = ", ".join(f"[{c}]" for c in cols)
    insert_vals = ", ".join(f"S.[{c}]" for c in cols)

    staging = f"dbo.stg_raw_{Path(cleaned_csv).stem[:20]}"

    conn = _get_conn()
    try:
        cursor = conn.cursor()

        # Create staging table identical to target
        cursor.execute(f"DROP TABLE IF EXISTS {staging}")
        cursor.execute(
            f"SELECT TOP 0 * INTO {staging} FROM {RAW_TABLE}"
        )

        # Bulk insert into staging
        placeholders = ", ".join("?" * len(cols))
        insert_sql   = f"INSERT INTO {staging} ({insert_cols}) VALUES ({placeholders})"

        for start in range(0, row_count, CHUNKSIZE):
            chunk = df.iloc[start : start + CHUNKSIZE]
            rows  = [tuple(r) for r in chunk.itertuples(index=False, name=None)]
            cursor.executemany(insert_sql, rows)
            logger.info("  Staged rows %d–%d", start, start + len(chunk))

        # MERGE staging → target
        merge_sql = f"""
        MERGE {RAW_TABLE}  AS T
        USING {staging}    AS S
           ON T.[{MERGE_KEY}] = S.[{MERGE_KEY}]
        WHEN MATCHED THEN
            UPDATE SET {set_clause}
        WHEN NOT MATCHED BY TARGET THEN
            INSERT ({insert_cols}) VALUES ({insert_vals});
        """
        cursor.execute(merge_sql)

        # Cleanup
        cursor.execute(f"DROP TABLE IF EXISTS {staging}")
        conn.commit()

        logger.info("Loaded %d rows into %s", row_count, RAW_TABLE)
        return row_count

    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

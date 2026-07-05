"""
Airflow ↔ Django SQL Integration Tests
=======================================
Validates that the exact raw SQL statements executed by Airflow's
PostgresOperator and PostgresHook will run successfully against the
Django-managed PostgreSQL schema without raising ProgrammingError,
missing-table, or missing-column exceptions.

Tested SQL Statements:
    1. AAS Session Registration  — CREATE TABLE IF NOT EXISTS + INSERT ON CONFLICT
    2. AAS Session Teardown      — DELETE + SELECT COUNT(*)
    3. Upload Status Update       — UPDATE upload_dataimport SET status/completed_at

These tests use django.db.connection.cursor() to mirror Airflow's raw
SQL execution path.  The Django test runner wraps each test in a
transaction so no permanent database changes occur.

Database Compatibility:
    The tests run on both PostgreSQL (production) and SQLite (local dev).
    PostgreSQL-specific syntax (ON CONFLICT DO NOTHING) is adapted for
    SQLite (INSERT OR IGNORE) when running locally without Docker.
"""

from __future__ import annotations

from django.db import connection
from django.test import TestCase

from apps.upload.models import DataImport


def _is_postgres() -> bool:
    """Return True if the test database is PostgreSQL."""
    return connection.vendor == "postgresql"


class AirflowAASSessionSQLTest(TestCase):
    """
    Tests for the aas_active_sessions table that Airflow creates and
    manages directly via raw SQL (not via Django ORM).

    This table is intentionally unmanaged by Django — Airflow uses
    CREATE TABLE IF NOT EXISTS to bootstrap it on first run.
    """

    MOCK_RUN_ID = "test_run_123"
    MOCK_REGION = "dubai"

    # ------------------------------------------------------------------
    # Exact SQL from Airflow DAG: _register_aas_session()
    # Kept verbatim for PostgreSQL; adapted for SQLite where needed.
    # ------------------------------------------------------------------
    SQL_CREATE_TABLE = (
        "CREATE TABLE IF NOT EXISTS aas_active_sessions "
        "(run_id VARCHAR(255) PRIMARY KEY, region VARCHAR(50));"
    )

    @staticmethod
    def _insert_sql() -> str:
        """
        Return the INSERT statement appropriate for the current DB backend.

        PostgreSQL (production — what Airflow actually runs):
            INSERT INTO ... VALUES (%s, %s) ON CONFLICT DO NOTHING;

        SQLite (local testing):
            INSERT OR IGNORE INTO ... VALUES (?, ?);
        """
        if _is_postgres():
            return (
                "INSERT INTO aas_active_sessions (run_id, region) "
                "VALUES (%s, %s) ON CONFLICT DO NOTHING;"
            )
        return (
            "INSERT OR IGNORE INTO aas_active_sessions (run_id, region) "
            "VALUES (?, ?);"
        )

    # ------------------------------------------------------------------
    # Exact SQL from Airflow DAG: _check_aas_shutdown_safe()
    # ------------------------------------------------------------------
    @staticmethod
    def _delete_sql() -> str:
        if _is_postgres():
            return "DELETE FROM aas_active_sessions WHERE run_id = %s;"
        return "DELETE FROM aas_active_sessions WHERE run_id = ?;"

    SQL_COUNT_SESSIONS = "SELECT COUNT(*) FROM aas_active_sessions;"

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------
    def _create_session_table(self) -> None:
        """Bootstrap the aas_active_sessions table."""
        with connection.cursor() as cursor:
            cursor.execute(self.SQL_CREATE_TABLE)

    def _register_session(self, run_id: str, region: str) -> None:
        """Insert one session row."""
        with connection.cursor() as cursor:
            cursor.execute(self._insert_sql(), [run_id, region])

    def _delete_session(self, run_id: str) -> None:
        """Delete one session row."""
        with connection.cursor() as cursor:
            cursor.execute(self._delete_sql(), [run_id])

    def _count_sessions(self) -> int:
        """Return the number of active sessions."""
        with connection.cursor() as cursor:
            cursor.execute(self.SQL_COUNT_SESSIONS)
            return cursor.fetchone()[0]

    def _teardown_session_table(self) -> None:
        """Drop the table so tests are fully isolated."""
        with connection.cursor() as cursor:
            cursor.execute("DROP TABLE IF EXISTS aas_active_sessions;")

    # ------------------------------------------------------------------
    # Setup / Teardown
    # ------------------------------------------------------------------
    def setUp(self) -> None:
        """Create the session table before each test."""
        self._create_session_table()

    def tearDown(self) -> None:
        """Remove the unmanaged table after each test."""
        self._teardown_session_table()

    # ------------------------------------------------------------------
    # Test Cases
    # ------------------------------------------------------------------
    def test_create_table_is_idempotent(self) -> None:
        """
        CREATE TABLE IF NOT EXISTS must succeed even if the table
        already exists (setUp already created it once).
        """
        # Executing a second time must NOT raise.
        self._create_session_table()

    def test_insert_session_on_conflict_do_nothing(self) -> None:
        """
        INSERT ... ON CONFLICT DO NOTHING must not raise when inserting
        a duplicate run_id.
        """
        self._register_session(self.MOCK_RUN_ID, self.MOCK_REGION)
        # Inserting the exact same row again — no error expected.
        self._register_session(self.MOCK_RUN_ID, self.MOCK_REGION)

        self.assertEqual(self._count_sessions(), 1)

    def test_delete_session_and_count(self) -> None:
        """
        DELETE + SELECT COUNT(*) must execute cleanly and reflect the
        correct remaining row count.
        """
        self._register_session(self.MOCK_RUN_ID, self.MOCK_REGION)
        self._register_session("other_run_456", "england")
        self.assertEqual(self._count_sessions(), 2)

        self._delete_session(self.MOCK_RUN_ID)
        self.assertEqual(self._count_sessions(), 1)

    def test_delete_nonexistent_session_is_silent(self) -> None:
        """
        Deleting a run_id that does not exist must not raise.
        """
        self._delete_session("nonexistent_run_id")
        self.assertEqual(self._count_sessions(), 0)


class AirflowUploadStatusUpdateSQLTest(TestCase):
    """
    Tests that the raw SQL used by the ``django_complete`` PostgresOperator
    task successfully updates the ``upload_dataimport`` table.

    Airflow SQL (corrected to match Django schema):
        UPDATE upload_dataimport
        SET status = 'COMPLETED', completed_at = NOW()
        WHERE run_id = 'test_run_123';
    """

    MOCK_RUN_ID = "test_run_123"

    # ------------------------------------------------------------------
    # Exact SQL from Airflow DAG: django_complete task (corrected)
    # NOW() works on both PostgreSQL and SQLite (via Django's adapter).
    # ------------------------------------------------------------------
    @staticmethod
    def _update_sql() -> str:
        """
        Return the UPDATE statement for the current DB backend.

        PostgreSQL uses NOW(); SQLite uses datetime('now').
        Both are semantically identical.
        """
        if _is_postgres():
            return (
                "UPDATE upload_dataimport "
                "SET status = 'COMPLETED', completed_at = NOW() "
                "WHERE run_id = %s;"
            )
        return (
            "UPDATE upload_dataimport "
            "SET status = 'COMPLETED', completed_at = datetime('now') "
            "WHERE run_id = ?;"
        )

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------
    def _create_dummy_import(self, run_id: str) -> DataImport:
        """
        Create a DataImport row simulating a file upload that Airflow
        is currently processing.
        """
        return DataImport.objects.create(
            file_name="airflow_test_fixture.csv",
            region=DataImport.Region.DUBAI,
            status=DataImport.Status.PROCESSING_ETL,
            run_id=run_id,
        )

    # ------------------------------------------------------------------
    # Test Cases
    # ------------------------------------------------------------------
    def test_status_update_executes_without_error(self) -> None:
        """
        The UPDATE query must execute against upload_dataimport without
        raising ProgrammingError (missing table/column).
        """
        self._create_dummy_import(self.MOCK_RUN_ID)

        with connection.cursor() as cursor:
            cursor.execute(self._update_sql(), [self.MOCK_RUN_ID])

    def test_status_is_changed_to_completed(self) -> None:
        """
        After the raw SQL UPDATE, the DataImport row must have
        status = 'COMPLETED'.
        """
        obj = self._create_dummy_import(self.MOCK_RUN_ID)
        self.assertEqual(obj.status, DataImport.Status.PROCESSING_ETL)

        with connection.cursor() as cursor:
            cursor.execute(self._update_sql(), [self.MOCK_RUN_ID])

        obj.refresh_from_db()
        self.assertEqual(obj.status, "COMPLETED")

    def test_completed_at_is_set_by_now(self) -> None:
        """
        After the raw SQL UPDATE, completed_at must be populated
        (it was NULL before the update).
        """
        obj = self._create_dummy_import(self.MOCK_RUN_ID)
        self.assertIsNone(obj.completed_at)

        with connection.cursor() as cursor:
            cursor.execute(self._update_sql(), [self.MOCK_RUN_ID])

        obj.refresh_from_db()
        self.assertIsNotNone(obj.completed_at)

    def test_update_with_no_matching_run_id_is_silent(self) -> None:
        """
        UPDATE with a non-existent run_id must not raise — it simply
        affects zero rows (standard SQL behaviour).
        """
        with connection.cursor() as cursor:
            cursor.execute(self._update_sql(), ["nonexistent_run"])
            # rowcount == 0 confirms nothing was updated but no error occurred
            self.assertEqual(cursor.rowcount, 0)

    def test_update_does_not_affect_other_rows(self) -> None:
        """
        Only the row matching the specific run_id should be updated;
        other DataImport rows must remain untouched.
        """
        target = self._create_dummy_import(self.MOCK_RUN_ID)
        bystander = self._create_dummy_import("other_pipeline_run_789")

        with connection.cursor() as cursor:
            cursor.execute(self._update_sql(), [self.MOCK_RUN_ID])

        target.refresh_from_db()
        bystander.refresh_from_db()

        self.assertEqual(target.status, "COMPLETED")
        self.assertEqual(bystander.status, DataImport.Status.PROCESSING_ETL)
        self.assertIsNotNone(target.completed_at)
        self.assertIsNone(bystander.completed_at)


class AirflowFullPipelineLifecycleSQLTest(TestCase):
    """
    End-to-end test simulating the complete sequence of raw SQL that a
    single Airflow DAG run executes against the Django database:

        1. Register AAS session
        2. (pipeline work happens...)
        3. Delete AAS session + count remaining
        4. Update upload_dataimport status to COMPLETED
    """

    MOCK_RUN_ID = "full_lifecycle_run_001"
    MOCK_REGION = "dubai"

    def test_full_pipeline_lifecycle(self) -> None:
        # ── 1. Airflow creates its session tracking table & registers ──
        with connection.cursor() as cursor:
            cursor.execute(
                "CREATE TABLE IF NOT EXISTS aas_active_sessions "
                "(run_id VARCHAR(255) PRIMARY KEY, region VARCHAR(50));"
            )
            if _is_postgres():
                cursor.execute(
                    "INSERT INTO aas_active_sessions (run_id, region) "
                    "VALUES (%s, %s) ON CONFLICT DO NOTHING;",
                    [self.MOCK_RUN_ID, self.MOCK_REGION],
                )
            else:
                cursor.execute(
                    "INSERT OR IGNORE INTO aas_active_sessions (run_id, region) "
                    "VALUES (?, ?);",
                    [self.MOCK_RUN_ID, self.MOCK_REGION],
                )

        # Verify the session was registered
        with connection.cursor() as cursor:
            cursor.execute("SELECT COUNT(*) FROM aas_active_sessions;")
            self.assertEqual(cursor.fetchone()[0], 1)

        # ── 2. Simulate the Django side: a DataImport row exists ───────
        obj = DataImport.objects.create(
            file_name="lifecycle_test.csv",
            region=DataImport.Region.DUBAI,
            status=DataImport.Status.PROCESSING_ETL,
            run_id=self.MOCK_RUN_ID,
        )

        # ── 3. Airflow tears down the AAS session ─────────────────────
        with connection.cursor() as cursor:
            if _is_postgres():
                cursor.execute(
                    "DELETE FROM aas_active_sessions WHERE run_id = %s;",
                    [self.MOCK_RUN_ID],
                )
            else:
                cursor.execute(
                    "DELETE FROM aas_active_sessions WHERE run_id = ?;",
                    [self.MOCK_RUN_ID],
                )
            cursor.execute("SELECT COUNT(*) FROM aas_active_sessions;")
            remaining = cursor.fetchone()[0]
            self.assertEqual(remaining, 0)

        # ── 4. Airflow marks the upload as COMPLETED ──────────────────
        with connection.cursor() as cursor:
            if _is_postgres():
                cursor.execute(
                    "UPDATE upload_dataimport "
                    "SET status = 'COMPLETED', completed_at = NOW() "
                    "WHERE run_id = %s;",
                    [self.MOCK_RUN_ID],
                )
            else:
                cursor.execute(
                    "UPDATE upload_dataimport "
                    "SET status = 'COMPLETED', completed_at = datetime('now') "
                    "WHERE run_id = ?;",
                    [self.MOCK_RUN_ID],
                )

        # ── 5. Verify the final state via ORM ─────────────────────────
        obj.refresh_from_db()
        self.assertEqual(obj.status, "COMPLETED")
        self.assertIsNotNone(obj.completed_at)

    def tearDown(self) -> None:
        """Clean up the unmanaged aas_active_sessions table."""
        with connection.cursor() as cursor:
            cursor.execute("DROP TABLE IF EXISTS aas_active_sessions;")

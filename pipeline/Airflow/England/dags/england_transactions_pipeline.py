# ============================================================
# dags/england_transactions_pipeline.py
#
# DAG: england_transactions_pipeline
# Flow: Quarantine → ClamAV → Staging → Clean → Synapse → dbt → 
#       Archive → AAS Session Check → Cube Refresh → ML K8s Pod → 
#       Power BI → AAS Safe Shutdown → Django UI / Notifications
# ============================================================

from __future__ import annotations

import logging
import os
import sys
from datetime import datetime, timedelta
from pathlib import Path

from airflow import DAG
from airflow.models.baseoperator import chain
from airflow.operators.bash import BashOperator
from airflow.operators.email import EmailOperator
from airflow.operators.empty import EmptyOperator
from airflow.operators.python import BranchPythonOperator, PythonOperator
from airflow.providers.cncf.kubernetes.operators.pod import KubernetesPodOperator
from airflow.providers.http.operators.http import SimpleHttpOperator
from airflow.providers.microsoft.azure.operators.synapse import AzureSynapseRunPipelineOperator
from airflow.providers.postgres.hooks.postgres import PostgresHook
from airflow.providers.postgres.operators.postgres import PostgresOperator
from airflow.utils.trigger_rule import TriggerRule

# Setup paths to ensure we can import custom utils and cleaning scripts
_pythonpath_root = os.environ.get("PYTHONPATH", "").split(":")[0].strip()
BASE_DIR = Path(_pythonpath_root) if _pythonpath_root else Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BASE_DIR))

from sensors.azure_new_csv_sensor import AzureNewCsvSensor
from utils.azure_blob_client import download_blob, move_blob, upload_blob

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Configuration & Environment Variables
# ---------------------------------------------------------------------------
REGION                 = "england"
BLOB_CONN_STR          = os.environ.get("BLOB_CONNECTION_STRING", "")
CONTAINER_QUARANTINE   = f"{REGION}-quarantine"
CONTAINER_STAGING      = f"{REGION}-staging"
CONTAINER_ARCHIVE      = f"{REGION}-archive"
NOTIFY_EMAILS          = os.environ.get("NOTIFY_EMAIL", "ahmedsherif3315@...com").split(",")

DATA_RAW_DIR   = BASE_DIR / "data" / "raw"
DATA_CLEAN_DIR = BASE_DIR / "data" / "cleaned"
DBT_PROJECT    = BASE_DIR / "dbt-england" / "smartmove_england"

DEFAULT_ARGS = {
    "owner": "smartmove-data",
    "depends_on_past": False,
    "email": NOTIFY_EMAILS,
    "email_on_failure": False, # Handled by custom routing
    "email_on_retry": False,
    "retries": 1,
    "retry_delay": timedelta(minutes=3),
}

# ---------------------------------------------------------------------------
# Python Callables (File Movement, Cleaning, Session Management)
# ---------------------------------------------------------------------------
def _move_to_staging(**context):
    ti = context["ti"]
    blobs = ti.xcom_pull(task_ids="sense_new_csv_files", key="new_csv_blobs") or []
    for blob in blobs:
        move_blob(BLOB_CONN_STR, CONTAINER_QUARANTINE, blob, CONTAINER_STAGING, blob)
        logger.info(f"Moved {blob} from Quarantine to Staging.")
    ti.xcom_push(key="processing_blobs", value=blobs)

def _download_to_worker(**context):
    ti = context["ti"]
    blobs = ti.xcom_pull(task_ids="move_to_staging", key="processing_blobs") or []
    DATA_RAW_DIR.mkdir(parents=True, exist_ok=True)
    local_paths = []
    for blob in blobs:
        local_path = DATA_RAW_DIR / Path(blob).name
        download_blob(BLOB_CONN_STR, CONTAINER_STAGING, blob, local_path)
        local_paths.append(str(local_path))
    ti.xcom_push(key="local_raw_paths", value=local_paths)

def _clean_transactions(**context):
    sys.path.insert(0, str(BASE_DIR / "DataCleaning"))
    from clean_transactions import clean_transactions
    
    ti = context["ti"]
    raw_paths = ti.xcom_pull(task_ids="download_to_worker", key="local_raw_paths") or []
    DATA_CLEAN_DIR.mkdir(parents=True, exist_ok=True)
    
    cleaned_paths = []
    for raw_str in raw_paths:
        raw = Path(raw_str)
        clean = DATA_CLEAN_DIR / raw.name.replace(".csv", "_cleaned.csv")
        clean_transactions(raw, clean, "transaction_id", None)
        cleaned_paths.append(str(clean))
        logger.info(f"Cleaned dataset saved locally to: {clean}")
    ti.xcom_push(key="cleaned_csv_paths", value=cleaned_paths)

def _upload_clean_to_blob(**context):
    ti = context["ti"]
    cleaned_paths = ti.xcom_pull(task_ids="clean_transactions", key="cleaned_csv_paths") or []
    uploaded_blobs = []
    for clean_str in cleaned_paths:
        blob_name = Path(clean_str).name
        upload_blob(BLOB_CONN_STR, CONTAINER_STAGING, blob_name, Path(clean_str))
        uploaded_blobs.append(blob_name)
        logger.info(f"Uploaded {blob_name} to Staging.")
    ti.xcom_push(key="staging_clean_blobs", value=uploaded_blobs)

def _move_to_archive(**context):
    ti = context["ti"]
    raw_blobs = ti.xcom_pull(task_ids="move_to_staging", key="processing_blobs") or []
    clean_blobs = ti.xcom_pull(task_ids="upload_clean_to_blob", key="staging_clean_blobs") or []
    timestamp = datetime.now().strftime('%Y%m%d%H%M')
    for blob in raw_blobs + clean_blobs:
        move_blob(BLOB_CONN_STR, CONTAINER_STAGING, blob, CONTAINER_ARCHIVE, f"{timestamp}_{blob}")
        logger.info(f"Archived {blob} safely to prevent duplication.")

# --- AAS Session Logic (Race Condition Prevention) ---
def _register_aas_session(**context):
    hook = PostgresHook(postgres_conn_id="postgres_django")
    run_id = context['run_id']
    hook.run("""
        CREATE TABLE IF NOT EXISTS aas_active_sessions (run_id VARCHAR(255) PRIMARY KEY, region VARCHAR(50));
        INSERT INTO aas_active_sessions (run_id, region) VALUES (%s, %s) ON CONFLICT DO NOTHING;
    """, parameters=(run_id, REGION))
    logger.info(f"Registered AAS Session for Run: {run_id}")

def _check_aas_shutdown_safe(teardown_type: str, **context):
    hook = PostgresHook(postgres_conn_id="postgres_django")
    run_id = context['run_id']
    
    hook.run("DELETE FROM aas_active_sessions WHERE run_id = %s;", parameters=(run_id,))
    active_count = hook.get_first("SELECT COUNT(*) FROM aas_active_sessions;")[0]
    
    logger.info(f"AAS Active Sessions remaining: {active_count}")
    if active_count == 0:
        return f"aas_turn_off_api_{teardown_type}"
    else:
        return f"skip_turn_off_{teardown_type}"


# ---------------------------------------------------------------------------
# DAG Definition
# ---------------------------------------------------------------------------
with DAG(
    dag_id=f"{REGION}_transactions_pipeline",
    description=f"Data Engineering and ML Orchestration Pipeline for {REGION.capitalize()}",
    schedule=None,
    start_date=datetime(2026, 1, 1),
    catchup=False,
    default_args=DEFAULT_ARGS,
    tags=[REGION, "smartmove", "enterprise", "ml"],
    max_active_runs=1,
) as dag:

    # 1. Edge Security
    sense_new_csv = AzureNewCsvSensor(
        task_id="sense_new_csv_files",
        connection_string=BLOB_CONN_STR,
        container=CONTAINER_QUARANTINE,
        mode="reschedule",
        poke_interval=300,
    )
    clamav_scan = SimpleHttpOperator(
        task_id="clamav_scan_file", 
        http_conn_id="clamav_server_3", 
        endpoint="/api/v1/scan", 
        method="POST",
        response_check=lambda response: response.json().get("infected") == False,
    )

    # 2. Staging & Cleaning
    move_to_staging = PythonOperator(task_id="move_to_staging", python_callable=_move_to_staging)
    download_to_worker = PythonOperator(task_id="download_to_worker", python_callable=_download_to_worker)
    clean_transactions = PythonOperator(task_id="clean_transactions", python_callable=_clean_transactions)
    upload_clean_to_blob = PythonOperator(task_id="upload_clean_to_blob", python_callable=_upload_clean_to_blob)

    # 3. Enterprise Loading
    synapse_ingest = AzureSynapseRunPipelineOperator(
        task_id="synapse_ingest", 
        azure_synapse_conn_id="azure_synapse_default", 
        pipeline_name=f"{REGION.capitalize()} pipeline",
        azure_synapse_workspace_dev_endpoint=os.environ.get("AZURE_SYNAPSE_DEV_ENDPOINT", "https://smartmove.dev.azuresynapse.net"),
    )
    run_dbt = BashOperator(
        task_id="run_dbt", 
        bash_command=f"cd {DBT_PROJECT} && dbt deps --profiles-dir . --target prod && dbt run --profiles-dir . --target prod",
    )
    move_to_archive = PythonOperator(task_id="move_to_archive", python_callable=_move_to_archive)

    # 4. AAS Boot Sequence (Session Manager Protected)
    register_aas_session = PythonOperator(task_id="register_aas_session", python_callable=_register_aas_session)
    aas_turn_on_api = SimpleHttpOperator(
        task_id="aas_turn_on_api", http_conn_id="azure_management_api", endpoint="/start", method="POST",
    )

    # 5. The Double-Pass Semantic Layer
    aas_process_historical = SimpleHttpOperator(
        task_id="aas_process_historical", http_conn_id="aas_rest_api", endpoint="/refreshes", method="POST",
        data='{"type":"full","objects":[{"database":"SmartMove","table":"fact_transactions_england"}]}',
    )
    
    # Executes the pipeline/ml/England/ container image on K3s Server 2
    ml_predict_execution = KubernetesPodOperator(
        task_id="ml_predict_execution",
        namespace="smartmove-airflow",
        image=f"ghcr.io/smartmove/ml-forecaster-{REGION}:latest",
        name="ml-forecast-pod",
        in_cluster=True,
        get_logs=True,
        is_delete_operator_pod=True,
        env_vars={"REGION": REGION, "AZURE_SQL_CONN": os.environ.get("AZURE_SQL_CONN", "")},
    )

    aas_process_predicted = SimpleHttpOperator(
        task_id="aas_process_predicted", http_conn_id="aas_rest_api", endpoint="/refreshes", method="POST",
        data='{"type":"full","objects":[{"database":"SmartMove","table":"fact_predictions_england"}]}',
    )

    # 6. Parallel Power BI Update
    refresh_normal_dashboards = SimpleHttpOperator(
        task_id="refresh_normal_dashboards", http_conn_id="powerbi_api", endpoint="/normal/refreshes", method="POST",
    )
    refresh_predicted_dashboards = SimpleHttpOperator(
        task_id="refresh_predicted_dashboards", http_conn_id="powerbi_api", endpoint="/predicted/refreshes", method="POST",
    )

    # =======================================================================
    # 7. DUAL-PATH TEARDOWN (The FinOps Fail-Safe Routing)
    # =======================================================================

    # --- PATH A: THE HAPPY PATH (ALL_SUCCESS) ---
    happy_session_check = BranchPythonOperator(
        task_id="happy_session_check",
        python_callable=_check_aas_shutdown_safe,
        op_kwargs={"teardown_type": "happy"},
        trigger_rule=TriggerRule.ALL_SUCCESS, 
    )
    aas_turn_off_api_happy = SimpleHttpOperator(
        task_id="aas_turn_off_api_happy", http_conn_id="azure_management_api", endpoint="/suspend", method="POST",
    )
    skip_turn_off_happy = EmptyOperator(task_id="skip_turn_off_happy")
    
    dashboard_refresh = SimpleHttpOperator(
        task_id="dashboard_refresh", http_conn_id="nextjs_admin_api", endpoint="/api/revalidate", method="GET",
        trigger_rule=TriggerRule.NONE_FAILED_MIN_ONE_SUCCESS, 
    )
    django_complete = PostgresOperator(
        task_id="django_complete", 
        postgres_conn_id="postgres_django",
        sql="UPDATE upload_adminjob SET status = 'COMPLETED', updated_at = NOW() WHERE run_id = '{{ run_id }}';",
    )
    notify_success = EmailOperator(
        task_id="notify_success", to=NOTIFY_EMAILS, subject=f"[SmartMove] {REGION.capitalize()} Pipeline ✅ Success", html_content="Pipeline complete.",
    )

    # --- PATH B: THE EMERGENCY SHUTDOWN PATH (ONE_FAILED) ---
    emergency_session_check = BranchPythonOperator(
        task_id="emergency_session_check",
        python_callable=_check_aas_shutdown_safe,
        op_kwargs={"teardown_type": "emergency"},
        trigger_rule=TriggerRule.ONE_FAILED, 
    )
    aas_turn_off_api_emergency = SimpleHttpOperator(
        task_id="aas_turn_off_api_emergency", http_conn_id="azure_management_api", endpoint="/suspend", method="POST",
    )
    skip_turn_off_emergency = EmptyOperator(task_id="skip_turn_off_emergency")

    notify_failure = EmailOperator(
        task_id="notify_failure", to=NOTIFY_EMAILS, subject=f"[SmartMove] {REGION.capitalize()} Pipeline ❌ FAILED", html_content="Execution halted. See Airflow logs.",
        trigger_rule=TriggerRule.NONE_FAILED_MIN_ONE_SUCCESS, 
    )

    # ---------------------------------------------------------------------------
    # Pipeline Orchestration / Graph Linking
    # ---------------------------------------------------------------------------
    
    # Linear Data Prep Flow
    chain(
        sense_new_csv, clamav_scan, move_to_staging, download_to_worker,
        clean_transactions, upload_clean_to_blob, synapse_ingest,
        run_dbt, move_to_archive, register_aas_session, aas_turn_on_api, 
        aas_process_historical, ml_predict_execution, aas_process_predicted
    )

    # Parallel BI Refresh
    aas_process_predicted >> [refresh_normal_dashboards, refresh_predicted_dashboards]
    
    # ---------------------------------------------------------
    # Route A: Happy Path Linking
    # ---------------------------------------------------------
    [refresh_normal_dashboards, refresh_predicted_dashboards] >> happy_session_check
    happy_session_check >> [aas_turn_off_api_happy, skip_turn_off_happy]
    [aas_turn_off_api_happy, skip_turn_off_happy] >> dashboard_refresh >> django_complete >> notify_success

    # ---------------------------------------------------------
    # Route B: Emergency Net Linking
    # ---------------------------------------------------------
    # Route EVERY critical step to the emergency check so ONE_FAILED catches it immediately
    [
        sense_new_csv, clamav_scan, move_to_staging, download_to_worker,
        clean_transactions, upload_clean_to_blob, synapse_ingest, run_dbt, move_to_archive,
        register_aas_session, aas_turn_on_api, aas_process_historical, 
        ml_predict_execution, aas_process_predicted, refresh_normal_dashboards, 
        refresh_predicted_dashboards
    ] >> emergency_session_check

    emergency_session_check >> [aas_turn_off_api_emergency, skip_turn_off_emergency]
    [aas_turn_off_api_emergency, skip_turn_off_emergency] >> notify_failure
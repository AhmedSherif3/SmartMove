# ============================================================
# dags/egypt_monthly_report_dag.py
#
# DAG: egypt_monthly_report
#
# Schedule: 0 0 1 * * (midnight on the 1st of every month)
#
# Flow:
#   fetch_market_data          → Dummy SQL fetch (Egypt market KPIs)
#       │
#   render_ai_prompt           → Jinja2 template rendering
#       │
#   generate_ai_analysis       → Anthropic Claude API call
#       │
#   trigger_django_pdf_builder → POST to Django /api/reports/build-pdf/
#       │
#       ├── Branch A: upload_report_to_azure (Storage)
#       │
#       ├── Branch B: fetch_subscriber_emails → dispatch_report_emails (Distribution)
#       │
#   reports_app_complete       → Database Update (Join)
#       │
#       ├── Success Route: notify_success → build_success → email_success
#       │
#       └── Failure Route: notify_failure → build_failure → email_failure
# ============================================================

from __future__ import annotations

import json
import logging
import os
import sys
from datetime import datetime, timedelta
from pathlib import Path

from airflow import DAG
from airflow.operators.python import PythonOperator
from airflow.operators.email import EmailOperator
from airflow.operators.empty import EmptyOperator
from airflow.utils.trigger_rule import TriggerRule

# PYTHONPATH is set in docker-compose.yaml to include both
# /opt/airflow/project and /opt/airflow/utils.
# For local development, insert the parent Airflow dir so utils/ is importable.
_AIRFLOW_ROOT = Path(__file__).resolve().parents[2]  # e.g. pipeline/Airflow/Egypt/
_PARENT_ROOT = _AIRFLOW_ROOT.parent                  # e.g. pipeline/Airflow/
sys.path.insert(0, str(_AIRFLOW_ROOT))
sys.path.insert(0, str(_PARENT_ROOT))

logger = logging.getLogger(__name__)

# ── Config ────────────────────────────────────────────────────────────────────
REGION = "egypt"
REGION_DISPLAY = "Egypt"

DJANGO_BASE_URL = os.environ.get("DJANGO_BASE_URL", "http://backend:8000")
AIRFLOW_WEBHOOK_SECRET = os.environ.get("AIRFLOW_WEBHOOK_SECRET", "")
NOTIFY_EMAILS = os.environ.get("NOTIFY_EMAIL", "ahmedsherif3315@gmail.com").split(",")

DEFAULT_ARGS = {
    "owner": "smartmove-data",
    "depends_on_past": False,
    "email_on_failure": False,
    "email_on_retry": False,
    "retries": 2,
    "retry_delay": timedelta(minutes=5),
}


# ── Task 1: Fetch Market Data ────────────────────────────────────────────────
def _fetch_market_data(**context):
    """
    Fetch market KPIs for Egypt.
    Connects to Azure SQL Data Warehouse and replicates AAS measures.
    # TODO: Replace with final regional SSAS measures when the local cube is finished.
    """
    import os
    import datetime
    import calendar
    import pandas as pd
    import pyodbc
    from dateutil.relativedelta import relativedelta
    
    execution_date = context["logical_date"]
    report_date = execution_date.replace(day=1) - timedelta(days=1)
    report_month = report_date.month
    report_year = report_date.year

    host = os.environ.get("AZURE_SQL_HOST")
    port = os.environ.get("AZURE_SQL_PORT", "1433")
    dbname = os.environ.get("AZURE_SQL_DB_NAME")
    user = os.environ.get("AZURE_SQL_USER")
    password = os.environ.get("AZURE_SQL_PASSWORD")

    conn_str = f"DRIVER={{ODBC Driver 18 for SQL Server}};SERVER={host},{port};DATABASE={dbname};UID={user};PWD={password};TrustServerCertificate=yes;"
    
    # 1. Data Extraction (The 13-Month Window)
    report_start_date = datetime.date(report_year, report_month, 1)
    last_day = calendar.monthrange(report_year, report_month)[1]
    report_end_date = datetime.date(report_year, report_month, last_day)
    
    start_date_13m = report_start_date - relativedelta(months=13)
    
    try:
        conn = pyodbc.connect(conn_str)
        query = f"""
            SELECT 
                d.full_date as transaction_date, 
                f.actual_worth, 
                f.procedure_area, 
                a.area_name_en, 
                p.property_type_en as property_type
            FROM dbo.fact_transactions_egypt f
            JOIN dbo.dim_date_egypt d ON f.date_id = d.date_id
            JOIN dbo.dim_area_egypt a ON f.area_id = a.area_id
            JOIN dbo.dim_property_egypt p ON f.property_type_id = p.property_type_id
            WHERE d.full_date >= '{start_date_13m.strftime('%Y-%m-%d')}'
              AND d.full_date <= '{report_end_date.strftime('%Y-%m-%d')}'
        """
        df = pd.read_sql(query, conn)
        conn.close()
    except Exception as e:
        logger.error(f"Failed to fetch data from Azure SQL: {e}")
        raise e

    if not df.empty:
        df['transaction_date'] = pd.to_datetime(df['transaction_date'])

    # 2. 1:1 AAS Measure Replication (Base KPIs)
    if not df.empty:
        df_current = df[(df['transaction_date'].dt.month == report_month) & (df['transaction_date'].dt.year == report_year)]
        
        prev_year_date = report_start_date - relativedelta(years=1)
        df_prev_year = df[(df['transaction_date'].dt.month == prev_year_date.month) & (df['transaction_date'].dt.year == prev_year_date.year)]
    else:
        df_current = pd.DataFrame()
        df_prev_year = pd.DataFrame()

    transaction_volume = len(df_current)
    total_sales_value = float(df_current['actual_worth'].sum()) if not df_current.empty else 0.0
    
    avg_price_per_sqm = "N/A"
    
    prev_total_sales_value = float(df_prev_year['actual_worth'].sum()) if not df_prev_year.empty else 0.0
    if pd.notna(prev_total_sales_value) and prev_total_sales_value > 0:
        yoy_change = ((total_sales_value - prev_total_sales_value) / prev_total_sales_value) * 100
    else:
        yoy_change = 0.0

    smartmove_index = 52.1  # Retain dummy composite score for now

    # 3. Top-Tier Granular Analysis (Risk & Volatility by Area)
    start_date_6m = report_start_date - relativedelta(months=5)
    if not df.empty:
        df_6m = df[(df['transaction_date'].dt.date >= start_date_6m) & (df['transaction_date'].dt.date <= report_end_date)]
    else:
        df_6m = pd.DataFrame()
    
    area_stats = []
    if not df_6m.empty:
        for area, group_6m in df_6m.groupby('area_name_en'):
            group_current = group_6m[(group_6m['transaction_date'].dt.month == report_month) & (group_6m['transaction_date'].dt.year == report_year)]
            if group_current.empty:
                continue
                
            # Price Volatility 6M (STDEV of monthly Avg actual_worth)
            monthly_avg = group_6m.groupby(group_6m['transaction_date'].dt.to_period('M'))['actual_worth'].mean()
            if len(monthly_avg) > 1:
                price_volatility_6m = monthly_avg.std(ddof=1)
            else:
                price_volatility_6m = 0.0
                
            # Outlier Transaction Ratio (current month)
            mu = group_current['actual_worth'].mean()
            sigma = group_current['actual_worth'].std(ddof=1)
            if pd.isna(sigma):
                sigma = 0.0
                
            outliers = group_current[group_current['actual_worth'] > (mu + 2 * sigma)]
            outlier_ratio = len(outliers) / len(group_current) if len(group_current) > 0 else 0.0
            
            # Shock Index
            current_avg = group_current['actual_worth'].mean()
            avg_6m = group_6m['actual_worth'].mean()
            shock_index = ((current_avg - avg_6m) / avg_6m) if avg_6m > 0 else 0.0
            
            # Raw Risk Score
            raw_risk_score = (0.45 * price_volatility_6m) + (0.35 * outlier_ratio) + (0.20 * shock_index)
            
            area_stats.append({
                'Area': area,
                'Raw Risk Score': raw_risk_score,
                'Price Volatility 6M': price_volatility_6m,
                'Outlier Ratio': outlier_ratio,
                'Shock Index': shock_index
            })

    df_areas = pd.DataFrame(area_stats)
    granular_tables = []
    
    # 4. Format & Output Strategy
    if not df_areas.empty:
        max_risk = df_areas['Raw Risk Score'].max()
        if max_risk > 0:
            df_areas['Normalized Risk Score'] = df_areas['Raw Risk Score'] / max_risk
        else:
            df_areas['Normalized Risk Score'] = 0.0
            
        # Filter and sort
        df_areas = df_areas.sort_values(by='Normalized Risk Score', ascending=False)
        df_areas = df_areas[['Area', 'Normalized Risk Score', 'Price Volatility 6M', 'Outlier Ratio', 'Shock Index']]
        
        top_5_highest = df_areas.head(5)
        top_5_lowest = df_areas.tail(5)
        
        granular_tables.append("### Top 5 Highest Risk Areas\n" + top_5_highest.to_markdown(index=False))
        granular_tables.append("### Top 5 Lowest Risk Areas\n" + top_5_lowest.to_markdown(index=False))

    # Property Type Price Spread
    if not df_current.empty:
        df_spread = df_current.groupby('property_type').agg(
            Avg_Transaction_Value=('actual_worth', 'mean'),
            Volume=('actual_worth', 'count')
        ).reset_index()
        granular_tables.append("### Property Type Price Spread\n" + df_spread.to_markdown(index=False))

    granular_market_data = "\n\n".join(granular_tables)

    market_data = {
        "region": REGION_DISPLAY,
        "report_month": report_month,
        "report_year": report_year,
        "smartmove_index": smartmove_index,
        "avg_price_per_sqm": avg_price_per_sqm,
        "total_sales_value": total_sales_value,
        "transaction_volume": transaction_volume,
        "yoy_change": round(yoy_change, 1) if isinstance(yoy_change, float) else yoy_change,
        "granular_market_data": granular_market_data,
        "market_trends": [
            {
                "name": "New Cairo Expansion",
                "direction": "Increasing",
                "magnitude": "+22.5% new unit launches MoM",
            },
            {
                "name": "EGP Devaluation Impact",
                "direction": "Stabilising",
                "magnitude": "EGP/USD rate flat at 48.5 for 3 months",
            },
            {
                "name": "Luxury Segment (North Coast)",
                "direction": "Increasing",
                "magnitude": "+9.8% price appreciation QoQ",
            },
            {
                "name": "Mortgage Penetration",
                "direction": "Increasing slowly",
                "magnitude": "+1.2pp to 8.4% of transactions",
            },
        ],
        "ai_recommendations": [
            "Focus on USD-denominated or inflation-hedged developments in New Administrative Capital.",
            "Monitor CBE monetary policy — further rate cuts expected in Q3.",
            "Consider North Coast resort properties for seasonal rental yield.",
            "Watch for government incentive programs for first-time buyers.",
        ],
    }

    context["ti"].xcom_push(key="market_data", value=market_data)
    logger.info("Fetched market data for %s %02d/%d", REGION_DISPLAY, report_month, report_year)
    return market_data


# ── Task 2: Render AI Prompt ──────────────────────────────────────────────────
def _render_ai_prompt(**context):
    """
    Load the Jinja2 prompt template and render with market data.
    """
    from jinja2 import Environment, FileSystemLoader

    market_data = context["ti"].xcom_pull(task_ids="fetch_market_data", key="market_data")

    # Resolve template directory — works in both Docker and local dev.
    docker_path = Path("/opt/airflow/utils/templates/prompts")
    local_path = Path(__file__).resolve().parents[2].parent / "utils" / "templates" / "prompts"
    template_dir = docker_path if docker_path.exists() else local_path
    env = Environment(loader=FileSystemLoader(str(template_dir)))
    template = env.get_template("base_executive_summary.jinja")

    rendered_prompt = template.render(**market_data)

    context["ti"].xcom_push(key="rendered_prompt", value=rendered_prompt)
    logger.info("Rendered prompt: %d chars", len(rendered_prompt))
    return rendered_prompt


# ── Task 3: Generate AI Analysis ─────────────────────────────────────────────
def _generate_ai_analysis(**context):
    """
    Send the rendered prompt to Claude and retrieve the executive summary.
    """
    from utils.llm_client import get_executive_summary

    rendered_prompt = context["ti"].xcom_pull(task_ids="render_ai_prompt", key="rendered_prompt")

    ai_markdown = get_executive_summary(rendered_prompt)

    context["ti"].xcom_push(key="ai_markdown", value=ai_markdown)
    logger.info("AI analysis generated: %d chars", len(ai_markdown))
    return ai_markdown


# ── Task 4: Trigger Django PDF Builder ────────────────────────────────────────
def _trigger_django_pdf_builder(**context):
    """
    POST the rendered HTML report to Django's /api/reports/build-pdf/ endpoint.
    Django handles:
        HTML → PDF (WeasyPrint)
        DB   → Report record creation
    """
    import requests
    from utils.report_html_template import render_report_html

    market_data = context["ti"].xcom_pull(task_ids="fetch_market_data", key="market_data")
    ai_markdown = context["ti"].xcom_pull(task_ids="generate_ai_analysis", key="ai_markdown")

    # Render the full HTML report
    html_content = render_report_html(
        region=market_data["region"],
        report_month=market_data["report_month"],
        report_year=market_data["report_year"],
        smartmove_index=market_data["smartmove_index"],
        ai_markdown=ai_markdown,
    )

    import os
    import base64

    def _get_b64_image(filename, mime_type="image/png"):
        """Reads a file from the local airflow/assets folder and converts it to Base64"""
        current_dir = os.path.dirname(os.path.abspath(__file__))
        asset_path = os.path.join(current_dir, '..', '..', 'assets', filename)
        with open(asset_path, "rb") as img_file:
            encoded_string = base64.b64encode(img_file.read()).decode('utf-8')
            return f"data:{mime_type};base64,{encoded_string}"

    html_with_images = html_content.replace(
        "SMARTMOVE_LOGO_PLACEHOLDER", 
        _get_b64_image("logo.png", "image/png")
    )
    html_with_images = html_with_images.replace(
        "SMARTMOVE_ROBOT_PLACEHOLDER", 
        _get_b64_image("robot.png", "image/png")
    )
    html_with_images = html_with_images.replace(
        "SMARTMOVE_EAGLE_PLACEHOLDER", 
        _get_b64_image("eagle.png", "image/png")
    )

    url = f"{DJANGO_BASE_URL}/api/reports/build-pdf/"
    headers = {
        "Content-Type": "application/json",
        "X-Airflow-API-Key": AIRFLOW_WEBHOOK_SECRET,
    }
    payload = {
        "region": REGION,
        "report_month": market_data["report_month"],
        "report_year": market_data["report_year"],
        "html_content": html_with_images,
    }

    logger.info("Triggering Django PDF builder: %s", url)
    response = requests.post(url, json=payload, headers=headers, timeout=120)

    if response.status_code == 201:
        result = response.json()
        logger.info(
            "PDF built successfully: %s (id=%s, %s bytes)",
            result.get("title"),
            result.get("report_id"),
            result.get("file_size_bytes"),
        )
        # Push the metadata explicitly so downstream parallel tasks can access the report_id
        context["ti"].xcom_push(key="report_metadata", value=result)
        return result
    else:
        error_msg = f"Django PDF builder returned {response.status_code}: {response.text}"
        logger.error(error_msg)
        raise RuntimeError(error_msg)


# ── Task 5A: Upload to Azure ──────────────────────────────────────────────────
def _upload_report_to_azure(**context):
    """
    Takes the generated PDF from Step 4 and uploads an archival copy to Azure.
    """
    import requests
    report_data = context["ti"].xcom_pull(task_ids="trigger_django_pdf_builder", key="report_metadata")
    
    url = f"{DJANGO_BASE_URL}/api/reports/{report_data['report_id']}/upload-azure/"
    payload = {"azure_container": f"{REGION}-reports"}
    
    logger.info(f"Triggering Azure Upload for Report ID: {report_data['report_id']}")
    response = requests.post(
        url, 
        json=payload, 
        headers={"X-Airflow-API-Key": AIRFLOW_WEBHOOK_SECRET}, 
        timeout=120
    )
    
    if response.status_code != 200:
        raise RuntimeError(f"Azure Upload Failed: {response.text}")
    logger.info("PDF successfully uploaded to Azure Blob Storage.")


# ── Task 5B: Fetch Subscriber Emails ──────────────────────────────────────────
def _fetch_subscriber_emails(**context):
    """
    Hits the Django Reports App to retrieve the specific mailing list.
    """
    import requests
    
    url = f"{DJANGO_BASE_URL}/api/subscriptions/matrix/"
    payload = {"target_region": REGION}
    
    response = requests.post(
        url, 
        json=payload, 
        headers={
            "Content-Type": "application/json", 
            "X-Airflow-API-Key": AIRFLOW_WEBHOOK_SECRET
        }, 
        timeout=30
    )

    if response.status_code == 200:
        emails = response.json().get("emails", [])
        logger.info(f"Subscription Matrix returned {len(emails)} targeted emails for {REGION_DISPLAY}.")
        context["ti"].xcom_push(key="subscriber_emails", value=emails)
        return emails
    else:
        raise RuntimeError(f"Failed to fetch subscriber matrix: {response.text}")


# ── Task 6: Dispatch Report Emails ────────────────────────────────────────────
def _dispatch_report_emails(**context):
    """
    Commands the Reports App to dispatch the generated emails.
    """
    import requests
    ti = context["ti"]
    
    report_data = ti.xcom_pull(task_ids="trigger_django_pdf_builder", key="report_metadata") 
    emails = ti.xcom_pull(task_ids="fetch_subscriber_emails", key="subscriber_emails")
    
    if not emails:
        logger.info("No active subscribers found for this matrix. Skipping email dispatch.")
        return "Skipped - No subscribers"

    report_id = report_data.get("report_id")
    
    url = f"{DJANGO_BASE_URL}/api/reports/dispatch/"
    payload = {
        "report_id": report_id,
        "recipients": emails
    }
    
    response = requests.post(
        url, 
        json=payload, 
        headers={
            "Content-Type": "application/json", 
            "X-Airflow-API-Key": AIRFLOW_WEBHOOK_SECRET
        }, 
        timeout=60
    )
    
    if response.status_code == 200:
        logger.info(f"Successfully dispatched Report {report_id} to {len(emails)} subscribers.")
        return "Dispatched"
    else:
        raise RuntimeError(f"Email dispatch failed: {response.text}")


# ── Task 7: Reports App Complete ─────────────────────────────────────────────
def _reports_app_complete(**context):
    """
    Updates the Reports App PostgreSQL database to mark the region's execution as SUCCESS.
    """
    import requests
    url = f"{DJANGO_BASE_URL}/api/reports/status/update/"
    payload = {"status": "SUCCESS", "region": REGION}
    
    response = requests.post(
        url, 
        json=payload, 
        headers={"X-Airflow-API-Key": AIRFLOW_WEBHOOK_SECRET}, 
        timeout=30
    )
    
    if response.status_code != 200:
        logger.warning(f"Failed to update Reports App database: {response.text}")
    else:
        logger.info("Reports App database updated to SUCCESS.")


# ── Task 8/9: Notification Summary Builders ───────────────────────────────────
def _build_success_summary(**context):
    """Generates the HTML content for the success email."""
    return f"""
    <h3>✅ {REGION_DISPLAY} Report Pipeline Successful</h3>
    <p>All tasks completed successfully. The AI analysis was rendered, the PDF was generated, 
    the archival copy was sent to Azure, and emails were successfully dispatched to the subscriber matrix.</p>
    """

def _build_failure_summary(**context):
    """Generates the HTML content for the failure email, identifying exactly what broke."""
    ti = context['ti']
    failed_task_instances = context['dag_run'].get_task_instances(state='failed')
    failed_tasks = [ti.task_id for ti in failed_task_instances]
    
    return f"""
    <h3>❌ {REGION_DISPLAY} Pipeline Failed</h3>
    <p>A critical failure was detected in the pipeline at the following task(s): <b>{failed_tasks}</b></p>
    <p>Please check the Airflow UI logs for the complete traceback to resolve the issue.</p>
    """


# ── DAG Definition ────────────────────────────────────────────────────────────
with DAG(
    dag_id="egypt_monthly_report",
    description="Monthly executive summary report for the Egypt real estate market",
    schedule="0 0 1 * *",
    start_date=datetime(2026, 1, 1),
    catchup=False,
    default_args=DEFAULT_ARGS,
    tags=["egypt", "smartmove", "reports", "monthly"],
    max_active_runs=1,
) as dag:

    # 1. Prep & Build Tasks
    fetch_market_data = PythonOperator(
        task_id="fetch_market_data",
        python_callable=_fetch_market_data,
    )

    render_ai_prompt = PythonOperator(
        task_id="render_ai_prompt",
        python_callable=_render_ai_prompt,
    )

    generate_ai_analysis = PythonOperator(
        task_id="generate_ai_analysis",
        python_callable=_generate_ai_analysis,
    )

    trigger_django_pdf_builder = PythonOperator(
        task_id="trigger_django_pdf_builder",
        python_callable=_trigger_django_pdf_builder,
    )

    # 2. Parallel Split Tasks
    upload_report_to_azure = PythonOperator(
        task_id="upload_report_to_azure",
        python_callable=_upload_report_to_azure,
    )

    fetch_subscriber_emails = PythonOperator(
        task_id="fetch_subscriber_emails",
        python_callable=_fetch_subscriber_emails,
    )

    # 3. Distribution Dispatch
    dispatch_report_emails = PythonOperator(
        task_id="dispatch_report_emails",
        python_callable=_dispatch_report_emails,
    )

    # 4. Join Task (DB Update)
    reports_app_complete = PythonOperator(
        task_id="reports_app_complete",
        python_callable=_reports_app_complete,
    )

    # 5. Success Notification Route
    notify_success = EmptyOperator(task_id="notify_success")
    build_success_summary = PythonOperator(
        task_id="build_success_summary",
        python_callable=_build_success_summary,
    )
    email_success_summary = EmailOperator(
        task_id="email_success_summary",
        to=NOTIFY_EMAILS,
        subject=f"[SmartMove] {REGION_DISPLAY} Report ✅ SUCCESS",
        html_content="{{ ti.xcom_pull(task_ids='build_success_summary') }}",
    )

    # 6. Failure Notification Route (Global Tripwire)
    notify_failure = EmptyOperator(
        task_id="notify_failure",
        trigger_rule=TriggerRule.ONE_FAILED,
    )
    build_failure_summary = PythonOperator(
        task_id="build_failure_summary",
        python_callable=_build_failure_summary,
    )
    email_failure_summary = EmailOperator(
        task_id="email_failure_summary",
        to=NOTIFY_EMAILS,
        subject=f"[SmartMove] {REGION_DISPLAY} Report ❌ FAILED",
        html_content="{{ ti.xcom_pull(task_ids='build_failure_summary') }}",
    )

    # ── Graph Linking ─────────────────────────────────────────────────────────
    
    # 1. Linear Prep & Build
    (
        fetch_market_data
        >> render_ai_prompt
        >> generate_ai_analysis
        >> trigger_django_pdf_builder
    )
    
    # 2. Parallel Split into Storage and Matrix Fetch
    trigger_django_pdf_builder >> [upload_report_to_azure, fetch_subscriber_emails]
    
    # 3. Distribution flows inside Branch B
    fetch_subscriber_emails >> dispatch_report_emails
    
    # 4. Join barrier before updating DB
    [upload_report_to_azure, dispatch_report_emails] >> reports_app_complete

    # 5. Success Path Routing
    reports_app_complete >> notify_success >> build_success_summary >> email_success_summary

    # 6. Failure Path Routing (Catches ANY failure upstream)
    [
        fetch_market_data,
        render_ai_prompt,
        generate_ai_analysis,
        trigger_django_pdf_builder,
        upload_report_to_azure,
        fetch_subscriber_emails,
        dispatch_report_emails,
        reports_app_complete
    ] >> notify_failure
    
    notify_failure >> build_failure_summary >> email_failure_summary
"""
SmartMove — Local Report Generator (Cumulative)
============================================================
Generates monthly executive summary reports using CSV files 
from D:\\data creation instead of Azure SQL.

- Cumulates all transactions from the beginning of time until the 
  end of the report month for current volume/values.
- Hardcoded for May 2026 as per user request.
- Focuses on Dubai, Egypt, and England.
- Uses Google Chrome headless for robust HTML to PDF rendering.

Usage:
    python generate_reports_local.py
"""

from __future__ import annotations

import base64
import gc
import json
import logging
import os
import sys
import datetime
import calendar
from pathlib import Path
from dateutil.relativedelta import relativedelta

import pandas as pd

# ── Setup paths ──────────────────────────────────────────────────────────────
SCRIPT_DIR = Path(__file__).resolve().parent
UTILS_DIR = SCRIPT_DIR / "utils"
ASSETS_DIR = SCRIPT_DIR / "assets"
TEMPLATE_DIR = UTILS_DIR / "templates" / "prompts"
OUTPUT_DIR = SCRIPT_DIR / "generated_reports"
OUTPUT_DIR.mkdir(exist_ok=True)

sys.path.insert(0, str(SCRIPT_DIR))
sys.path.insert(0, str(SCRIPT_DIR.parent))

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

# ── Load .env ────────────────────────────────────────────────────────────────
from dotenv import load_dotenv
load_dotenv(SCRIPT_DIR / ".env")

# ── Data paths ───────────────────────────────────────────────────────────────
DATA_DIR = Path(r"D:\data creation")

EGYPT_CSV = DATA_DIR / "EGYPT_MASTER_CONFORMED.csv"
DUBAI_CSV = DATA_DIR / "Dubai_cleaned.csv"

# England uses multiple parts
ENGLAND_CSVS = [DATA_DIR / f"ENGLAND_MASTER_CONFORMED_part_{i}.csv" for i in range(6)]

NEEDED_COLS_EGYPT = [
    'full_date', 'actual_worth', 'procedure_area', 'area_name_en', 'property_type_en'
]
NEEDED_COLS_DUBAI = [
    'instance_date', 'actual_worth', 'meter_sale_price', 'procedure_area',
    'area_name_en', 'property_type_en'
]
NEEDED_COLS_ENGLAND = [
    'full_date', 'actual_worth', 'property_type_en', 'area_name_en'
]

# TARGET REPORT MONTH
TARGET_MONTH = 5
TARGET_YEAR = 2026


# ── Helpers ──────────────────────────────────────────────────────────────────
def _get_b64_image(filename: str, mime_type: str = "image/png") -> str:
    asset_path = ASSETS_DIR / filename
    with open(asset_path, "rb") as f:
        encoded = base64.b64encode(f.read()).decode("utf-8")
    return f"data:{mime_type};base64,{encoded}"


def _run_area_risk_analysis(df, df_current, report_month, report_year,
                             report_start_date, report_end_date,
                             price_col='actual_worth', area_col='area_name_en'):
    # We still use a 6-month window for risk/volatility so the math stays meaningful
    start_date_6m = report_start_date - relativedelta(months=5)
    df_6m = df[(df['transaction_date'].dt.date >= start_date_6m) & (df['transaction_date'].dt.date <= report_end_date)]
    
    area_stats = []
    if not df_6m.empty:
        for area, group_6m in df_6m.groupby(area_col):
            # Current month stats for volatility comparison
            group_current = group_6m[
                (group_6m['transaction_date'].dt.month == report_month) &
                (group_6m['transaction_date'].dt.year == report_year)
            ]
            if group_current.empty:
                continue
                
            monthly_avg = group_6m.groupby(group_6m['transaction_date'].dt.to_period('M'))[price_col].mean()
            price_volatility_6m = monthly_avg.std(ddof=1) if len(monthly_avg) > 1 else 0.0
            
            mu = group_current[price_col].mean()
            sigma = group_current[price_col].std(ddof=1)
            if pd.isna(sigma):
                sigma = 0.0
            outliers = group_current[group_current[price_col] > (mu + 2 * sigma)]
            outlier_ratio = len(outliers) / len(group_current) if len(group_current) > 0 else 0.0
            
            current_avg = group_current[price_col].mean()
            avg_6m = group_6m[price_col].mean()
            shock_index = ((current_avg - avg_6m) / avg_6m) if avg_6m > 0 else 0.0
            
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
    
    if not df_areas.empty:
        max_risk = df_areas['Raw Risk Score'].max()
        if max_risk > 0:
            df_areas['Normalized Risk Score'] = df_areas['Raw Risk Score'] / max_risk
        else:
            df_areas['Normalized Risk Score'] = 0.0
        df_areas = df_areas.sort_values(by='Normalized Risk Score', ascending=False)
        df_areas = df_areas[['Area', 'Normalized Risk Score', 'Price Volatility 6M', 'Outlier Ratio', 'Shock Index']]
        
        top_5_highest = df_areas.head(5)
        top_5_lowest = df_areas.tail(5)
        
        granular_tables.append("### Top 5 Highest Risk Areas\n" + top_5_highest.to_markdown(index=False))
        granular_tables.append("### Top 5 Lowest Risk Areas\n" + top_5_lowest.to_markdown(index=False))

    return granular_tables


# ═══════════════════════════════════════════════════════════════════════════════
#  EGYPT REPORT
# ═══════════════════════════════════════════════════════════════════════════════
def fetch_egypt_data() -> dict:
    logger.info("Loading Egypt CSV: %s", EGYPT_CSV)
    df = pd.read_csv(EGYPT_CSV, usecols=NEEDED_COLS_EGYPT, low_memory=False)
    
    df['transaction_date'] = pd.to_datetime(df['full_date'], errors='coerce')
    df = df.dropna(subset=['transaction_date'])
    df['property_type'] = df['property_type_en']
    
    report_month = TARGET_MONTH
    report_year = TARGET_YEAR
    
    report_start_date = datetime.date(report_year, report_month, 1)
    last_day = calendar.monthrange(report_year, report_month)[1]
    report_end_date = datetime.date(report_year, report_month, last_day)
    
    # Cumulative stats (all transactions from beginning up to report end date)
    df_current = df[df['transaction_date'].dt.date <= report_end_date]
    
    # For YoY, cumulative up to the same month last year
    last_day_prev = calendar.monthrange(report_year - 1, report_month)[1]
    prev_report_end_date = datetime.date(report_year - 1, report_month, last_day_prev)
    df_prev_year = df[df['transaction_date'].dt.date <= prev_report_end_date]
    
    transaction_volume = len(df_current)
    total_sales_value = float(df_current['actual_worth'].sum()) if not df_current.empty else 0.0
    avg_price_per_sqm = "N/A"
    
    prev_total_sales_value = float(df_prev_year['actual_worth'].sum()) if not df_prev_year.empty else 0.0
    if pd.notna(prev_total_sales_value) and prev_total_sales_value > 0:
        yoy_change = ((total_sales_value - prev_total_sales_value) / prev_total_sales_value) * 100
    else:
        yoy_change = 0.0

    smartmove_index = 52.1

    granular_tables = _run_area_risk_analysis(
        df, df_current, report_month, report_year,
        report_start_date, report_end_date, price_col='actual_worth', area_col='area_name_en'
    )

    if not df_current.empty:
        df_spread = df_current.groupby('property_type').agg(
            Avg_Transaction_Value=('actual_worth', 'mean'),
            Volume=('actual_worth', 'count')
        ).reset_index()
        granular_tables.append("### Property Type Price Spread (Cumulative)\n" + df_spread.to_markdown(index=False))

    granular_market_data = "\n\n".join(granular_tables)

    market_data = {
        "region": "Egypt",
        "report_month": report_month,
        "report_year": report_year,
        "smartmove_index": smartmove_index,
        "avg_price_per_sqm": avg_price_per_sqm,
        "total_sales_value": total_sales_value,
        "transaction_volume": transaction_volume,
        "yoy_change": round(yoy_change, 1) if isinstance(yoy_change, float) else yoy_change,
        "granular_market_data": granular_market_data,
        "market_trends": [
            {"name": "New Cairo Expansion", "direction": "Increasing", "magnitude": "+22.5% new unit launches MoM"},
            {"name": "EGP Devaluation Impact", "direction": "Stabilising", "magnitude": "EGP/USD rate flat at 48.5 for 3 months"},
            {"name": "Luxury Segment (North Coast)", "direction": "Increasing", "magnitude": "+9.8% price appreciation QoQ"},
            {"name": "Mortgage Penetration", "direction": "Increasing slowly", "magnitude": "+1.2pp to 8.4% of transactions"},
        ],
        "ai_recommendations": [
            "Focus on USD-denominated or inflation-hedged developments in New Administrative Capital.",
            "Monitor CBE monetary policy — further rate cuts expected in Q3.",
            "Consider North Coast resort properties for seasonal rental yield.",
            "Watch for government incentive programs for first-time buyers.",
        ],
    }
    
    logger.info("Egypt: %d transactions (cumulative), total value: %.2f", transaction_volume, total_sales_value)
    del df; gc.collect()
    return market_data


# ═══════════════════════════════════════════════════════════════════════════════
#  DUBAI REPORT
# ═══════════════════════════════════════════════════════════════════════════════
def fetch_dubai_data() -> dict:
    logger.info("Loading Dubai CSV: %s", DUBAI_CSV)
    df = pd.read_csv(DUBAI_CSV, usecols=NEEDED_COLS_DUBAI, low_memory=False)
    
    # Dubai uses DD-MM-YYYY format
    df['transaction_date'] = pd.to_datetime(df['instance_date'], dayfirst=True, errors='coerce')
    df = df.dropna(subset=['transaction_date'])
    df['property_type'] = df['property_type_en']
    
    report_month = TARGET_MONTH
    report_year = TARGET_YEAR
    
    report_start_date = datetime.date(report_year, report_month, 1)
    last_day = calendar.monthrange(report_year, report_month)[1]
    report_end_date = datetime.date(report_year, report_month, last_day)
    
    # Cumulative stats (all transactions from beginning up to report end date)
    df_current = df[df['transaction_date'].dt.date <= report_end_date]
    
    # For YoY, cumulative up to the same month last year
    last_day_prev = calendar.monthrange(report_year - 1, report_month)[1]
    prev_report_end_date = datetime.date(report_year - 1, report_month, last_day_prev)
    df_prev_year = df[df['transaction_date'].dt.date <= prev_report_end_date]
    
    transaction_volume = len(df_current)
    total_sales_value = float(df_current['actual_worth'].sum()) if not df_current.empty else 0.0
    avg_price_per_sqm = float(df_current['meter_sale_price'].mean()) if not df_current.empty else 0.0
    
    prev_avg_price_per_sqm = float(df_prev_year['meter_sale_price'].mean()) if not df_prev_year.empty else 0.0
    if pd.notna(prev_avg_price_per_sqm) and prev_avg_price_per_sqm > 0:
        yoy_change = ((avg_price_per_sqm - prev_avg_price_per_sqm) / prev_avg_price_per_sqm) * 100
    else:
        yoy_change = 0.0

    smartmove_index = 78.4

    granular_tables = _run_area_risk_analysis(
        df, df_current, report_month, report_year,
        report_start_date, report_end_date, price_col='meter_sale_price', area_col='area_name_en'
    )

    if not df_current.empty:
        df_spread = df_current.groupby('property_type').agg(
            Avg_Price_per_sqm=('meter_sale_price', 'mean'),
            Volume=('meter_sale_price', 'count')
        ).reset_index()
        granular_tables.append("### Property Type Price Spread (Cumulative)\n" + df_spread.to_markdown(index=False))

    granular_market_data = "\n\n".join(granular_tables)

    market_data = {
        "region": "Dubai",
        "report_month": report_month,
        "report_year": report_year,
        "smartmove_index": smartmove_index,
        "avg_price_per_sqm": round(avg_price_per_sqm, 2),
        "total_sales_value": total_sales_value,
        "transaction_volume": transaction_volume,
        "yoy_change": round(yoy_change, 1),
        "granular_market_data": granular_market_data,
        "market_trends": [
            {"name": "Off-Plan Sales Volume", "direction": "Increasing", "magnitude": "+14.2% MoM"},
            {"name": "Villa Segment Premium", "direction": "Stable", "magnitude": "Holding at 23% above apartments"},
            {"name": "Mortgage Originations", "direction": "Increasing", "magnitude": "+6.1% MoM"},
            {"name": "Rental Yields (Avg.)", "direction": "Declining slightly", "magnitude": "-0.4pp to 6.8%"},
        ],
        "ai_recommendations": [
            "Monitor off-plan exposure in Dubai Marina and Business Bay.",
            "Consider value-add plays in Jumeirah Village Circle — yield compression lag.",
            "Hedge AED/USD exposure for non-GCC investors.",
            "Watch RERA regulatory pipeline for upcoming rental cap changes.",
        ],
    }
    
    logger.info("Dubai: %d transactions (cumulative), total value: %.2f, avg AED/sqm: %.2f", transaction_volume, total_sales_value, avg_price_per_sqm)
    del df; gc.collect()
    return market_data


# ═══════════════════════════════════════════════════════════════════════════════
#  ENGLAND REPORT (CHUNKING)
# ═══════════════════════════════════════════════════════════════════════════════
def fetch_england_data() -> dict:
    report_month = TARGET_MONTH
    report_year = TARGET_YEAR
    
    report_start_date = datetime.date(report_year, report_month, 1)
    last_day = calendar.monthrange(report_year, report_month)[1]
    report_end_date = datetime.date(report_year, report_month, last_day)
    
    # For YoY, cumulative up to the same month last year
    last_day_prev = calendar.monthrange(report_year - 1, report_month)[1]
    prev_report_end_date = datetime.date(report_year - 1, report_month, last_day_prev)
    
    # Accumulators
    current_volume = 0
    current_sales_value = 0.0
    
    prev_volume = 0
    prev_sales_value = 0.0
    
    # For risk analysis we need 6 months of data
    start_date_6m = report_start_date - relativedelta(months=5)
    
    # We will aggregate to smaller dfs for risk and spread analysis instead of keeping full df
    # list to hold small slices
    df_6m_list = []
    df_spread_chunks = []
    
    for i, file_path in enumerate(ENGLAND_CSVS):
        if not file_path.exists():
            logger.warning("England chunk file not found: %s", file_path)
            continue
            
        logger.info("Processing England CSV Chunk %d: %s", i, file_path)
        
        # Read in chunks
        chunk_iter = pd.read_csv(file_path, usecols=NEEDED_COLS_ENGLAND, chunksize=500000)
        
        for chunk in chunk_iter:
            # Parse dates
            chunk['transaction_date'] = pd.to_datetime(chunk['full_date'], errors='coerce')
            chunk = chunk.dropna(subset=['transaction_date'])
            chunk['property_type'] = chunk['property_type_en']
            
            # 1) Current Cumulative
            mask_current = chunk['transaction_date'].dt.date <= report_end_date
            c_chunk = chunk[mask_current]
            current_volume += len(c_chunk)
            current_sales_value += float(c_chunk['actual_worth'].sum())
            
            # Store subset for spread analysis (aggregated to save memory)
            if not c_chunk.empty:
                agg = c_chunk.groupby('property_type').agg(
                    total_worth=('actual_worth', 'sum'),
                    Volume=('actual_worth', 'count')
                ).reset_index()
                df_spread_chunks.append(agg)
            
            # 2) Previous Cumulative (YoY)
            mask_prev = chunk['transaction_date'].dt.date <= prev_report_end_date
            p_chunk = chunk[mask_prev]
            prev_volume += len(p_chunk)
            prev_sales_value += float(p_chunk['actual_worth'].sum())
            
            # 3) Last 6 Months data (for Risk Analysis)
            mask_6m = (chunk['transaction_date'].dt.date >= start_date_6m) & (chunk['transaction_date'].dt.date <= report_end_date)
            risk_chunk = chunk[mask_6m]
            if not risk_chunk.empty:
                # Sample 10% of risk rows to prevent OOM
                df_6m_list.append(risk_chunk[['transaction_date', 'actual_worth', 'area_name_en']].sample(frac=0.1, random_state=42))
                
        # Force GC after each file
        gc.collect()

    avg_price_per_sqm = "N/A" # England doesn't track sqm in standard Land Registry
    
    if prev_sales_value > 0:
        yoy_change = ((current_sales_value - prev_sales_value) / prev_sales_value) * 100
    else:
        yoy_change = 0.0

    smartmove_index = 84.2

    # Aggregate 6m data
    df_6m_full = pd.concat(df_6m_list, ignore_index=True) if df_6m_list else pd.DataFrame()
    df_current_full = df_6m_full[
        (df_6m_full['transaction_date'].dt.month == report_month) &
        (df_6m_full['transaction_date'].dt.year == report_year)
    ] if not df_6m_full.empty else pd.DataFrame()

    granular_tables = _run_area_risk_analysis(
        df_6m_full, df_current_full, report_month, report_year,
        report_start_date, report_end_date, price_col='actual_worth', area_col='area_name_en'
    )
    
    # Aggregate property spread
    if df_spread_chunks:
        df_spread_agg = pd.concat(df_spread_chunks).groupby('property_type').sum().reset_index()
        df_spread_agg['Avg_Transaction_Value'] = df_spread_agg['total_worth'] / df_spread_agg['Volume']
        df_spread = df_spread_agg[['property_type', 'Avg_Transaction_Value', 'Volume']]
        
        # Map Property type letters (D = Detached, S = Semi-Detached, T = Terraced, F = Flats/Maisonettes, O = Other)
        type_mapping = {'D': 'Detached', 'S': 'Semi-Detached', 'T': 'Terraced', 'F': 'Flats/Maisonettes', 'O': 'Other'}
        df_spread['property_type'] = df_spread['property_type'].map(type_mapping).fillna(df_spread['property_type'])
        
        granular_tables.append("### Property Type Price Spread (Cumulative)\n" + df_spread.to_markdown(index=False))

    granular_market_data = "\n\n".join(granular_tables)

    market_data = {
        "region": "England",
        "report_month": report_month,
        "report_year": report_year,
        "smartmove_index": smartmove_index,
        "avg_price_per_sqm": avg_price_per_sqm,
        "total_sales_value": current_sales_value,
        "transaction_volume": current_volume,
        "yoy_change": round(yoy_change, 1) if isinstance(yoy_change, float) else yoy_change,
        "granular_market_data": granular_market_data,
        "market_trends": [
            {"name": "Bank of England Base Rate", "direction": "Stable", "magnitude": "Maintained at 4.25%"},
            {"name": "London Prime Central", "direction": "Increasing", "magnitude": "+1.8% transaction volume"},
            {"name": "Energy Efficient Homes Premium", "direction": "Increasing", "magnitude": "EPC A/B selling 8% faster"},
            {"name": "Buy-to-Let Exits", "direction": "Increasing", "magnitude": "Landlord sell-offs up 11% YoY"},
        ],
        "ai_recommendations": [
            "Seek distressed BTL portfolios in Northern regeneration areas (e.g., Manchester, Leeds).",
            "Factor in upcoming EPC minimum standard regulations for 2028 when valuing older housing stock.",
            "Monitor central London commercial-to-residential conversion opportunities.",
            "Defensive play: Student accommodation in Tier-1 university cities.",
        ],
    }
    
    logger.info("England: %d transactions (cumulative), total value: %.2f", current_volume, current_sales_value)
    
    # Cleanup memory
    del df_6m_full; del df_current_full; del df_6m_list; del df_spread_chunks
    if 'df_spread_agg' in locals():
        del df_spread_agg
    gc.collect()
    
    return market_data

# ═══════════════════════════════════════════════════════════════════════════════
#  SHARED: Render Prompt → AI → HTML → PDF
# ═══════════════════════════════════════════════════════════════════════════════
def render_prompt(market_data: dict) -> str:
    from jinja2 import Environment, FileSystemLoader
    env = Environment(loader=FileSystemLoader(str(TEMPLATE_DIR)))
    template = env.get_template("base_executive_summary.jinja")
    rendered = template.render(**market_data)
    logger.info("Rendered prompt for %s: %d chars", market_data["region"], len(rendered))
    return rendered


def generate_ai_analysis(rendered_prompt: str) -> str:
    from utils.llm_client import get_executive_summary
    ai_markdown = get_executive_summary(rendered_prompt)
    logger.info("AI analysis generated: %d chars", len(ai_markdown))
    return ai_markdown


def build_html_report(market_data: dict, ai_markdown: str) -> str:
    from utils.report_html_template import render_report_html
    html_content = render_report_html(
        region=market_data["region"],
        report_month=market_data["report_month"],
        report_year=market_data["report_year"],
        smartmove_index=market_data["smartmove_index"],
        ai_markdown=ai_markdown,
    )
    
    html_content = html_content.replace(
        "SMARTMOVE_LOGO_PLACEHOLDER",
        _get_b64_image("logo.png", "image/png")
    )
    html_content = html_content.replace(
        "SMARTMOVE_ROBOT_PLACEHOLDER",
        _get_b64_image("robot.png", "image/png")
    )
    html_content = html_content.replace(
        "SMARTMOVE_EAGLE_PLACEHOLDER",
        _get_b64_image("eagle.png", "image/png")
    )
    
    return html_content


def save_report(html_content: str, region: str, report_month: int, report_year: int):
    month_names = [
        "", "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December",
    ]
    month_name = month_names[report_month]
    
    base_name = f"SmartMove_{region}_{month_name}_{report_year}_Cumulative"
    
    html_path = OUTPUT_DIR / f"{base_name}.html"
    with open(html_path, "w", encoding="utf-8") as f:
        f.write(html_content)
    logger.info("HTML saved: %s", html_path)
    
    # PDF generation using local Chrome headless
    try:
        import subprocess
        pdf_path = OUTPUT_DIR / f"{base_name}.pdf"
        chrome_path = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
        
        # We need an absolute path to the HTML for Chrome
        abs_html_path = html_path.resolve()
        
        cmd = [
            chrome_path,
            "--headless",
            "--disable-gpu",
            "--print-to-pdf-no-header",
            "--no-pdf-header-footer",
            f"--print-to-pdf={pdf_path}",
            str(abs_html_path)
        ]
        
        logger.info("Generating PDF with Chrome headless...")
        subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        logger.info("PDF saved: %s", pdf_path)
    except Exception as e:
        logger.warning("PDF generation with Chrome failed: %s", e)
    
    return html_path


def generate_single_report(region: str, fetch_func):
    logger.info("=" * 70)
    logger.info("GENERATING REPORT: %s", region.upper())
    logger.info("=" * 70)
    
    market_data = fetch_func()
    report_month = market_data["report_month"]
    report_year = market_data["report_year"]
    
    logger.info("Report period: Cumulative to %02d/%d", report_month, report_year)
    
    rendered_prompt = render_prompt(market_data)
    ai_markdown = generate_ai_analysis(rendered_prompt)
    html_content = build_html_report(market_data, ai_markdown)
    html_path = save_report(html_content, region, report_month, report_year)
    
    logger.info("✅ %s report complete!", region.upper())
    return html_path


# ═══════════════════════════════════════════════════════════════════════════════
#  MAIN
# ═══════════════════════════════════════════════════════════════════════════════
def main():
    logger.info("SmartMove Local Report Generator (Cumulative)")
    logger.info("Output directory: %s", OUTPUT_DIR)
    logger.info("Target: %02d/%d", TARGET_MONTH, TARGET_YEAR)
    logger.info("")
    
    # Run England
    reports = [
        # ("Dubai", fetch_dubai_data),
        # ("Egypt", fetch_egypt_data),
        ("England", fetch_england_data),
    ]
    
    results = []
    for region, fetch_func in reports:
        try:
            path = generate_single_report(region, fetch_func)
            results.append((region, "✅ SUCCESS", str(path)))
        except Exception as e:
            logger.error("❌ %s report failed: %s", region, e, exc_info=True)
            results.append((region, "❌ FAILED", str(e)))
    
    logger.info("")
    logger.info("=" * 70)
    logger.info("REPORT GENERATION SUMMARY")
    logger.info("=" * 70)
    for region, status, detail in results:
        logger.info("  %-10s %s  →  %s", region, status, detail)
    logger.info("=" * 70)


if __name__ == "__main__":
    main()

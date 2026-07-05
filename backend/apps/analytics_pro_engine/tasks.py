import os
import json
import pandas as pd
from .models import AnalysisWorkspace
from django.conf import settings
from apps.core.services.ai_manager import SmartMoveAIManager
import traceback
import logging
import io
import re

logger = logging.getLogger(__name__)

MINIO_BUCKET_NAME = getattr(settings, 'MINIO_BUCKET_NAME', 'smartmove-bucket')

PII_KEYWORDS = ['email', 'phone', 'name', 'ssn']

def generate_ai_dashboard(workspace_id):
    try:
        workspace = AnalysisWorkspace.objects.get(id=workspace_id)
        user = workspace.user
        
        # Data Ingestion
        dfs = []
        for file_obj in workspace.files.all():
            if not file_obj.file_content:
                continue
            file_bytes = file_obj.file_content.read()
            filename = getattr(file_obj, 'filename', '').lower()
            
            if filename.endswith('.csv'):
                df = pd.read_csv(io.BytesIO(file_bytes))
            elif filename.endswith(('.xls', '.xlsx')):
                df = pd.read_excel(io.BytesIO(file_bytes))
            else:
                raise ValueError(f"Unsupported file format: {filename}")
                
            dfs.append(df)
            
        if not dfs:
            raise ValueError("No valid files in workspace")
            
        combined_df = pd.concat(dfs, ignore_index=True)
        
        if combined_df.empty:
            raise ValueError("All uploaded files resulted in an empty dataset.")
        
        # PII Shield
        cols_to_drop = [col for col in combined_df.columns if any(keyword in col.lower() for keyword in PII_KEYWORDS)]
        shielded_df = combined_df.drop(columns=cols_to_drop)
        
        # Mathematical Profile
        import numpy as np
        numeric_df = shielded_df.select_dtypes(include=['number'])
        
        # Advanced stats for deeper insights
        trends = {}
        for col in numeric_df.columns:
            if len(numeric_df) > 2:
                mid = len(numeric_df) // 2
                first_half = numeric_df[col].iloc[:mid].mean()
                second_half = numeric_df[col].iloc[mid:].mean()
                
                # Protect against division by zero
                if pd.isna(first_half) or pd.isna(second_half) or first_half == 0:
                    trends[col] = "neutral"
                else:
                    change = (second_half - first_half) / abs(first_half)
                    if change > 0.05:
                        trends[col] = f"upward (+{change*100:.1f}%)"
                    elif change < -0.05:
                        trends[col] = f"downward ({change*100:.1f}%)"
                    else:
                        trends[col] = "stable"
            else:
                trends[col] = "insufficient_data"

        profile = {
            "means": numeric_df.mean().to_dict(),
            "std_dev": numeric_df.std().to_dict(),
            "correlations": numeric_df.corr().to_dict(),
            "skewness": numeric_df.skew().to_dict(),
            "kurtosis": numeric_df.kurtosis().to_dict(),
            "simple_trends": trends,
        }
        
        categorical_df = shielded_df.select_dtypes(include=['object', 'category'])
        if not categorical_df.empty:
            profile["top_10_categories"] = {col: categorical_df[col].value_counts().head(10).to_dict() for col in categorical_df.columns}
        else:
            profile["top_10_categories"] = {}

        # Call Centralized AI Manager
        user_tier = getattr(user, 'role', '')
        json_output = SmartMoveAIManager.get_workspace_dashboard(profile, user_tier)
        
        # --- DETAILED LOGGING ---
        logger.info(f"[ANALYTICS] Raw AI output type: {type(json_output)}, length: {len(json_output) if json_output else 0}")
        logger.info(f"[ANALYTICS] Raw AI output (first 500 chars): {str(json_output)[:500]}")
        
        # Resilient JSON parsing — strip markdown fences if the LLM wraps JSON in ```
        if isinstance(json_output, str):
            cleaned = json_output.strip()
            # Strip markdown code fences
            md_match = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', cleaned)
            if md_match:
                cleaned = md_match.group(1)
                logger.info(f"[ANALYTICS] Stripped markdown fences, cleaned length: {len(cleaned)}")
            try:
                parsed = json.loads(cleaned)
                logger.info(f"[ANALYTICS] JSON parsed successfully. Type: {type(parsed)}, keys: {list(parsed.keys()) if isinstance(parsed, dict) else 'N/A'}")
            except json.JSONDecodeError as je:
                logger.error(f"[ANALYTICS] JSON parse FAILED: {je}. Raw cleaned text: {cleaned[:500]}")
                parsed = {"error": "AI returned invalid JSON", "raw_preview": cleaned[:200]}
        else:
            parsed = json_output
            logger.info(f"[ANALYTICS] AI output is already non-string: {type(parsed)}")
        
        # Ensure we don't store empty dict (which the status view treats as "processing")
        if parsed == {} or parsed is None:
            logger.warning(f"[ANALYTICS] Parsed result is empty! Storing error payload instead.")
            parsed = {"error": "AI returned empty result", "kpis": [], "charts": {}, "insight_text": "Analysis could not be completed."}
        
        # Re-fetch workspace to avoid stale object issues in background threads
        workspace = AnalysisWorkspace.objects.get(id=workspace_id)
        workspace.dashboard_payload = parsed
        workspace.save(update_fields=['dashboard_payload'])
        
        # Verify save worked
        verify = AnalysisWorkspace.objects.get(id=workspace_id)
        is_empty = (verify.dashboard_payload == {})
        logger.info(f"[ANALYTICS] Save verified. dashboard_payload is None: {verify.dashboard_payload is None}, "
                     f"is empty: {is_empty}, "
                     f"type: {type(verify.dashboard_payload)}")
        
        return {"status": "success"}
    
    except Exception as e:
        logger.error(f"[ANALYTICS] generate_ai_dashboard FAILED: {str(e)}")
        traceback.print_exc()
        try:
            workspace = AnalysisWorkspace.objects.get(id=workspace_id)
            workspace.minio_dashboard_key = "FAILED"
            workspace.save(update_fields=['minio_dashboard_key'])
        except Exception as inner_e:
            logger.error(f"[ANALYTICS] Failed to update workspace status to FAILED: {str(inner_e)}")
        return {"status": "failed", "error": str(e)}

def _run_in_background(workspace_id):
    import threading
    thread = threading.Thread(target=generate_ai_dashboard, args=(workspace_id,))
    thread.start()
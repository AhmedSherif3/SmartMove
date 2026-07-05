import os
import sys
import django

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from apps.agentic_ai.tools.azure_sandbox import AzureSQLSandbox
try:
    print("dim_properties:", AzureSQLSandbox.execute_read_only_query("SELECT DISTINCT region FROM dim_properties;"))
except Exception as e:
    print(f"dim_properties error: {e}")

try:
    print("fact_forecasts:", AzureSQLSandbox.execute_read_only_query("SELECT DISTINCT region FROM fact_forecasts;"))
except Exception as e:
    print(f"fact_forecasts error: {e}")

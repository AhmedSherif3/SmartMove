import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from apps.agentic_ai.tools.azure_sandbox import AzureSQLSandbox

schema = AzureSQLSandbox.get_database_schema()
print("=== SCHEMA START ===")
print(schema)
print("=== SCHEMA END ===")

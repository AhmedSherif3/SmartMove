import os

dubai_path = os.path.join("Dubai", "docker-compose.yaml")
egypt_path = os.path.join("Egypt", "docker-compose.yml")
england_path = os.path.join("England", "docker-compose.yml")

with open(dubai_path, "r", encoding="utf-8") as f:
    dubai_compose = f.read()

# Egypt Replacements
egypt_compose = dubai_compose.replace("smartmove-dubai-airflow", "smartmove-egypt-airflow")
egypt_compose = egypt_compose.replace("DUBAI_REPORTS_CONTAINER", "EGYPT_REPORTS_CONTAINER")
egypt_compose = egypt_compose.replace("/opt/airflow/Dubai", "/opt/airflow/Egypt")
egypt_compose = egypt_compose.replace("\"8085:8080\"", "\"8081:8080\"")
egypt_compose = egypt_compose.replace("\"5555:5555\"", "\"5556:5555\"")

# Add back data volume which is specific to Egypt
# Find: - .:/opt/airflow/Egypt
# Replace with: - ./data:/opt/airflow/Egypt/data\n    - .:/opt/airflow/Egypt
egypt_compose = egypt_compose.replace("- .:/opt/airflow/Egypt", "- ./data:/opt/airflow/Egypt/data\n    - .:/opt/airflow/Egypt")

with open(egypt_path, "w", encoding="utf-8") as f:
    f.write(egypt_compose)

# England Replacements
england_compose = dubai_compose.replace("smartmove-dubai-airflow", "smartmove-england-airflow")
england_compose = england_compose.replace("DUBAI_REPORTS_CONTAINER", "ENGLAND_REPORTS_CONTAINER")
england_compose = england_compose.replace("/opt/airflow/Dubai", "/opt/airflow/England")
england_compose = england_compose.replace("\"8085:8080\"", "\"8082:8080\"")
england_compose = england_compose.replace("\"5555:5555\"", "\"5557:5555\"")

# Add back data volume which is specific to England
england_compose = england_compose.replace("- .:/opt/airflow/England", "- ./data:/opt/airflow/England/data\n    - .:/opt/airflow/England")

with open(england_path, "w", encoding="utf-8") as f:
    f.write(england_compose)

print("Docker compose files updated successfully!")

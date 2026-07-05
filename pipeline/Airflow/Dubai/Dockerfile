# ============================================================
# Dockerfile
# Custom Airflow image with isolated dbt environment, 
# Microsoft ODBC driver, Kubernetes, and Postgres support.
# ============================================================

FROM apache/airflow:2.9.2-python3.11

USER root

# ── Install System Dependencies & MS ODBC Driver 18 ──────────────────────
# Added build-essential and libpq-dev for K8s and Postgres providers
RUN apt-get update --fix-missing && apt-get install -y --no-install-recommends \
    curl \
    gnupg \
    apt-transport-https \
    build-essential \
    libpq-dev \
    && curl -fsSL https://packages.microsoft.com/keys/microsoft.asc \
    | gpg --dearmor -o /usr/share/keyrings/microsoft-prod.gpg \
    && echo "deb [arch=amd64 signed-by=/usr/share/keyrings/microsoft-prod.gpg] \
    https://packages.microsoft.com/debian/12/prod bookworm main" \
    > /etc/apt/sources.list.d/mssql-release.list \
    && apt-get update --fix-missing \
    && ACCEPT_EULA=Y apt-get install -y --no-install-recommends --fix-missing \
    msodbcsql18 \
    unixodbc-dev \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# ── Create dbt venv as root (airflow user has no write access to /opt/) ──
RUN python -m venv /opt/dbt-venv \
    && chown -R airflow:root /opt/dbt-venv

USER airflow

# ── Copy and install Python requirements ─────────────────────────────────
COPY requirements.txt /requirements.txt
RUN pip install --no-cache-dir -r /requirements.txt

# ── Install dbt-sqlserver into the isolated venv ─────────────────────────
# dbt-core conflicts with Airflow's SQLAlchemy<2.0 pin if installed into
# the same environment. A separate venv sidesteps the conflict entirely.
RUN /opt/dbt-venv/bin/pip install --no-cache-dir \
    "dbt-sqlserver==1.9.0"

# ── Copy project code into the isolated regional directory ───────────────
COPY --chown=airflow:root . /opt/airflow/Dubai/

# Set PYTHONPATH to the Dubai folder so custom imports (sensors/utils) work
ENV PYTHONPATH="/opt/airflow/Dubai:${PYTHONPATH}"

# Make the dbt binary available to BashOperator shells
ENV PATH="/opt/dbt-venv/bin:${PATH}"
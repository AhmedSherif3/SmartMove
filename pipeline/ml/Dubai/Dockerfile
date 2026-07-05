# ============================================================
# pipeline/ml/Dubai/Dockerfile
#
# Kubernetes ML Execution Environment for SmartMove Dubai
# Installs Prophet, trains models during build, and predicts.
# ============================================================

FROM python:3.11-slim-bookworm

ENV PYTHONUNBUFFERED=1

# 1. Install System Dependencies (C++ Compiler for Prophet & Tools for Microsoft ODBC)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    gnupg \
    apt-transport-https \
    unixodbc-dev \
    # 2. Add Microsoft official repository for Debian 12 (Bookworm)
    && curl -fsSL https://packages.microsoft.com/keys/microsoft.asc \
    | gpg --dearmor -o /usr/share/keyrings/microsoft-prod.gpg \
    && echo "deb [arch=amd64 signed-by=/usr/share/keyrings/microsoft-prod.gpg] \
    https://packages.microsoft.com/debian/12/prod bookworm main" \
    > /etc/apt/sources.list.d/mssql-release.list \
    # 3. Install the MS ODBC Driver 18
    && apt-get update \
    && ACCEPT_EULA=Y apt-get install -y --no-install-recommends msodbcsql18 \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 4. Install Python Requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 5. Copy the ML scripts into the image
COPY . /app/

# 6. Build the Models (Bypasses Windows C++ errors!)
# This runs your scripts using the Linux compiler and saves the .pkl files inside the image.
RUN python train_price_model.py && python train_rent_model.py

# 7. Default Command: Execute forecast generation when the Pod spins up in K8s
CMD ["python", "generate_forecast.py"]
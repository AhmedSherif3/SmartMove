# ============================================================
# SmartMove Backend — Multi-Stage Dockerfile
# Base: Python 3.11 slim (Debian Bookworm)
# ============================================================

# ----------------------------------------------------------
# Stage 1: Builder — install build tools & Python packages
# ----------------------------------------------------------
FROM python:3.11-slim-bookworm AS builder

# Prevent Python from writing .pyc files and enable unbuffered output
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Install system-level build dependencies
#   - gcc, g++            : C/C++ compiler (needed by many Python packages)
#   - libpq-dev           : PostgreSQL client headers (psycopg2)
#   - unixodbc-dev        : ODBC headers (pyodbc)
#   - libpango1.0-dev     : Pango headers (WeasyPrint)
#   - libcairo2-dev       : Cairo headers (WeasyPrint)
#   - libgdk-pixbuf2.0-dev: GDK-Pixbuf headers (WeasyPrint / Pillow)
#   - libffi-dev          : Foreign Function Interface (cryptography)
#   - libjpeg62-turbo-dev : JPEG support (Pillow)
#   - libwebp-dev         : WebP support (Pillow)
#   - zlib1g-dev          : Compression (Pillow)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    libpq-dev \
    unixodbc-dev \
    libpango1.0-dev \
    libcairo2-dev \
    libgdk-pixbuf-2.0-dev \
    libffi-dev \
    libjpeg62-turbo-dev \
    libwebp-dev \
    zlib1g-dev \
    && rm -rf /var/lib/apt/lists/*

# Create a virtualenv so we can cleanly copy it to the runtime stage
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Install Python dependencies
COPY requirements/ /tmp/requirements/
RUN pip install --upgrade pip setuptools wheel \
    && pip install --no-cache-dir -r /tmp/requirements/production.txt

# ----------------------------------------------------------
# Stage 2: Runtime — lean production image
# ----------------------------------------------------------
FROM python:3.11-slim-bookworm AS runtime

LABEL maintainer="SmartMove Team" \
    description="SmartMove Django Backend" \
    version="1.0"

# Prevent Python from writing .pyc files and enable unbuffered output
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Install runtime-only system libraries (no -dev headers)
#   - libpq5              : PostgreSQL client lib
#   - unixodbc            : ODBC runtime (pyodbc)
#   - libpango-1.0-0      : Pango runtime (WeasyPrint)
#   - libpangocairo-1.0-0 : PangoCairo runtime (WeasyPrint)
#   - libcairo2           : Cairo runtime (WeasyPrint)
#   - libgdk-pixbuf2.0-0  : GDK-Pixbuf runtime (WeasyPrint / Pillow)
#   - libffi8             : FFI runtime (cryptography)
#   - libjpeg62-turbo     : JPEG runtime (Pillow)
#   - libwebp7            : WebP runtime (Pillow)
#   - curl                : Health-check probe
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    unixodbc \
    libpango-1.0-0 \
    libpangoft2-1.0-0 \
    libpangocairo-1.0-0 \
    libcairo2 \
    libgdk-pixbuf-2.0-0 \
    libffi8 \
    libjpeg62-turbo \
    libwebp7 \
    shared-mime-info \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Microsoft ODBC 18 Drivers for Azure SQL (Modern Debian Method)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl apt-transport-https gnupg2 unixodbc-dev \
    && curl -fsSL https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor -o /usr/share/keyrings/microsoft-prod.gpg \
    && curl -fsSL https://packages.microsoft.com/config/debian/12/prod.list > /etc/apt/sources.list.d/mssql-release.list \
    && apt-get update \
    && ACCEPT_EULA=Y apt-get install -y --no-install-recommends msodbcsql18 \
    && rm -rf /var/lib/apt/lists/*

# Copy the virtualenv from the builder stage
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Create a non-root user for security
RUN groupadd --system appgroup \
    && useradd --system --gid appgroup --home-dir /app --no-create-home appuser

# Set working directory
WORKDIR /app

# Copy application source code
COPY . .

# Create the staticfiles directory and collect static files
RUN mkdir -p /app/staticfiles \
    && DJANGO_SETTINGS_MODULE=config.settings.production \
    SECRET_KEY=build-placeholder \
    DB_NAME=x DB_USER=x DB_PASSWORD=x DB_HOST=x \
    python manage.py collectstatic --noinput 2>/dev/null || true

# Give ownership to appuser
RUN chown -R appuser:appgroup /app

# Switch to non-root user
USER appuser

# Set default environment variables
ENV DJANGO_SETTINGS_MODULE=config.settings.production \
    PORT=8000

# Expose the application port
EXPOSE 8000

# Health-check: hit Django health endpoint (adjust path as needed)
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:8000/admin/login/ || exit 1

# Start Gunicorn with Uvicorn workers (ASGI for WebSocket support)
CMD ["gunicorn", \
    "config.asgi:application", \
    "-k", "uvicorn.workers.UvicornWorker", \
    "--bind", "0.0.0.0:8000", \
    "--workers", "1", \
    "--timeout", "120", \
    "--access-logfile", "-", \
    "--error-logfile", "-"]
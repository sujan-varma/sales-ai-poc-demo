# Sales AI backend (FastAPI). Build context is the REPOSITORY ROOT, so the mobile app's web build can be included:
#   docker build -f backend/Dockerfile -t sales-ai-backend .
FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

COPY backend/requirements.txt .
RUN pip install -r requirements.txt

COPY backend/app ./app
# The workbook the API serves. Replace it at runtime by mounting a file over this path, then POST /api/sales/reload.
COPY ["backend/data/Master data_Sales GenAI.xlsx", "./data/"]
# The mobile app's web build, served at /app
COPY mobile/app ./mobile-app

# Non-root user; /app/state holds push tokens, the action tracker and the VAPID key (mount a volume there to keep it across restarts)
RUN useradd --system --uid 10001 --no-create-home appuser \
    && mkdir -p /app/state \
    && chown appuser /app/state
USER appuser

ENV EXCEL_PATH="/app/data/Master data_Sales GenAI.xlsx" \
    TOKENS_PATH=/app/state/tokens.json \
    TRACKER_PATH=/app/state/tracker.json \
    VAPID_PATH=/app/state/vapid.pem \
    APP_STATIC_DIR=/app/mobile-app

EXPOSE 8000

# The workbook takes ~20 s to load; /api/health answers 503 until it has.
HEALTHCHECK --interval=30s --timeout=5s --start-period=90s --retries=3 \
  CMD python -c "import sys, urllib.request; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/api/health', timeout=4).status == 200 else 1)"

# One worker: the workbook is cached in process memory and push tokens live in a local file.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1", "--proxy-headers", "--forwarded-allow-ips", "*"]

# Sales AI POC

The Sales AI (Cortex) dashboards and a field-sales mobile app, all driven by one Excel workbook through a FastAPI backend.

```
frontend/   Next.js web app: ASM, Head of Sales, Thermometer, Logs, Configuration     → port 3000
backend/    FastAPI API: reads "Master data_Sales GenAI.xlsx", serves both apps, Expo push → port 8000
mobile/     Field-sales mobile web app (mockup + generated app), served by the backend at /app/
docs/       Design and product prompts (DESIGN.md and PRODUCT.md are at the root)
```

| Doc | For |
|---|---|
| [DEPLOYMENT.md](DEPLOYMENT.md) | DevOps: Docker images, compose, proxy/TLS, health checks, scaling, smoke test |
| [ENVIRONMENT.md](ENVIRONMENT.md) | DevOps: every environment variable, secrets, values per environment, Kubernetes example |
| [backend/README.md](backend/README.md) | API endpoints, how the Excel data is shaped, push notifications, local backend setup |
| [frontend/README.md](frontend/README.md) | Web app routes, how the data loads, local frontend setup |
| [mobile/README.md](mobile/README.md) | Mobile web app and how it's built from the mockup |

## Run locally

```bash
# 1. backend (http://localhost:8000, Swagger at /docs, mobile app at /app/)
cd backend
python -m venv .venv && .venv\Scripts\activate      # macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
copy .env.example .env                              # set API_KEY
uvicorn app.main:app --port 8000 --reload

# 2. frontend (http://localhost:3000)
cd frontend
npm ci
copy .env.example .env.local                        # API_URL=http://localhost:8000
npm run dev
```

## Run with Docker

```bash
cp deploy.env.example deploy.env                    # set API_KEY, API_URL, CORS_ORIGINS
docker compose --env-file deploy.env up -d --build
```

See [DEPLOYMENT.md](DEPLOYMENT.md) for the details.

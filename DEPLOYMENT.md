# Sales AI POC — Deployment Guide

This guide covers building, configuring and running the Sales AI POC with Docker.

## 1. What you're deploying

| Service | Tech | Image built from | Port | What it does |
|---|---|---|---|---|
| **backend** | Python 3.13, FastAPI, uvicorn | `backend/Dockerfile` | 8000 | Reads the Excel workbook into memory at startup and serves JSON APIs for the web app and the mobile app. It also serves the mobile web app at `/app/` and sends push notifications through Expo. |
| **frontend** | Node 20, Next.js 14 (standalone server) | `Dockerfile` (repo root) | 3000 | The Sales AI web dashboard. It loads its data from the backend in the browser. |

```
Browser ──► frontend :3000  (pages, plus GET /runtime-config → { apiUrl })
   │
   └──────► backend  :8000  (GET /api/web/bootstrap, /api/app/bootstrap, /api/sales/*, /app/ …)
                       └── Excel workbook baked into the image (or mounted), cached in memory
```

The **browser** calls the backend directly; the frontend server never does. So:

- The backend must be reachable from users' browsers, through a public URL or ingress.
- `API_URL` on the frontend must be that browser-facing URL. An internal Docker or Kubernetes service name won't work.
- `CORS_ORIGINS` on the backend must include the frontend's public origin.

There is no database. All data comes from `backend/data/Master data_Sales GenAI.xlsx`.

## 2. Prerequisites

- Docker 24+ with BuildKit, and Docker Compose v2 for the compose route.
- Each image is built from the **repository root**. Both Dockerfiles copy files from several folders.
- Outbound HTTPS from the backend to `https://exp.host`. This is only needed for push notifications.

## 3. Quick start (single host, Docker Compose)

```bash
git clone https://github.com/sujan-varma/sales-ai-poc-demo.git
cd sales-ai-poc-demo

cp deploy.env.example deploy.env
# edit deploy.env: set API_KEY, and API_URL / CORS_ORIGINS for your hostnames (section 5)

docker compose --env-file deploy.env up -d --build
docker compose --env-file deploy.env ps   # wait until backend shows "healthy" (~30–90 s)
```

Open:
- Web app: `http://<host>:3000` (the root redirects to `/asm`)
- Mobile web app: `http://<host>:8000/app/`
- API docs (Swagger): `http://<host>:8000/docs`

To stop it, run `docker compose --env-file deploy.env down`. Push tokens are kept in the `backend-state` volume.

## 4. Building and pushing images (CI/CD)

Run these from the repository root:

```bash
docker build -f backend/Dockerfile -t <registry>/sales-ai-backend:<tag> .
docker build -f Dockerfile         -t <registry>/sales-ai-frontend:<tag> .
docker push <registry>/sales-ai-backend:<tag>
docker push <registry>/sales-ai-frontend:<tag>
```

With compose, set `REGISTRY=<registry>/` and `TAG=<tag>` in `deploy.env`, then run `docker compose --env-file deploy.env build && docker compose --env-file deploy.env push`.

Build notes:
- The frontend image takes no build arguments. The backend URL is a runtime setting (`API_URL`), so one image works in every environment.
- The frontend runs `npm ci --include=dev`. The build needs Tailwind, PostCSS and TypeScript even if your CI sets `NODE_ENV=production`.
- Each image is built from a single `.dockerignore` at the root. Secrets (`.env`, `deploy.env`), `node_modules`, `.next`, the Python virtualenv and docs are never copied into an image.
- The backend image includes the Excel workbook (27 MB).

## 5. Configuration

### Backend (`sales-ai-backend`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `API_KEY` | **yes** | – | Shared secret sent in the `X-API-Key` header for `POST /api/sales/reload`, `POST /api/notifications/send` and `GET /api/notifications/tokens`. While it's empty, those endpoints are locked. Store it as a secret. Generate one with `python -c "import secrets; print(secrets.token_urlsafe(32))"` |
| `CORS_ORIGINS` | yes (prod) | `*` | Comma-separated browser origins allowed to call the API, e.g. `https://sales-ai.example.com`. |
| `EXPO_ACCESS_TOKEN` | no | – | Only needed if *Enhanced push security* is on for the Expo project. Store it as a secret. |
| `NOTIFY_ON_RELOAD` | no | `true` | After a successful reload, push "Sales data updated" to every registered device. |
| `DEFAULT_SALES_OFFICER` | no | `SO018` | The sales officer the mobile app shows by default. |
| `APP_TODAY` | no | `2026-09-21` | The mobile app's "today". The workbook's actuals end on 20 Sep 2026. |
| `EXCEL_PATH` | no | `/app/data/Master data_Sales GenAI.xlsx` | The workbook to serve. It's preset in the image; only change it if you mount the file somewhere else. |
| `TOKENS_PATH` | no | `/app/state/tokens.json` | The push-token registry. Keep `/app/state` on a volume. |
| `APP_STATIC_DIR` | no | `/app/mobile-app` | The mobile web app files, served at `/app/`. Preset in the image. |

### Frontend (`sales-ai-frontend`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `API_URL` | **yes** | `http://localhost:8000` | The backend's URL **as the user's browser reaches it**, e.g. `https://sales-ai-api.example.com`. It's read at runtime and served to the browser by `GET /runtime-config`. |
| `PORT` | no | `3000` | Listen port. |

### Example production values

```
# backend
API_KEY=<secret>
CORS_ORIGINS=https://sales-ai.example.com
# frontend
API_URL=https://sales-ai-api.example.com
```

## 6. Reverse proxy / TLS

Put both services behind your load balancer or ingress with TLS. Use two hostnames, or one hostname with path routing:

| Public URL | Upstream |
|---|---|
| `https://sales-ai.example.com/` | frontend:3000 |
| `https://sales-ai-api.example.com/` | backend:8000 (all paths: `/api/*`, `/app/*`, `/docs`, `/openapi.json`) |

The backend trusts `X-Forwarded-*` headers (`--proxy-headers`).

Proxy settings:
- **Response size:** `GET /api/web/bootstrap` returns about 1.5 MB of JSON. Enable gzip or brotli at the proxy.
- **Timeouts:** allow a read timeout of at least 60 s on the backend. `POST /api/sales/reload` re-reads the workbook, which takes 10–20 s.

nginx example for the API host:

```nginx
server {
  listen 443 ssl;
  server_name sales-ai-api.example.com;
  gzip on; gzip_types application/json text/html application/javascript text/css;
  client_max_body_size 5m;
  location / {
    proxy_pass http://backend:8000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 60s;
  }
}
```

## 7. Health checks, resources, scaling

| | Backend | Frontend |
|---|---|---|
| Health / readiness endpoint | `GET /api/health`: **200** once the workbook is loaded, **503** before | `GET /runtime-config`: 200 |
| Startup time | 10–30 s, while the workbook loads; it doesn't accept connections until then. Use a start period or initial delay of at least 60 s. | A few seconds |
| Memory | About 300–600 MB in use. Set the limit to **1 GB**. | Set the limit to about 256–512 MB. |
| CPU | 0.5–1 vCPU | 0.25–0.5 vCPU |
| Replicas | **Exactly 1** (see below) | Any number (it's stateless) |

**The backend must run as a single replica with one worker.** It keeps the workbook in process memory, and it stores push tokens in a local JSON file (`/app/state/tokens.json`). With more than one replica:
- devices would register on different instances, so a push from one instance wouldn't reach them all
- `POST /api/sales/reload` would only refresh the instance that received it

Both Dockerfiles already run as non-root users and include a `HEALTHCHECK`.

### Kubernetes notes

- **Backend:** a Deployment with `replicas: 1` and strategy `Recreate`.
  - Readiness probe: `httpGet /api/health:8000`, `initialDelaySeconds: 20`, `periodSeconds: 10`, `failureThreshold: 9`.
  - Liveness probe: the same endpoint, but with `initialDelaySeconds: 90`.
  - Mount a small PVC (100 Mi) at `/app/state`.
  - Supply `API_KEY` (and `EXPO_ACCESS_TOKEN` if used) from a Secret.
- **Frontend:** a Deployment with any replica count and a readiness probe on `httpGet /runtime-config:3000`. Set `API_URL` from a ConfigMap.
- **Ingress:** route as in section 6, with gzip on.

## 8. Updating the Excel data

The workbook is baked into the backend image. There are two ways to update it.

1. **Rebuild (simplest):** replace `backend/data/Master data_Sales GenAI.xlsx` in the repo, rebuild and redeploy the backend image.
2. **Without rebuilding:** mount the new file over the baked-in copy, then trigger a reload.
   ```yaml
   # docker-compose.yml → backend.volumes
   - ./data/Master data_Sales GenAI.xlsx:/app/data/Master data_Sales GenAI.xlsx:ro
   ```
   ```bash
   curl -X POST https://<api-host>/api/sales/reload -H "X-API-Key: $API_KEY"
   ```
   The reload takes 10–20 s. While it runs, the old data keeps being served. Afterwards, every registered device gets a "Sales data updated" push, unless `NOTIFY_ON_RELOAD=false`.

The workbook layout (sheet names and columns) must stay the same. The backend derives every screen from specific sheets and columns.

## 9. Post-deploy smoke test

```bash
API=https://sales-ai-api.example.com
WEB=https://sales-ai.example.com

curl -fsS $API/api/health                          # {"success":true,...,"sheets":35,"rows":23591}
curl -fsS -o /dev/null -w "%{http_code}\n" $API/api/web/bootstrap   # 200
curl -fsS -o /dev/null -w "%{http_code}\n" $API/api/app/bootstrap   # 200
curl -fsS $WEB/runtime-config                      # {"apiUrl":"https://sales-ai-api.example.com"}
curl -fsS -o /dev/null -w "%{http_code}\n" $WEB/asm                 # 200
curl -sS -o /dev/null -w "%{http_code}\n" -X POST $API/api/sales/reload    # 401 without the key (expected)
```

Then check in a browser:
- Open `$WEB/asm`. You should see "Welcome back, Raman" with Excel figures (e.g. ₹144.2L achieved).
- Open `$WEB/leadership`. You should see "Ajay Choudhari · 8 ASMs · 24 territories".
- Open `$API/app/`. You should see the mobile app with "Welcome Paresh!".

## 10. Logs and troubleshooting

Both services log to stdout and stderr. View them with `docker compose logs -f backend frontend`.

| Symptom | Likely cause / fix |
|---|---|
| Web app shows "Couldn't load the sales data" with a URL | The browser can't reach `API_URL`. Check that it's the public backend URL, that it's reachable from a browser, and that `CORS_ORIGINS` includes the web app's origin. The browser console shows CORS errors explicitly. |
| `GET /runtime-config` returns `http://localhost:8000` in production | `API_URL` isn't set on the **frontend** container. |
| Backend restarts in a loop or stays unhealthy | It's being killed during the 10–30 s workbook load. Raise the start period or initial delay, and the memory limit (1 GB). Backend logs show `Loaded Master data_Sales GenAI.xlsx: 35 sheets…` when it's ready. |
| `GET /api/health` returns 503 | The workbook failed to load: the file is missing or unreadable, or its layout changed. The traceback is in the backend logs. |
| `401 Missing or invalid X-API-Key` | Send the `X-API-Key` header with the value of `API_KEY`. |
| `503 API_KEY is not configured` | `API_KEY` is empty on the backend. |
| Push send fails with `DeviceNotRegistered` | That token is invalid; the backend removes it automatically. |
| Pushes stop after a redeploy | `/app/state` isn't on a persistent volume, so registered tokens were lost. Devices re-register the next time the app starts. |

## 11. Security notes

- The workbook contains retailer names, owner names and mobile numbers, which the API returns. Treat both images and the API as internal. Restrict access (VPN, IP allow-list or SSO at the proxy) if the data isn't synthetic.
- `API_KEY` and `EXPO_ACCESS_TOKEN` are secrets. Pass them as environment variables from your secret store, never baked into an image. `.dockerignore` keeps `.env` and `deploy.env` out of the build context.
- In production, set `CORS_ORIGINS` to the web app's exact origin, not `*`.
- `/docs` and `/openapi.json` are public API docs. Block them at the proxy if they shouldn't be exposed.

## 12. Repository map (deployment-relevant)

```
Dockerfile               frontend image
backend/Dockerfile       backend image
.dockerignore            shared build-context filter (repo root)
docker-compose.yml       both services, the state volume and health-ordered startup
deploy.env.example       variables for compose (copy to deploy.env)
backend/                 FastAPI app (backend/README.md: endpoints, local dev)
backend/data/            the Excel workbook
mobile/app/              mobile web app, served by the backend at /app/
src/                     Next.js web app
```

# Sales AI POC — Environment Variables

This is the complete list of settings for both services. The build and run steps are in [DEPLOYMENT.md](DEPLOYMENT.md).

| Service | Folder | Template | Where values come from |
|---|---|---|---|
| Backend (FastAPI) | `backend/` | [`backend/.env.example`](backend/.env.example) | Container env vars. For local development, `backend/.env`. |
| Frontend (Next.js) | `frontend/` | [`frontend/.env.example`](frontend/.env.example) | Container env vars at **runtime**. For local development, `frontend/.env.local`. |
| Docker Compose | repo root | [`deploy.env.example`](deploy.env.example) | `docker compose --env-file deploy.env …` passes these on to both services. |

None of the real values are in git: `.env`, `.env.local` and `deploy.env` are git-ignored and excluded from Docker images.

---

## 1. Secrets

Store these in your secret manager (Vault, AWS Secrets Manager, a Kubernetes Secret, CI/CD protected variables). Don't put them in images, ConfigMaps or the repo.

| Variable | Service | Required | Purpose | How to create |
|---|---|---|---|---|
| `API_KEY` | backend | **Yes** | Clients send it as the `X-API-Key` header. It protects `POST /api/sales/reload`, `POST /api/notifications/send` and `GET /api/notifications/tokens`. | `python -c "import secrets; print(secrets.token_urlsafe(32))"`. Use a different value in each environment. |
| `EXPO_ACCESS_TOKEN` | backend | No | Lets the backend send pushes through Expo when *Enhanced push security* is on for the Expo project. | expo.dev → Account settings → Access tokens → Create. Owned by the mobile team. |

The frontend has no secrets.

---

## 2. Backend variables (`backend/`)

| Variable | Required | Default (in the Docker image) | Default (local dev) | Description |
|---|---|---|---|---|
| `API_KEY` | **Yes** | – | – | See [Secrets](#1-secrets). If it's empty, the protected endpoints return `503 API_KEY is not configured`. |
| `CORS_ORIGINS` | Yes in prod | `*` | `*` | Comma-separated browser origins allowed to call the API. Set it to the **web app's public origin**, e.g. `https://sales-ai.example.com`. It must match the scheme, host and port exactly, with no trailing slash. |
| `EXPO_ACCESS_TOKEN` | No | – | – | See [Secrets](#1-secrets). |
| `EXPO_PUSH_URL` | No | `https://exp.host/--/api/v2/push/send` | same | The Expo push API endpoint. Only change it for a proxy or test double. The backend needs outbound HTTPS to it. |
| `EXCEL_PATH` | No | `/app/data/Master data_Sales GenAI.xlsx` | `data/Master data_Sales GenAI.xlsx` | The workbook to serve. It's loaded once at startup (10–30 s) and again on `POST /api/sales/reload`. Absolute, or relative to `backend/`. |
| `TOKENS_PATH` | No | `/app/state/tokens.json` | `data/tokens.json` | The registry of push tokens, which the API writes. It **must be on persistent storage**, so mount a volume or PVC at `/app/state`. |
| `APP_STATIC_DIR` | No | `/app/mobile-app` | `../mobile/app` | The folder of the mobile web app, served at `/app/`. If the folder doesn't exist, that route is skipped. |
| `NOTIFY_ON_RELOAD` | No | `true` | `true` | After a successful reload, push "Sales data updated" to every registered device. Accepts `true` or `false`. |
| `DEFAULT_SALES_OFFICER` | No | `SO018` | `SO018` | The sales officer the mobile app shows when no `?so=` is given. Valid IDs are listed at `GET /api/app/sales-officers`. |
| `APP_TODAY` | No | `2026-09-21` | `2026-09-21` | The mobile app's "today", as `YYYY-MM-DD`. The workbook's actuals end on 20 Sep 2026, so keep this just after the data date. |

How the backend reads its settings:
- It uses pydantic-settings.
- Environment variables override `backend/.env`.
- Names are case-insensitive.
- If a value is invalid (for example `APP_TODAY=tomorrow` or `NOTIFY_ON_RELOAD=maybe`), the container fails to start and logs a validation error that names the variable.

## 3. Frontend variables (`frontend/`)

| Variable | When it's read | Required | Default | Description |
|---|---|---|---|---|
| `API_URL` | **Runtime** | **Yes** | `http://localhost:8000` | The backend's URL **as the user's browser reaches it**. The browser fetches `GET /runtime-config` and then calls this URL directly. It must be a public or ingress URL, not an internal name like `http://backend:8000`. No trailing slash. |
| `PORT` | Runtime | No | `3000` | The Next.js server port. |
| `HOSTNAME` | Runtime | No | `0.0.0.0` | The interface the server listens on. Keep `0.0.0.0` in containers. |
| `NEXT_TELEMETRY_DISABLED` | Build and runtime | No | `1` (in the image) | Turns off Next.js telemetry. |
| `NODE_ENV` | Build and runtime | No | `production` (runtime stage of the image) | **Don't set this to `production` while building or for `next dev`.** If you do, `npm ci` skips the dev dependencies (Tailwind, PostCSS, TypeScript) and `next dev` fails with `Module parse failed: Unexpected character '@'` in `globals.css`. The Dockerfile already guards the install with `--include=dev`. |
| `NEXT_PUBLIC_API_URL` | **Build** time | No | – | Only used by `npm run export:html` (the single-file HTML export, which fetches the data while it builds) and as a fallback if `/runtime-config` can't be reached. **Not needed for the Docker image.** |

The frontend image has **no build arguments**. Build it once and set `API_URL` for each environment.

## 4. Compose-only variables (`deploy.env`)

| Variable | Default | Description |
|---|---|---|
| `BACKEND_PORT` | `8000` | The host port mapped to the backend container's port 8000. |
| `FRONTEND_PORT` | `3000` | The host port mapped to the frontend container's port 3000. |
| `REGISTRY` | (empty) | The image name prefix with a trailing slash, e.g. `registry.example.com/sales-ai/`. |
| `TAG` | `latest` | The image tag. |

Compose also passes `API_KEY`, `EXPO_ACCESS_TOKEN`, `CORS_ORIGINS`, `NOTIFY_ON_RELOAD`, `DEFAULT_SALES_OFFICER` and `APP_TODAY` to the backend, and `API_URL` to the frontend.

---

## 5. The two URLs that must match

```
Browser on https://sales-ai.example.com
  1) GET https://sales-ai.example.com/runtime-config  → {"apiUrl": "<API_URL>"}
  2) GET <API_URL>/api/web/bootstrap                  → backend checks the Origin header against CORS_ORIGINS
```

| Setting | Must equal |
|---|---|
| Frontend `API_URL` | The backend's public URL, e.g. `https://sales-ai-api.example.com` |
| Backend `CORS_ORIGINS` | The frontend's public origin, e.g. `https://sales-ai.example.com` |

If they don't match, the web app shows **"Couldn't load the sales data"** together with the URL it tried. The browser console shows the CORS or network error.

The mobile web app at `<backend>/app/` calls its own origin, so it needs no settings.

---

## 6. Values per environment

Replace the hostnames with your own. Each environment needs its own `API_KEY`.

### Local development (no Docker)

`backend/.env`
```
API_KEY=<any local value>
CORS_ORIGINS=*
```
`frontend/.env.local`
```
API_URL=http://localhost:8000
```
Run the backend with `cd backend && uvicorn app.main:app --port 8000 --reload`, and the frontend with `cd frontend && npm run dev`.

### Docker Compose on one host

`deploy.env`
```
API_KEY=<secret>
API_URL=http://<host-ip-or-dns>:8000
CORS_ORIGINS=http://<host-ip-or-dns>:3000
```

### Staging

| Service | Variable | Value |
|---|---|---|
| backend | `API_KEY` | `<staging secret>` |
| backend | `CORS_ORIGINS` | `https://sales-ai.staging.example.com` |
| backend | `EXPO_ACCESS_TOKEN` | `<only if Expo push security is on>` |
| frontend | `API_URL` | `https://sales-ai-api.staging.example.com` |

### Production

| Service | Variable | Value |
|---|---|---|
| backend | `API_KEY` | `<production secret>` |
| backend | `CORS_ORIGINS` | `https://sales-ai.example.com` |
| backend | `EXPO_ACCESS_TOKEN` | `<only if Expo push security is on>` |
| backend | `NOTIFY_ON_RELOAD` | `true` |
| frontend | `API_URL` | `https://sales-ai-api.example.com` |

Everything else can stay at the image defaults.

---

## 7. Kubernetes example

```yaml
apiVersion: v1
kind: Secret
metadata: { name: sales-ai-backend }
stringData:
  API_KEY: "<secret>"
  EXPO_ACCESS_TOKEN: ""
---
apiVersion: v1
kind: ConfigMap
metadata: { name: sales-ai-backend }
data:
  CORS_ORIGINS: "https://sales-ai.example.com"
  NOTIFY_ON_RELOAD: "true"
---
apiVersion: v1
kind: ConfigMap
metadata: { name: sales-ai-frontend }
data:
  API_URL: "https://sales-ai-api.example.com"
```

In the Deployments:
- Backend: `envFrom: [{secretRef: {name: sales-ai-backend}}, {configMapRef: {name: sales-ai-backend}}]`, and a PVC mounted at `/app/state`.
- Frontend: `envFrom: [{configMapRef: {name: sales-ai-frontend}}]`.

The other settings (replicas, health checks, resources) are in [DEPLOYMENT.md §7](DEPLOYMENT.md#7-health-checks-resources-scaling).

## 8. Checklist before go-live

- [ ] `API_KEY` is set from the secret store, and it's different for each environment.
- [ ] `API_URL` on the frontend is the backend's **public** URL, and it opens in a browser.
- [ ] `CORS_ORIGINS` on the backend is the frontend's public origin (not `*` in production).
- [ ] `/app/state` on the backend is a persistent volume.
- [ ] `curl $WEB/runtime-config` returns the expected `apiUrl`.
- [ ] `curl -X POST $API/api/sales/reload` without a key returns 401, and with `-H "X-API-Key: …"` returns 200.
- [ ] `EXPO_ACCESS_TOKEN` is set only if the mobile team turned on Enhanced push security.

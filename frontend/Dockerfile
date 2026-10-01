# Sales AI web app (Next.js). Build context is the frontend/ folder:
#   docker build -t sales-ai-frontend ./frontend
# Runtime setting: API_URL = the backend's public URL as the browser reaches it (e.g. https://api.example.com).

FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# --include=dev: the build needs Tailwind/PostCSS/TypeScript even if the CI sets NODE_ENV=production
RUN npm ci --include=dev --no-audit --no-fund

FROM node:20-alpine AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-alpine AS run
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    API_URL=http://localhost:8000
RUN addgroup -S app && adduser -S app -G app
# standalone server + static assets (next.config.mjs: output "standalone")
COPY --from=build --chown=app:app /app/.next/standalone ./
COPY --from=build --chown=app:app /app/.next/static ./.next/static
USER app
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:3000/runtime-config || exit 1
CMD ["node", "server.js"]

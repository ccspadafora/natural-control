# 09 · Docker y despliegue

**Regla:** todo corre en Docker, en todos los ambientes (desarrollo, CI, staging y producción). La misma imagen que se prueba en staging es la que se promueve a producción, sin reconstruir.

## 1. Ambientes

| Ambiente | Dónde | Dominio (propuesto, D4) | Datos |
|---|---|---|---|
| dev | Máquina del desarrollador | `localhost:8080` | Semilla (`make seed`) |
| ci | GitHub Actions | — | Efímeros |
| staging | EC2 `t3.small` (o el mismo servidor, con otro proyecto de Compose, si el presupuesto lo exige) | `staging.crm.<dominio>` | Copia anonimizada de producción + semilla |
| producción | EC2 `t3.medium` (2 vCPU, 4 GiB), Ubuntu 24.04 LTS, disco gp3 de 60 GB, IP elástica | `crm.<dominio>` | Reales |

**Presupuesto:** la propuesta estima ~USD 50 al mes de servidor a cargo del cliente. Una `t3.medium` bajo demanda en `us-east-1` (~USD 30 al mes) + 60 GB gp3 (~USD 5) + S3 y transferencia (~USD 5) + SES (céntimos) entran en ese monto **con Postgres en contenedor**. Usar RDS gestionado (+USD 15–30 al mes) es más robusto, pero supera el estimado: decisión abierta D7. Con una instancia reservada a un año, el costo baja cerca de un 35 %.

## 2. Servicios de Docker Compose

| Servicio | Imagen | Rol | Dev | Prod |
|---|---|---|---|---|
| `nginx` | `infra/docker/nginx.Dockerfile` (contiene los builds de `campo` y `web`) | TLS, estáticos, proxy `/api`, `/ws`, `/hooks` | ✓ (sin TLS) | ✓ |
| `api` | `backend` (target `prod` o `dev`) | Gunicorn + UvicornWorker (ASGI: DRF + Channels) | `runserver` ASGI con recarga automática | 3 workers |
| `worker` | `backend` | Celery `-Q default,sync -c 4` | ✓ | ✓ |
| `worker-io` | `backend` | Celery `-Q notify,whatsapp,erp -c 8` | ✓ (fusionado con `worker` en dev) | ✓ |
| `worker-heavy` | `backend` | Celery `-Q reports,maint -c 2` | ✓ (fusionado) | ✓ |
| `beat` | `backend` | Celery Beat (`DatabaseScheduler`) | ✓ | ✓ (1 réplica) |
| `db` | `postgis/postgis:16-3.4` | Postgres + PostGIS | ✓ | ✓ (o RDS, D7) |
| `redis` | `redis:7-alpine` | Broker (db0), canales (db1) y caché (db2); `appendonly yes` | ✓ | ✓ |
| `frontend-dev` | `node:20-alpine` | Vite dev server de `campo` (5173) y `web` (5174) con HMR | ✓ | — |
| `minio` | `minio/minio` | S3 local | ✓ | — |
| `mailpit` | `axllent/mailpit` | SMTP y visor de correo (8025) | ✓ | — |
| `flower` | `mher/flower` | Monitor de Celery | opcional | staging |

Límites de memoria en producción (`deploy.resources.limits`): `api` 1 GB, `worker` 512 MB, `worker-io` 384 MB, `worker-heavy` 768 MB, `beat` 128 MB, `db` 1 GB (`shared_buffers=256MB`, `work_mem=8MB`, `effective_cache_size=1GB`), `redis` 256 MB (`maxmemory-policy noeviction` en db0 — Celery no tolera desalojos), `nginx` 64 MB.

`healthcheck` en todos los servicios: `api` → `GET /api/health/live` (y `/ready` verifica la base y Redis); `db` → `pg_isready`; `redis` → `redis-cli ping`; workers → `celery inspect ping -d celery@$HOSTNAME` cada 60 s.

## 3. Dockerfiles

### 3.1 Backend (`infra/docker/backend.Dockerfile`, multi-stage)
```dockerfile
FROM python:3.12-slim-bookworm AS base
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 UV_COMPILE_BYTECODE=1
RUN apt-get update && apt-get install -y --no-install-recommends \
      gdal-bin libgdal-dev libgeos-dev libproj-dev \
      libpq5 \
      libpango-1.0-0 libpangoft2-1.0-0 libharfbuzz0b fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/*
COPY --from=ghcr.io/astral-sh/uv:0.4 /uv /usr/local/bin/uv
WORKDIR /app

FROM base AS deps
COPY backend/pyproject.toml backend/uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project

FROM deps AS dev
RUN uv sync --frozen --no-install-project       # + dependencias de dev
COPY backend/ .
CMD ["uv","run","python","manage.py","runserver","0.0.0.0:8000"]

FROM base AS prod
RUN useradd -r -u 10001 app
COPY --from=deps /app/.venv /app/.venv
COPY backend/ .
COPY infra/scripts/entrypoint.sh /entrypoint.sh
ENV PATH="/app/.venv/bin:$PATH" DJANGO_SETTINGS_MODULE=config.settings.prod
RUN python manage.py collectstatic --noinput
USER app
ENTRYPOINT ["/entrypoint.sh"]
CMD ["gunicorn","config.asgi:application","-k","uvicorn.workers.UvicornWorker","-w","3","-b","0.0.0.0:8000","--timeout","60","--graceful-timeout","30","--access-logfile","-"]
```
`entrypoint.sh` espera la base (`pg_isready`) y **no** migra automáticamente en producción: las migraciones son un paso explícito del despliegue (§5).

### 3.2 Frontend + Nginx (`infra/docker/nginx.Dockerfile`)
```dockerfile
FROM node:20-alpine AS build
RUN corepack enable
WORKDIR /fe
COPY frontend/ .
RUN pnpm install --frozen-lockfile
ARG APP_VERSION
ENV VITE_APP_VERSION=$APP_VERSION
RUN pnpm turbo run build --filter=campo --filter=web

FROM nginx:1.27-alpine
COPY infra/nginx/prod.conf /etc/nginx/conf.d/default.conf
COPY --from=build /fe/apps/campo/dist /usr/share/nginx/html/campo
COPY --from=build /fe/apps/web/dist   /usr/share/nginx/html/web
```

## 4. Nginx (puntos clave de `prod.conf`)
- TLS con certificados de Let's Encrypt (contenedor `certbot` con renovación cada 12 h y `nginx -s reload`); HTTP → HTTPS.
- `location /campo/` → `try_files $uri /campo/index.html`; **`sw.js` y `manifest.webmanifest` con `Cache-Control: no-cache`**; los assets con hash, `max-age=31536000, immutable`.
- `location ~ ^/(portal|consola)/` → la SPA `web`; `location = /` → redirección según el dispositivo (móvil → `/campo`, escritorio → `/portal`; el usuario puede cambiar).
- `location /api/` → `proxy_pass http://api:8000`; `client_max_body_size 15m` (importaciones XLSX); `proxy_read_timeout 60s`.
- `location /ws/` → `proxy_pass http://api:8000` con `Upgrade` y `Connection`, y `proxy_read_timeout 3600s`.
- `location /hooks/` → `api`, sin límite de tasa por IP (Meta reintenta).
- `limit_req_zone` para `/api/v1/auth/` (10 r/m por IP).
- Las cabeceras de seguridad de `docs/08` §1.
- `gzip` y `brotli` (si el módulo está disponible) para JS, CSS y JSON.

## 5. CI/CD (GitHub Actions)

**`ci.yml`** (cada PR y cada push a `develop` o `main`):
1. `lint` — ruff, mypy, eslint, `tsc --noEmit` (dentro de contenedores con `docker compose run`).
2. `test-backend` — `docker compose -f docker-compose.ci.yml run api pytest -n auto --cov`, contra Postgres + PostGIS y Redis reales (sin SQLite: GeoDjango y las consultas de PostGIS deben probarse de verdad).
3. `test-frontend` — vitest.
4. `schema-check` — genera el OpenAPI y falla si difiere del commiteado (`backend/openapi.yaml`) o si el cliente de `orval` no se regeneró.
5. `e2e` — levanta el stack completo y corre Playwright (perfiles Pixel 7 e iPhone 14, con la geolocalización emulada y el modo offline).
6. `security` — `pip-audit`, `pnpm audit --prod`, `trivy image`.
7. `build` — imágenes `backend` y `nginx` etiquetadas con el SHA y publicadas en GHCR (o en ECR).

**`deploy.yml`:**
- Push a `develop` → despliegue automático a **staging**.
- Tag `vX.Y.Z` en `main` → despliegue a **producción** con aprobación manual (environment protegido en GitHub; aprueba el líder técnico).
- Pasos en el servidor (por SSH con una llave de despliegue, o con SSM Run Command):
  1. `docker compose pull`;
  2. `docker compose run --rm api python manage.py migrate --noinput` (las migraciones deben ser compatibles hacia atrás con la versión anterior en ejecución: patrón *expand/contract*);
  3. `docker compose up -d --remove-orphans`;
  4. *smoke test* de `/api/health/ready` y `/campo/` (si falla → `docker compose` con el tag anterior y aviso por correo);
  5. aviso a Sentry del *release*.
- La versión de la app (`APP_VERSION`) se compara con `X-Client-Version` para forzar la actualización de la PWA en cambios incompatibles (`docs/04` §2).

## 6. Backups y recuperación
- `maint.backup_db` (diario, 2:00): `pg_dump -Fc` → cifrado con `age` (clave pública en el servidor; la privada solo en el gestor de secretos de 3 Orillas) → `s3://nc-crm-prod/backups/db/YYYY/MM/DD.dump.age`. Retención: 30 diarios, 12 mensuales.
- Snapshots de EBS del volumen de datos cada 24 h con Data Lifecycle Manager (7 retenidos).
- **RPO** 24 h (o 5 min si se adopta RDS con PITR, D7). **RTO** 4 h.
- Prueba de restauración **mensual** en staging (`make restore-latest`), con el resultado documentado. Un backup que no se restauró no cuenta.
- Redis no se respalda (es transitorio); al perderse, solo se pierden las tareas en vuelo, que tienen sus reintentos o se reprograman.

## 7. Observabilidad
- Logs JSON a stdout → `docker logs` con rotación (`max-size: 50m`, `max-file: 5`) y envío opcional a CloudWatch Logs con el driver `awslogs`.
- Sentry para el backend (Django y Celery) y el frontend (con *source maps* subidos en el build; `release` = SHA).
- `/admin/health` (`docs/03` §3.9) para la supervisión funcional.
- Alarmas: CloudWatch sobre la CPU > 80 % durante 15 min, el disco > 80 % y el *status check* de la instancia → correo al equipo; Sentry → alertas por correo y Slack del equipo.

## 8. Makefile (targets mínimos)
```
up / down / logs / ps          # stack de dev
migrate / makemigrations       # Django
seed                           # datos de demo
shell / dbshell                # consolas
test / test-be / test-fe / e2e # pruebas
lint / fmt / typecheck
schema                         # regenera openapi.yaml y el cliente orval
backup / restore-latest        # en staging o prod
```

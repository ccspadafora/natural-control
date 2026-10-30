# 01 · Arquitectura

## 1. Vista general

```
                    ┌──────────────────────── Nginx (TLS, gzip, static, proxy) ────────────────────────┐
  RTC (celular) ───▶│ /campo/*   → PWA Campo (estáticos + Service Worker)                              │
  RTC (computador) ▶│ /portal/*  → SPA Web (Portal)          ┐ mismo bundle "web"                       │
  Gerencia/Admin ──▶│ /consola/* → SPA Web (Consola)         ┘                                          │
                    │ /api/*     → api (Django ASGI: DRF)                                               │
                    │ /ws/*      → api (Django Channels)                                               │
                    │ /hooks/*   → api (webhooks WhatsApp, SES)                                        │
                    └──────────────────────────────────────────────────────────────────────────────────┘
                                   │                  │                     │
                           PostgreSQL 16         Redis 7              AWS S3 (fotos, PDF,
                           + PostGIS 3.4   (cache, broker, channels)    exportaciones, backups)
                                   ▲                  ▲
                                   │                  │
             ┌──────────── Celery workers (colas: default, sync, notify, whatsapp, erp, reports, maint) ───────────┐
             │                       Celery Beat (django-celery-beat, programación en BD)                         │
             └──────▶ ERP Natural Control · WhatsApp Cloud API · Amazon SES · LLM (IA) · Web Push (VAPID) · Mapas ─┘
```

**Un solo dominio**, por ejemplo `crm.naturalcontrol.com.co` (decisión abierta D4), con enrutamiento por ruta. Así, la cookie de refresh es *same-site*, no se necesita CORS y el Service Worker de la PWA queda en el alcance `/campo/`.

## 2. Backend

| Componente | Elección | Por qué |
|---|---|---|
| Lenguaje y framework | Python 3.12, Django 5.1 | Pedido por el equipo; ORM, admin interno y GeoDjango |
| API | Django REST Framework 3.15 + `drf-spectacular` | OpenAPI 3 como contrato; de ahí se genera el cliente TS |
| Base de datos | PostgreSQL 16 + PostGIS 3.4 (`postgis/postgis:16-3.4`) | Distancias geodésicas exactas (`ST_Distance` sobre geography), índices GiST, `JSONB` |
| Auth | `djangorestframework-simplejwt` (access en memoria + refresh en cookie httpOnly), `django-otp` (TOTP), `py_webauthn` (passkeys y biometría) | Ver `docs/08` §1 |
| Tiempo real | Django Channels 4 + `channels-redis` | Consolidado y agenda en vivo (HU-8.1) |
| Servidor | Gunicorn con `uvicorn.workers.UvicornWorker` (ASGI) | HTTP y WebSocket en el mismo proceso |
| Asíncrono | Celery 5.4 + Redis (broker) + `django-celery-beat` | Colas por tipo de carga (`docs/07`) |
| Archivos | `django-storages[s3]` + boto3, con URLs prefirmadas | El celular sube las fotos directo a S3 |
| Correo | `django-anymail[amazon-ses]` | Transaccional, informes y PDF |
| PDF / Excel | WeasyPrint (plantillas HTML) / `openpyxl` | Exportaciones de E5 e informes |
| Push | `pywebpush` (VAPID) | Web Push en Android y en iOS 16.4+ instalado |
| Observabilidad | `structlog` (JSON), `sentry-sdk`, `django-prometheus` (opcional) | |
| Calidad | ruff, mypy + django-stubs, pytest, pytest-django, factory_boy, `freezegun`, `responses` | |

### 2.1 Apps Django

```
backend/
├── config/                 # settings (base, dev, test, prod), urls, asgi, celery
└── apps/
    ├── core/               # BaseModel, mixins, paginación, errores, utilidades de fecha/periodo
    ├── accounts/           # User, Role, Permission, sesiones, dispositivos, OTP, WebAuthn
    ├── org/                # Zone, Team (jerarquía líder → RTC)
    ├── geo/                # Departamento, Municipio (DIVIPOLA), servicios de geocodificación
    ├── crm/                # Client, Site (sede/finca), Contact, Crop, ClientBiotech, dedupe
    ├── catalog/            # Category, Product, PriceList, TechSheet (versionada)
    ├── visits/             # Visit, VisitProduct, Evidence, GpsCheck, WeeklyPlan, VisitReason
    ├── pipeline/           # Stage, Opportunity, OpportunityLine, FollowUpRule, Task
    ├── goals/              # Goal (presupuesto + meta de visitas), Achievement (gamificación)
    ├── forecast/           # selectors de forecast, ForecastSnapshot
    ├── messaging/          # WhatsApp: Conversation, Message, Template; EmailLog
    ├── automation/         # PostVisitRule, AutomationRun
    ├── reports/            # AIReport, exportaciones (ExportJob)
    ├── integrations/       # ERP: ErpSyncRun, ErpSale, ErpCustomerLink, adaptadores
    ├── notifications/      # Notification, PushSubscription, preferencias
    ├── sync/               # protocolo offline: MutationLog, endpoints push/pull
    ├── audit/              # AuditLog
    └── parameters/         # SystemSetting + get_setting() con caché en Redis
```

Cada app tiene: `models.py`, `services.py` (escrituras y reglas), `selectors.py` (lecturas), `api/` (serializers, views, urls), `tasks.py`, `permissions.py`, `tests/`.

## 3. Frontend

**Decisión:** monorepo con **dos aplicaciones**. La PWA de campo tiene requisitos (offline, bundle liviano, Service Worker agresivo) que no deben contaminar la web de escritorio, y la web de escritorio tiene dependencias pesadas (tablas, kanban, gráficas) que no deben llegar al celular.

```
frontend/
├── apps/
│   ├── campo/        # PWA móvil del RTC. Base /campo/. Offline-first.
│   └── web/          # SPA de escritorio: rutas /portal/* (RTC) y /consola/* (líder, gerencia, admin)
├── packages/
│   ├── api/          # cliente generado con orval desde /api/schema/ + hooks TanStack Query
│   ├── domain/       # tipos de dominio, esquemas zod, formateadores (COP, fechas, ha), constantes
│   ├── ui/           # componentes shadcn/ui + tokens de diseño compartidos
│   └── maps/         # wrapper de MapLibre (marcadores, punto real vs esperado, selector de pin)
├── turbo.json
└── pnpm-workspace.yaml
```

| Necesidad | Librería |
|---|---|
| Base | React 18, TypeScript 5 (`strict`), Vite 5 |
| Ruteo | React Router 6 (data routers) |
| Estado de servidor | TanStack Query v5; en Campo, con `persistQueryClient` sobre IndexedDB |
| Estado local | Zustand (UI y sesión) |
| Offline (Campo) | Dexie 4 (IndexedDB): caché de datos y **outbox** de mutaciones (`docs/04`) |
| PWA | `vite-plugin-pwa` en modo `injectManifest` + Workbox 7 |
| UI | Tailwind CSS 3 + shadcn/ui (Radix), íconos `lucide-react` |
| Formularios | react-hook-form + zod (los esquemas se comparten desde `packages/domain`) |
| Mapas | MapLibre GL JS 4 + teselas vectoriales de MapTiler (proveedor configurable) |
| Gráficas | Apache ECharts (`echarts-for-react`) — solo en `web` |
| Tablas | TanStack Table v8 + virtualización (`@tanstack/react-virtual`) — solo en `web` |
| Kanban | `@dnd-kit` — en `web` (en Campo, el cambio de etapa se hace con un selector) |
| Fechas | `date-fns` + `date-fns-tz` (zona `America/Bogota`) |
| Pruebas | Vitest, Testing Library, MSW, Playwright (perfiles móviles Pixel 7 e iPhone 14) |

**Presupuesto de rendimiento de Campo:** JS inicial ≤ 250 KB gzip; Lighthouse PWA ≥ 90 y Performance ≥ 80 en un Moto G (perfil 4G lenta); el primer render desde caché debe ser < 1,5 s.

## 4. Estructura completa del repositorio

```
nc-crm/
├── backend/
│   ├── apps/ …
│   ├── config/
│   ├── templates/ (correo, PDF)
│   ├── pyproject.toml   (dependencias con uv; lock: uv.lock)
│   └── manage.py
├── frontend/ (ver §3)
├── infra/
│   ├── docker/ (backend.Dockerfile, frontend.Dockerfile, nginx.Dockerfile)
│   ├── nginx/ (dev.conf, prod.conf)
│   └── scripts/ (backup.sh, restore.sh, entrypoint.sh)
├── docs/
├── .github/workflows/ (ci.yml, deploy.yml)
├── docker-compose.yml
├── docker-compose.prod.yml
├── Makefile
└── .env.example
```

## 5. Convenciones transversales

- **IDs:** `UUIDField(primary_key=True, default=uuid7)`, ordenable por tiempo. En todas las entidades que se pueden crear sin conexión, el **cliente genera el UUID** y lo envía como `id`; el servidor lo acepta si no existe (ver `docs/04` §4).
- **`BaseModel`:** `id`, `created_at`, `updated_at` (indexado, lo usa el *pull* incremental), `created_by`, `updated_by`, `is_deleted` (borrado lógico) y `version` (entero que sube con cada escritura; se usa para detectar conflictos).
- **Borrado:** lógico en todo lo de negocio. Los *tombstones* viajan en el pull de sincronización.
- **Paginación:** por cursor (`CursorPagination`, orden `-created_at,id`), con `page_size` por defecto de 50 y máximo de 200.
- **Errores:** formato único `{"code": "visit.already_closed", "detail": "texto para el usuario", "fields": {...}}` con códigos estables que el frontend traduce.
- **Versionado de API:** prefijo `/api/v1/`. Los cambios que rompen el contrato van a `v2` y conviven seis meses con `v1` (la PWA puede quedar desactualizada en un celular).
- **Zona horaria:** `USE_TZ=True`, `TIME_ZONE="America/Bogota"`. Los periodos se calculan con `core.periods` (`day_bounds`, `iso_week_bounds`, `month_bounds`).
- **Feature flags:** `SystemSetting` con prefijo `feature.` (por ejemplo `feature.whatsapp`, `feature.offline`, `feature.ai_reports`) para activar las fases sin desplegar de nuevo.

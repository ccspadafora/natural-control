# 03 · API REST y WebSocket

## 1. Convenciones
- Base: `/api/v1/`. JSON en `snake_case`. Fechas en ISO 8601 con zona (`2026-10-15T09:30:00-05:00`). Dinero como **string decimal** (`"1250000.00"`) para no perder precisión en JS.
- Coordenadas en GeoJSON: `{"type": "Point", "coordinates": [lng, lat]}` (orden lng, lat).
- Contrato: `GET /api/schema/` (OpenAPI 3.1, `drf-spectacular`) y `GET /api/docs/` (Swagger, solo en dev y staging). **El frontend genera su cliente desde este schema** (`orval`). Todo endpoint documenta request, respuestas, errores y permisos con `@extend_schema`.
- Paginación por cursor: `?cursor=…&page_size=50` → `{"next": "...", "previous": "...", "results": [...]}`.
- Filtros con `django-filter`: `?status=REALIZADA&rtc=<uuid>&zone=<uuid>&from=2026-10-01&to=2026-10-31&search=texto`.
- Escrituras concurrentes: los `PATCH` sobre entidades editables desde varios lugares (`Client`, `Site`, `Visit`, `Opportunity`) exigen la cabecera `If-Match: <version>`. Si la versión no coincide → `409 {"code":"conflict.version","current": {...}}`.
- Idempotencia: los `POST` que crean entidades aceptan `id` generado por el cliente; un reintento con el mismo `id` devuelve `200` con la entidad existente, en lugar de `201`. Las demás acciones aceptan la cabecera `Idempotency-Key`.
- Errores: `{"code": "...", "detail": "...", "fields": {"campo": ["mensaje"]}}`. Estados: 400 validación, 401 sin sesión, 403 sin permiso, 404 fuera de alcance (no se revela la existencia), 409 conflicto o transición inválida, 422 regla de negocio, 429 límite de peticiones.
- Límites (`django-ratelimit` sobre Redis): login 10/min por IP y 5/min por cuenta; OTP 3 solicitudes cada 15 min por cuenta; API general 600/min por usuario.

## 2. Autenticación (`/api/v1/auth/`)

| Método y ruta | Descripción | Notas |
|---|---|---|
| `POST /auth/login` | `{identifier, password}` → `{access, user, mfa_required}` y cookie `nc_refresh` | `identifier` = correo o usuario. Crea o actualiza el `Device`. Si se exige MFA, devuelve `mfa_token` en lugar de `access` |
| `POST /auth/otp/request` | `{identifier, purpose: LOGIN\|PASSWORD_RESET}` | Responde 202 siempre (no revela si existe la cuenta) |
| `POST /auth/otp/verify` | `{identifier, code, purpose}` → igual que el login | |
| `POST /auth/mfa/verify` | `{mfa_token, code}` (TOTP) o una aserción WebAuthn | [C] |
| `POST /auth/refresh` | Lee la cookie y rota el refresh → `{access}` | Si `Device.revoked_at` o la inactividad > `auth.session_idle_days` → 401 `auth.session_expired` |
| `POST /auth/logout` | Revoca el refresh del dispositivo actual y borra la cookie | |
| `POST /auth/password/reset` | `{identifier, code, new_password}` | Contraseña mínima de 10 caracteres, validadores de Django + lista de contraseñas filtradas (zxcvbn ≥ 3) |
| `POST /auth/password/change` | `{current_password, new_password}` | Revoca todos los demás dispositivos |
| `GET /auth/me` | Usuario, rol, permisos efectivos (lista de códigos), zona, flags (`requires_weekly_plan`), `features` activas | La UI decide qué mostrar con esto |
| `GET\|POST\|DELETE /auth/webauthn/…` | Registro y autenticación de passkeys | [C] HU-17.1 |
| `GET /auth/devices` · `POST /auth/devices/{id}/revoke` | Mis dispositivos | El admin usa `/users/{id}/devices` |

**Tokens:** el `access` es un JWT de 15 min que vive **solo en memoria** del cliente (nunca en localStorage). El refresh va en la cookie `nc_refresh`: `HttpOnly; Secure; SameSite=Strict; Path=/api/v1/auth/`, con rotación en cada uso y lista negra del jti anterior. La expiración absoluta es 90 días; la de inactividad, `auth.session_idle_days`.

## 3. Recursos

Columna **Alcance**: OWN = el RTC solo ve lo suyo, TEAM o ZONE = el líder ve su equipo o zona, ALL = gerencia o admin (`docs/08` §2). La columna **Permiso** es el código requerido.

### 3.1 Usuarios y organización
| Ruta | Métodos | Permiso | Notas |
|---|---|---|---|
| `/users/` | GET, POST | `users.view` / `users.manage` | Filtros `role`, `zone`, `team`, `is_active`, `search` |
| `/users/{id}/` | GET, PATCH | `users.manage` | No hay DELETE: `POST /users/{id}/deactivate` y `/reactivate` |
| `/users/{id}/devices/` · `/users/{id}/devices/{d}/revoke` | GET, POST | `users.manage` | Cierre remoto |
| `/users/{id}/weekly-plan-requirement` | PUT | `weekly_plan.require` | `{required: bool, reason}` (HU-3.5) |
| `/users/{id}/activity` | GET | `users.view` | Último acceso, última sincronización, conteos del periodo |
| `/roles/` · `/roles/{id}/` | CRUD | `roles.manage` | Asigna `permissions` (lista de códigos) y `data_scope` |
| `/permissions/` | GET | `roles.manage` | Catálogo de permisos |
| `/zones/` · `/teams/` | CRUD | `org.manage` | |
| `/geo/municipalities/?search=` | GET | autenticado | Autocompletar; se cachea en Campo |

### 3.2 Clientes
| Ruta | Métodos | Permiso | Alcance | Notas |
|---|---|---|---|---|
| `/clients/` | GET, POST | `clients.view` / `clients.create` | OWN/TEAM/ZONE/ALL | El POST acepta anidados `sites[]` (≥ 1, primaria), `contacts[]`, `crops[]`, `biotechs[]` y `consent` en **una sola transacción** (para el modo sin conexión). Filtros: `owner`, `zone`, `segment`, `commercial_status`, `client_type`, `municipality`, `is_new` (creado hace ≤ 7 días), `search` |
| `/clients/duplicates-check` | POST | `clients.create` | | `{document_type, document_number, legal_name, phone, location}` → `{blocking: [...], warnings: [...]}` |
| `/clients/{id}/` | GET, PATCH | `clients.view` / `clients.edit` | | El GET incluye resumen: últimas 5 visitas, oportunidades abiertas, biotecnologías en uso, cultivos vigentes, área total |
| `/clients/{id}/timeline` | GET | `clients.view` | | Visitas, tareas, mensajes de WhatsApp, cambios de etapa y ventas ERP, en orden cronológico (cursor) |
| `/clients/{id}/reassign` | POST | `clients.reassign` | | `{owner_id, include_open_visits: bool, include_opportunities: bool}`. Reasigna también la conversación de WhatsApp |
| `/clients/{id}/sites/` · `/sites/{id}/` | CRUD | `clients.edit` | | Ubicación según la regla antifraude (`docs/02` §4) |
| `/sites/{id}/location-requests/` | POST | `clients.edit` | | Si la ubicación está bloqueada |
| `/location-requests/` · `/{id}/decide` | GET, POST | `locations.approve` | TEAM/ZONE/ALL | `{decision: APROBADA\|RECHAZADA, note}` |
| `/clients/{id}/contacts/` · `/contacts/{id}/` | CRUD | `clients.edit` | | |
| `/sites/{id}/crops/` · `/crops/{id}/` | CRUD | `clients.edit` | | |
| `/clients/{id}/biotechs/` · `/client-biotechs/{id}/` | CRUD | `clients.edit` | | |
| `/clients/import` | POST (multipart XLSX) | `clients.import` | | Carga inicial (HU-8.2): valida y devuelve un reporte por fila; se aplica con `?commit=true` |
| `/client-types/` · `/crop-types/` · `/visit-reasons/` · `/lost-reasons/` | CRUD | `catalogs.manage` | | GET abierto a autenticados |

### 3.3 Catálogo
| Ruta | Métodos | Permiso | Notas |
|---|---|---|---|
| `/products/` · `/products/{id}/` | GET / CRUD | `catalog.view` / `catalog.manage` | GET acepta `client` o `price_list` y devuelve el precio de esa lista (la del cliente, si se pasa `client`). Sin ese contexto, no hay un precio único de compañía. Filtros `category`, `crop_type`, `is_available` |
| `/products/{id}/tech-sheets/` | GET, POST (multipart) | `catalog.manage` | Publicar una versión nueva la marca vigente |
| `/tech-sheets/{id}/download` | GET | `catalog.view` | Redirige 302 a una URL prefirmada de S3 (5 min) |
| `/categories/` · `/price-lists/` · `/price-lists/{id}/prices/` | CRUD | `catalog.manage` | Importación de precios en XLSX |

### 3.4 Visitas
| Ruta | Métodos | Permiso | Alcance | Notas |
|---|---|---|---|---|
| `/visits/` | GET, POST | `visits.view` / `visits.create` | OWN/… | El POST con `rtc ≠ yo` exige `visits.assign`. Filtros: `rtc`, `zone`, `client`, `status`, `result`, `gps_status`, `review_status`, `from`, `to`, `origin` |
| `/visits/agenda?date=YYYY-MM-DD&view=today\|pending\|done` | GET | `visits.view` | OWN | Optimizado para Campo (HU-2.1) |
| `/visits/{id}/` | GET, PATCH | `visits.view` / `visits.edit` | | El PATCH respeta la ventana de edición |
| `/visits/{id}/start` | POST | `visits.execute` | OWN | `{gps: GpsPayload}` |
| `/visits/{id}/close` | POST | `visits.execute` | OWN | Ver §3.4.1 |
| `/visits/{id}/cancel` · `/not-done` | POST | `visits.execute` o `visits.assign` | | `{reason}` |
| `/visits/{id}/products/` · `/visit-products/{id}/` | CRUD | `visits.edit` | | Mientras la visita esté editable |
| `/visits/{id}/evidence/presign` | POST | `visits.edit` | | `{id (uuid del cliente), kind, content_type, size_bytes, sha256}` → `{upload_url, fields}` (S3 POST prefirmado, 10 MB máx.) |
| `/evidence/{id}/confirm` | POST | `visits.edit` | | Marca UPLOADED y encola la miniatura |
| `/visits/{id}/gps-checks/{gid}/justify` | POST | `visits.execute` | OWN | `{justification}` del RTC |
| `/gps-checks/` | GET | `gps.review` | TEAM/ZONE/ALL | Reporte de discrepancias (HU-4.3): filtros `status`, `review_status`, `rtc`, `zone`, `from`, `to`. Incluye `position` y `reference_location` para el mapa |
| `/gps-checks/{id}/review` | POST | `gps.review` | | `{review_status: JUSTIFICADA\|RECHAZADA, note}` |
| `/visit-recurrences/` | CRUD | `visits.assign` | | [C] |
| `/visits/export` | POST | `visits.export` | | `{format: xlsx\|pdf, filters}` → `202 {job_id}`; luego `GET /exports/{job_id}` |

#### 3.4.1 `POST /visits/{id}/close` — el endpoint más importante
Request:
```json
{
  "mutation_id": "0192f0c5-...",
  "completed_at": "2026-10-15T10:42:11-05:00",
  "contact_id": "…", "contact_name_free": "",
  "result": "COTIZACION_SOLICITADA",
  "notes": "…", "agreements": "…",
  "next_follow_up_at": "2026-10-22T09:00:00-05:00",
  "products": [
    {"id": "…", "product_id": "…", "kind": "POTENCIAL", "quantity": "20", "unit_price": "185000.00",
     "horizon": "MEDIANO", "expected_date": "2026-10-31", "crop_type_id": "…", "target_area_ha": "12.5"}
  ],
  "biotechs_in_use": [{"product_id": null, "competitor_product": "Trichoderma X", "competitor_brand": "Marca Y", "crop_type_id": "…"}],
  "gps": {
    "position": {"type": "Point", "coordinates": [-75.4312, 6.0219]},
    "accuracy_m": 18.0, "altitude_m": 2150.0,
    "captured_at": "2026-10-15T10:42:05-05:00",
    "capture_mode": "OFFLINE", "error": "NONE",
    "samples": 6
  },
  "evidence_ids": ["…", "…"],
  "signature_evidence_id": null
}
```
Proceso en `visits.services.close_visit()` dentro de una transacción `select_for_update` sobre la visita:
1. Verifica la idempotencia (`SyncMutation` y `mutation_id`).
2. Valida la transición (PROGRAMADA o EN_CURSO → REALIZADA) y el alcance.
3. Crea `GpsCheck(kind=CLOSE)` y calcula el estado (`docs/04` §6).
4. Hace upsert de `VisitProduct` (calcula `total_value` y la probabilidad por defecto) y de `ClientBiotech`.
5. Fija `completed_at`, `server_received_at` y `status`.
6. Si `next_follow_up_at`, crea `Task`.
7. `on_commit`: emite el evento WS `visit.closed`; si hay discrepancia, notifica al líder; si `feature.pipeline`, encola `pipeline.upsert_from_visit`; si `feature.automation`, encola `automation.evaluate_post_visit_rules`.

Response 200: la visita completa, con `gps_check` (`status`, `distance_m`, `tolerance_m`). La app muestra el resultado de la verificación con lo que devuelve el servidor y no con un cálculo local (excepto la vista previa sin conexión, `docs/04` §6.3).

### 3.5 Programación semanal (HU-3.5)
| Ruta | Métodos | Permiso | Notas |
|---|---|---|---|
| `/weekly-plans/` | GET, POST | `weekly_plan.view` / `weekly_plan.submit` | `?iso_year&iso_week&rtc&status`. El RTC crea la suya |
| `/weekly-plans/{id}/items/` · `/weekly-plan-items/{id}/` | CRUD | `weekly_plan.submit` | Solo en BORRADOR o DEVUELTA |
| `/weekly-plans/{id}/submit` | POST | `weekly_plan.submit` | Valida ≥ 1 ítem; marca `is_late` |
| `/weekly-plans/{id}/approve` · `/return` | POST | `weekly_plan.review` | `{note}`. Aprobar materializa las visitas |
| `/weekly-plans/compliance?iso_year&iso_week` | GET | `weekly_plan.review` | Quién debía enviar, quién envió, a tiempo o tarde, y quién falta |

### 3.6 Embudo y tareas ([F2])
| Ruta | Métodos | Permiso | Notas |
|---|---|---|---|
| `/stages/` | CRUD | `pipeline.configure` | Reordenar: `POST /stages/reorder {ids: [...]}` |
| `/opportunities/` | GET, POST | `pipeline.view` / `pipeline.edit` | `?view=board` agrupa por etapa con totales; filtros `owner`, `zone`, `stage`, `client`, `expected_close_from/to` |
| `/opportunities/{id}/` | GET, PATCH | | `If-Match` |
| `/opportunities/{id}/move` | POST | `pipeline.edit` | `{stage_id, lost_reason_id?}`. Dispara `FollowUpRule` |
| `/opportunities/{id}/lines/` | CRUD | `pipeline.edit` | |
| `/follow-up-rules/` | CRUD | `pipeline.configure` | |
| `/tasks/` | GET, POST | `tasks.view` / `tasks.edit` | `?due=today\|overdue\|week&owner` — la agenda diaria de tareas (HU-12.5) |
| `/tasks/{id}/` · `/tasks/{id}/done` | PATCH, POST | `tasks.edit` | |

### 3.7 Métricas, forecast y metas
Todos los endpoints de lectura aceptan `period=day|week|month|quarter|custom&from&to`, `zone`, `rtc`, `team` y respetan el alcance.

| Ruta | Permiso | Devuelve |
|---|---|---|
| `GET /metrics/visits` | `metrics.view` | Totales (programadas, realizadas, no realizadas, canceladas), % verificadas, por RTC, por zona y serie temporal |
| `GET /metrics/products-of-interest` | `metrics.view` | Top de productos (frecuencia, cantidad, valor) por tipo CONCRETADO o POTENCIAL |
| `GET /metrics/activity-ranking` | `metrics.view` | Ranking de RTC por visitas realizadas y verificadas, clientes nuevos y valor potencial |
| `GET /metrics/agro` | `metrics.view` | HU-5.3: hectáreas por cultivo, por zona y por tipo de cliente; uso de biotecnologías propias frente a competencia; penetración por cultivo |
| `GET /metrics/funnel` | `metrics.view` | [F2] Conversión por etapa y por vendedor, tiempo medio por etapa |
| `GET /metrics/planned-vs-done` | `metrics.view` | Visitas programadas (programación y asignación) frente a realizadas |
| `GET /metrics/follow-up-compliance` | `metrics.view` | [F2] Tareas a tiempo, vencidas y escaladas |
| `GET /forecast/` | `forecast.view` | `group_by=rtc\|zone\|product\|month\|week`; `scenario=committed\|probable\|optimistic\|all`; `source=visits\|pipeline\|blended`. Ver la definición en `docs/05` HU-6.2 |
| `GET /forecast/vs-actual` | `forecast.view` | Forecast congelado (`ForecastSnapshot`) frente a `ErpSale` por periodo |
| `GET /goals/` · `POST /goals/import` · CRUD `/goals/{id}/` | `goals.view` / `goals.manage` | |
| `GET /goals/compliance?user=me&date=` | `goals.view` (OWN permitido) | Cumplimiento diario y del periodo, semáforo (HU-6.3) |
| `GET /goals/leaderboard` | `goals.view` | [C] Ranking y logros |

### 3.8 WhatsApp y correo ([F2])
| Ruta | Métodos | Permiso | Notas |
|---|---|---|---|
| `/conversations/` | GET | `whatsapp.view` | OWN (`assigned_to`)/TEAM/… `?unread=true&search=` |
| `/conversations/{id}/messages/` | GET, POST | `whatsapp.view` / `whatsapp.send` | POST: `{type: TEXT, body}` dentro de la ventana de 24 h; fuera de ella, `{type: TEMPLATE, template_id, variables}`; o `{type: DOCUMENT, tech_sheet_id}`. Responde 202 y el estado llega por WS |
| `/conversations/start` | POST | `whatsapp.send` | `{contact_id, template_id, variables}`; exige `whatsapp_opt_in` |
| `/messages/search?q=` | GET | `whatsapp.view` | HU-13.4 |
| `/wa-templates/` · `/wa-templates/sync` | GET, POST | `whatsapp.configure` | |
| `/clients/{id}/send-tech-sheets` | POST | `whatsapp.send` | `{product_ids, channels: ["whatsapp","email"], contact_id}` |
| `/hooks/whatsapp` | GET (verificación), POST | público con firma HMAC | Fuera de `/api/v1/` (`docs/06` §2) |
| `/hooks/ses` | POST | público, SNS firmado | Rebotes y quejas |

### 3.9 Automatización, informes, notificaciones y administración
| Ruta | Métodos | Permiso |
|---|---|---|
| `/post-visit-rules/` | CRUD | `automation.configure` |
| `/automation-runs/?visit=` | GET | `automation.view` |
| `/ai-reports/` · `/ai-reports/{id}/` · `POST /ai-reports/generate` | GET, POST | `ai_reports.view` / `ai_reports.generate` |
| `/exports/{id}/` · `/exports/{id}/download` | GET | El dueño del job |
| `/notifications/?unread=true` · `/notifications/{id}/read` · `/notifications/read-all` | GET, POST | autenticado |
| `/notifications/preferences` | GET, PUT | autenticado |
| `/push/subscriptions` | POST, DELETE | autenticado; `GET /push/vapid-public-key` |
| `/settings/` · `/settings/{key}` | GET, PUT | `settings.view` / `settings.edit` (además, `editable_by_role`) |
| `/audit-logs/` · `/audit-logs/export` | GET, POST | `audit.view` |
| `/admin/health` | GET | `admin.supervise`: estado de WhatsApp (calidad del número, último webhook), SES (envíos y rebotes en 24 h), ERP (última corrida por entidad), colas Celery (longitud), último backup, dispositivos con mutaciones pendientes |
| `/erp/sync-runs/` · `POST /erp/sync/{entity}` · `/erp/unmatched/` · `POST /erp/unmatched/{id}/resolve` | GET, POST | `erp.manage` |

### 3.10 Sincronización del modo sin conexión (`docs/04` §4)
| Ruta | Descripción |
|---|---|
| `GET /sync/bootstrap` | Snapshot inicial para Campo: mi usuario y permisos, settings públicos, catálogos (productos con precio vigente, categorías, tipos, motivos, cultivos, municipios de mis zonas), mis clientes con sedes, contactos, cultivos y biotecnologías, mis visitas de −30 a +30 días, mis tareas abiertas, mis oportunidades abiertas y mis metas. Respuesta con `cursor` y paginada por secciones si supera 5 MB |
| `GET /sync/pull?cursor=…` | Delta desde el cursor: `{changes: {clients: [...], sites: [...], …}, deleted: {visits: [ids], …}, cursor, has_more}`. El cursor es opaco (codifica `updated_at` + id por entidad) |
| `POST /sync/push` | `{device_id, pending_count, mutations: [{mutation_id, op, entity_id, base_version, payload, client_ts}]}` (máx. 50 por lote) → `{results: [{mutation_id, status: APPLIED\|CONFLICT\|REJECTED, entity, error}]}`. Se aplican **en orden** y dentro de un savepoint por mutación |

Operaciones (`op`) soportadas: `client.create`, `client.update`, `site.create`, `site.update`, `contact.upsert`, `crop.upsert`, `biotech.upsert`, `visit.create`, `visit.update`, `visit.start`, `visit.close`, `visit.cancel`, `visit.not_done`, `visit_product.upsert`, `visit_product.delete`, `gps.justify`, `task.create`, `task.done`, `opportunity.move`, `weekly_plan.upsert`, `weekly_plan.submit`, `evidence.register`. Cada `op` delega en el **mismo servicio** que su endpoint REST; no se duplica la lógica.

## 4. WebSocket (`/ws/v1/stream`)
- Autenticación: el primer mensaje es `{"type": "auth", "token": "<access>"}`; si no llega en 5 s, se cierra con el código 4401. Al rotar el access, el cliente reenvía `auth`.
- Al conectarse, el servidor suscribe al usuario a sus grupos: `user.<id>`, y según el rol `team.<id>`, `zone.<id>` o `org.all`.
- Mensajes servidor → cliente: `{"type": "<evento>", "id": "<uuid del evento>", "at": "...", "data": {...}}`. **Los eventos no llevan la entidad completa**, solo `entity_type`, `entity_id`, `version` y un resumen; el cliente invalida la consulta de TanStack Query correspondiente. Así el WS nunca filtra datos fuera de alcance: el refetch pasa por la API con permisos.

| Evento | Grupos destino | Uso |
|---|---|---|
| `visit.created` / `visit.updated` / `visit.closed` / `visit.assigned` | dueño, su equipo, su zona, `org.all` | Consolidado en vivo (HU-5.1), agenda del RTC (HU-7.3) |
| `gps.discrepancy` | equipo, zona, `org.all` | Contador e indicador en la Consola |
| `client.created` | equipo, zona, `org.all` | HU-2.3 "se refleja en vivo en gerencia" |
| `opportunity.moved` | dueño, equipo, zona, `org.all` | Kanban en vivo |
| `task.due` / `task.overdue` | dueño (y líder si escala) | |
| `wa.message` / `wa.status` | `assigned_to` y su líder | Inbox |
| `notification.new` | `user.<id>` | Campana |
| `weekly_plan.submitted` | líder, `org.all` | |
| `session.revoked` | `user.<id>` (filtrado por dispositivo) | Forzar el cierre en ese dispositivo |

- **Respaldo:** si el WS no conecta (redes corporativas, iOS en segundo plano), la Consola hace polling de `/visits/?updated_since=` cada 30 s. La App Campo no depende del WS: refresca al abrir y al recuperar la conexión.

# 06 · Integraciones

Regla general: cada integración vive detrás de una **interfaz** en `apps/integrations/<proveedor>/` o en la app dueña, con una implementación real y otra *fake* para dev y pruebas (se selecciona con una variable de entorno). Ninguna vista llama a un proveedor externo de forma directa: todo pasa por tareas Celery con reintentos e idempotencia (`docs/07`).

## 1. ERP de Natural Control (E9)

**Estado:** el proveedor y su API están pendientes. Natural Control se comprometió en el kick-off a pedir la documentación con el mensaje que se les envió (autenticación, endpoints, ambientes, límites y contacto técnico) para clientes, productos, precios, inventario y pedidos o ventas.

### 1.1 Interfaz
```python
# apps/integrations/erp/base.py
class ErpAdapter(Protocol):
    def fetch_sales(self, since: datetime | None, cursor: str | None) -> Page[ErpSaleDTO]: ...
    def fetch_customers(self, since, cursor) -> Page[ErpCustomerDTO]: ...
    def fetch_products(self, since, cursor) -> Page[ErpProductDTO]: ...
    def fetch_prices(self, since, cursor) -> Page[ErpPriceDTO]: ...
    def fetch_inventory(self, cursor) -> Page[ErpStockDTO]: ...
    def healthcheck(self) -> HealthStatus: ...

@dataclass(frozen=True)
class Page(Generic[T]):
    items: list[T]
    next_cursor: str | None
```
- Implementaciones: `FakeErpAdapter` (lee fixtures JSON, para dev), `<Proveedor>ErpAdapter` (cuando haya documentación) y, si el ERP no tiene API, `FileDropErpAdapter`, que lee CSV o XLSX de un bucket S3 donde Natural Control deposita exportes programados. **Es el plan B que se propone si la documentación no llega o no hay API.**
- Selección: `ERP_ADAPTER=fake|<proveedor>|filedrop`.
- Cliente HTTP: `httpx` con *timeout* de 30 s, reintentos ante 429 y 5xx (`tenacity`, exponencial con jitter, máximo 5), y un *circuit breaker* simple en Redis (5 fallos seguidos → pausa de 10 min y alerta en health).
- Credenciales en variables de entorno (`ERP_BASE_URL`, `ERP_CLIENT_ID`, `ERP_CLIENT_SECRET`…), nunca en `SystemSetting`.

### 1.2 Sincronización de ventas (prioridad de la HU-9.1)
- Tarea `erp.sync_sales` en la cola `erp`, programada con `erp.sync_cron.sales`. Usa un *lock* en Redis (`lock:erp:sales`, TTL de 30 min) para no correr dos a la vez.
- Lee desde `ErpSyncRun.cursor_out` de la última corrida OK, menos una ventana de solapamiento de 2 días (las facturas se corrigen o anulan). Hace upsert por `(erp_document, erp_line)`; las anulaciones dejan `net_amount = 0` y `raw.status = ANULADA`.
- Cruce: `erp_customer_code → Client.erp_code`, `erp_seller_code → User.erp_seller_code`, `erp_product_code → Product.erp_code`. Lo que no cruza va a `ErpUnmatched` y la venta se guarda igual (con el FK nulo) para no perder totales.
- Después de cada corrida: se invalidan las cachés de cumplimiento y forecast frente a real.

### 1.3 Restricción contractual
El contrato de la Fase 1 limita la integración a **un** endpoint, condicionada a la entrega completa de la documentación. Las demás entidades (HU-9.2) son del alcance completo.

## 2. WhatsApp Business (Cloud API de Meta) [F2]

### 2.1 Configuración
- Una cuenta de WhatsApp Business (WABA) a nombre de Natural Control, con un número dedicado (no el personal de ningún RTC). App de Meta con un **token permanente de *system user*** con los permisos `whatsapp_business_messaging` y `whatsapp_business_management`.
- Variables: `WA_PHONE_NUMBER_ID`, `WA_WABA_ID`, `WA_ACCESS_TOKEN`, `WA_APP_SECRET`, `WA_VERIFY_TOKEN` y `WA_API_VERSION` (fijada, por ejemplo `v21.0`; se revisa cada trimestre).
- Un solo número para toda la empresa. El ruteo al RTC es lógico (`Conversation.assigned_to`): el cliente le escribe "a Natural Control" y le contesta su RTC desde la plataforma.

### 2.2 Webhook (`/hooks/whatsapp`)
- `GET`: verificación con `hub.verify_token`.
- `POST`: **verificar la firma** `X-Hub-Signature-256` (HMAC-SHA256 del cuerpo crudo con `WA_APP_SECRET`, comparación en tiempo constante). Si es inválida → 403.
- **ACK primero:** guardar el cuerpo crudo en `RawWebhookEvent(provider, payload, received_at, processed_at, error)` y responder 200 de inmediato; luego encolar `messaging.process_wa_webhook(event_id)`.
- Procesamiento idempotente por `wamid` (`Message.wamid` es único): los mensajes entrantes crean o actualizan la `Conversation` (por `wa_id`) y el `Message`, actualizan `last_inbound_at` (abre la ventana de 24 h), descargan el medio entrante a S3 (`GET /{media-id}`; la URL de Meta expira) y emiten `wa.message` y una notificación.
- Los estados (`sent`, `delivered`, `read`, `failed`) actualizan `Message.status` solo hacia adelante (no se baja de `read` a `delivered` si llegan desordenados).

### 2.3 Envío
- Tarea `messaging.send_wa_message(message_id)` en la cola `whatsapp`, con un límite de tasa de 60 mensajes por segundo por número (muy por encima de nuestro volumen; el *throttle* es por seguridad).
- Texto libre solo si `now − last_inbound_at < 24 h`; si no → 422 `whatsapp.window_closed` (la UI ya lo evita).
- Documento: se sube el PDF a Meta (`POST /{phone-number-id}/media`) o se envía con un link prefirmado de S3 de larga vida (24 h) en `document.link`, con `filename` = `"<Producto> - Ficha tecnica v<n>.pdf"`.
- Plantillas: `type=template` con `components` armados desde `WaTemplate.components` y las variables validadas.
- Errores de Meta: el `131047` (fuera de ventana), `131026` (no entregable), `131051` (tipo no soportado) y los de límite de tasa se mapean a mensajes legibles; los 5xx se reintentan.
- Costos: por conversación según la categoría y el país (Colombia está entre los mercados más baratos). Cada `Message` guarda la categoría para estimar el gasto; la Consola de supervisión muestra el estimado del mes.

### 2.4 Plantillas iniciales (para aprobar en Meta)
| Nombre | Categoría | Uso |
|---|---|---|
| `nc_primer_contacto_v1` | UTILITY | "Hola {{1}}, soy {{2}}, tu asesor de Natural Control. Te escribo por nuestra visita del {{3}}…" |
| `nc_ficha_tecnica_v1` | UTILITY | Encabezado de documento + "Te comparto la ficha técnica de {{1}} que revisamos." |
| `nc_seguimiento_v1` | UTILITY | Recordatorio de seguimiento acordado |
| `nc_codigo_acceso_v1` | AUTHENTICATION | OTP de login (HU-1.4) |

### 2.5 Consentimiento
Meta exige el opt-in antes de iniciar conversaciones. Se registra en `Contact.whatsapp_opt_in` (`docs/02` §4) durante la visita ("¿Autoriza que le escribamos por WhatsApp?"). Un mensaje entrante del contacto cuenta como opt-in (`MENSAJE_ENTRANTE`). Si el contacto escribe "BAJA" o "STOP", se revoca el opt-in y se deja de enviar.

## 3. Correo (Amazon SES vía django-anymail)
- Dominio verificado con DKIM, SPF y DMARC (`p=quarantine`). Remitente `no-responder@<dominio>`; `reply-to` = el correo del RTC cuando el mensaje sale a nombre suyo (fichas técnicas).
- Sale del *sandbox* de SES antes del piloto (solicitud de acceso a producción con el caso de uso transaccional).
- Plantillas en `backend/templates/email/` (HTML + texto plano), renderizadas con Django y probadas con *snapshots*.
- Webhook de eventos (SNS → `/hooks/ses`): se valida la firma de SNS; los rebotes duros marcan el correo del contacto como inválido; las quejas lo suprimen.
- En dev: Mailpit (`docs/09`).

## 4. Mapas y geocodificación
- **Mapa:** MapLibre GL + estilo de MapTiler (clave en `VITE_MAP_STYLE_URL`, con restricción por dominio). Es intercambiable por otro proveedor de teselas vectoriales sin cambiar código (`packages/maps`). Capa satelital opcional (fincas sin calles).
- **Geocodificación** (dirección → punto), solo como ayuda al registrar: `GeocodingProvider` con la implementación de MapTiler Geocoding o Google Geocoding (configurable). En zonas rurales la dirección no sirve, por eso **la fuente preferida es el GPS en sitio o el pin manual**. Los resultados geocodificados quedan con `location_source = GEOCODED` y **no** bloquean la sede (la primera visita verificada puede corregirla).
- **Municipio desde un punto** (geocodificación inversa): `ST_Contains` contra los polígonos municipales del DANE si se cargan (opcional), o el centroide más cercano como aproximación.

## 5. IA para informes [F2]

### 5.1 Proveedor
- Interfaz `LLMClient.generate_structured(system, user, schema, max_tokens) -> dict`, con la implementación por defecto en la **API de Anthropic** (SDK `anthropic`) y el modelo configurable en `ai.model` (por defecto `claude-sonnet-5-5`). Variables `ANTHROPIC_API_KEY` y `AI_PROVIDER`.
- Salida estructurada forzada con *tool use* (una herramienta `emit_report` con el JSON Schema de la salida), validada con Pydantic; si no valida, se reintenta una vez con el error y, si vuelve a fallar, `AIReport.status = FAILED`.

### 5.2 Entrada (lo único que ve el modelo)
`reports/selectors.py::build_ai_input(scope, period)` arma un JSON **agregado** con: métricas del periodo y del anterior por RTC y zona (visitas, % verificadas, cumplimiento, forecast, conversión), oportunidades estancadas (cliente, monto, días, etapa), clientes con señal de fuga (días sin compra frente a su ciclo) y discrepancias GPS. **No se envían** teléfonos, correos, documentos, notas libres de las visitas ni contenido de WhatsApp (minimización de datos, `docs/08` §5).

### 5.3 Salida (JSON Schema resumido)
```json
{
  "summary": "string (≤ 1200 caracteres, español)",
  "risks": [{"type": "RTC|ZONA", "id": "uuid", "name": "string", "reason": "string", "metrics_cited": ["key"]}],
  "actions": [{"priority": 1, "owner_role": "LIDER_ZONA|GERENCIA|RTC", "target_id": "uuid|null", "action": "string", "expected_impact": "string"}],
  "stalled_opportunities": [{"opportunity_id": "uuid", "comment": "string"}],
  "churn_risk_clients": [{"client_id": "uuid", "comment": "string"}]
}
```
- Validación posterior: todo `id` debe existir en la entrada; los números que aparecen en el texto se contrastan con la entrada (expresión regular de cifras con tolerancia de redondeo) y, si hay cifras inventadas → reintento.
- Prompt versionado en `backend/apps/reports/prompts/ai_report_v<n>.md`; `AIReport.prompt_version` guarda cuál se usó.
- Costo: se registran los tokens y el costo estimado por informe; tope mensual en `ai.monthly_budget_usd` (al superarlo se suspenden los informes automáticos y se alerta al admin).

## 6. Web Push
- Claves VAPID en variables de entorno (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT=mailto:soporte@<dominio>`).
- Suscripción desde la app tras un gesto del usuario; se guarda `PushSubscription` por dispositivo.
- Envío con `pywebpush` en la cola `notify`; las respuestas 404 o 410 desactivan la suscripción; tres fallos seguidos también.
- Payload ≤ 3 KB: `{title, body, link, tag, kind}`. El `tag` agrupa (por ejemplo `visit-<id>`) para no apilar notificaciones repetidas.

## 7. Almacenamiento (S3)
- Bucket privado `nc-crm-<env>` con prefijos `evidence/`, `techsheets/`, `exports/`, `reports/` y `backups/`. Cifrado SSE-S3, bloqueo de acceso público y versionado activado en `techsheets/` y `backups/`.
- Ciclo de vida: `exports/` se borra a los 7 días; `backups/` pasa a Glacier Instant Retrieval a los 30 días y se borra a los 365.
- CORS del bucket solo para el dominio de la app (subidas prefirmadas desde el navegador).
- En dev: MinIO.

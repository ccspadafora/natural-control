# 07 · Tareas asíncronas y tiempo real

## 1. Celery: colas y workers

| Cola | Qué procesa | Worker (servicio Compose) | Concurrencia inicial | Notas |
|---|---|---|---|---|
| `default` | Transiciones derivadas, recálculos ligeros, materializar recurrencias | `worker` | 4 (prefork) | |
| `sync` | Miniaturas, limpieza de EXIF, confirmación de evidencias | `worker` | (misma) | Pillow |
| `notify` | Notificaciones in-app, push y correo | `worker-io` | 8 | E/S |
| `whatsapp` | Envío de mensajes y procesamiento de webhooks | `worker-io` | (misma) | Límite de tasa con `rate_limit` |
| `erp` | Corridas de sincronización del ERP | `worker-io` | (misma) | Lock por entidad |
| `reports` | Exportaciones (XLSX y PDF), informes de IA y PDF de informes | `worker-heavy` | 2 | Memoria alta (WeasyPrint) |
| `maint` | Backups, particiones de auditoría, limpieza | `worker-heavy` | (misma) | |

Configuración común:
- `task_acks_late = True`, `worker_prefetch_multiplier = 1` (no se pierden tareas si un worker muere).
- `task_time_limit` por tarea (por defecto 300 s; exportaciones e IA, 900 s) y `soft_time_limit` = límite − 30 s.
- Reintentos: `autoretry_for=(TransientError, httpx.HTTPError)`, `retry_backoff=True`, `retry_backoff_max=600`, `retry_jitter=True`, `max_retries=5`. Los errores de negocio (`PermanentError`) **no** se reintentan y quedan registrados.
- Toda tarea recibe **IDs**, nunca objetos, y vuelve a leer de la base (los datos pudieron cambiar).
- Las tareas se encolan **siempre** con `transaction.on_commit(lambda: task.delay(...))` para no procesar datos de una transacción que se revirtió.
- Resultados: no se guardan (`ignore_result=True`) salvo en `ExportJob` y `AIReport`, que tienen su propio estado en la base.
- Monitoreo: Flower en staging (protegido con autenticación básica, sin exponerlo en producción); en producción, las métricas de la longitud de las colas van a `/admin/health` y Sentry captura las excepciones de las tareas.

## 2. Celery Beat (`django-celery-beat`, programación en la base)
Las programaciones se siembran en una migración y quedan editables desde la Consola de administración (las que dependen de settings se reprograman al cambiar el setting).

| Tarea | Programación por defecto (hora Colombia) | Qué hace |
|---|---|---|
| `erp.sync_sales` | `*/30 6-21 * * *` | HU-9.1 |
| `erp.sync_masters` | `0 2 * * *` | HU-9.2 [C] |
| `visits.materialize_recurrences` | `15 0 * * *` | HU-10.2 |
| `visits.mark_overdue` | `5 0 * * *` | Marca las visitas atrasadas (indicador; no cambia el estado) |
| `weekly_plan.create_and_remind` | cada hora en punto | Crea los `WeeklyPlan` de la semana objetivo para los RTC obligados y envía los recordatorios de 24 h y 2 h |
| `weekly_plan.close_deadline` | cada hora a los :05 | Notifica a quien no envió al vencer el plazo |
| `weekly_plan.auto_require` | `0 7 * * 1` | Regla automática de la HU-3.5 CA1 (si está activa) |
| `forecast.snapshot` | `30 23 * * *` | Congela el `ForecastSnapshot` del día |
| `forecast.expire_potentials` | `0 1 * * *` | Marca VENCIDO según `forecast.grace_days` |
| `pipeline.recompute_priority` | `0 3 * * *` | Puntaje de priorización |
| `pipeline.create_due_tasks_notifications` | `0 7 * * *` | Push y correo de las tareas del día |
| `pipeline.escalate_overdue` | `*/15 * * * *` | HU-12.4 |
| `alerts.stalled_and_churn` | `0 7 * * 1-5` | HU-16.4 |
| `alerts.inactive_rtc` | `0 7 * * 1-5` | HU-17.5 |
| `goals.award_achievements` | `0 4 * * *` | HU-15.2 |
| `reports.ai_weekly` / `reports.ai_monthly` | `0 6 * * 1` / `0 6 1 * *` | HU-16.3 |
| `messaging.sync_wa_templates` | `0 */6 * * *` | Estado de las plantillas |
| `maint.backup_db` | `0 2 * * *` | `docs/09` §6 |
| `maint.audit_partitions` | `0 0 25 * *` | Crea la partición del mes siguiente |
| `maint.cleanup` | `30 3 * * *` | Borra exportaciones vencidas, `SyncMutation` > 90 días, `RawWebhookEvent` > 30 días, OTP vencidos |

Beat corre en **un solo** contenedor (`beat`); nunca más de una réplica.

## 3. Tiempo real (Django Channels)
- Capa de canales: `channels_redis.core.RedisChannelLayer` sobre la **base Redis 1** (la 0 es para el broker de Celery y la 2 para la caché), con `capacity=1000` y `expiry=60`.
- Consumidor `StreamConsumer(AsyncJsonWebsocketConsumer)` en `/ws/v1/stream`: autenticación por el primer mensaje (`docs/03` §4), con la suscripción a los grupos según el alcance del usuario calculada **en el servidor**.
- Emisión: `core.realtime.publish(event_type, entity, groups)`, llamada **siempre** dentro de `transaction.on_commit`. La función decide los grupos destino a partir de la entidad (dueño, equipo, zona y `org.all`).
- *Heartbeat*: el cliente envía `ping` cada 25 s; el servidor cierra las conexiones sin `ping` en 60 s. Reconexión del cliente con *backoff* (1, 2, 5, 10 y 30 s) y, al reconectar, invalida todas las consultas activas (pueden haberse perdido eventos).
- Escala esperada: < 50 conexiones concurrentes; un solo proceso ASGI es suficiente. Si crece, el *layer* de Redis permite varias réplicas.

## 4. Idempotencia (reglas concretas)

| Origen | Clave | Dónde se guarda | Comportamiento al repetirse |
|---|---|---|---|
| Mutación offline | `mutation_id` (uuid7 del cliente) | `SyncMutation` | Devuelve la respuesta guardada |
| `POST` que crea | `id` de la entidad (uuid del cliente) | La propia tabla (PK) | 200 con la entidad existente, si pertenece al mismo usuario; si no, 409 |
| Acciones REST (`close`, `move`, `send`) | Cabecera `Idempotency-Key` | Redis `idem:<user>:<key>` (24 h) con la respuesta serializada | Devuelve la respuesta guardada |
| Webhook de WhatsApp | `wamid` | `Message.wamid` (unique) | Ignora y responde 200 |
| Webhook de SES | `messageId` + tipo de evento | `EmailLog` | Ignora |
| Automatización | `f"{rule_id}:{visit_id}"` | `AutomationRun.idempotency_key` (unique) | No vuelve a ejecutar |
| Venta ERP | `(erp_document, erp_line)` | `ErpSale` (unique) | Upsert |
| Informe de IA programado | `(scope, scope_id, period_start, frequency)` | `AIReport` (unique parcial) | No genera dos veces |
| Envío de notificación | `(user, kind, entity_id, ventana)` | Redis `notif:<hash>` (TTL según el tipo) | Evita duplicados (por ejemplo, dos recordatorios de 24 h) |

## 5. Notificaciones (`notifications.services.notify`)
```python
notify(user, kind="visit.assigned", title=..., body=..., link=..., entity_id=..., dedupe_ttl=3600)
```
1. Crea el `Notification` (in-app) y emite `notification.new` por WS.
2. Consulta la `NotificationPreference` del usuario para ese `kind` (con valores por defecto por rol).
3. Encola push y/o correo en la cola `notify`.

Catálogo de `kind` (y canales por defecto): `visit.assigned` (in-app, push), `visit.reassigned`, `gps.discrepancy` (líder: in-app, push), `gps.reviewed` (RTC), `plan.reminder` (push), `plan.missing` (RTC y líder: push y correo), `plan.returned`, `location.request` (líder), `location.decided` (RTC), `task.due` (push 7:00), `task.overdue`, `task.escalated` (líder: push y correo), `wa.inbound` (push), `opportunity.stalled`, `client.churn_risk`, `rtc.inactive` (líder y gerencia: correo), `report.ready` (correo), `export.ready` (in-app), `erp.sync_failed` (admin: correo), `security.new_device` (usuario: correo).

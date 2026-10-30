# Feature flags (`SystemSetting` con prefijo `feature.`)

Valores por defecto en `backend/apps/core/seed.py`. La sesión expone cada clave sin prefijo en `user.features` (véase `GET /api/v1/auth/me`).

| Clave | Default seed | Descripción breve |
|---|---|---|
| `feature.erp` | `false` | Integración ERP / conciliación |
| `feature.offline` | `true` | Outbox Campo + `POST /sync/mutations` |
| `feature.pipeline` | `false` | Embudo comercial |
| `feature.whatsapp` | `false` | Mensajería WhatsApp |
| `feature.automation` | `false` | Automatizaciones post-visita |
| `feature.ai_reports` | `false` | Informes con modelo |
| `feature.gamification` | `false` | Liga y logros |
| `feature.mfa` | `false` | Doble factor |
| `feature.webauthn` | `false` | Biometría / passkeys |
| `feature.catalog` | `true` | Consulta catálogo y precios |

APIs que responden `404` con `feature.disabled` cuando el flag está apagado: embudo, WhatsApp, automatizaciones, ERP (`/erp/status`, `/erp/unmatched`), informes IA (`/reports/ai`). Offline usa el mismo código en sync.

Bitácora (`/audit/logs`) y dispositivos (`/devices`) dependen de permisos, no de flags de producto.

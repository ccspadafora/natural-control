# Checklist de paridad (plan §3)

Activar con Docker + `make seed-prototipo` + `PARITY_FULL=1 make parity`.

## 3.1 Transversales

| Elemento | Estado app | Prueba |
|---|---|---|
| Login tarjeta 440px + OTP | Hecho | `inventory.parity.ts`, screenshot login |
| Sidebar NAV por rol + contador geo | Hecho | Manual / E2E login líder |
| Búsqueda global | Parcial (navega a cartera) | E2E Enter → `/portal/clientes?q=` |
| En vivo + fecha | Hecho | WS `openStream` → indicador; fecha seed |
| Tema claro/oscuro/sol | Hecho web | Ciclo en shell |
| Toasts textos prototipo | Hecho | `TOAST` en `@nc/ui` (copy prototipo) |

## 3.2 Portal

| Pantalla | Estado | Nota |
|---|---|---|
| Inicio Mes/Día | Hecho UI | KPIs placeholder |
| Mis números | Hecho UI + API | `/metrics/my-numbers` (Goal + Scorecard) |
| Agenda lista | Hecho | Semana/mes stub |
| Cartera | Hecho | Export/registrar disabled |
| Ficha | Parcial | Cultivos/historial stub |
| Visitas en vivo | Hecho UI | Mapa stub |
| Geolocalización + HU-D.2 | Hecho | Mapa tolerancia + LocationChange API/UI |
| Tableros | Hecho UI | Sin drill-down completo |
| Forecast / Mi forecast | Hecho UI | Datos demo |
| Programación / asignación | Hecho | Sugeridos stub |
| Liga 4 tabs | Hecho | API `/league` + scorecards; PDF comparar pendiente |
| Salud / Usuarios / Zonas | Hecho | `/admin/health` + revoke; usuarios/zonas API |

## 3.3 Campo

| Pantalla | Estado | Nota |
|---|---|---|
| Hoy + SyncBanner | Hecho | Offline-first vía bootstrap/pull + outbox |
| Visita 4 estados + Cómo llegar | Hecho | Justificación API parcial |
| Clientes filtros | Hecho | — |
| Ficha / Nuevo 4 pasos | Hecho UI | Wizard 4 pasos + pedir cambio ubicación |
| Mis números / Yo / Sync | Hecho | Yo ← `/league/scorecards/me`; Sync pull+outbox |
| Outbox | Hecho | Fotos + start + close/not-done/client |

## Cómo correr

```bash
make up && make seed-prototipo
cd frontend && PARITY_FULL=1 pnpm exec playwright test --project=parity
```

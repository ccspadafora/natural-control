# Checklist de paridad (plan §3)

Activar con Docker + `make seed-prototipo` + `PARITY_FULL=1 make parity`.

## 3.1 Transversales

| Elemento | Estado app | Prueba |
|---|---|---|
| Login tarjeta 440px + OTP | Hecho | `inventory.parity.ts`, screenshot login |
| Sidebar NAV por rol + contador geo | Hecho | Manual / E2E login líder |
| Búsqueda global | Parcial (navega a cartera) | E2E Enter → `/portal/clientes?q=` |
| En vivo + fecha | Hecho (fecha seed) | Screenshot topbar |
| Tema claro/oscuro/sol | Hecho web | Ciclo en shell |
| Toasts textos prototipo | Pendiente | — |

## 3.2 Portal

| Pantalla | Estado | Nota |
|---|---|---|
| Inicio Mes/Día | Hecho UI | KPIs placeholder |
| Mis números | Hecho UI | Metas placeholder |
| Agenda lista | Hecho | Semana/mes stub |
| Cartera | Hecho | Export/registrar disabled |
| Ficha | Parcial | Cultivos/historial stub |
| Visitas en vivo | Hecho UI | Mapa stub |
| Geolocalización + HU-D.2 | Hecho | LocationChange API stub |
| Tableros | Hecho UI | Sin drill-down completo |
| Forecast / Mi forecast | Hecho UI | Datos demo |
| Programación / asignación | Hecho | Sugeridos stub |
| Liga 4 tabs | Hecho UI | Datos RAW prototipo |
| Salud / Usuarios / Zonas | Salud hecho; resto shell DS | — |

## 3.3 Campo

| Pantalla | Estado | Nota |
|---|---|---|
| Hoy + SyncBanner | Hecho | Offline core |
| Visita 4 estados + Cómo llegar | Hecho | Justificación API parcial |
| Clientes filtros | Hecho | — |
| Ficha / Nuevo 4 pasos | Pendiente rediseño | screens.tsx legacy |
| Mis números / Yo / Sync | Hecho UI | Metas/carta stub |
| Outbox | Hecho core | Sin fotos/start |

## Cómo correr

```bash
make up && make seed-prototipo
cd frontend && PARITY_FULL=1 pnpm exec playwright test --project=parity
```

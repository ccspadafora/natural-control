# Progreso de ejecución del plan

Actualizado: 2026-11-18 (Funcional 100 % + Campo app-feel desplegado en EC2).

| Fase | Estado | Notas |
|---|---|---|
| 1. Matriz + bases | Hecha | [estado-historias.md](estado-historias.md), git, Makefile, CI, seeds, Playwright |
| 2. Design system | Hecha | `@nc/ui` tokens + componentes + Vitest |
| 3. Stack + shells | Hecha | Query/orval/zod, login/shells NAV, tema, demo |
| 4. App Campo | Hecha | Shell 100dvh, Workbox PWA, toasts/sheets/haptics, mapa ficha |
| 5. Portal RTC | Hecha | Agenda rango real, sugeridos API, ficha/export/PDF sin mock |
| 6. Líder | Hecha | Programación + load/suggestions reales |
| 7. Gerencia | Hecha | Tableros drill-down real; exports honestos |
| 8. Liga | Hecha | PDF real vía exports |
| 9. Admin | Hecha | Nav por flags; backlog sin fake |
| 10. Offline | Hecha | Sync crops/biotechs/history en bootstrap |
| 11. Paridad | Hecha (suite) | `PARITY_FULL=1 make parity` |
| 12. Backlog flags | Hecha | Nav oculto si flag off; APIs reales / empty |
| 13. Cierre | En curso | EC2 redeploy 2026-11-18; disco 8 GB sigue justo |

## Qué falta en esta fase (piloto actual)

1. **Ops disco EC2:** ampliar EBS (≥30 GB); builds amd64 en 8 GB son frágiles
2. **Ops:** backup real, deploy.yml CI; Lighthouse PWA verificado en dispositivo
3. **Datos de ventas en vivo:** hoy el piloto usa snapshot/seed; el motor Anexo A / ERP es fase comercial posterior

## Fuera de esta fase (contratable después)

WhatsApp Business API (WABA), informes con IA, conector ERP completo, automatizaciones post-visita, embudo avanzado — flags `feature.*` quedan en `false`; no forman parte del entregable actual.

## Arranque local

```bash
cd nc-crm
cp .env.example .env
make up && make seed-prototipo
# http://localhost:8080 — rtc@naturalcontrol.test / Nc-Campo-2026-piloto
```

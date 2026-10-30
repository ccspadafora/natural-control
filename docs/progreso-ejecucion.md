# Progreso de ejecución del plan

Actualizado: 2026-10-30 (pasada completa de fases del plan en código).

| Fase | Estado | Notas |
|---|---|---|
| 1. Matriz + bases | Hecha | [estado-historias.md](estado-historias.md), git, Makefile, CI, seeds, Playwright |
| 2. Design system | Hecha | `@nc/ui` tokens + componentes + Vitest |
| 3. Stack + shells | Hecha | Query/orval/zod, login/shells NAV, tema, demo |
| 4. App Campo | Hecha (parcial) | Hoy/Visita/Clientes/Números/Yo; ficha/wizard legacy |
| 5. Portal RTC | Hecha (parcial) | `/portal/*` completo UI; metas/liga placeholder |
| 6. Líder | Hecha (parcial) | Geo + HU-D.2, programación/asignación |
| 7. Gerencia | Hecha (parcial) | Inicio Mes/Día, visitas, tableros, forecast, mapa |
| 8. Liga | Hecha (parcial) | 4 tabs + modelos Scorecard/Badge |
| 9. Admin | Hecha (parcial) | Salud + shell DS en admin |
| 10. Offline | Hecha (core) | Dexie + `POST /sync/mutations` |
| 11. Paridad | Scaffold | [parity-checklist.md](parity-checklist.md) — verde con Docker |
| 12. Backlog flags | Hecha (stubs) | E9–E14, E16–E17 stubs; [flags.md](flags.md) |
| 13. Cierre | Checklist | [cierre-staging.md](cierre-staging.md) — Lighthouse/pytest en Docker |

## Qué falta para “producción / paridad 100 %”

1. **Docker:** `make up && make seed-prototipo && make test && PARITY_FULL=1 make parity`
2. **Datos reales:** motor Anexo A, goals/forecast API, GPS en mapa vivo
3. **Campo:** wizard 4 pasos + ficha rediseñada
4. **Terceros:** WABA, ERP, clave IA (flags ya listos)
5. **Ops:** backup real, Lighthouse ≥ 90, staging

## Arranque local

```bash
cd nc-crm
cp .env.example .env
make up && make seed-prototipo
# http://localhost:8080 — rtc@naturalcontrol.test / Nc-Campo-2026-piloto
```

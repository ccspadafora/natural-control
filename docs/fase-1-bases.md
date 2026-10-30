# Fase 1 — Matriz y bases

## Entregado

1. **Matriz de historias:** [estado-historias.md](estado-historias.md) — 82 HU de 05b + 4 HU-D, trazabilidad diseño → HU.
2. **Git:** repositorio inicializado en `nc-crm` (rama `main`). Sin remoto todavía.
3. **Makefile:** `test`, `test-fe`, `e2e`, `parity`, `lint`, `schema-check`, `seed-prototipo`, `seed-volume`.
4. **CI:** [.github/workflows/ci.yml](../.github/workflows/ci.yml) (backend pytest + ruff; frontend typecheck/tests).
5. **Seed prototipo:** `make seed-prototipo` → `apps/core/prototipo/` con zonas, 11 RTC, staff, 18 clientes, productos, visitas del 29-oct-2026 11:02, GPS pendientes, metas. Settings `demo.frozen_at` y `feature.demo_mode`.
6. **Seed volumen:** `make seed-volume` para rendimiento.
7. **Playwright:** `frontend/playwright.config.ts` + smoke E2E y placeholder de paridad (`PARITY_FULL=1` en fase 10).

## Cómo verificar el seed

```bash
# Arranca Docker Desktop, luego:
cp .env.example .env   # si aún no existe
make up
make seed-prototipo
```

Login: `rtc@naturalcontrol.test` / `Nc-Campo-2026-piloto`.

## Siguiente

Fase 2: port del Design System a `packages/ui`.

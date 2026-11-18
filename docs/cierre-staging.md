# Cierre y staging (fase 13)

Pendiente de entorno Docker/staging. Checklist operativa.

## HU-8.1 — Sync en vivo

- [x] ASGI Channels + ruta `ws/v1/stream` (ya en backend)
- [x] Consola: `openStream` / feed visitas (parcial)
- [ ] Campo: suscripción WebSocket
- [ ] Indicador «En vivo» ligado a p95 real (hoy es estático/éxito de conexión)
- [ ] Job de respaldo documentado + tarjeta Salud «Último backup»

## Regresión

```bash
make up && make seed-prototipo
make test          # pytest completo (75+)
make test-fe       # Vitest @nc/ui
make e2e
PARITY_FULL=1 make parity   # inventory + campo · 15 tests
```

## Rendimiento

```bash
make seed-volume
# medir listados cartera / visitas en vivo / tableros
```

## Lighthouse PWA Campo

```bash
# con /campo/ servido (Lighthouse 11 conserva categoría pwa)
npx lighthouse@11.7.1 http://16.59.184.151/campo/ --only-categories=pwa --view
# meta: PWA ≥ 90
# 2026-11-18: Workbox SW + maskable icons + theme #124481 en http://16.59.184.151/campo/
# (Lighthouse headless remoto puede fallar NO_FCP; verificar en Chrome local)
```

## Staging

1. Desplegar imagen API + worker + beat + nginx + PostGIS
2. `DEMO_MODE=false` / `VITE_DEMO_MODE=false`
3. Flags de fases futuras off (WhatsApp / ERP / IA / embudo / automatización) — no son de este piloto
4. Smoke por rol: RTC Campo, Líder geo, Gerencia inicio, Admin salud

## DoD producto (recorte honesto)

**Listo en código (UI + stubs):** superficies del prototipo, DS, offline core, flags E9/E12–E14/E16–E17.

**Falta para endurecer este piloto:** disco EC2, backups, Lighthouse PWA en dispositivo. **Fases comerciales posteriores (no este contrato):** WABA, ERP vivo, IA, automatizaciones.

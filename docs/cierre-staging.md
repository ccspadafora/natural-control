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
make test          # pytest completo
make test-fe
make e2e
PARITY_FULL=1 make parity
```

## Rendimiento

```bash
make seed-volume
# medir listados cartera / visitas en vivo / tableros
```

## Lighthouse PWA Campo

```bash
# con /campo/ servido
npx lighthouse http://localhost:8080/campo/ --only-categories=pwa,performance --view
# meta: PWA ≥ 90
```

## Staging

1. Desplegar imagen API + worker + beat + nginx + PostGIS
2. `DEMO_MODE=false` / `VITE_DEMO_MODE=false`
3. Flags terceros off hasta WABA / ERP / clave IA
4. Smoke por rol: RTC Campo, Líder geo, Gerencia inicio, Admin salud

## DoD producto (recorte honesto)

**Listo en código (UI + stubs):** superficies del prototipo, DS, offline core, flags E9/E12–E14/E16–E17.

**Falta para producción:** motor Anexo A real, ERP/WABA/IA, wizard ficha/nuevo Campo, MapLibre vivo, paridad visual verde, Lighthouse, backups operativos.

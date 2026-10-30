# Frontend stack (Natural Control CRM)

## OpenAPI → cliente React Query (Orval)

El paquete `@nc/api` incluye el cliente manual (`login`, `api`, `restore`, …) y, opcionalmente, hooks generados bajo `packages/api/src/generated/`.

1. Levanta el backend (p. ej. Docker Compose) hasta que responda `http://localhost:8000/api/schema/`.
2. Desde `frontend/`:

```bash
ORVAL_SCHEMA=http://localhost:8000/api/schema/ pnpm --filter @nc/api generate
```

Si el API no está disponible, puedes generar contra el stub incluido:

```bash
ORVAL_OFFLINE=1 pnpm --filter @nc/api generate
```

Variables útiles:

| Variable | Uso |
| -------- | --- |
| `ORVAL_SCHEMA` | URL o ruta al OpenAPI (por defecto `http://localhost:8000/api/schema/`) |
| `ORVAL_OFFLINE=1` | Usa `packages/api/openapi.stub.json` |

## React Query en apps

`apps/web` y `apps/campo` montan `QueryClientProvider` con `createNcQueryClient()` (`staleTime` 30s).

## Modo demo

`isDemoMode()` en `@nc/api` devuelve `true` si `VITE_DEMO_MODE=true` o, si no está definida, en desarrollo Vite (`import.meta.env.DEV`). Añade en `.env`:

```bash
VITE_DEMO_MODE=false
```

para desactivar demo en local.

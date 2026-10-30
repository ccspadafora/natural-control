# Cliente generado (Orval)

Este directorio se llena con `pnpm --filter @nc/api generate` cuando el esquema OpenAPI está disponible.

- Backend en marcha: `ORVAL_SCHEMA=http://localhost:8000/api/schema/ pnpm --filter @nc/api generate`
- Sin backend: `ORVAL_OFFLINE=1 pnpm --filter @nc/api generate` (usa `openapi.stub.json` en la raíz del paquete)

Los archivos generados (excepto este README) están en `.gitignore`.

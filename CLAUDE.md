# CLAUDE.md — Instrucciones para agentes de desarrollo

Este archivo lo leen los agentes de código (Claude Code, Cursor, etc.) antes de tocar el repositorio. Las reglas aplican igual a humanos.

## 1. Fuente de verdad
- El comportamiento esperado está en `docs/`. Antes de implementar una historia, lee su HU en `docs/05-epicas-e-historias.md`, los modelos involucrados en `docs/02` y los endpoints en `docs/03`.
- Si algo no está especificado, **no lo inventes**. Implementa lo mínimo, deja un `# TODO(spec): <pregunta>` y repórtalo en la descripción del PR.
- Si cambias un modelo, un endpoint o un evento, actualiza el doc correspondiente **en el mismo PR**.

## 2. Reglas no negociables
1. **Todo corre en Docker.** Ningún comando de desarrollo, test o CI se ejecuta fuera de contenedores. Usa los targets del `Makefile`.
2. **Ningún parámetro de negocio va quemado en el código.** Tolerancia GPS, días de sesión, metas, plazos, horizontes, umbrales y textos de plantillas se leen de `parameters.SystemSetting` a través de `parameters.services.get_setting(key)`, que tiene caché en Redis. Ver `docs/02` §13.
3. **Permisos en el backend siempre.** La UI oculta, pero el backend decide. Toda vista hereda de `ScopedViewSet` (ver `docs/08` §2). Un endpoint sin scoping explícito no pasa code review.
4. **Idempotencia** en toda escritura que venga del modo sin conexión (`client_uuid`) y en toda llamada externa (WhatsApp, ERP, correo, IA). Ver `docs/07` §4.
5. **Las vistas no llaman servicios externos.** Encolan una tarea Celery y responden. Los webhooks responden 200 en menos de 2 s y procesan después.
6. **Patrón services/selectors:** la lógica de escritura vive en `<app>/services.py` y las lecturas complejas en `<app>/selectors.py`. Serializers y vistas son delgados.
7. **Dinero** en `DecimalField(max_digits=16, decimal_places=2)` y en COP. Nunca `float`.
8. **Fechas:** se guardan en UTC y se calculan periodos (día, semana, mes) en `America/Bogota`. Semana ISO, de lunes a domingo.
9. **Coordenadas:** `PointField(geography=True, srid=4326)`. Las distancias se calculan en la base con `ST_Distance` sobre geography y nunca en Python.
10. **Auditoría:** las mutaciones sobre `Cliente`, `Sede` (ubicación), `Visita`, `VerificacionGPS`, `Oportunidad`, `User` y `SystemSetting` generan `AuditLog` mediante `audit.services.record()`.

## 3. Convenciones de código
- **Backend:** ruff (lint + format), mypy con `django-stubs` en modo estricto para `services.py` y `selectors.py`, pytest + factory_boy. Cobertura mínima de 85 % en `services`.
- **Frontend:** TypeScript `strict`, ESLint + Prettier, Vitest + Testing Library, Playwright para E2E. El cliente HTTP **se genera** desde el OpenAPI con `orval`; no se escriben tipos de API a mano.
- **Commits:** Conventional Commits (`feat(visits): …`). **Ramas:** `feat/HU-3.2-registro-visita`.
- **Migraciones:** una por PR por app, con nombre descriptivo. No se editan migraciones ya mergeadas a `develop`.
- **Idioma:** el código (identificadores) va en inglés; los textos de UI, los mensajes de error para el usuario y los docs, en español de Colombia.

> Nota: los nombres de modelos en `docs/02` están en español para el lector de negocio. En código se usan sus equivalentes en inglés, según la tabla de mapeo de `docs/02` §0.

## 4. Definition of Done de una HU
Ver `docs/10-plan-de-entrega.md` §3. Resumen: criterios de aceptación cubiertos por tests, OpenAPI actualizado, permisos probados por rol, funciona sin conexión si la HU lo exige, se probó en un Android y un iPhone reales instalados como PWA, docs al día.

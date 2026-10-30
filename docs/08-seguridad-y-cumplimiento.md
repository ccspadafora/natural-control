# 08 · Seguridad y cumplimiento

## 1. Autenticación
- Contraseñas con Argon2id; longitud mínima de 10; validadores de Django + `zxcvbn` (puntaje ≥ 3); verificación contra contraseñas filtradas (k-anonimato de HIBP, opcional y desactivable si no hay salida a internet).
- JWT firmados con HS256 y una clave dedicada (`JWT_SIGNING_KEY`, distinta de `SECRET_KEY`), rotable con `kid`.
- Refresh en una cookie `HttpOnly; Secure; SameSite=Strict`, con rotación en cada uso y detección de reutilización: si llega un refresh ya rotado, se **revocan todos los dispositivos** del usuario (indica robo del token) y se le avisa por correo.
- La sesión expira por inactividad a los 30 días (K3) y de forma absoluta a los 90.
- MFA [C]: TOTP (`django-otp`) o passkey (WebAuthn) para los roles en `auth.mfa_required_roles`.
- Las cabeceras de seguridad las fija Nginx (`docs/09` §4): HSTS (1 año, `includeSubDomains`), CSP estricta (`default-src 'self'`; `connect-src 'self' wss://<dominio> https://api.maptiler.com https://<bucket>.s3.amazonaws.com`; `img-src 'self' data: blob: https://<bucket>.s3.amazonaws.com https://api.maptiler.com`; `worker-src 'self'`), `X-Content-Type-Options`, `Referrer-Policy: strict-origin-when-cross-origin` y `Permissions-Policy: geolocation=(self), camera=(self)`.
- CSRF: la API usa JWT en la cabecera `Authorization`, así que no aplica a los endpoints autenticados; el endpoint de refresh (que usa la cookie) exige además la cabecera `X-Requested-With: nc` y un `Origin` igual al dominio.

## 2. Autorización

### 2.1 Mecanismo
- **Permiso de módulo:** `HasPermissionCode("visits.close")` en cada acción de la vista (no solo por viewset).
- **Alcance de datos:** `ScopedViewSet.get_queryset()` aplica `scope_queryset(qs, user)`, definido **por modelo** en `<app>/permissions.py`:

```python
def scope_visits(qs, user):
    match user.effective_scope:          # del rol, con override por usuario si aplica
        case Scope.OWN:  return qs.filter(rtc=user)
        case Scope.TEAM: return qs.filter(Q(rtc=user) | Q(rtc__team__leader=user))
        case Scope.ZONE: return qs.filter(Q(rtc=user) | Q(client__zone__in=user.led_zones.all()))
        case Scope.ALL:  return qs
```
- Un objeto fuera del alcance → **404** (no 403), para no revelar que existe.
- Las acciones sobre objetos relacionados validan el alcance del objeto padre (por ejemplo, crear un `VisitProduct` comprueba que la `Visit` esté en el alcance y sea editable).
- Pruebas obligatorias (HU-1.2 CA3): matriz endpoint × rol × propio o ajeno.

### 2.2 Matriz sembrada (resumen)
✓ = permitido · OWN, TEAM o ZONE = permitido con ese alcance · — = no

| Permiso | RTC | LIDER_ZONA | GERENCIA | ADMIN | ADMIN_PRODUCTO |
|---|---|---|---|---|---|
| `clients.view` / `clients.create` / `clients.edit` | OWN | ZONE | ✓ | ✓ | — |
| `clients.reassign` · `clients.import` | — | ZONE / — | ✓ | ✓ | — |
| `locations.approve` | — | ZONE | ✓ | ✓ | — |
| `visits.view` | OWN | ZONE | ✓ | ✓ | — |
| `visits.create` · `visits.execute` | OWN | OWN | — | — | — |
| `visits.assign` | — | ZONE | ✓ | ✓ | — |
| `visits.edit` (fuera de la ventana) | — | ZONE | ✓ | ✓ | — |
| `visits.export` | — | ZONE | ✓ | ✓ | — |
| `gps.review` | — | ZONE | ✓ | ✓ | — |
| `weekly_plan.submit` | OWN | — | — | — | — |
| `weekly_plan.review` · `weekly_plan.require` | — | ZONE | ✓ | ✓ | — |
| `pipeline.view` / `pipeline.edit` | OWN | ZONE | ✓ / — | ✓ | — |
| `pipeline.configure` | — | — | ✓ | ✓ | — |
| `tasks.view` / `tasks.edit` | OWN | ZONE | ✓ | ✓ | — |
| `metrics.view` · `forecast.view` | OWN (propias) | ZONE | ✓ | ✓ | — |
| `goals.view` / `goals.manage` | OWN / — | ZONE / — | ✓ | ✓ | — |
| `whatsapp.view` / `whatsapp.send` | OWN | ZONE (ver) / — | ✓ (ver) | ✓ | — |
| `whatsapp.configure` · `automation.configure` | — | — | — | ✓ | — |
| `catalog.view` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `catalog.manage` | — | — | — | ✓ | ✓ |
| `ai_reports.view` / `ai_reports.generate` | — | ZONE (su zona) / — | ✓ | ✓ | — |
| `users.view` / `users.manage` · `roles.manage` · `org.manage` | — | ZONE (ver) / — | ✓ (ver) / — | ✓ | — |
| `settings.view` / `settings.edit` · `audit.view` · `admin.supervise` · `erp.manage` | — | — | ✓ (ver audit) | ✓ | — |
| `catalogs.manage` | — | — | ✓ | ✓ | — |

Los roles personalizados se arman con esta misma matriz (HU-17.7).

## 3. Auditoría
- `audit.services.record(actor, action, entity, before, after, request)` se llama desde los **servicios** (no desde señales: así queda claro qué acción de negocio la produjo).
- Siempre se auditan: login (exitoso y fallido), cambios de rol o permiso, desactivaciones, revocación de dispositivos, creación y edición de clientes, **cualquier cambio de ubicación de una sede**, transiciones de visita, ediciones fuera de la ventana, revisión de GPS, confirmación de "no es duplicado", reasignaciones, cambios de `SystemSetting`, exportaciones y descargas, y envíos de WhatsApp y correo.
- El `AuditLog` es de solo inserción: no hay endpoints de edición ni de borrado; el usuario de base de datos de la aplicación no tiene `UPDATE` ni `DELETE` sobre esa tabla (se concede con una migración que ejecuta `REVOKE`).

## 4. Antifraude de visitas
Ver `docs/04` §6. Resumen de capas: (1) referencia de la sede bloqueada tras la primera verificación y cambios aprobados por un líder; (2) captura GPS con precisión y hora del dispositivo y del servidor; (3) señales de sospecha automáticas; (4) fotos con fecha y ubicación EXIF; (5) revisión humana de toda discrepancia, y las rechazadas no cuentan para las metas; (6) reportes por RTC de % verificadas y señales (la Consola resalta a quien supere la media en más de 2 desviaciones).

## 5. Protección de datos personales (Colombia, Ley 1581 de 2012 y Decreto 1377 de 2013)
- **Roles:** Natural Control es el **Responsable** del tratamiento; Valfora Holdings S.A.S. (3 Orillas) es el **Encargado** (así está en el contrato). Los proveedores de infraestructura (AWS, Meta, Anthropic y MapTiler) son subencargados; se listan en el anexo de seguridad que se entrega al cliente.
- **Autorización:** en el registro de contactos (HU-2.3 CA5) se guardan la fecha, el usuario que la tomó, la versión del texto de autorización (`parameters`: `privacy.consent_text` y `privacy.consent_version`) y la evidencia opcional. Natural Control debe aportar su política de tratamiento de datos y el texto de autorización (decisión abierta D6).
- **Derechos (conocer, actualizar, rectificar y suprimir):** el administrador puede exportar todos los datos de un contacto (JSON y PDF) y **anonimizar** un cliente o contacto (reemplaza los datos personales por marcadores, conserva las métricas agregadas y las visitas, y deja `AuditLog`).
- **Minimización:** la IA recibe solo agregados (`docs/06` §5.2); los logs no contienen datos personales (un filtro de `structlog` enmascara teléfonos, correos y documentos); Sentry tiene `send_default_pii=False` y depuración de datos con `before_send`.
- **Ubicación de los empleados:** el sistema **solo** captura la ubicación del RTC en eventos de trabajo explícitos (iniciar o cerrar una visita, registrar una sede o tomar una foto) y nunca en segundo plano. Esto se debe informar a los RTC (comunicación interna de Natural Control); la app lo explica al pedir el permiso.
- **Retención:** visitas y clientes mientras dure la relación contractual; auditoría 36 meses; exportaciones 7 días; webhooks crudos 30 días; backups 12 meses.

## 6. Infraestructura y secretos
- Secretos en variables de entorno inyectadas desde **AWS SSM Parameter Store** (SecureString) al desplegar; nunca en el repositorio. Hay un `.env.example` con las claves y valores ficticios.
- El servidor solo expone los puertos 80 y 443 (Security Group); el SSH, por **EC2 Instance Connect** o una IP fija de la oficina; Postgres y Redis **no** se exponen fuera de la red de Docker.
- El usuario de base de datos de la aplicación no es superusuario; las migraciones usan un rol separado.
- Escaneo de dependencias en CI (`pip-audit`, `pnpm audit`) y de imágenes (`trivy`); Dependabot activo.
- Las imágenes corren con un usuario no-root y el sistema de archivos de solo lectura donde aplica.

## 7. Pruebas de seguridad antes de producción
- Lista de verificación OWASP ASVS nivel 1 aplicada a autenticación, sesión, control de acceso y validación de entrada.
- Prueba de escalada horizontal automatizada (suite de permisos).
- Revisión manual del flujo offline: el cierre de sesión borra todo; otro usuario en el mismo dispositivo no ve datos del anterior.

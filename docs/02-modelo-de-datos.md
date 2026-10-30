# 02 · Modelo de datos

Notación: `campo: Tipo [restricciones] — comentario`. Todos los modelos heredan de `BaseModel` (`docs/01` §5) salvo que se indique lo contrario. `FK` es `ForeignKey(on_delete=PROTECT)` salvo que se indique otra cosa. Los `choices` se implementan con `models.TextChoices`.

## 0. Mapeo de nombres (negocio → código)

| Doc | Código | App | Doc | Código | App |
|---|---|---|---|---|---|
| Usuario | `User` | accounts | Visita | `Visit` | visits |
| Rol | `Role` | accounts | ProductoVisita | `VisitProduct` | visits |
| Permiso | `Permission` | accounts | Evidencia | `Evidence` | visits |
| Dispositivo | `Device` | accounts | VerificacionGPS | `GpsCheck` | visits |
| Zona | `Zone` | org | MotivoVisita | `VisitReason` | visits |
| Equipo | `Team` | org | ProgramacionSemanal | `WeeklyPlan` | visits |
| Departamento / Municipio | `Department` / `Municipality` | geo | ItemProgramacion | `WeeklyPlanItem` | visits |
| Cliente | `Client` | crm | EtapaPipeline | `Stage` | pipeline |
| Sede | `Site` | crm | Oportunidad | `Opportunity` | pipeline |
| Contacto | `Contact` | crm | LineaOportunidad | `OpportunityLine` | pipeline |
| Cultivo | `Crop` | crm | ReglaSeguimiento | `FollowUpRule` | pipeline |
| TipoCultivo | `CropType` | crm | Tarea / Seguimiento | `Task` | pipeline |
| ClienteBiotecnologia | `ClientBiotech` | crm | Meta | `Goal` | goals |
| SolicitudCambioUbicacion | `LocationChangeRequest` | crm | Logro | `Achievement` | goals |
| Categoria | `Category` | catalog | ConversacionWA | `Conversation` | messaging |
| Producto | `Product` | catalog | MensajeWA | `Message` | messaging |
| ListaPrecios / Precio | `PriceList` / `Price` | catalog | PlantillaWA | `WaTemplate` | messaging |
| FichaTecnica | `TechSheet` | catalog | RegistroCorreo | `EmailLog` | messaging |
| VentaERP | `ErpSale` | integrations | ReglaPostVisita / Ejecucion | `PostVisitRule` / `AutomationRun` | automation |
| EventoWebhook | `RawWebhookEvent` | integrations | ForecastCongelado | `ForecastSnapshot` | forecast |
| CorridaSyncERP | `ErpSyncRun` | integrations | InformeIA | `AIReport` | reports |
| Notificacion | `Notification` | notifications | TrabajoExportacion | `ExportJob` | reports |
| SuscripcionPush | `PushSubscription` | notifications | Bitacora | `AuditLog` | audit |
| Parametro | `SystemSetting` | parameters | MutacionSync | `SyncMutation` | sync |

> La app que guarda los parámetros se llama **`parameters`** (no `config`, para no chocar con el paquete de *settings* de Django). El servicio de lectura es `parameters.services.get_setting(key)`.

---

## 1. accounts

### Role
- `code: Char(40) [unique]` — `RTC`, `LIDER_ZONA`, `GERENCIA`, `ADMIN`, `ADMIN_PRODUCTO` o códigos personalizados.
- `name: Char(80)`
- `data_scope: Choice(OWN, TEAM, ZONE, ALL)` — alcance de datos por defecto del rol (ver `docs/08` §2).
- `is_system: Bool` — los roles sembrados no se pueden borrar.
- `permissions: M2M(Permission)`

### Permission
- `code: Char(80) [unique]` — formato `módulo.acción`, por ejemplo `visits.create`, `visits.review_gps`, `clients.export`, `settings.edit`. El catálogo completo de códigos se siembra en una migración (`docs/08` §2.2).
- `module: Char(40)`, `description: Char(200)`

### User (`AbstractBaseUser`, `PermissionsMixin` de Django **no** se usa para negocio)
- `email: Email [unique, ci]` — es el identificador de inicio de sesión.
- `username: Char(40) [unique, null]` — alternativo (HU-1.1 permite "usuario o correo").
- `first_name`, `last_name: Char(80)`
- `phone: Char(20) [E.164, null]`
- `document_id: Char(20) [null]` — cédula.
- `role: FK(Role)`
- `zone: FK(Zone, null)` — zona principal (RTC y líder).
- `team: FK(Team, null)` — equipo al que pertenece el RTC.
- `erp_seller_code: Char(40) [null, unique]` — código del vendedor en el ERP (para cruzar ventas reales).
- `requires_weekly_plan: Bool [default False]` — K6 / HU-3.5.
- `requires_weekly_plan_reason: Char(200) [blank]`, `requires_weekly_plan_since: DateTime [null]`
- `is_active: Bool` — se desactiva y **nunca se borra** (HU-7.1).
- `last_seen_at: DateTime [null]` — último request autenticado (actualizado como máximo una vez cada 5 min).
- `last_sync_at: DateTime [null]` — última sincronización exitosa desde Campo.
- `mfa_required: Bool` — se fuerza por rol o por usuario (HU-17.2).
- `password` — hash Argon2 (`PASSWORD_HASHERS` con `Argon2PasswordHasher` primero).

Índices: `(role, is_active)`, `(zone, is_active)`, `last_seen_at`.

### Device
Un registro por instalación de la PWA o navegador. Lo crea el login.
- `user: FK(User, CASCADE)`
- `label: Char(120)` — por ejemplo "Android · Chrome 129 · Moto G54", derivado del user agent.
- `platform: Choice(ANDROID, IOS, DESKTOP, OTHER)`, `is_standalone: Bool` — si está instalada como PWA.
- `refresh_jti: Char(64) [index]` — jti del refresh vigente; rota en cada refresh.
- `last_used_at: DateTime`, `revoked_at: DateTime [null]`, `revoked_by: FK(User, null)` — cierre remoto (HU-17.3).
- `pending_mutations: Int` — lo reporta el cliente en cada sync; alimenta la supervisión (HU-17.6).

### OtpChallenge
- `user: FK(User, CASCADE)`, `channel: Choice(EMAIL, WHATSAPP)`, `purpose: Choice(LOGIN, PASSWORD_RESET, MFA)`
- `code_hash: Char(128)` — hash del código de 6 dígitos; el código nunca se guarda en claro.
- `expires_at: DateTime` (10 min), `attempts: SmallInt` (máximo 5), `consumed_at: DateTime [null]`

### WebAuthnCredential
- `user: FK(User, CASCADE)`, `device: FK(Device, null)`, `credential_id: Binary [unique]`, `public_key: Binary`, `sign_count: BigInt`, `transports: JSON`, `label: Char(80)`

## 2. org

### Zone
- `name: Char(80) [unique]` — por ejemplo "Oriente Antioqueño", "Eje Cafetero".
- `code: Char(20) [unique]`
- `municipalities: M2M(Municipality)` — define la cobertura y se usa para sugerir la zona de un cliente nuevo.
- `gps_tolerance_m: PositiveInt [null]` — anula el valor global (K4) en zonas rurales dispersas.
- `leaders: M2M(User, limit role=LIDER_ZONA)`

### Team
- `name: Char(80)`, `leader: FK(User)`, `zone: FK(Zone)`
- Los miembros son los `User.team`. El alcance `TEAM` de un líder = los usuarios con `team.leader = líder`.

## 3. geo
- `Department(code: Char(2) [DIVIPOLA, unique], name)`
- `Municipality(code: Char(12) [unique], name, department: FK, centroid: Point [geography])` — el código DIVIPOLA cabe en 5 caracteres. Los municipios creados desde el Excel de ventas, mientras no esté el archivo del DANE, usan un código `imp…` que no se confunde con DIVIPOLA.
- Se cargan con una migración de datos desde el archivo DIVIPOLA del DANE (1.122 municipios).

## 4. crm

### Client
- `kind: Choice(PERSONA, EMPRESA)`
- `document_type: Choice(NIT, CC, CE, PASAPORTE, OTRO)`, `document_number: Char(20) [null]` — con DV aparte para NIT: `nit_dv: Char(1) [null]`.
- `legal_name: Char(200)`, `trade_name: Char(200) [blank]`
- `client_type: FK(ClientType)` — catálogo configurable (Agricultor, Finca empresarial, Distribuidor, Almacén agropecuario, Cooperativa, Otro).
- `segment: Choice(A, B, C) [null]` — potencial (HU-11.1).
- `commercial_status: Choice(PROSPECTO, ACTIVO, INACTIVO, PERDIDO) [default PROSPECTO]`
- `owner: FK(User)` — RTC responsable. Con K5 (`OPEN`) es quien lo creó, y se puede reasignar (HU-7.2).
- `zone: FK(Zone, null)` — la zona comercial cuando el municipio cae en una de las siete listas. Si no hay lista para ese departamento, queda vacío y el cliente no hereda precios de otra zona.
- `price_list: FK(PriceList, null)` — lista de precios de este cliente. Se propone desde la zona y se puede cambiar. Es la que usa el RTC para consultar precios y precargar la visita.
- `phone: Char(20) [E.164, blank]`, `email: Email [blank]`
- `erp_code: Char(40) [null, unique]` — vínculo con el cliente en el ERP (E9).
- `data_consent_at: DateTime [null]`, `data_consent_evidence: FK(Evidence, null)` — autorización de tratamiento de datos (Ley 1581, ver `docs/08` §5).
- `notes: Text [blank]`
- `source: Choice(APP, IMPORT, ERP)`

Restricciones: `UniqueConstraint(document_type, document_number, condition=Q(document_number__isnull=False, is_deleted=False))`.
Índices: `(owner, commercial_status)`, `zone`, `GinIndex(SearchVector('legal_name','trade_name'))` con configuración `spanish` + `unaccent`, y trigram sobre `legal_name` para la búsqueda difusa y la detección de duplicados.

### Site (sede / finca)
- `client: FK(Client, CASCADE)`
- `name: Char(120)` — por ejemplo "Finca La Esperanza".
- `is_primary: Bool`
- `municipality: FK(Municipality)`, `vereda: Char(120) [blank]`, `address: Char(250) [blank]`
- `location: Point [geography, srid 4326, null]` — **referencia contra la que se verifica el GPS.**
- `location_source: Choice(GPS_DEVICE, MAP_PIN, GEOCODED, IMPORT)`, `location_accuracy_m: Float [null]`
- `location_set_by: FK(User, null)`, `location_set_at: DateTime [null]`
- `location_locked: Bool [default False]` — se bloquea después de la primera visita verificada (ver la regla siguiente).
- `total_area_ha: Decimal(10,2) [null]`

Índice GiST en `location`. Restricción: como máximo una `is_primary=True` por cliente.

**Regla antifraude de la ubicación:** un RTC puede fijar `location` solo al crear la sede o si está vacía. Si `location_locked=True`, cambiarla exige una `LocationChangeRequest`, que aprueba un líder o gerencia. Todo cambio deja `AuditLog` con el punto anterior y el nuevo.

### LocationChangeRequest
- `site: FK(Site)`, `requested_by: FK(User)`, `old_location: Point`, `new_location: Point`, `new_accuracy_m: Float`, `reason: Text`
- `status: Choice(PENDIENTE, APROBADA, RECHAZADA)`, `decided_by: FK(User, null)`, `decided_at: DateTime [null]`, `decision_note: Text [blank]`

### Contact
- `client: FK(Client, CASCADE)`, `site: FK(Site, null)`
- `full_name: Char(160)`, `role_title: Char(80) [blank]` — por ejemplo "Administrador de finca" o "Agrónomo".
- `phone: Char(20) [E.164, blank]`, `email: Email [blank]`
- `is_primary: Bool`
- `whatsapp_opt_in: Bool`, `whatsapp_opt_in_at: DateTime [null]`, `whatsapp_opt_in_source: Choice(VERBAL_EN_VISITA, FORMULARIO, MENSAJE_ENTRANTE) [null]` — exigido por la política de Meta (`docs/06` §2).

### CropType
- `name: Char(80) [unique]` — Aguacate Hass, Flores, Papa, Café, Banano, Cítricos, Hortalizas… (configurable)

### Crop
- `site: FK(Site, CASCADE)`, `crop_type: FK(CropType)`, `area_ha: Decimal(10,2)`, `notes: Char(200) [blank]`
- `recorded_at: Date` — el área cambia con el tiempo; se guarda historia (no se sobrescribe; la vigente es la más reciente por `site + crop_type`).

### ClientBiotech (K8: lo que el cliente **ya usa**)
- `client: FK(Client, CASCADE)`, `site: FK(Site, null)`
- `product: FK(Product, null)` — si es de Natural Control.
- `competitor_product: Char(160) [blank]`, `competitor_brand: Char(120) [blank]` — si es de la competencia.
- `crop_type: FK(CropType, null)`
- `status: Choice(EN_USO, DEJO_DE_USAR)`, `since: Date [null]`, `notes: Char(250) [blank]`
- `source_visit: FK(Visit, null)` — la visita en que se registró.

Restricción: `CheckConstraint(product IS NOT NULL OR competitor_product <> '')`.

### ClientType
- `name: Char(80) [unique]`, `is_active: Bool`

### Dedupe (no es un modelo; vive en `crm/selectors.py`)
`find_possible_duplicates(document_number, legal_name, phone, location)` devuelve candidatos cuando hay:
1. el mismo `document_type + document_number` → **bloqueante** (error `client.duplicate_document`);
2. el mismo teléfono normalizado en el cliente o en un contacto → advertencia;
3. similitud trigram de `legal_name` ≥ 0,6 → advertencia;
4. una sede a ≤ `crm.dedupe_radius_m` (por defecto 200 m) con nombre similar ≥ 0,4 → advertencia.

Si hay advertencias, el RTC debe confirmar ("Es otro cliente") antes de crear; la confirmación queda en `AuditLog`.

## 5. catalog

### Category
- `name: Char(80)`, `parent: FK(self, null)`, `sort_order: Int`

### Product
- `sku: Char(40) [unique]`, `erp_code: Char(40) [unique, null]`
- `name: Char(160)`, `category: FK(Category)`
- `active_ingredient: Char(200) [blank]` — microorganismo o ingrediente activo.
- `presentation: Char(80)` — por ejemplo "Galón 3,78 L".
- `unit: Choice(L, KG, UNIDAD, GAL)`, `unit_size: Decimal(10,3)`
- `short_description: Char(300)`, `usage: Text [blank]` — dosis, cultivos objetivo y modo de uso (HU-11.2).
- `target_crops: M2M(CropType)`
- `is_available: Bool`, `is_active: Bool`
- `images: M2M(Evidence)` — reutiliza el almacenamiento de archivos.

### PriceList / Price
- `PriceList(name, zone: FK(Zone), is_default: Bool, valid_from: Date, valid_to: Date [null], notes)` — una lista por zona comercial (Oriente Antioqueño, Urabá, Bogotá–Cundinamarca, Bucaramanga–Santander, Pamplona y Norte de Santander, Tolima, Valle). `is_default` marca la lista vigente de esa zona.
- `Price(price_list: FK, product: FK, unit_price: Decimal(16,2), currency: Char(3)='COP')`, único por `(price_list, product)`.
- **Regla:** el cliente guarda la lista que le aplica (`Client.price_list`). Al crearlo se propone la lista por defecto de su zona, y gerencia puede cambiarla. Al registrar un producto en una visita, `unit_price` se precarga con el precio vigente de **esa** lista y el RTC lo puede modificar. Se guarda el valor final en la línea. El catálogo del RTC, abierto desde un cliente, muestra los precios de la lista del cliente.

### TechSheet (ficha técnica versionada)
- `product: FK(Product, CASCADE)`, `version: PositiveInt`, `file: File (S3, PDF ≤ 10 MB)`, `sha256: Char(64)`
- `is_current: Bool` — exactamente una vigente por producto (restricción parcial única).
- `published_by: FK(User)`, `published_at: DateTime`, `changelog: Char(300)`
- **Regla:** las automatizaciones y los envíos manuales usan **siempre** la versión vigente en el momento del envío, y registran `tech_sheet_id` en el log del envío (HU-11.3).

## 6. visits

### VisitReason
- `name: Char(80)` — Prospección, Seguimiento técnico, Cierre de venta, Cobro, Posventa, Capacitación (configurable).
- `is_active: Bool`

### Visit
- `client: FK(Client)`, `site: FK(Site)` — la sede es obligatoria: es la referencia del GPS.
- `rtc: FK(User)` — quien la ejecuta.
- `assigned_by: FK(User, null)` — si la asignó un líder o gerencia (HU-7.3).
- `origin: Choice(RTC, ASIGNADA, PROGRAMACION, RECURRENTE)`
- `weekly_plan_item: FK(WeeklyPlanItem, null)`, `recurrence: FK(VisitRecurrence, null)`
- `reason: FK(VisitReason, null)`, `priority: Choice(BAJA, MEDIA, ALTA) [default MEDIA]`
- `scheduled_start: DateTime [null]`, `scheduled_end: DateTime [null]` — una visita "sin agendar" (registrada al vuelo) tiene `scheduled_start = null`.
- `status: Choice(PROGRAMADA, EN_CURSO, REALIZADA, NO_REALIZADA, CANCELADA)`
- `started_at: DateTime [null]`, `completed_at: DateTime [null]` — **hora del dispositivo** al marcar.
- `server_received_at: DateTime [null]` — hora del servidor cuando llegó el cierre (sirve para el modo sin conexión).
- `contact: FK(Contact, null)`, `contact_name_free: Char(160) [blank]` — persona atendida (HU-3.2).
- `result: Choice(PEDIDO_CONFIRMADO, COTIZACION_SOLICITADA, SEGUIMIENTO_PROGRAMADO, SIN_INTERES, OTRO) [null]`
- `notes: Text [blank]`, `agreements: Text [blank]`
- `cancel_reason: Char(250) [blank]`, `not_done_reason: Char(250) [blank]`
- `next_follow_up_at: DateTime [null]` — si se fija, crea una `Task` (E12).
- `client_signature: FK(Evidence, null)` — firma del cliente (HU-10.4).
- `is_offline_created: Bool`, `device: FK(Device, null)`
- `edit_locked_at: DateTime [null]` — ver la regla de edición.

Índices: `(rtc, status, scheduled_start)`, `(client, completed_at)`, `(status, completed_at)`, `site`.

**Máquina de estados**

```
                 ┌───────────── cancelar (RTC/líder, con motivo) ────────────┐
                 │                                                           ▼
 crear ──▶ PROGRAMADA ──iniciar──▶ EN_CURSO ──cerrar (GPS)──▶ REALIZADA    CANCELADA
                 │                    │
                 │                    └──cerrar sin realizar──▶ NO_REALIZADA
                 └──cerrar (GPS) directo──▶ REALIZADA
 registro al vuelo (sin agendar) ──▶ EN_CURSO ──▶ …
```

- `iniciar` es opcional. Si se usa, también captura el GPS (`GpsCheck.kind = START`) como evidencia adicional.
- `cerrar` (REALIZADA) **exige** un intento de captura GPS (`GpsCheck.kind = CLOSE`). Si el permiso se niega o no hay señal satelital, la visita se cierra igual, pero con el estado de verificación correspondiente (§6 GpsCheck) y queda marcada para revisión.
- Las transiciones viven en `visits.services.transition_visit(visit, to, actor, payload)`, que valida la tabla de transiciones permitidas y genera `AuditLog` y un evento WebSocket.

**Regla de edición (HU-3.2):** el RTC puede editar notas, productos y fotos de una visita REALIZADA durante `visits.edit_window_hours` (por defecto 24 h) desde `completed_at`. Pasado ese tiempo, `edit_locked_at` se fija y solo un líder o gerencia puede editar, con justificación. **El GPS, `completed_at` y `result` no se editan nunca** después del cierre.

### VisitRecurrence ([C], HU-10.2)
- `client`, `site`, `rtc`, `reason`, `rrule: Char(250)` — RFC 5545, por ejemplo `FREQ=WEEKLY;INTERVAL=2;BYDAY=TU`.
- `starts_on: Date`, `ends_on: Date [null]`, `default_start_time: Time`, `duration_min: Int`, `is_active: Bool`
- Una tarea diaria de Beat materializa las visitas de los próximos `visits.recurrence_horizon_days` (por defecto 14) días.

### VisitProduct (K8, K9)
- `visit: FK(Visit, CASCADE)`, `product: FK(Product)`
- `kind: Choice(CONCRETADO, POTENCIAL)`
- `quantity: Decimal(12,3)`, `unit: (se copia del producto)`
- `unit_price: Decimal(16,2)`, `total_value: Decimal(16,2)` — calculado como `quantity × unit_price` en el servicio (no en el cliente).
- `horizon: Choice(CORTO, MEDIANO, LARGO) [null]` — obligatorio si `kind = POTENCIAL`.
- `expected_date: Date [null]` — obligatorio si `kind = POTENCIAL` (regla de cálculo en `docs/05` HU-3.3).
- `probability: SmallInt [0-100, null]` — por defecto según el horizonte (`forecast.default_probability.{CORTO|MEDIANO|LARGO}` = 70/40/20); el RTC la puede ajustar si `forecast.allow_rtc_probability = true`.
- `crop_type: FK(CropType, null)`, `target_area_ha: Decimal(10,2) [null]` — para el BI agrícola (HU-5.3).
- `opportunity_line: FK(OpportunityLine, null)` — vínculo con el embudo (E12).
- `status: Choice(ABIERTO, GANADO, PERDIDO, VENCIDO, REEMPLAZADO)` — solo para `POTENCIAL`; `VENCIDO` lo fija una tarea cuando `expected_date + forecast.grace_days` pasa sin venta; `REEMPLAZADO` cuando una visita posterior registra el mismo cliente y producto (HU-6.2).

### Evidence (archivo genérico)
- `kind: Choice(PHOTO, SIGNATURE, DOCUMENT, CONSENT)`
- `file: File (S3)`, `content_type`, `size_bytes`, `sha256`
- `width`, `height: Int [null]`, `thumbnail: File [null]` — generada en Celery (cola `sync`).
- `captured_at: DateTime [null]` — hora de captura en el dispositivo.
- `capture_location: Point [geography, null]` — si había fix GPS reciente (≤ 2 min) al tomar la foto.
- `visit: FK(Visit, null, CASCADE)`, `uploaded_by: FK(User)`
- `upload_status: Choice(PENDING, UPLOADED, PROCESSED, FAILED)`
- Se eliminan los metadatos EXIF sensibles después de extraer `captured_at` y la ubicación.

### GpsCheck (VerificacionGPS)
- `visit: FK(Visit, CASCADE)`, `kind: Choice(START, CLOSE)`
- `position: Point [geography, null]`, `accuracy_m: Float [null]`, `altitude_m: Float [null]`
- `captured_at: DateTime [null]` — reloj del dispositivo; `received_at: DateTime` — reloj del servidor.
- `capture_mode: Choice(ONLINE, OFFLINE)`
- `error: Choice(NONE, PERMISSION_DENIED, POSITION_UNAVAILABLE, TIMEOUT, UNSUPPORTED) [default NONE]`
- `reference_location: Point [geography, null]` — copia de `site.location` en el momento de la verificación (inmutable).
- `tolerance_m: PositiveInt` — copia de la tolerancia aplicada (inmutable).
- `distance_m: Float [null]` — `ST_Distance(position, reference_location)`.
- `status: Choice(VERIFICADA, FUERA_DE_RANGO, SIN_REFERENCIA, SIN_UBICACION, PRECISION_BAJA)`
- `flags: ArrayField(Choice(CLOCK_SKEW, STALE_FIX, ACCURACY_TOO_PERFECT, SAME_POINT_REPEATED, IMPOSSIBLE_SPEED)) [default []]` — señales de sospecha (`docs/04` §6.2); no cambian el estado.
- `review_status: Choice(NO_REQUERIDA, PENDIENTE, JUSTIFICADA, RECHAZADA)`
- `rtc_justification: Text [blank]`, `reviewed_by: FK(User, null)`, `reviewed_at: DateTime [null]`, `review_note: Text [blank]`

Inmutable una vez creado, salvo los campos de revisión. El algoritmo está en `docs/04` §6.

### WeeklyPlan (HU-3.5, K6)
- `rtc: FK(User)`, `iso_year: SmallInt`, `iso_week: SmallInt` — único por `(rtc, iso_year, iso_week)`.
- `status: Choice(BORRADOR, ENVIADA, APROBADA, DEVUELTA)`
- `submitted_at: DateTime [null]`, `deadline_at: DateTime` — calculado al crear, según `weekly_plan.deadline_*`.
- `is_late: Bool` — `submitted_at > deadline_at`.
- `reviewed_by: FK(User, null)`, `review_note: Text [blank]`

### WeeklyPlanItem
- `plan: FK(WeeklyPlan, CASCADE)`, `client: FK(Client)`, `site: FK(Site)`, `planned_date: Date`
- `slot: Choice(MANANA, TARDE, DIA) [default DIA]`, `reason: FK(VisitReason, null)`, `objective: Char(250) [blank]`
- `visit: OneToOne(Visit, null)` — al **aprobar** (o al enviar, si `weekly_plan.auto_approve = true`) se crea la visita PROGRAMADA.

## 7. pipeline ([F2])

### Stage
- `name: Char(60)`, `order: SmallInt`, `probability: SmallInt [0-100]`
- `kind: Choice(OPEN, WON, LOST)` — debe haber al menos una de cada tipo.
- `is_active: Bool`, `color: Char(7)`
- Siembra por defecto: Prospecto (10), Visita técnica (25), Prueba en campo (40), Cotización (60), Negociación (80), Ganada (100, WON), Perdida (0, LOST).

### Opportunity
- `client: FK(Client)`, `site: FK(Site, null)`, `owner: FK(User)`, `stage: FK(Stage)`
- `title: Char(160)`
- `amount: Decimal(16,2)` — suma de las líneas, mantenida por el servicio.
- `probability: SmallInt` — por defecto la de la etapa; editable si `pipeline.allow_probability_override`.
- `expected_close_date: Date`
- `priority_score: Float [null]` — "priorización sugerida" (§7.1), recalculada cada noche.
- `stage_changed_at: DateTime`, `last_activity_at: DateTime` — alimentan las alertas de estancamiento.
- `lost_reason: FK(LostReason, null)`, `won_at`, `lost_at: DateTime [null]`
- `source_visit: FK(Visit, null)`

### OpportunityLine
- `opportunity: FK(Opportunity, CASCADE)`, `product: FK(Product)`, `quantity`, `unit_price`, `total_value`

### OpportunityStageHistory
- `opportunity: FK(CASCADE)`, `from_stage`, `to_stage: FK(Stage)`, `changed_by: FK(User)`, `changed_at`, `trigger: Choice(MANUAL, AUTOMATION, VISIT)`

### LostReason
- `name: Char(80)` — Precio, Competencia, Sin presupuesto, Clima o cosecha, Otro.

### FollowUpRule
- `stage: FK(Stage)`, `days_after_entry: SmallInt`, `task_title_template: Char(160)` — admite `{cliente}` y `{producto}`.
- `channel_hint: Choice(VISITA, LLAMADA, WHATSAPP, CORREO)`
- `escalate_after_overdue_days: SmallInt [null]` — escala al líder (HU-12.4).
- `is_active: Bool`

### Task (seguimiento)
- `owner: FK(User)`, `client: FK(Client)`, `opportunity: FK(Opportunity, null)`, `visit: FK(Visit, null)`
- `title: Char(160)`, `due_at: DateTime`, `kind: Choice(VISITA, LLAMADA, WHATSAPP, CORREO, OTRO)`
- `status: Choice(PENDIENTE, HECHA, CANCELADA)`, `done_at: DateTime [null]`
- `source: Choice(MANUAL, RULE, VISIT_NEXT_STEP, AI)`, `rule: FK(FollowUpRule, null)`
- `escalated_at: DateTime [null]`, `escalated_to: FK(User, null)`

### 7.1 Puntaje de priorización (`pipeline/selectors.py::priority_score`)
`score = amount_norm × 0.4 + probability/100 × 0.3 + urgency × 0.2 + segment_weight × 0.1`
- `amount_norm` = monto ÷ percentil 95 de los montos abiertos del RTC (topado en 1).
- `urgency` = 1 si `expected_close_date` ≤ 7 días; 0,5 si ≤ 30 días; 0 en otro caso.
- `segment_weight` = A 1, B 0,6, C 0,3, sin segmento 0,5.
- Los pesos son configurables (`pipeline.priority_weights`).

**Relación visita ↔ embudo:** al cerrar una visita con líneas `POTENCIAL`, el servicio `pipeline.services.upsert_from_visit(visit)` busca una oportunidad abierta del mismo cliente con alguno de esos productos. Si existe, agrega o actualiza las líneas y registra actividad; si no, crea una oportunidad en la etapa `pipeline.default_stage_from_visit` (por defecto "Visita técnica"). Las líneas `CONCRETADO` con `result = PEDIDO_CONFIRMADO` mueven la oportunidad a la etapa WON si **todas** sus líneas quedaron concretadas. En F1 (sin embudo) no se ejecuta; el forecast sale directamente de `VisitProduct`.

## 8. goals

### Goal (K7)
- `user: FK(User)`, `period_type: Choice(MES, SEMANA)`, `period_start: Date`
- `sales_budget: Decimal(16,2)` — presupuesto en COP.
- `visits_target: PositiveInt` — meta de visitas del periodo (si el periodo es mensual, la semanal se deriva = meta ÷ semanas).
- `new_clients_target: PositiveInt [null]` ([C])
- Único por `(user, period_type, period_start)`. Se carga por Consola o por importación de Excel (HU-15.1).

### Cálculo del cumplimiento (`goals/selectors.py::compliance(user, date)`)
- `days_in_period` = días calendario del mes si `goals.daily_basis = CALENDAR` (por defecto, coherente con el ejemplo del kick-off: $30M ÷ 30 = $1M diario), o días hábiles de Colombia (con festivos, librería `holidays`) si `BUSINESS`.
- `meta_a_la_fecha` = `sales_budget × días_transcurridos ÷ days_in_period`.
- `ventas_a_la_fecha` = según `goals.sales_source`:
  - `ERP` (por defecto cuando E9 está activa): Σ `ErpSale.net_amount` del vendedor en el periodo;
  - `CONCRETADOS`: Σ `VisitProduct.total_value` con `kind = CONCRETADO` de visitas REALIZADAS en el periodo.
- `cumplimiento_ventas_%` = `ventas_a_la_fecha ÷ meta_a_la_fecha × 100`.
- `cumplimiento_visitas_%` = visitas REALIZADAS (sin contar `FUERA_DE_RANGO` RECHAZADAS) ÷ `visits_target` prorrateada a la fecha × 100.
- Semáforo: verde ≥ 90 %, amarillo ≥ 70 %, rojo < 70 % (`goals.traffic_light`).

### Achievement ([C], gamificación)
- `user: FK(User)`, `code: Char(40)` — por ejemplo `TOP_MES_VENTAS`, `100_VERIFICADAS`, `RACHA_4_SEMANAS_PROGRAMACION`.
- `period_start: Date [null]`, `awarded_at: DateTime`, `metadata: JSON`
- Las reglas de otorgamiento se definen como funciones en `goals/achievements.py`, registradas por código.

## 9. integrations (E9)

### ErpSyncRun
- `entity: Choice(CUSTOMERS, PRODUCTS, PRICES, INVENTORY, SALES)`, `started_at`, `finished_at`, `status: Choice(RUNNING, OK, PARTIAL, FAILED)`
- `cursor_in`, `cursor_out: Char(120) [null]` — marca incremental (fecha o id).
- `records_read`, `records_upserted`, `records_failed: Int`, `error: Text [blank]`

### ErpSale (venta real, de solo lectura)
- `erp_document: Char(60)`, `erp_line: Char(20)` — único por `(erp_document, erp_line)`.
- `date: Date`, `client: FK(Client, null)`, `erp_customer_code: Char(40)`, `seller: FK(User, null)`, `erp_seller_code: Char(40)`
- `product: FK(Product, null)`, `erp_product_code: Char(40)`, `quantity: Decimal`, `net_amount: Decimal(16,2)`
- `raw: JSONB` — el registro original, para depurar.

Índices: `(seller, date)`, `(client, date)`, `(product, date)`.

### RawWebhookEvent
Cuerpo crudo de cada webhook recibido, para procesar después del ACK (`docs/06` §2.2).
- `provider: Choice(WHATSAPP, SES)`, `payload: JSONB`, `headers: JSONB`, `received_at: DateTime [index]`, `processed_at: DateTime [null]`, `attempts: SmallInt`, `error: Text [blank]`
- Retención de 30 días.

### ErpUnmatched
Registros que no cruzaron (un cliente o producto sin vínculo) para resolverlos manualmente en la Consola (HU-9.3): `entity`, `erp_code`, `payload: JSONB`, `resolved_to_id: UUID [null]`, `resolved_by`, `resolved_at`.

## 10. messaging ([F2])

### WaTemplate
- `name: Char(512)`, `language: Char(10)='es_CO'`, `category: Choice(MARKETING, UTILITY, AUTHENTICATION)`
- `status: Choice(PENDING, APPROVED, REJECTED, PAUSED, DISABLED)` — se sincroniza desde Meta.
- `components: JSONB` — la estructura de Meta; `variables_example: JSONB`
- `purpose: Choice(FIRST_CONTACT, TECH_SHEET, FOLLOW_UP, OTP, OTHER)`

### Conversation
- `client: FK(Client)`, `contact: FK(Contact)`, `wa_id: Char(20) [index]` — número E.164 sin `+`.
- `assigned_to: FK(User)` — se deriva de `client.owner` y se actualiza al reasignar la cartera (HU-13.2). **La conversación pertenece al cliente, no al empleado.**
- `last_inbound_at: DateTime [null]` — define la ventana de 24 h.
- `last_message_at: DateTime`, `unread_count: Int`
- Único por `(wa_id)`: un número de cliente = una conversación con la empresa.

### Message
- `conversation: FK(CASCADE)`, `direction: Choice(IN, OUT)`
- `wamid: Char(128) [unique, null]` — id de Meta; garantiza la idempotencia de los webhooks.
- `type: Choice(TEXT, TEMPLATE, DOCUMENT, IMAGE, AUDIO, VIDEO, LOCATION, INTERACTIVE, REACTION, UNSUPPORTED)`
- `body: Text [blank]`, `template: FK(WaTemplate, null)`, `template_vars: JSONB [null]`
- `media: FK(Evidence, null)`, `tech_sheet: FK(TechSheet, null)`
- `status: Choice(QUEUED, SENT, DELIVERED, READ, FAILED)`, `error_code: Char(20) [blank]`, `error_detail: Text [blank]`
- `sent_by: FK(User, null)` — null si lo envió una automatización.
- `automation_run: FK(AutomationRun, null)`
- `sent_at`, `delivered_at`, `read_at: DateTime [null]`
- Índice de búsqueda: `GinIndex(SearchVector('body', config='spanish'))` para HU-13.4.

### EmailLog
- `to: Email`, `subject: Char(250)`, `template_code: Char(60)`, `ses_message_id: Char(120) [unique, null]`
- `status: Choice(QUEUED, SENT, DELIVERED, BOUNCED, COMPLAINED, FAILED)`, `client: FK(null)`, `automation_run: FK(null)`, `attachments: JSONB` — ids de `TechSheet` o `ExportJob`.

## 11. automation ([F2], HU-14.x)

### PostVisitRule
- `name`, `is_active: Bool`, `order: SmallInt`
- `trigger_results: ArrayField(Choice of Visit.result)` — en qué resultados se dispara.
- `requires_product_kinds: ArrayField(Choice(CONCRETADO, POTENCIAL))`
- `actions: JSONB` — lista ordenada, validada contra un esquema:
  `{"type": "send_tech_sheets", "channels": ["whatsapp","email"], "template": "ficha_tecnica_v1"}`,
  `{"type": "move_stage", "to_stage_id": "..."}`,
  `{"type": "create_task", "days": 3, "title": "Llamar a {cliente} para confirmar prueba"}`
- `delay_minutes: SmallInt [default 0]` — permite al RTC corregir la visita antes del envío.

### AutomationRun
- `rule: FK`, `visit: FK`, `status: Choice(PENDING, RUNNING, DONE, PARTIAL, FAILED, SKIPPED)`
- `idempotency_key: Char(120) [unique]` = `f"{rule.id}:{visit.id}"` — una regla corre una sola vez por visita.
- `log: JSONB` — el resultado de cada acción (lo enviado, a quién, qué versión de ficha). Esto es el "registro de lo enviado" del informe.

## 12. reports, notifications, audit, sync

### AIReport ([F2], HU-16.x)
- `scope: Choice(EMPRESA, ZONA, RTC)`, `zone: FK(null)`, `user: FK(null)`
- `period_start`, `period_end: Date`, `frequency: Choice(SEMANAL, MENSUAL, MANUAL)`
- `input_snapshot: JSONB` — las métricas agregadas que se enviaron al modelo (reproducibilidad).
- `output: JSONB` — salida estructurada (`docs/06` §5): `summary`, `risks[]`, `actions[]`, `stalled_opportunities[]`, `churn_risk_clients[]`.
- `model: Char(60)`, `prompt_version: Char(20)`, `tokens_in`, `tokens_out: Int`, `cost_usd: Decimal(10,4)`
- `status: Choice(PENDING, DONE, FAILED)`, `pdf: File [null]`, `sent_to: ArrayField(Email)`

Restricción: `UniqueConstraint(scope, zone, user, period_start, frequency, condition=~Q(frequency='MANUAL'))` — un informe programado no se genera dos veces.

### ForecastSnapshot (forecast congelado, HU-6.2 CA3)
- `date: Date` — día del congelamiento; `user: FK(User)`, `zone: FK(Zone)`, `product: FK(Product)`, `period_month: Date` — mes de `expected_date`.
- `source: Choice(VISITS, PIPELINE, BLENDED)`
- `optimistic`, `probable`, `committed: Decimal(16,2)`
- Único por `(date, user, product, period_month, source)`. Para comparar con lo real se usa el **último snapshot anterior al inicio del mes** pronosticado.

### ExportJob
- `kind: Choice(VISITS_XLSX, VISITS_PDF, CLIENTS_XLSX, FORECAST_XLSX, AUDIT_XLSX, …)`, `filters: JSONB`, `requested_by: FK(User)`
- `status: Choice(PENDING, DONE, FAILED)`, `file: File [null]`, `row_count: Int`, `expires_at: DateTime` (7 días)

### Notification
- `user: FK(User, CASCADE)`, `kind: Char(60)` — por ejemplo `visit.assigned`, `plan.reminder`, `gps.discrepancy`, `task.overdue`, `wa.inbound`, `location.request`.
- `title: Char(120)`, `body: Char(300)`, `link: Char(250)` — ruta interna, por ejemplo `/campo/visitas/<id>`.
- `read_at: DateTime [null]`, `channels_sent: ArrayField(Choice(INAPP, PUSH, EMAIL))`
- `NotificationPreference(user, kind, push: Bool, email: Bool)` — se crean valores por defecto por rol.

### PushSubscription
- `user: FK(CASCADE)`, `device: FK(Device, CASCADE)`, `endpoint: URL [unique]`, `p256dh`, `auth: Char`, `failure_count: SmallInt`, `disabled_at: DateTime [null]`

### AuditLog (no hereda de BaseModel; solo inserción)
- `id: BigAutoField`, `at: DateTime [index]`, `actor: FK(User, null)`, `actor_ip: GenericIP [null]`, `device: FK(Device, null)`
- `action: Char(60)` — `client.create`, `site.location_change`, `visit.transition`, `gps.review`, `user.deactivate`, `setting.update`, `export.download`…
- `entity_type: Char(60)`, `entity_id: UUID [index]`
- `before: JSONB [null]`, `after: JSONB [null]` — solo los campos que cambiaron.
- `request_id: Char(36)`
- Particionado mensual por `at` (con `pg_partman`, o con tablas creadas por una tarea de mantenimiento). Retención de `audit.retention_months` (por defecto 36).

### SyncMutation (idempotencia del modo sin conexión)
- `id: UUID [pk]` — **el `mutation_id` que genera el cliente.**
- `user: FK`, `device: FK`, `op: Char(60)` — por ejemplo `visit.close`.
- `entity_id: UUID`, `received_at`, `result: Choice(APPLIED, CONFLICT, REJECTED)`, `response: JSONB`
- Si llega un `mutation_id` repetido, se devuelve el `response` guardado sin volver a aplicar nada. Retención de 90 días.

## 13. parameters

### SystemSetting
- `key: Char(120) [unique]`, `value: JSONB`, `value_type: Choice(INT, DECIMAL, BOOL, STRING, JSON, DURATION)`
- `description: Char(300)`, `module: Char(40)`, `editable_by_role: ArrayField(Char)` — por defecto `["ADMIN"]`.
- `updated_by: FK(User, null)`
- Lectura con `get_setting(key)` y caché en Redis (`setting:<key>`, invalidada al guardar). **Se siembran todas las claves con su valor por defecto en una migración.** Un `get_setting` de una clave inexistente lanza `ImproperlyConfigured` (falla rápido en pruebas).

**Claves iniciales (valores por defecto)**

| Clave | Valor | Origen |
|---|---|---|
| `auth.session_idle_days` | 30 | K3 |
| `auth.access_token_minutes` | 15 | |
| `auth.otp_login_enabled` | true | Notion |
| `auth.local_lock_minutes` | 0 (desactivado) | HU-17.1 |
| `auth.mfa_required_roles` | `["GERENCIA","ADMIN"]` (si `feature.mfa`) | [C] |
| `gps.tolerance_m` | 1000 | K4 |
| `gps.max_accuracy_m` | 200 | Por encima de esto, `PRECISION_BAJA` |
| `gps.target_accuracy_m` | 50 | Objetivo del muestreo (`docs/04` §6) |
| `gps.sample_timeout_s` | 25 | |
| `gps.max_device_clock_skew_min` | 10 | Antifraude |
| `crm.portfolio_mode` | `OPEN` | K5 (`OPEN` o `ASSIGNED`) |
| `crm.portfolio_visibility` | `OWN` | `OWN` o `ZONE` |
| `crm.dedupe_radius_m` | 200 | |
| `visits.edit_window_hours` | 24 | |
| `visits.recurrence_horizon_days` | 14 | |
| `visits.max_photos` | 10 | HU-3.4 |
| `visits.signature_required_results` | `[]` | HU-10.4 |
| `weekly_plan.deadline_weekday` | 1 (lunes) | K6 — a confirmar (D2) |
| `weekly_plan.deadline_time` | `"12:00"` | |
| `weekly_plan.target_week_offset` | 1 (semana siguiente) | K6 — a confirmar (D2) |
| `weekly_plan.auto_approve` | true | |
| `weekly_plan.auto_require_rule` | `{"enabled": false, "below_pct": 70, "weeks": 2}` | HU-3.5 |
| `goals.daily_basis` | `CALENDAR` | K7 |
| `goals.sales_source` | `ERP` | K10 |
| `goals.traffic_light` | `{"green": 90, "yellow": 70}` | |
| `forecast.default_probability` | `{"CORTO": 70, "MEDIANO": 40, "LARGO": 20}` | |
| `forecast.horizon_max_days` | `{"CORTO": 7, "MEDIANO": 31, "LARGO": 90}` | K9 |
| `forecast.grace_days` | 15 | |
| `forecast.allow_rtc_probability` | false | |
| `pipeline.default_stage_from_visit` | id de "Visita técnica" | |
| `pipeline.stalled_days` | 21 | HU-16.4 |
| `alerts.inactive_rtc_days` | 3 | HU-17.5 |
| `erp.sync_cron.sales` | `"*/30 6-21 * * *"` | |
| `erp.owned_fields` | `{"client": ["legal_name","document_number"], "product": ["name","erp_code"]}` | HU-9.2 |
| `ai.model` | `"claude-sonnet-5-5"` | `docs/06` §5 |
| `ai.weekly_cron` | `"0 6 * * 1"` | Lunes a las 6:00 |
| `ai.monthly_budget_usd` | 30 | `docs/06` §5.3 |
| `privacy.consent_text` / `privacy.consent_version` | texto provisto por Natural Control (D6) | `docs/08` §5 |
| `feature.erp`, `feature.offline`, `feature.pipeline`, `feature.whatsapp`, `feature.automation`, `feature.ai_reports`, `feature.gamification`, `feature.mfa`, `feature.webauthn` | false en F1 | |

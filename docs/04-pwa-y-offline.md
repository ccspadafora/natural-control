# 04 · PWA y modo sin conexión

## 1. Por qué PWA y qué implica
La App Campo se distribuye como **Progressive Web App**: el RTC abre `https://<dominio>/campo`, la instala con "Agregar a pantalla de inicio" y queda como un ícono con pantalla completa, sin barra del navegador. Ventajas: no hay revisión de tiendas, las actualizaciones son inmediatas y comparte código con la web.

Limitaciones que **el equipo y el cliente deben conocer** (se comunican en la capacitación, HU-8.4):

| Capacidad | Android (Chrome) | iOS (Safari, instalada) | Qué hacemos |
|---|---|---|---|
| Instalación | Prompt nativo (`beforeinstallprompt`) | Manual: Compartir → "Agregar a inicio" | Pantalla guiada de instalación con detección de plataforma (HU-8.3) |
| GPS en primer plano | Sí | Sí | Es lo único que usamos |
| GPS en segundo plano | No | No | No se requiere: se captura en eventos (iniciar o cerrar visita, crear sede) |
| Cámara | `<input capture>` y `getUserMedia` | Igual | `<input type="file" accept="image/*" capture="environment">` como base |
| Web Push | Sí | **Solo si está instalada** (iOS 16.4+) y con permiso pedido tras un gesto del usuario | Se pide el permiso después del primer login, desde un botón |
| Background Sync API | Sí | **No** | La sincronización no depende de ella: se dispara al abrir, en `online`, en `visibilitychange` y cada 60 s con la app abierta |
| Almacenamiento | IndexedDB sin tope práctico (cuota del 60 % del disco) | IndexedDB, pero Safari puede **borrar datos** de sitios no usados en 7 días si **no** está instalada | Se exige la instalación; se llama a `navigator.storage.persist()`; los datos pendientes nunca son la única copia por más tiempo del necesario y la UI alerta si hay pendientes > 24 h |
| Detección de ubicación simulada (mock) | No disponible en web | No disponible | Mitigaciones en §6.4 y `docs/08` §4 |
| Biometría | WebAuthn (huella o rostro) | WebAuthn (Face ID o Touch ID) | HU-17.1 |

**Versión mínima soportada:** Android 10 con Chrome ≥ 120; iOS 16.4 con Safari. Por debajo se muestra una pantalla de "dispositivo no compatible".

## 2. Manifest y Service Worker

`apps/campo/public/manifest.webmanifest`:
```json
{
  "name": "Natural Control · Campo",
  "short_name": "NC Campo",
  "id": "/campo/",
  "start_url": "/campo/?source=pwa",
  "scope": "/campo/",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#FFFFFF",
  "theme_color": "<color de marca>",
  "lang": "es-CO",
  "icons": [ {192, 512, maskable 512}, … ],
  "shortcuts": [
    {"name": "Registrar visita", "url": "/campo/visitas/nueva"},
    {"name": "Nuevo cliente", "url": "/campo/clientes/nuevo"}
  ]
}
```
Además, para iOS: `apple-touch-icon` y `apple-mobile-web-app-status-bar-style`, y pantallas de inicio (`apple-touch-startup-image`) en los tamaños de iPhone vigentes.

**Service Worker** (`src/sw.ts`, Workbox con `injectManifest`):
- **Precache** del app shell (HTML, JS, CSS, fuentes, íconos) con revisión por hash.
- **Navegación:** `NavigationRoute` → `index.html` desde la caché (SPA offline).
- **API:** el SW **no** cachea la API. El dato offline vive en IndexedDB (Dexie), administrado por la app. Esto evita servir respuestas viejas con permisos de otro usuario.
- **Teselas del mapa:** `CacheFirst` con `ExpirationPlugin` (máx. 2.000 teselas, 30 días). Botón "Descargar mapa de mi zona" que precarga las teselas de los niveles 8 a 14 del bbox de la zona (con un tope de 150 MB y advertencia de datos móviles).
- **Fotos de fichas técnicas e imágenes de producto:** `StaleWhileRevalidate`.
- **Push:** maneja `push` (muestra la notificación con `data.link`) y `notificationclick` (enfoca o abre la ventana en el link).
- **Actualización:** `registerType: 'prompt'`. Cuando hay una versión nueva, la app muestra "Hay una actualización" y aplica `skipWaiting` al aceptar. **Nunca se actualiza en medio de un formulario**: si hay un borrador abierto, el aviso espera.
- Si el backend responde `426 client.version_unsupported` (la versión del cliente va en la cabecera `X-Client-Version`), la app fuerza la actualización.

## 3. Almacenamiento local (Dexie)

```ts
db.version(1).stores({
  // caché de datos (espejo de lo que el servidor permite ver)
  clients:        'id, owner_id, updated_at, *search_tokens',
  sites:          'id, client_id, updated_at',
  contacts:       'id, client_id',
  crops:          'id, site_id',
  biotechs:       'id, client_id',
  visits:         'id, status, scheduled_start, client_id, updated_at',
  visit_products: 'id, visit_id',
  products:       'id, category_id, *search_tokens',
  catalogs:       'key',                 // tipos, motivos, cultivos, municipios, settings
  tasks:          'id, due_at, status',
  opportunities:  'id, stage_id, client_id',
  weekly_plans:   'id, [iso_year+iso_week]',
  goals:          'id, period_start',
  // operación offline
  outbox:         '++seq, mutation_id, op, entity_id, status, created_at',
  blobs:          'id, evidence_id, status',  // fotos y firmas pendientes de subir
  meta:           'key'                  // cursor de sync, device_id, last_sync_at, user_id
});
```
- La base local pertenece a un solo usuario (`meta.user_id`): al cerrar sesión se **borra completa** (`db.delete()`), incluidas las teselas privadas. Si hay mutaciones pendientes, el cierre de sesión pide confirmación ("Tienes 3 registros sin sincronizar") y ofrece sincronizar primero.
- `search_tokens`: nombre, nombre comercial, documento y municipio normalizados (sin tildes y en minúsculas), para buscar sin conexión.

## 4. Protocolo de sincronización

### 4.1 Lectura
1. **Bootstrap** (`GET /sync/bootstrap`) en el primer login del dispositivo, o si el cursor tiene más de 30 días.
2. **Pull incremental** (`GET /sync/pull?cursor=`) en cada disparo de sync (§4.4), en un bucle mientras `has_more`.
3. Los cambios se aplican con `bulkPut`; los `deleted` con `bulkDelete`. Si un registro local tiene mutaciones pendientes, **no se sobrescribe** con la versión del servidor hasta resolver el push (ver §4.3).

### 4.2 Escritura (outbox)
Toda escritura en Campo, con o sin conexión, sigue el mismo camino. **No hay dos implementaciones.**
1. La UI llama a `mutate(op, entityId, payload)`.
2. Se aplica **optimistamente** en la tabla local y se inserta en `outbox` con `mutation_id = uuidv7()`, `base_version` (versión local conocida) y `status = PENDING`.
3. El *sync engine* toma los PENDING en orden de `seq` y los envía en lotes de hasta 50 a `POST /sync/push`.
4. Por resultado: `APPLIED` → se borra del outbox y se reemplaza la entidad local por la del servidor. `CONFLICT` → §4.3. `REJECTED` (validación o permiso) → queda en `outbox` con `status = REJECTED` y se muestra en la pantalla "Pendientes" para que el RTC corrija o descarte.
5. Errores de red o 5xx → reintento con *backoff* exponencial (5 s, 15 s, 45 s, 2 min, 5 min, y luego cada 5 min).
6. **Orden y dependencias:** una mutación que referencia una entidad creada offline (por ejemplo, `visit.create` sobre un `client.create` pendiente) se envía en el mismo lote o después; el servidor aplica en orden. Si la creación padre fue REJECTED, las hijas quedan bloqueadas (`BLOCKED`) y se muestran juntas.

### 4.3 Conflictos
Los conflictos son raros porque cada RTC es dueño de sus datos. Política:

| Entidad | Regla |
|---|---|
| `Visit` cerrada | **Gana el servidor** en estado, GPS y `completed_at` (son inmutables). Si llega un `visit.close` sobre una visita ya cerrada por otra vía, el resultado es `APPLIED` idempotente si es el mismo `mutation_id`, o `CONFLICT` si es otro; en ese caso se descarta el local y se avisa |
| `Visit` cancelada por el líder mientras el RTC la cerraba offline | **Gana el cierre del RTC** si `completed_at < cancelada_at`, porque la visita ocurrió; si no, `CONFLICT` y queda para el líder. Se notifica a ambos |
| `Client`, `Site`, `Contact` (campos simples) | Fusión por campo: si `base_version` < versión actual, el servidor aplica solo los campos del payload que **no** cambiaron en el servidor desde `base_version` (usa `AuditLog.before/after`); los que chocan → `CONFLICT` con ambos valores y la UI le pide al RTC elegir |
| `Site.location` | Siempre pasa por la regla antifraude (`docs/02` §4); si está bloqueada → `REJECTED` con sugerencia de crear una `LocationChangeRequest` |
| `Opportunity.move` | Gana la última escritura por `client_ts`, con historial completo en `OpportunityStageHistory` |

### 4.4 Disparadores de sync
- Al abrir la app y al volver a primer plano (`visibilitychange` → `visible`).
- Evento `online`.
- Cada 60 s mientras la app esté abierta y haya conexión, si hay pendientes; cada 5 min si no hay.
- Después de cada mutación (con *debounce* de 2 s).
- Manualmente: botón "Sincronizar ahora".
- En Android, además, `sync` del Background Sync API registrado por el SW (`tag: 'outbox'`) como mejora progresiva.

### 4.5 Fotos y archivos
1. Al capturar: se comprime en el cliente (`browser-image-compression`: lado mayor 1.920 px, JPEG con calidad 0,8, ~300–600 KB) y se guarda el blob en `blobs` con un `evidence_id` (uuid del cliente). La visita referencia ese id de inmediato.
2. En el sync, **después** de que la mutación de la entidad padre queda `APPLIED`: `POST /visits/{id}/evidence/presign` → subida directa a S3 → `POST /evidence/{id}/confirm`.
3. Las fotos se suben solo con Wi-Fi o datos según la preferencia del RTC (`Ajustes → Subir fotos con datos móviles`, activado por defecto). Si una foto lleva más de 24 h pendiente, se muestra una alerta.

### 4.6 Indicadores en la UI (HU-10.1)
- Banda superior persistente: "Sin conexión · 3 pendientes" (ámbar) o "Sincronizando…" o nada si todo está al día.
- Cada registro pendiente muestra un ícono de nube tachada.
- Pantalla "Pendientes": lista del outbox con estado (pendiente, error con el motivo, bloqueado) y acciones de reintentar, editar o descartar.
- En el perfil: "Última sincronización: hace 4 min" (`meta.last_sync_at`, que también se reporta al servidor como `User.last_sync_at`).

## 5. Rutas y pantallas de la App Campo

| Ruta | Pantalla | HU |
|---|---|---|
| `/campo/login`, `/campo/login/codigo`, `/campo/recuperar` | Login con contraseña o con código OTP | 1.1, 1.4 |
| `/campo/instalar` | Guía de instalación (Android o iOS) y permisos (ubicación, notificaciones, cámara) | 8.3 |
| `/campo/` | **Hoy**: visitas del día (pendientes y realizadas), tareas del día, mi cumplimiento (semáforo), aviso de programación semanal | 2.1, 6.3, 3.5, 12.5 |
| `/campo/agenda` | Pestañas Hoy, Pendientes, Realizadas; selector de fecha | 2.1 |
| `/campo/clientes` | Cartera: búsqueda, filtros (zona, tipo, segmento, nuevos), cercanos a mí (orden por distancia si hay fix GPS) | 2.2 |
| `/campo/clientes/nuevo` | Asistente de 4 pasos: datos → sede y ubicación (mapa) → contacto y autorización de datos → cultivos y biotecnologías en uso | 2.3, 11.1 |
| `/campo/clientes/:id` | Ficha: datos, sedes (mapa), contactos (llamar o WhatsApp), cultivos, biotecnologías, historial, oportunidades | 2.4 |
| `/campo/visitas/nueva?cliente=` | Agendar (fecha, hora, sede, motivo) o "Registrar ahora" | 3.1 |
| `/campo/visitas/:id` | Detalle; botones Iniciar y Cerrar | 3.2 |
| `/campo/visitas/:id/cerrar` | Formulario de cierre: contacto, resultado, productos (concretados y potenciales), biotecnologías en uso, notas, acuerdos, fotos, firma, próximo seguimiento → captura GPS → resultado de la verificación | 3.2–3.4, 4.1, 4.2, 10.4 |
| `/campo/programacion` | Mi programación semanal (si `requires_weekly_plan`) | 3.5 |
| `/campo/embudo` | Mis oportunidades por etapa (lista agrupada; mover con selector) | 12.1 |
| `/campo/tareas` | Tareas de hoy y vencidas | 12.5 |
| `/campo/mensajes`, `/campo/mensajes/:id` | WhatsApp de mis clientes | 13.x |
| `/campo/numeros` | "Mis números del mes": ventas frente a presupuesto, visitas frente a meta, ranking, logros | 6.3, 15.x |
| `/campo/catalogo`, `/campo/catalogo/:id` | Catálogo y fichas (disponibles sin conexión) | 11.x |
| `/campo/pendientes` | Outbox | 10.1 |
| `/campo/perfil` | Datos, dispositivo, última sync, biometría, preferencias de notificación, cerrar sesión | 1.3, 17.1 |

**Diseño de interacción en campo:** objetivos táctiles ≥ 48 px, alto contraste (uso a pleno sol), formularios en pasos cortos con el progreso guardado como borrador local en cada campo (si la app se cierra, el borrador sobrevive), teclado numérico para cantidades y teléfonos, y ninguna acción crítica detrás de gestos (deslizar).

## 6. Captura y verificación GPS

### 6.1 Captura en el dispositivo (`packages/domain/gps.ts`)
```ts
captureBestFix({ targetAccuracyM = 50, timeoutS = 25 }): Promise<GpsPayload>
```
1. Verifica el permiso (`navigator.permissions.query({name:'geolocation'})`). Si está `denied`, devuelve `error: PERMISSION_DENIED` y muestra cómo habilitarlo (instrucciones por plataforma).
2. `watchPosition({ enableHighAccuracy: true, maximumAge: 0, timeout: timeoutS*1000 })`.
3. Guarda las muestras; termina cuando una tiene `accuracy ≤ targetAccuracyM` o al vencer `timeoutS`.
4. Devuelve **la muestra con mejor precisión** (no el promedio, para no mezclar puntos lejanos), con `captured_at = new Date(sample.timestamp)`, `samples = n` y `capture_mode` según `navigator.onLine`.
5. UI: "Ubicando… precisión 35 m" con un indicador que se actualiza y un botón "Usar esta ubicación" que se habilita cuando la precisión es ≤ `gps.max_accuracy_m`.

El GPS satelital funciona sin datos móviles. La captura **no depende de la conexión**: solo el mapa de fondo lo hace.

### 6.2 Verificación en el servidor (`visits/services.py::verify_gps`)
```
reference = site.location
tolerance = site.client.zone.gps_tolerance_m or get_setting("gps.tolerance_m")

si payload.error != NONE             → status = SIN_UBICACION,  review = PENDIENTE
si reference is NULL                  → status = SIN_REFERENCIA, review = NO_REQUERIDA
                                        (y si la sede no tiene ubicación, se fija con esta captura
                                         cuando accuracy ≤ gps.max_accuracy_m — queda en AuditLog)
distance = ST_Distance(position::geography, reference::geography)   -- en la BD
si accuracy_m > gps.max_accuracy_m    → status = PRECISION_BAJA,  review = PENDIENTE
si distance <= tolerance              → status = VERIFICADA,      review = NO_REQUERIDA
si no                                 → status = FUERA_DE_RANGO,  review = PENDIENTE
```
Señales de sospecha (se guardan en `GpsCheck.flags`) que **no cambian el estado** pero se muestran al revisor:
- `CLOCK_SKEW`: con `capture_mode = ONLINE`, `|received_at − captured_at| > gps.max_device_clock_skew_min`.
- `STALE_FIX`: `captured_at` anterior a `started_at` o a la apertura del formulario.
- `ACCURACY_TOO_PERFECT`: `accuracy_m < 3` (típico de las apps de ubicación falsa).
- `SAME_POINT_REPEATED`: la misma posición (< 5 m) en visitas a clientes distintos (> 2 km entre sedes) el mismo día.
- `IMPOSSIBLE_SPEED`: velocidad implícita > 120 km/h entre dos cierres consecutivos del mismo RTC.

### 6.3 Vista previa sin conexión
Sin conexión, la app calcula la distancia **localmente** (haversine) contra la sede en caché y muestra "Verificación preliminar: a 320 m del cliente (dentro del rango)". Al sincronizar, el estado oficial lo fija el servidor y puede diferir (por ejemplo, si la tolerancia cambió). La UI lo etiqueta claramente como preliminar.

### 6.4 Lo que una PWA no puede impedir
Un navegador no expone si la ubicación es simulada. La defensa combina: señales de sospecha (§6.2), evidencias fotográficas con ubicación EXIF cuando existe, bloqueo de la ubicación de la sede tras la primera visita verificada (`docs/02` §4), revisión humana de las discrepancias y reportes de patrones por RTC. Esto se le explica al cliente de manera explícita (decisión abierta D5 en `docs/10`).

## 7. Portal del vendedor (`apps/web`, rutas `/portal/*`)
Mismo usuario RTC, en computador. **Se conecta online** (sin outbox) y reutiliza los componentes de escritorio.
- `/portal` — tablero personal: cumplimiento, forecast propio, tareas, oportunidades por cerrar.
- `/portal/clientes` — tabla con filtros, edición en lote de campos simples, importación de contactos.
- `/portal/agenda` — calendario semanal y mensual con arrastrar para reprogramar.
- `/portal/programacion` — armar la programación semanal con un mapa de mis clientes y la lista lado a lado.
- `/portal/embudo` — Kanban completo.
- `/portal/mensajes` — inbox de WhatsApp de dos paneles.
- `/portal/numeros` — mis métricas y ranking.

## 8. Consola (`apps/web`, rutas `/consola/*`)
- `/consola` — tablero: visitas hoy (en vivo), % verificadas, discrepancias pendientes, forecast del mes frente al presupuesto, RTC sin actividad.
- `/consola/visitas` — consolidado (HU-5.1) con exportación.
- `/consola/geo` — mapa de visitas verificadas y fuera de rango, y cola de revisión (HU-4.3).
- `/consola/planeacion` — calendario y mapa por zona, asignación, recurrencias y programaciones semanales (HU-7.3, 10.2, 3.5).
- `/consola/clientes`, `/consola/clientes/:id`, `/consola/solicitudes-ubicacion`.
- `/consola/embudo`, `/consola/tareas`.
- `/consola/estadisticas`, `/consola/agro`, `/consola/forecast`, `/consola/metas`, `/consola/ranking`.
- `/consola/mensajes` (supervisión de WhatsApp).
- `/consola/informes-ia`.
- `/consola/admin/*` — usuarios, roles y permisos, zonas y equipos, catálogo, listas de precios, etapas y reglas, plantillas WA y correo, automatizaciones, parámetros, integraciones (ERP), auditoría, supervisión (health).

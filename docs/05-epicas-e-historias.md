# 05 · Épicas e historias de usuario

Formato de cada HU: **historia** · fase · superficies · criterios de aceptación (CA) verificables por prueba. Las épicas E1–E9 conservan la numeración del contrato de la Fase 1; las E10–E17 son el alcance ampliado.

Etiquetas: **[F1]** contratada · **[F2]** Fase 2 de la propuesta · **[C]** alcance completo. Superficies: **C** = App Campo, **P** = Portal, **K** = Consola, **B** = Backend.

| Épica | Fase | HU |
|---|---|---|
| E1 Acceso, seguridad y roles | F1 | 1.1–1.4 |
| E2 App del comercial: agenda y cartera | F1 | 2.1–2.4 |
| E3 Agendamiento y registro de visitas | F1 | 3.1–3.5 |
| E4 Verificación de visita con GPS | F1 | 4.1–4.3 |
| E5 Panel de gerencia: registros consolidados | F1 | 5.1–5.3 |
| E6 Estadísticas, forecast y cumplimiento | F1 | 6.1–6.3 |
| E7 Usuarios, cartera y asignación de visitas | F1 | 7.1–7.3 |
| E8 Infraestructura, sincronización y entrega | F1 | 8.1–8.4 |
| E9 Integración con el ERP | F1 (9.1) / C | 9.1–9.3 |
| E10 Campo sin conexión y planeación avanzada | C | 10.1–10.5 |
| E11 Datos maestros y catálogo | F2 / C | 11.1–11.4 |
| E12 Embudo, seguimientos y forecast ampliado | F2 | 12.1–12.6 |
| E13 WhatsApp integrado | F2 | 13.1–13.4 |
| E14 Automatización posterior a la visita | F2 | 14.1–14.2 |
| E15 Metas, ranking y gamificación | C | 15.1–15.2 |
| E16 Inteligencia de negocio e informes con IA | F2 | 16.1–16.4 |
| E17 Administración, seguridad avanzada y supervisión | C | 17.1–17.7 |

---

## E1 · Acceso, seguridad y roles [F1]

### HU-1.1 · Inicio de sesión y recuperación de contraseña · C P K B
*Como usuario, quiero entrar con mi correo o usuario y mi contraseña, y recuperarla si la olvido.*
- CA1: con credenciales válidas, `POST /auth/login` devuelve `access` y fija la cookie `nc_refresh`; la app redirige según el rol: RTC → `/campo` en móvil o `/portal` en escritorio; los demás → `/consola`.
- CA2: con credenciales inválidas responde 401 `auth.invalid_credentials` con un mensaje genérico ("Usuario o contraseña incorrectos"), sin revelar cuál de los dos falló.
- CA3: tras 5 intentos fallidos en 15 min, la cuenta se bloquea 15 min (`auth.locked`) y se notifica al usuario por correo.
- CA4: la recuperación envía un código de 6 dígitos al correo (vigencia de 10 min, 5 intentos); al usarlo se exige una contraseña nueva válida y se revocan todos los dispositivos.
- CA5: las contraseñas se guardan con Argon2; ningún log contiene contraseñas, códigos ni tokens (prueba que inspecciona los logs capturados).
- CA6: un usuario desactivado no puede entrar (`auth.inactive`).

### HU-1.2 · Roles y permisos · B K
*Como administrador, quiero que cada rol vea solo sus módulos y datos.*
- CA1: existen los roles sembrados `RTC`, `LIDER_ZONA`, `GERENCIA`, `ADMIN` y `ADMIN_PRODUCTO` con la matriz de `docs/08` §2.2.
- CA2: `GET /auth/me` devuelve la lista de permisos efectivos y la UI oculta los módulos sin permiso.
- CA3: **suite de permisos**: para cada endpoint de `docs/03` existe una prueba parametrizada por rol que verifica 200/403 y que un RTC recibe 404 al pedir un recurso de otro RTC.
- CA4: un RTC lista solo sus clientes, visitas, oportunidades, tareas y conversaciones (alcance OWN).

### HU-1.3 · Sesión persistente y cierre seguro · C P K B
*Como RTC, quiero que la app recuerde mi sesión para no tener que entrar cada vez en la calle.*
- CA1: la sesión sigue activa mientras no pasen **30 días sin uso** (K3, `auth.session_idle_days`); cada uso renueva el plazo.
- CA2: el access expira a los 15 min y se renueva solo y de forma transparente; un 401 durante una petición dispara un único refresh y reintenta (sin carreras: un *mutex* en el cliente).
- CA3: "Cerrar sesión" revoca el refresh del dispositivo, borra IndexedDB y caches privadas y vuelve al login. Si hay pendientes de sincronizar, pide confirmación (`docs/04` §3).
- CA4: la sesión sin conexión sigue funcionando: la app no exige un refresh para operar offline; si el refresh vence offline, al reconectar se pide login y **las mutaciones pendientes se conservan** y se envían después del nuevo login del mismo usuario (si entra otro usuario, se descartan con una advertencia explícita).

### HU-1.4 · Acceso con código (OTP) · C P B
*Como RTC, quiero entrar con un código que me llega al correo, para no depender de recordar la contraseña.*
- CA1: con `auth.otp_login_enabled`, la pantalla de login ofrece "Entrar con código"; `POST /auth/otp/request` envía 6 dígitos al correo (con WhatsApp como canal adicional cuando `feature.whatsapp`).
- CA2: el código vence en 10 min, admite 5 intentos y es de un solo uso; se limitan las solicitudes (3 cada 15 min).
- CA3: la respuesta del *request* es idéntica exista o no la cuenta.

## E2 · App del comercial: agenda y cartera [F1]

### HU-2.1 · Agenda de visitas · C P
- CA1: la pantalla Hoy y las pestañas Hoy, Pendientes y Realizadas listan las visitas del RTC con cliente, sede, municipio, hora y estado; se ordenan por `scheduled_start` (las que no tienen hora van al final) y por estado.
- CA2: "Pendientes" = PROGRAMADA o EN_CURSO con fecha ≤ hoy; las vencidas (fecha < hoy) llevan la etiqueta "Atrasada".
- CA3: tocar una visita abre su detalle, y desde ahí la ficha del cliente con un toque.
- CA4: las visitas asignadas por un líder o gerencia aparecen **en vivo** si la app está abierta (WS) o en el siguiente sync, con una notificación push "Nueva visita asignada".
- CA5: la agenda carga desde IndexedDB en < 1 s con 300 visitas.

### HU-2.2 · Cartera de clientes · C P
- CA1: lista paginada virtualmente con los clientes en alcance (con K5, los propios).
- CA2: búsqueda por nombre, nombre comercial, documento o municipio, tolerante a tildes, que funciona sin conexión.
- CA3: filtros por zona, tipo de cliente, segmento y estado comercial; insignia "Nuevo" si se creó hace ≤ 7 días.
- CA4: orden "Cerca de mí" disponible cuando hay un fix GPS reciente (≤ 5 min).
- CA5: cada fila muestra el nombre, el municipio, la última visita ("hace 12 días") y un acceso para llamar.

### HU-2.3 · Registro de cliente nuevo con geolocalización · C P B
- CA1: asistente de 4 pasos (`docs/04` §5). Obligatorios: tipo de persona, razón social o nombre, tipo de cliente, municipio y **una sede con ubicación**.
- CA2: la ubicación se fija con "Usar mi ubicación actual" (precisión mostrada) o arrastrando el pin en el mapa; se guardan `location_source` y la precisión.
- CA3: antes de crear se llama a `duplicates-check` (si no hay conexión, se hace contra la caché local y se repite en el servidor al sincronizar). Un documento duplicado bloquea; las advertencias exigen confirmar "Es otro cliente".
- CA4: se capturan los cultivos (tipo y área en ha) y las **biotecnologías que ya usa** (K8): producto propio o de la competencia, con marca.
- CA5: autorización de tratamiento de datos: casilla obligatoria para registrar contactos, con el texto vigente y una evidencia opcional (foto o firma); se guarda `data_consent_at`.
- CA6: el cliente aparece de inmediato en la cartera (optimista) y en la Consola en vivo tras la sincronización (`client.created`).
- CA7: la creación completa es **una sola mutación** (`client.create` con anidados) y es atómica en el servidor.

### HU-2.4 · Ficha e historial del cliente · C P K
- CA1: muestra los datos, las sedes en un mapa, los contactos (con botones de llamar, WhatsApp y correo), los cultivos vigentes con el área total, las biotecnologías en uso (propias y de la competencia), las oportunidades abiertas y la línea de tiempo (`/clients/{id}/timeline`).
- CA2: botones "Agendar visita" y "Registrar visita ahora".
- CA3: disponible sin conexión con lo que está en caché (el historial, hasta las últimas 20 visitas).

## E3 · Agendamiento y registro de visitas [F1]

### HU-3.1 · Agendamiento · C P K B
- CA1: se elige el cliente, la sede (por defecto la primaria), la fecha, la hora de inicio y la duración (por defecto 60 min) y el motivo. Queda PROGRAMADA.
- CA2: se advierte (sin bloquear) si se cruza con otra visita del mismo RTC.
- CA3: notifica en vivo a gerencia y al líder (`visit.created`).
- CA4: se puede reprogramar o cancelar con motivo; todo queda en `AuditLog`.

### HU-3.2 · Ejecución y registro de la visita · C B
- CA1: desde una visita PROGRAMADA: "Iniciar" (opcional, captura el GPS de inicio) y "Cerrar visita". Desde la cartera: "Registrar ahora" crea la visita EN_CURSO al vuelo.
- CA2: formulario de cierre: persona atendida (contacto existente o texto libre), **resultado** (pedido confirmado, cotización solicitada, seguimiento programado, sin interés u otro), notas y acuerdos. La fecha y la hora se toman automáticamente del dispositivo.
- CA3: el cierre ejecuta la captura GPS (HU-4.1) y queda REALIZADA; se refleja en vivo en la Consola.
- CA4: también se puede cerrar como NO_REALIZADA (con motivo: cliente ausente, clima, vía cerrada u otro); en ese caso también se captura el GPS.
- CA5: regla de edición: 24 h para el RTC (`visits.edit_window_hours`); después solo un líder o gerencia, con justificación. El GPS, la hora y el resultado no se pueden editar.
- CA6: el formulario guarda un borrador local en cada cambio; si la app se cierra, se recupera al volver.

### HU-3.3 · Productos de interés, cantidades y horizonte · C B
- CA1: se agregan una o varias líneas: producto (buscador del catálogo), **tipo** (Concretado = pedido de la visita, o Potencial), cantidad y precio unitario (precargado con la lista de precios del cliente, vigente, y editable). El total lo calcula el servidor.
- CA2: si es Potencial, el **horizonte** es obligatorio: Corto (esta semana), Mediano (este mes) o Largo (hasta 3 meses). `expected_date` se propone así: Corto → domingo de la semana ISO actual; Mediano → último día del mes actual; Largo → el RTC elige un mes entre el siguiente y el tercero, y se toma el último día de ese mes. Se valida que `expected_date − hoy ≤ forecast.horizon_max_days[horizonte]`.
- CA3: opcionalmente, el cultivo objetivo y el área objetivo (ha) por línea, para el BI (HU-5.3).
- CA4: en la misma pantalla se actualizan las biotecnologías que el cliente ya usa (K8).
- CA5: las líneas son editables mientras la visita sea editable; alimentan el forecast de inmediato (HU-6.2).
- CA6: resultado "Pedido confirmado" exige ≥ 1 línea Concretada.

### HU-3.4 · Fotos y evidencia · C K B
- CA1: hasta `visits.max_photos` (por defecto 10) fotos por visita, desde la cámara o la galería; compresión en el cliente (`docs/04` §4.5).
- CA2: funcionan sin conexión: se ven de inmediato en la visita y se suben luego.
- CA3: en la Consola se ven las miniaturas y, al tocar, la foto completa con la fecha y hora de captura y la ubicación (si la había).
- CA4: el servidor elimina el EXIF tras extraer la fecha y la ubicación; las URLs de S3 son prefirmadas (5 min).

### HU-3.5 · Programación semanal obligatoria · C P K B (kick-off K6)
*Como gerencia, quiero exigir a los RTC con bajo cumplimiento que envíen su programación de visitas, con recordatorios y visibilidad de quién no la envió.*
- CA1: un líder o gerencia activa o desactiva la exigencia por RTC (`PUT /users/{id}/weekly-plan-requirement`), con motivo. Opcionalmente, una regla automática la activa si el cumplimiento de visitas o ventas es < `below_pct` durante `weeks` semanas seguidas (`weekly_plan.auto_require_rule`).
- CA2: el RTC con la exigencia ve un aviso persistente en Hoy y la pantalla "Programación"; arma los ítems (cliente, sede, fecha, franja, motivo y objetivo) y la envía.
- CA3: el plazo se calcula con `weekly_plan.deadline_weekday`, `deadline_time` y `target_week_offset` (por defecto: lunes 12:00 para la semana siguiente; **a confirmar, D2**). Recordatorios push e in-app 24 h y 2 h antes del plazo; al vencer sin envío, notificación al RTC y a su líder o gerencia.
- CA4: al enviar (y aprobar, si `auto_approve = false`) se crean las visitas PROGRAMADAS con `origin = PROGRAMACION`.
- CA5: la Consola muestra por semana: RTC obligados, enviadas a tiempo, enviadas tarde y faltantes, y el cumplimiento de lo programado frente a lo realizado.

## E4 · Verificación de visita con GPS [F1]

### HU-4.1 · Captura de ubicación al cerrar · C B
- CA1: al cerrar, la app pide el permiso (si hace falta) con una explicación previa ("Para verificar la visita necesitamos tu ubicación en este momento").
- CA2: captura según `docs/04` §6.1; se guardan la posición, la precisión, la altitud, la hora de captura y el modo (online u offline).
- CA3: sin permiso o sin fix, la visita igual se cierra con el estado `SIN_UBICACION` y queda pendiente de revisión; el RTC puede escribir una justificación.
- CA4: funciona en modo avión (prueba E2E con la geolocalización emulada y la red cortada).

### HU-4.2 · Comparación contra la ubicación del cliente · B C K
- CA1: el servidor calcula la distancia con PostGIS y fija el estado según `docs/04` §6.2; la tolerancia por defecto es 1.000 m (K4) y se puede sobreescribir por zona.
- CA2: la app muestra el resultado: "Verificada · a 85 m" (verde) o "Discrepancia · a 2,3 km" (rojo), con la opción de justificar.
- CA3: la tolerancia y la referencia aplicadas se guardan en el `GpsCheck` (cambiar el parámetro después **no** altera las verificaciones pasadas).
- CA4: pruebas unitarias con pares de coordenadas conocidas: 0 m, 999 m, 1.001 m, sede sin ubicación, precisión de 250 m.

### HU-4.3 · Reporte de visitas fuera de rango · K
- CA1: `/consola/geo` lista los `GpsCheck` con estado ≠ VERIFICADA, con filtros por RTC, zona, periodo, estado y estado de revisión.
- CA2: el mapa muestra el punto real (rojo) y el esperado (verde) unidos por una línea con la distancia; si hay inicio y cierre, muestra ambos.
- CA3: el revisor marca JUSTIFICADA o RECHAZADA con una nota; las rechazadas **no cuentan** para el cumplimiento de visitas.
- CA4: se ven las señales de sospecha (`flags`) de cada caso.
- CA5: hay un indicador en cada registro del consolidado (HU-5.1) y un contador de pendientes en el menú.

## E5 · Panel de gerencia: registros consolidados [F1]

### HU-5.1 · Consolidado de visitas · K
- CA1: tabla virtualizada con: fecha y hora, RTC, zona, cliente, sede y municipio, motivo, estado, resultado, valor potencial, valor concretado, estado GPS (ícono y distancia) y la cantidad de fotos.
- CA2: filtros por RTC, zona, cliente, estado, resultado, estado GPS y periodo; la selección de filtros se refleja en la URL (se puede compartir).
- CA3: indicador "En vivo" y filas nuevas resaltadas durante 5 s al llegar por WS.
- CA4: el detalle lateral muestra el registro completo: productos, notas, fotos, mapa del GPS y auditoría de cambios.
- CA5: con 50.000 visitas, la primera página responde en < 500 ms (índices de `docs/02`).

### HU-5.2 · Exportación · K B
- CA1: "Exportar" a Excel o PDF de la **vista filtrada actual**; responde 202 y avisa cuando está lista (WS y notificación), con descarga desde `/exports/{id}/download`.
- CA2: el Excel trae una hoja de visitas y otra de productos (una fila por línea), con columnas tipadas (fechas como fecha y valores como número) e incluye el estado y la distancia de la verificación.
- CA3: el PDF usa una plantilla con el logo, los filtros aplicados, los totales y la tabla; está pensado para ≤ 2.000 filas (más allá, ofrece el Excel).
- CA4: cada descarga queda en `AuditLog` (`export.download`).

### HU-5.3 · Datos de venta y BI agrícola · K (Notion, post kick-off)
- CA1: vista "Agro" con: hectáreas registradas por cultivo y zona, clientes por tipo, biotecnologías en uso (propias frente a competencia) por cultivo y la penetración (% de clientes de un cultivo que usan al menos un producto propio).
- CA2: consolidado de forecast y ventas por producto, cultivo (por la línea), tipo de cliente y zona.
- CA3: todo es filtrable por periodo y zona, y exportable a Excel.

## E6 · Estadísticas, forecast y cumplimiento [F1]

### HU-6.1 · Estadísticas de visitas y de RTC · K
- CA1: tarjetas: visitas realizadas, % verificadas, clientes nuevos, valor potencial y valor concretado del periodo, con variación frente al periodo anterior.
- CA2: gráficas: visitas por RTC (barras), por zona, serie diaria o semanal, top 10 de productos de interés, y ranking de actividad.
- CA3: las comparaciones por región usan la misma escala; las gráficas siguen la guía de visualización del equipo (paleta accesible, sin 3D).

### HU-6.2 · Forecast de ventas · K P C
**Definición del forecast (F1, fuente = visitas):** sobre las líneas `VisitProduct` con `kind = POTENCIAL`, `status = ABIERTO` y `expected_date` dentro del periodo consultado:
- **Optimista** = Σ `total_value`.
- **Probable** = Σ `total_value × probability ÷ 100`.
- **Comprometido** = Σ `total_value` de las líneas con horizonte CORTO y `probability ≥ 70`, más las líneas CONCRETADAS de visitas del periodo que todavía no aparecen facturadas en el ERP.

Si un mismo cliente y producto tiene varias líneas potenciales abiertas, **solo cuenta la más reciente** (la anterior pasa a `status = REEMPLAZADO`), para no inflar el pronóstico con visitas repetidas.
- CA1: vista con los tres escenarios, agrupable por RTC, zona, producto y mes o semana (distribución del monto en el tiempo según `expected_date`).
- CA2: K10: junto a cada RTC se muestra su **histórico real** (ventas del ERP en los últimos 3 meses) y la precisión del forecast pasado (forecast congelado frente a lo real).
- CA3: una tarea nocturna congela un `ForecastSnapshot` por RTC, producto y mes, para comparar luego.
- CA4: el RTC ve su propio forecast en el Portal y en "Mis números".
- CA5: cuando `feature.pipeline` está activo, se usa la definición ampliada de HU-12.6.

### HU-6.3 · Estímulos y cumplimiento diario · C P K (kick-off K7)
- CA1: el RTC ve en Hoy y en "Mis números": presupuesto del mes, meta a la fecha, ventas a la fecha y % de cumplimiento con semáforo, y visitas de la semana frente a la meta (por ejemplo, 9/15).
- CA2: se muestra la meta diaria (presupuesto ÷ días según `goals.daily_basis`; ejemplo: $30.000.000 en un mes de 30 días → $1.000.000 diarios) y lo que falta para ponerse al día.
- CA3: la Consola muestra la misma información para todos los RTC, ordenable, con el semáforo.
- CA4: el cálculo está en `goals/selectors.py::compliance` con pruebas que cubren meses de 28, 30 y 31 días y la base hábil con festivos.

## E7 · Usuarios, cartera y asignación de visitas [F1]

### HU-7.1 · Gestión de usuarios · K
- CA1: crear, editar, desactivar y reactivar; nunca borrar. Al crear se envía una invitación por correo con un enlace para fijar la contraseña (válido por 72 h).
- CA2: se asignan el rol, la zona, el equipo y el código de vendedor en el ERP.
- CA3: la ficha muestra el último acceso, la última sincronización, los dispositivos y la actividad del periodo.
- CA4: desactivar revoca todos los dispositivos y exige reasignar la cartera (asistente) si el usuario tiene clientes.

### HU-7.2 · Zonas y carteras · K
- CA1: CRUD de zonas (con municipios y tolerancia GPS opcional) y de equipos.
- CA2: reasignación individual o en lote de clientes entre RTC, con opciones para mover las visitas futuras y las oportunidades abiertas; la conversación de WhatsApp se mueve con el cliente.
- CA3: con `crm.portfolio_mode = OPEN` (K5), el RTC que crea el cliente queda como responsable; con `ASSIGNED`, solo la Consola asigna.

### HU-7.3 · Asignación de visitas · K
- CA1: un líder o gerencia crea la visita para un RTC (cliente, sede, fecha, hora, motivo y prioridad); llega en vivo a su agenda y con push.
- CA2: queda visible en el consolidado como PROGRAMADA con `origin = ASIGNADA`.
- CA3: se puede reasignar a otro RTC mientras no esté cerrada.

## E8 · Infraestructura, sincronización y entrega [F1]

### HU-8.1 · Sincronización en vivo · B C K
- CA1: implementado con WebSocket según `docs/03` §4, con *fallback* de polling.
- CA2: un cierre de visita aparece en la Consola en < 3 s (p95) cuando el RTC tiene conexión.

### HU-8.2 · Modelo de datos y carga inicial · B K
- CA1: migraciones completas según `docs/02` y siembra de roles, permisos, settings, DIVIPOLA, catálogos base y etapas.
- CA2: importadores XLSX (plantillas descargables) de clientes con su RTC (insumo comprometido por Natural Control el 5 de octubre), RTC y catálogo de productos; validación por fila con un reporte de errores, ejecución en seco y luego confirmación.
- CA3: la importación de clientes sin coordenadas deja `Site.location = null` (la primera visita verificada la puede fijar, `docs/04` §6.2).

### HU-8.3 · Despliegue, ambientes y distribución de la PWA · B C
**(Modifica el texto contractual de "publicación en tiendas"; ver D3.)**
- CA1: ambientes de staging y producción según `docs/09`, con backups automáticos.
- CA2: la PWA cumple los criterios de instalabilidad en Android e iOS; Lighthouse PWA ≥ 90.
- CA3: pantalla `/campo/instalar` con la guía por plataforma y detección de "ya instalada" (`display-mode: standalone`).
- CA4: QR imprimible y enlace corto para la instalación durante la capacitación.

### HU-8.4 · Capacitación y acompañamiento · —
- CA1: sesiones por rol (RTC, líderes y gerencia, administradores), guía rápida en PDF de la app y un video corto de instalación.
- CA2: canal de soporte definido (grupo de WhatsApp del proyecto y correo) con tiempos de respuesta acordados.

## E9 · Integración con el ERP

### HU-9.1 · Integración de un endpoint del ERP · B [F1]
- CA1: se consume **un** endpoint según la documentación que entregue Natural Control (condición contractual). Prioridad sugerida: **ventas facturadas** (alimenta K10 y el cumplimiento).
- CA2: adaptador según `docs/06` §1; corrida incremental programada; las corridas quedan en `ErpSyncRun`.
- CA3: sin documentación, la HU queda bloqueada sin afectar al resto (marca `feature.erp = false`).

### HU-9.2 · Sincronización ampliada (clientes, productos, precios e inventario) · B [C]
- CA1: un adaptador por entidad con upsert por `erp_code`; nunca borra datos locales, solo marca inactivos.
- CA2: los conflictos de datos maestros (por ejemplo, un nombre editado en el CRM y también en el ERP) se resuelven a favor del ERP en los campos que el ERP gobierna (`erp.owned_fields`).

### HU-9.3 · Conciliación de registros no cruzados · K [C]
- CA1: `/consola/admin/erp` lista los `ErpUnmatched` con sugerencias (por documento o nombre similar) y permite vincular o crear.

## E10 · Campo sin conexión y planeación avanzada [C]

### HU-10.1 · Modo sin conexión completo · C B
- CA1: con la red cortada, el RTC puede: consultar la cartera, la agenda, las fichas, el catálogo y sus tareas; crear clientes; agendar, iniciar y cerrar visitas con productos, fotos, firma y GPS; justificar discrepancias; marcar tareas.
- CA2: al recuperar la red, todo se sincroniza sin intervención y en orden (`docs/04` §4). Prueba E2E: 3 clientes y 8 visitas creados offline → sincronizan → aparecen en la Consola con su GPS y sus fotos.
- CA3: los indicadores de `docs/04` §4.6 están presentes.
- CA4: la Consola de supervisión muestra los dispositivos con pendientes y su antigüedad.

### HU-10.2 · Visitas recurrentes · K
- CA1: se define una recurrencia (RRULE) por cliente, sede y RTC; se materializan las visitas a 14 días y los cambios a futuro no tocan las pasadas.

### HU-10.3 · Planeación en calendario y mapa · K P
- CA1: vista semanal o mensual por RTC o por zona, con arrastrar para reasignar o reprogramar.
- CA2: vista de mapa con clientes y visitas por color de estado, y selección de clientes en el mapa para asignar en lote.
- CA3: la prioridad y el motivo de la visita son visibles y filtrables.

### HU-10.4 · Firma del cliente · C
- CA1: lienzo de firma en el cierre (opcional según `visits.signature_required_results`), que se guarda como `Evidence(kind=SIGNATURE)` en PNG; funciona sin conexión.

### HU-10.5 · Rol de líder de zona · B K C
- CA1: el alcance TEAM o ZONE se aplica en todos los endpoints; el líder aprueba programaciones y cambios de ubicación, revisa las discrepancias de su equipo y recibe los escalamientos.

## E11 · Datos maestros y catálogo

### HU-11.1 · Ficha ampliada, segmentación y duplicados · C K [C]
- CA1: NIT con validación del dígito de verificación (algoritmo DIAN), varias sedes, segmento A/B/C y estado comercial; la detección de duplicados según `docs/02` §4.

### HU-11.2 · Catálogo administrable · K [F2]
- CA1: el rol ADMIN_PRODUCTO gestiona productos, categorías, imágenes, uso y cultivos objetivo, disponibilidad y listas de precios (con importación XLSX).

### HU-11.3 · Fichas técnicas versionadas · K B [F2]
- CA1: publicar un PDF nuevo crea una versión y la marca vigente; las anteriores se conservan.
- CA2: todo envío (manual o automático) usa la versión vigente en ese momento y deja constancia de cuál fue.

### HU-11.4 · Catálogo sin conexión · C [C]
- CA1: los productos, los precios y los PDF de fichas (marcados para descarga) están disponibles offline; el RTC puede compartir un PDF con la hoja nativa del sistema (`navigator.share` con archivos).

## E12 · Embudo, seguimientos y forecast ampliado [F2]

### HU-12.1 · Kanban de oportunidades · P K C
- CA1: columnas por etapa con el conteo y el total (monto y monto ponderado); arrastrar entre etapas (en Campo, con un selector); las tarjetas muestran el cliente, el monto, la probabilidad, la fecha esperada, los días en la etapa y el puntaje de prioridad.
- CA2: mover a "Perdida" exige un motivo; a "Ganada" fija `won_at`.
- CA3: orden por la priorización sugerida (`docs/02` §7.1) con explicación visible ("Monto alto · cierra en 5 días").

### HU-12.2 · Oportunidades desde la visita · B
- CA1: se implementa `pipeline.services.upsert_from_visit` según `docs/02` §7 (relación visita ↔ embudo).

### HU-12.3 · Reglas de seguimiento · K B
- CA1: al entrar a una etapa con reglas activas, se crean las tareas con su fecha (`days_after_entry`).
- CA2: las tareas se notifican por push y correo el día que vencen, a las 7:00.

### HU-12.4 · Vencidos y escalamiento · B K
- CA1: una tarea vencida hace más de `escalate_after_overdue_days` se escala al líder (notificación y aparece en su vista "Escalados").

### HU-12.5 · Agenda diaria de tareas · C P
- CA1: Hoy muestra las tareas del día y las vencidas, con acciones rápidas (llamar, WhatsApp, marcar hecha o reprogramar).

### HU-12.6 · Forecast ampliado · K
- CA1: fuente `pipeline`: Σ de las oportunidades abiertas por `expected_close_date`; Comprometido = etapas con probabilidad ≥ 80 %; Probable = monto × probabilidad; Optimista = monto total.
- CA2: fuente `blended` (por defecto con el embudo activo): las oportunidades más las líneas potenciales de visitas no vinculadas a ninguna oportunidad (sin doble conteo).
- CA3: niveles de certeza por RTC (precisión histórica: |forecast congelado − real| ÷ real en los últimos 3 meses) y comparativo de forecast frente a ventas reales.

## E13 · WhatsApp integrado [F2]

### HU-13.1 · Configuración y plantillas · K B
- CA1: conexión con la WABA de Natural Control (`docs/06` §2); la sincronización de plantillas trae su estado; supervisión de la calidad del número.

### HU-13.2 · Chat ligado al cliente · C P K
- CA1: inbox con las conversaciones de los clientes en alcance; cada conversación muestra la ficha resumida del cliente.
- CA2: envío de texto dentro de la ventana de 24 h; fuera de ella, la UI solo ofrece plantillas.
- CA3: al reasignar la cartera, las conversaciones pasan al nuevo RTC con todo el historial.
- CA4: un mensaje entrante de un número desconocido crea una conversación "Sin cliente" visible para el líder o gerencia, que la vincula o crea el cliente.

### HU-13.3 · Primer contacto y consentimiento · C B
- CA1: iniciar una conversación exige `whatsapp_opt_in` del contacto (registrado en la visita) y usa una plantilla aprobada con `purpose = FIRST_CONTACT`.

### HU-13.4 · Búsqueda y notificaciones · C P K
- CA1: búsqueda de texto completo en el histórico dentro del alcance.
- CA2: un mensaje entrante genera una notificación push al `assigned_to` (con la opción de silenciar) y aumenta el contador de no leídos.

## E14 · Automatización posterior a la visita [F2]

### HU-14.1 · Reglas configurables · K
- CA1: CRUD de `PostVisitRule` con un editor de acciones validado (enviar fichas por WhatsApp y/o correo, mover etapa, crear tarea).

### HU-14.2 · Ejecución y registro · B K C
- CA1: al cerrar una visita (y tras el retraso configurado), se evalúan las reglas en orden; cada regla corre a lo sumo una vez por visita (`idempotency_key`).
- CA2: se envían los PDF vigentes de los productos de interés al contacto atendido, por los canales con consentimiento; sin consentimiento de WhatsApp, solo correo.
- CA3: la visita muestra "Enviado: Ficha X v3 por WhatsApp (entregado) y correo (enviado)".
- CA4: los fallos parciales quedan en `AutomationRun.log` con la opción de reintentar desde la Consola.

## E15 · Metas, ranking y gamificación [C]

### HU-15.1 · Carga de metas · K
- CA1: CRUD e importación XLSX de presupuestos y metas de visitas por RTC y mes.

### HU-15.2 · Ranking y logros · C P K
- CA1: ranking del mes por % de cumplimiento de ventas, visitas verificadas y clientes nuevos; ver la posición propia en "Mis números".
- CA2: los logros se otorgan con una tarea nocturna y se muestran como insignias; la gerencia puede reconocer públicamente al top 3 (mensaje en la app).

## E16 · Inteligencia de negocio e informes con IA [F2]

### HU-16.1 · Tablero de BI · K
- CA1: visitas realizadas frente a planeadas, conversión por etapa y por vendedor, y cumplimiento de seguimientos (endpoints de `docs/03` §3.7).

### HU-16.2 · Informe con IA · K B
- CA1: genera, para empresa, zona o RTC y un periodo, un informe con: resumen en lenguaje natural, RTC o zonas en riesgo (con la razón numérica), acciones correctivas priorizadas, oportunidades estancadas y clientes en riesgo de fuga (`docs/06` §5).
- CA2: **toda cifra del informe proviene de `input_snapshot`**; la prueba de validación rechaza salidas que mencionan números que no están en la entrada.
- CA3: se guarda con el modelo, la versión del prompt y el costo.

### HU-16.3 · Envío programado · B
- CA1: semanal (lunes 6:00) y mensual (día 1, 6:00) según la configuración; se envía como PDF por correo a la lista configurada y queda visible en la Consola.

### HU-16.4 · Alertas de estancamiento y fuga · B C K
- CA1: oportunidad estancada = sin cambio de etapa ni actividad en `pipeline.stalled_days`; cliente en riesgo de fuga = cliente ACTIVO sin compra en el ERP ni visita en N días (más de 1,5 veces su ciclo de compra histórico). Las alertas llegan al dueño y a su líder.

## E17 · Administración, seguridad avanzada y supervisión [C]

### HU-17.1 · Desbloqueo biométrico · C
- CA1: el RTC registra una passkey (WebAuthn, autenticador de plataforma); con la sesión vigente pero la app bloqueada por inactividad local (`auth.local_lock_minutes`, por defecto 0 = desactivado), desbloquea con huella o rostro.

### HU-17.2 · Doble factor para perfiles gerenciales · K
- CA1: para los roles en `auth.mfa_required_roles`, el login exige TOTP o passkey; incluye códigos de recuperación de un solo uso.

### HU-17.3 · Cierre remoto de sesión · K
- CA1: el administrador revoca un dispositivo; en el siguiente request (o por el evento WS `session.revoked`) la app borra los datos locales y vuelve al login.

### HU-17.4 · Bitácora y exportación para auditoría · K
- CA1: búsqueda en el `AuditLog` por usuario, entidad, acción y periodo, con exportación XLSX.

### HU-17.5 · Alerta de RTC sin actividad · B K
- CA1: una tarea diaria (7:00) detecta a los RTC activos sin visitas ni sincronización en `alerts.inactive_rtc_days` días hábiles y notifica al líder y a gerencia.

### HU-17.6 · Supervisión del sistema · K
- CA1: `/consola/admin/salud` muestra el estado de `/admin/health` (`docs/03` §3.9) con semáforos.

### HU-17.7 · Parámetros, permisos y catálogos configurables · K
- CA1: editor de `SystemSetting` agrupado por módulo, con validación por tipo y descripción; cada cambio queda auditado.
- CA2: editor de la matriz rol × permiso y creación de roles intermedios (K2).
- CA3: catálogos editables: tipos de cliente, cultivos, motivos de visita y de pérdida, etapas y reglas, plantillas de WhatsApp y correo, y periodicidad de los informes de IA.

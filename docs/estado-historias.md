# Estado de historias — Natural Control CRM

Auditoría contra [05b-historias-por-actor.md](../../nc-crm-spec/05b-historias-por-actor.md) y los prototipos en `nc-crm-spec/Portal web para desarrollo (1)/`. Fecha de corte: 2026-10-30.

Leyenda de estado:

| Estado | Significado |
|---|---|
| HECHA | Lógica usable (API + servicio + UI); falta rediseño al Design System / prototipo |
| PARCIAL | Hay modelos y/o API y/o UI, pero faltan criterios de aceptación materiales |
| SIN_CONSTRUIR | Sin flujo usable (puede haber modelo vacío) |

Superficies: **C** Campo · **P** Portal · **K** Consola · **B** Backend.

---

## Resumen

Auditoría verificada en código (APIs montadas + UI) el 2026-10-30. Tras fases 1–3 del rediseño, varias HECHA/PARCIAL ya tienen shell/login nuevo; el DoD de producto sigue abierto.

| Estado | Cantidad (corte auditoría) | Nota post fases 1–3 |
|---|---|---|
| HECHA (flujo usable; rediseño pendiente o en curso) | 14 | Login/shells ya rediseñados (1.1, 1.4, D.3 parcial) |
| PARCIAL | 18 | Incluye 1.2, 2.2–2.4, 3.4, 4.2, 3.5a, 5.1, 8.x, 10.1, 10.5, 17.3, 17.7 |
| SIN_CONSTRUIR (05b + huecos) | 50 | Forecast, tableros, liga, WA, embudo, etc. |
| HU-D | 4 | D.1/D.3 UI shell lista; D.2/D.4 aún sin flujo completo |
| **Total trazado** | **86** | 82 HU únicas en 05b + 4 HU-D |

Detalle criterio por criterio: la tabla siguiente. Evidencia ampliada del agente de auditoría: APIs solo en `accounts`, `crm`, `visits`, `catalog`, `parameters`.

---

## Matriz de historias

| HU | Título corto | Estado | Evidencia | Falta para DoD | Pantalla prototipo |
|---|---|---|---|---|---|
| 1.1 | Iniciar sesión y recuperar contraseña | HECHA | `accounts/api`; `PortalLogin` (tarjeta 440px) | Recover Campo al DS; SES prod | Login Portal |
| 1.2 | Configurar roles y permisos | PARCIAL | Seed + `RoleListView` lectura | Editor permisos por rol | Parámetros / roles |
| 1.3 | Mantener sesión abierta | HECHA | refresh + `restore()` + checkbox | Aviso pendientes offline | Transversal |
| 1.4 | Entrar con código (OTP) | HECHA | OTP API + modo código en `PortalLogin` | Rate limit UI tests | Login OTP |
| 2.1 | Ver mi agenda de visitas | HECHA | `AgendaView`; Campo `Today` | Semana/mes Portal; push; offline | Agenda / Hoy |
| 2.2 | Consultar mi cartera | PARCIAL | `clients` list + filtros básicos; FE Clients | Filtros HU + prototipo; Exportar; «Cerca de mí» | Cartera / Clientes |
| 2.3 | Registrar cliente nuevo con ubicación | PARCIAL | `clients` create; NewClient Campo | Wizard 4 pasos prototipo; cultivos con fase; autorizaciones con fecha | Nuevo cliente (Campo + web) |
| 2.4 | Ver ficha e historial | PARCIAL | ClientDetail; ficha Campo/Portal básica | Cultivos, biotecnologías, mapa sedes, historial cotizaciones/ERP | Ficha |
| 2.5 | Pedir cambio de ubicación | SIN_CONSTRUIR | Modelo `LocationChangeRequest` | API + UI Campo | Ficha |
| 2.6 | Aprobar cambios de ubicación | SIN_CONSTRUIR | Modelo sin endpoints | Cola aprobación Consola | Geolocalización |
| 3.1 | Agendar visita | HECHA | `VisitCreateView` + Campo `Schedule` | Reprogramar auditado | Agendar |
| 3.2 | Registrar lo que pasó | HECHA | `close_visit` + `campo/visit.tsx` | Rediseño 4 estados prototipo | Visita |
| 3.3 | Productos, cantidades y horizonte | HECHA | `VisitProduct` + close | Cultivo/área UI | Visita productos |
| 3.4 | Adjuntar fotos | PARCIAL | `evidence` upload | Tope, galería, foto completa en consolidado | Visita fotos |
| 3.5a | Exigir y revisar programación | PARCIAL | weekly-plans approve/return/require | Tabla Por qué auto/manual; semana anterior; UI prototipo | Programación y asignación |
| 3.5b | Enviar mi programación | HECHA | weekly API + `programacion.tsx` | Insignia a tiempo; push | Programación Campo |
| 4.1 | Capturar ubicación al cerrar | HECHA | `verify_gps` + Campo locate | Copy permiso; UI capturando | Visita |
| 4.2 | Ver verificación y justificar | PARCIAL | Chip GPS; campo justificación en modelo | POST justificación RTC | Visita |
| 4.3 | Revisar discrepancias | HECHA | GPS list/review + GeoPage | Mapa tolerancia; HU-D.2 | Geolocalización |
| 5.1 | Consolidado visitas en vivo | PARCIAL | `visits/now`; VisitsPage | Filtros URL; panel detalle; mapa pines; WS | Visitas en vivo |
| 5.2 | Exportar Excel y PDF | PARCIAL | openpyxl en deps; export parcial | Excel/PDF reales Cartera + Visitas | Cartera / Visitas «Exportar» |
| 5.3 | Datos venta y BI agrícola | SIN_CONSTRUIR | Modelos ERP sales | Pantalla Agro; fuentes ERP | Agro (sin diseño) |
| 6.1 | Estadísticas visitas y RTC | SIN_CONSTRUIR | — | Pantalla Estadísticas | Estadísticas (sin diseño) |
| 6.2 | Forecast de ventas | SIN_CONSTRUIR | Modelo `ForecastSnapshot` | API + barras apiladas + tabs | Forecast gerencia |
| 6.2b | Mi propio forecast | SIN_CONSTRUIR | — | Cumplimiento, ritmo, citas, productos | Mi forecast / Mis números |
| 6.3a | Cómo voy frente a mi meta | SIN_CONSTRUIR | Modelo `Goal` | ComplianceMeter; meta diaria | Mis números |
| 6.3b | Cumplimiento del equipo | SIN_CONSTRUIR | — | Vista gerencial cumplimiento | Inicio / Tableros |
| 6.4 | Tablero por comercial | SIN_CONSTRUIR | — | Tabla + drill-down RTC | Tableros · Por comercial |
| 6.5 | Tablero del día | SIN_CONSTRUIR | — | StatTiles + timeline | Tableros · Del día / Inicio Día |
| 6.6 | Tablero por producto | SIN_CONSTRUIR | — | Tarjetas + detalle atributos | Tableros · Por producto |
| 6.7 | Tablero gerencial resumen | SIN_CONSTRUIR | — | Variantes Mes y Día completas | Inicio |
| 6.8 | Mapa desempeño por zona | SIN_CONSTRUIR | — | Cartograma 31 deps; ficha zona; comparar | Mapa de zonas |
| 7.1 | Gestionar usuarios | HECHA | directory API + UsersPage | Ficha detalle; invitación | Usuarios |
| 7.2 | Gestionar zonas y carteras | HECHA | zones API + ZonesPage + reassign | Equipos UI; tarjetas prototipo | Zonas |
| 7.3 | Asignar visitas a un RTC | HECHA | assign/reassign + ops UI | Carga/sugeridos (→ 7.4) | Asignar |
| 7.4 | Asignar con base en datos | SIN_CONSTRUIR | — | Listas B1/B2; UI sugerencias | Asignar |
| 8.1 | Sincronizar en vivo | PARCIAL | Channels/ASGI; health live/ready | WS `ws/v1/stream`; indicador En vivo real | Transversal «En vivo» |
| 8.2 | Carga inicial de datos | PARCIAL | `seed` / `load_nc` | Importadores Excel; UI carga | Carga inicial (sin diseño) |
| 8.3 | Instalar app en celular | PARCIAL | PWA parcial Campo | Guía instalación; dispositivo no compatible | Campo (sin diseño) |
| 8.4 | Capacitar y adopción | SIN_CONSTRUIR | — | Guía PDF + video | — |
| 9.1 | Integrar endpoint ERP | SIN_CONSTRUIR | Modelos `integrations` | Cliente HTTP; flag `feature.erp` | — |
| 9.2 | Sync clientes/productos/precios | SIN_CONSTRUIR | `ErpSyncRun` | Jobs sync; flag | — |
| 9.3 | Conciliar registros ERP | SIN_CONSTRUIR | `ErpUnmatched` | UI conciliación | Conciliación (sin diseño) |
| 10.1 | Trabajar sin conexión | PARCIAL | Dexie outbox + `POST /sync/mutations`; Hoy SyncBanner; flag on | Bootstrap/pull, fotos, start visita, SW | Pendientes / SyncBanner |
| 10.2 | Visitas recurrentes | SIN_CONSTRUIR | Modelo `VisitRecurrence` | API + UI líder | Recurrencias (sin diseño) |
| 10.3 | Planear en calendario y mapa | PARCIAL | Agenda básica | Calendario semana/mes + mapa líder | Agenda calendarios |
| 10.4 | Firma del cliente | SIN_CONSTRUIR | Setting signature_required | Captura firma | Visita |
| 10.5 | Ver y gestionar solo mi equipo | PARCIAL | Scope ZONE en roles | Enforcement uniforme en todas las APIs | Alcance transversal |
| 11.1 | Completar ficha NIT/sedes/segmento | SIN_CONSTRUIR | Campos en Client | Flujo completar ficha | Ficha |
| 11.2 | Administrar catálogo | HECHA | catalog admin API + `catalog.tsx` | Atributos Anexo A; rediseño DS | Catálogo |
| 11.3 | Fichas técnicas versionadas | SIN_CONSTRUIR | — | Versionado + publish | Fichas (sin diseño) |
| 11.4 | Catálogo offline | SIN_CONSTRUIR | — | Cache Dexie | Campo offline |
| 12.1 | Gestionar oportunidades embudo | SIN_CONSTRUIR | Modelos pipeline; flag off | API + UI Mis oportunidades | Mis números → oportunidades |
| 12.2 | Crear oportunidades desde visita | SIN_CONSTRUIR | — | Auto-creación al cerrar | Sistema |
| 12.3 | Configurar reglas seguimiento | SIN_CONSTRUIR | `FollowUpRule` | UI admin | Reglas (sin diseño) |
| 12.4 | Seguimientos vencidos escalados | SIN_CONSTRUIR | — | Notificaciones líder | — |
| 12.5 | Ver tareas del día | SIN_CONSTRUIR | Modelo `Task` | API + «Tareas de hoy» | Mis números |
| 12.6 | Forecast ampliado con embudo | SIN_CONSTRUIR | — | Vista gerencia | Forecast |
| 13.1 | Conectar WhatsApp y plantillas | SIN_CONSTRUIR | Modelos messaging; flag | WABA; UI plantillas | WhatsApp (flag) |
| 13.2a | Chatear WhatsApp con clientes | SIN_CONSTRUIR | — | Inbox Campo/Portal | Mensajes |
| 13.2b | Supervisar conversaciones equipo | SIN_CONSTRUIR | — | Vista líder | Mensajes |
| 13.3 | Primer contacto WhatsApp | SIN_CONSTRUIR | — | Plantilla inicio | Ficha |
| 13.4 | Buscar mensajes y avisos | SIN_CONSTRUIR | — | Push + búsqueda | Mensajes |
| 14.1 | Configurar automatizaciones post-visita | SIN_CONSTRUIR | `PostVisitRule` | UI config | Automatizaciones |
| 14.2 | Ejecutar automatizaciones | SIN_CONSTRUIR | `AutomationRun` | Celery workers | Sistema |
| 15.1 | Cargar metas y presupuestos | SIN_CONSTRUIR | Modelo `Goal` | Importación; UI Metas | Metas (sin diseño) |
| 15.2 | Mi carta, liga y logros | SIN_CONSTRUIR | — | PlayerCard; radar; vecindario | Mi carta / Yo |
| 15.3 | Carta de cada comercial | SIN_CONSTRUIR | — | Carta + radar + tabla | Liga · Carta |
| 15.4 | Liga y once ideal | SIN_CONSTRUIR | — | Tabla liga; cancha; insignias | Liga · Campo |
| 15.5 | Comparar dos comerciales | SIN_CONSTRUIR | — | Selectores + PDF | Liga · Comparar |
| 15.6 | Calcular calificaciones nocturnas | SIN_CONSTRUIR | — | ScorecardSnapshot + Beat; insignias | Sistema |
| 16.1 | Tablero BI comercial | SIN_CONSTRUIR | — | Tablero BI | BI (sin diseño) |
| 16.2 | Informe gestión con IA | SIN_CONSTRUIR | `AIReport`; flag | Prompt + clave IA | Informes (flag) |
| 16.3 | Informes programados | SIN_CONSTRUIR | — | Cron envío | Sistema |
| 16.4 | Alertas estancados / fuga | SIN_CONSTRUIR | — | Reglas + notificaciones | — |
| 17.1 | Desbloquear con biometría | SIN_CONSTRUIR | Flag webauthn | WebAuthn en Yo | Yo (sin diseño) |
| 17.2 | Doble factor gerenciales | SIN_CONSTRUIR | Flag mfa; setting roles | Flujo MFA | Login (sin diseño) |
| 17.3 | Cerrar sesión dispositivo remoto | SIN_CONSTRUIR | — | Revocar refresh tokens | Usuarios / Salud |
| 17.4 | Bitácora de auditoría | PARCIAL | `AuditLog` + `record()` | UI consulta/export | Bitácora (sin diseño) |
| 17.5 | Alertar RTC sin actividad | SIN_CONSTRUIR | Setting inactive_rtc_days | Job + aviso | Sistema |
| 17.6 | Supervisar salud del sistema | SIN_CONSTRUIR | health live/ready | 6 tarjetas + dispositivos pendientes | Salud del sistema |
| 17.7 | Parámetros, permisos y catálogos | PARCIAL | settings API + FE | Roles editor; catálogos simples | Parámetros |

### Historias nuevas del diseño (HU-D)

| HU | Título | Estado | Pantalla | Notas |
|---|---|---|---|---|
| D.1 | Búsqueda global cliente/RTC/municipio | PARCIAL | Topbar `PortalShell` (input listo) | Endpoint search + resultados |
| D.2 | Pedir más información (GPS) | HECHA | `ReviewStatus.INFORMACION_SOLICITADA` + UI GeoReview | Notificación push al RTC | Geolocalización |
| D.3 | Selector de tema web (claro/oscuro/sol) | HECHA | `applyTheme` / ciclo en `PortalShell`; default oscuro | Selector en Campo Yo | Menú usuario web |
| D.4 | Cómo llegar (enlace mapas) | SIN_CONSTRUIR | Visita · Antes | Maps/Waze desde sede |

---

## Trazabilidad diseño → HU

### 3.1 Transversales portal

| Elemento | HU |
|---|---|
| Login contraseña + OTP | 1.1, 1.4 |
| Olvidé mi contraseña | 1.1 |
| Sidebar NAV por rol + contador geo | 1.2, 4.3, 10.5 |
| Usuario / Cerrar sesión | 1.1, 1.3 |
| Búsqueda global | D.1 |
| Indicador En vivo + fecha | 8.1 |
| Toasts | transversal UX |
| Tema claro/oscuro/sol | D.3 |

### 3.2 Portal por rol

| Pantalla / bloque | HU |
|---|---|
| Inicio Mes/Día | 6.7, 6.5, 8.1 |
| Mis números | 6.3a, 12.5, 15.2 |
| Agenda lista/semana/mes | 2.1, 3.1, 10.3 |
| Cartera | 2.2, 5.2 |
| Ficha | 2.4, 2.5, 2.6 |
| Visitas en vivo | 5.1, 5.2, 8.1 |
| Geolocalización + Pedir info | 4.3, 2.6, D.2 |
| Tableros comercial/día/producto | 6.4, 6.5, 6.6 |
| Mapa de zonas | 6.8 |
| Forecast / Mi forecast | 6.2, 6.2b, 6.3a |
| Programación y asignación | 3.5a, 7.3, 7.4 |
| Mi programación | 3.5b |
| Liga / Carta / Campo / Comparar | 15.3–15.5 |
| Mi carta y liga | 15.2 |
| Salud del sistema | 17.6 |
| Usuarios | 7.1 |
| Zonas y carteras | 7.2 |

### 3.3 App Campo

| Pantalla | HU |
|---|---|
| Hoy + SyncBanner | 2.1, 6.3a, 10.1 |
| Visita 4 estados + Cómo llegar | 3.2–3.4, 4.1–4.2, D.4 |
| Clientes + filtros | 2.2 |
| Ficha + pedir ubicación | 2.4, 2.5 |
| Nuevo cliente 4 pasos | 2.3 |
| Mis números / oportunidades | 6.2b, 6.3a, 12.1, 12.5 |
| Yo + tema + sync | 15.2, D.3, 10.1 |
| Programación | 3.5b |
| Pendientes / Sincronización | 10.1 |

---

## Brechas de modelo (diseño §3.4)

Pendientes de migración:

1. Fase de cultivo (`producción` | `siembra`) en `Crop`.
2. Fecha de autorización en contacto (ya hay `whatsapp_opt_in_at`; falta fecha Ley 1581 explícita si aplica).
3. Estado GPS review `INFORMACION_SOLICITADA` (HU-D.2).
4. Dispositivo: modelo, SO, última sync.
5. Métricas de salud (p95 sync, colas, backup, ERP).
6. `ScorecardSnapshot`, `Badge`, temporadas.
7. Atributos de producto Anexo A §A.4.
8. Stats semana anterior + origen exigencia programación (auto/manual).

---

## Orden de cierre (alineado al plan)

1. Fases 2–10: 100 % del diseño + pantallas sin prototipo que ya van en esas fases (Metas, Agro, catálogo, parámetros…).
2. Fases 11–12: resto E12–E14 y backlog restante (flags WhatsApp/ERP/IA).
3. Fase 13: HU-8.1 cierre, regresión, rendimiento, Lighthouse, staging.

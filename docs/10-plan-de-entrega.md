# 10 · Plan de entrega

## 1. Ritmo de trabajo (acordado en el kick-off)
- Gestión en Notion (`WORKFLOW / CLIENTES - OPERACIONES / Natural Control`): cronograma, épicas e historias, y el tablero.
- **Cada lunes:** informe por el grupo de WhatsApp del proyecto con lo avanzado la semana anterior y lo planeado para la semana en curso.
- **Cada 15 a 20 días:** entrega funcional en staging para que Natural Control la vea, pruebe y apruebe. Aprobador: **Emilio**. El contrato fija 5 días hábiles para hacer observaciones; sin ellas, la entrega se entiende aceptada.
- Tipos de reunión: planeación y estrategia, testeo, y entrega de flujos completos.
- El cronograma es una guía (metodología ágil); los cambios se discuten y aprueban con el cliente.

## 2. Hitos propuestos

### Orden vigente desde el 15 de octubre de 2026
Camilo pidió adelantar la Consola del administrador. Esa parte operativa ya está usable (usuarios, zonas, cartera, visitas, catálogo y parámetros). El 15 de octubre se retomó Campo por la programación semanal.

| Orden | Hito | Contenido | Demo | Estado |
|---|---|---|---|---|
| 1 | H0 · Cimientos | Repositorio, Docker, modelos, auth (HU-1.1–1.3), siembra | Login | Hecho |
| 2 | Campo base (adelantado) | Cartera, alta de cliente, agenda (HU-3.1), visita con productos, fotos y GPS (HU-3.2–3.4, E4), aviso en vivo (HU-8.1), código de acceso (HU-1.4), PWA instalable | El RTC ve su cartera, agenda y cierra una visita; la discrepancia se revisa en Consola | Hecho como base. No se sigue ampliando ahora |
| 3 | Administrador | HU-7.1 usuarios, HU-7.2 zonas y reasignación de cartera, HU-7.3 asignación de visitas, catálogo y parámetros que opera la Consola | El administrador crea un comercial, le asigna zona y mueve cartera | Hecho en lo operativo |
| 4 | Vendedor | Lo que falta de Campo y Portal: programación semanal (HU-3.5), números, importadores (HU-8.2) y guía de instalación (HU-8.3) | El comercial trabaja el día completo sobre los datos que dejó el administrador | En curso. HU-3.5: exigencia, envío y visitas en la agenda |
| 5 | Gerencia | E5, E6 (con 6.3), HU-9.1 si llegó la documentación del ERP | Consolidado, exportaciones, forecast y cumplimiento | Después del vendedor |
| 6 | Implementación | Carga real, piloto con 2–3 comerciales, capacitación (HU-8.4), producción | Operación real | Al final |

### Fase 1 original (referencia del kick-off)
El cronograma de semanas 1 a 8 sigue siendo la guía del contrato. El cambio de arriba solo reordena el trabajo que falta: administrador, luego vendedor, luego gerencia.

### Alcance completo (a continuación, por épicas)
Orden sugerido por valor y dependencia: **E10.1 (offline)** → E11 (catálogo y fichas) → E12 (embudo y seguimientos) → E13 (WhatsApp) → E14 (automatización) → E15 (metas y gamificación) → E16 (BI e IA) → E17 (seguridad avanzada y supervisión), con piloto en campo y despliegue por zonas.

**Dependencias críticas:**
- E13 y E14 necesitan la WABA aprobada por Meta y las plantillas aprobadas (2–3 semanas de trámite): **iniciar el trámite al comenzar E11**.
- E14 depende de E11.3 (fichas versionadas) y E13.
- E16.2 depende de los datos de E12 y E9 para ser útil (mínimo 4 semanas de operación).
- K10 (histórico real) y el cumplimiento por ventas dependen de E9.

## 3. Definition of Done (por HU)
1. Todos los criterios de aceptación cubiertos por pruebas automatizadas (unitarias de servicios + API; E2E para los flujos de Campo).
2. Permisos probados por rol y alcance (suite de `docs/08` §2).
3. OpenAPI actualizado y el cliente regenerado; sin diferencias en `schema-check`.
4. Si la HU toca Campo: probada **instalada como PWA** en un Android real y un iPhone real, incluido el modo avión si la HU lo exige.
5. Sin errores nuevos en Sentry de staging durante 24 h tras la demo.
6. Textos de UI revisados (español de Colombia, sin jerga técnica para el RTC).
7. Docs actualizados (`docs/` y el changelog).
8. Desplegada en staging y validada con el cliente en la entrega quincenal.

## 4. Datos y accesos que debe entregar Natural Control
| Insumo | Responsable | Fecha comprometida | Bloquea |
|---|---|---|---|
| Listado de clientes actuales con su RTC asociado (Excel) | Gonzalo y Lila | 5-oct-2026 | HU-8.2 |
| Manual de marca y logos | Gonzalo y Lila | 5-oct-2026 | Diseño de UI, ícono de la PWA |
| Catálogo de productos | Natural Control | 5-oct-2026 | HU-3.3, E11 |
| Documentación del API del ERP | Proveedor del ERP vía Natural Control | "esta semana" (semana del kick-off) | E9 |
| Definir quién será Administrador | Gonzalo y Emilio | — | HU-7.1 |
| Presupuestos y metas de visitas por RTC | Emilio | Antes de H3 | HU-6.3 |
| Zonas y su composición (municipios y RTC) | Emilio | Antes de H1 | HU-7.2 |
| Dominio o subdominio y acceso al DNS | Natural Control | Antes de H0 | Staging y producción |
| Cuenta de AWS (o aprobación para que la administre 3 Orillas) | Natural Control | Antes de H0 | Infraestructura |
| Política de tratamiento de datos y texto de autorización | Natural Control (jurídico) | Antes de H1 | HU-2.3 CA5 |
| WABA, número dedicado y verificación de la empresa en Meta | Natural Control | Al iniciar E11 | E13 |

> Varios de estos insumos tenían fecha 5 de octubre; a la fecha de este documento (15 de octubre) hay que confirmar con Emilio cuáles llegaron.

## 5. Decisiones abiertas

| # | Decisión | Opciones | Recomendación | Quién decide |
|---|---|---|---|---|
| D1 | ¿Adelantar el modo sin conexión (HU-10.1) a la Fase 1? | Sí (cambio de alcance) / No | **Sí**: las visitas rurales ocurren sin señal; el backend ya queda listo. Formalizar con un otrosí | Emilio + 3 Orillas |
| D2 | Plazo de la programación semanal: ¿qué día y hora, y para qué semana? | El kick-off dice "cada lunes, la semana siguiente"; también es común "viernes 17:00 para la semana siguiente" | Confirmar; el sistema soporta ambas | Emilio |
| D3 | La PWA reemplaza la "publicación en tiendas" de la HU-8.3 | Otrosí / nota en el acta de entrega | Dejarlo por escrito antes de H1, incluidas las limitaciones de iOS (`docs/04` §1) | Cami + Emilio |
| D4 | Dominio | `crm.naturalcontrol.com.co` u otro | — | Natural Control |
| D5 | Antifraude GPS: aceptar las limitaciones de la web frente a la detección de ubicación simulada | Aceptar / exigir una app nativa en el futuro para RTC específicos | Aceptar y medir durante el piloto | Emilio |
| D6 | Texto de autorización de datos y política | — | Lo provee el jurídico de Natural Control | Natural Control |
| D7 | Base de datos en contenedor frente a RDS | Contenedor (~USD 50 al mes en total) / RDS (+USD 15–30 al mes, PITR) | Contenedor en F1 con backups probados; migrar a RDS al crecer o si el cliente prioriza RPO de minutos | Natural Control (paga) |
| D8 | Fuente de ventas para el cumplimiento (`goals.sales_source`) | ERP / concretados en la app | ERP en cuanto E9 esté activa; hasta entonces, concretados | Emilio |
| D9 | Tolerancia GPS diferenciada por zona (urbana o rural) | Única de 1 km / por zona | Arrancar con 1 km y ajustar con los datos del piloto | Emilio |

## 6. Riesgos

| Riesgo | Prob. | Impacto | Mitigación |
|---|---|---|---|
| La documentación del ERP no llega o el ERP no tiene API | Alta | Medio (K10, cumplimiento por ventas) | Adaptador `filedrop` (exportes programados a S3); `goals.sales_source = CONCRETADOS` mientras tanto |
| Baja adopción de los RTC | Media | Alto | Piloto con RTC aliados, capacitación en campo, formularios cortos, estímulos (HU-6.3) y que gerencia use el consolidado desde la semana 1 |
| Safari borra datos de una PWA no instalada | Media | Alto (pérdida de pendientes) | Exigir la instalación (bloqueo suave en `/campo` si no está en modo standalone en iOS), `storage.persist()` y alertas de pendientes antiguos |
| Señal nula en fincas (sin offline en F1) | Alta | Alto | D1 |
| Ubicaciones simuladas | Media | Medio | `docs/08` §4 y D5 |
| Retraso en la aprobación de Meta | Media | Medio (E13) | Iniciar el trámite temprano; plantillas simples de categoría UTILITY |
| Costo del servidor por encima de los USD 50 | Baja | Bajo | Dimensionamiento de §1 de `docs/09`; instancia reservada |
| El alcance completo (8 épicas nuevas, E10–E17) desborda el presupuesto | Media | Alto | Construir por épica con demo y aprobación; el backlog está priorizado y cada épica es entregable de forma independiente |

# 00 · Visión, alcance y decisiones

## 1. Problema
Natural Control vende biotecnologías agrícolas (bioinsumos) por medio de una fuerza comercial de campo: los **RTC**, que visitan fincas, agricultores, distribuidores y almacenes en distintas regiones del país. Hoy la información de esas visitas vive en la memoria de cada RTC, en cuadernos y en chats. No hay trazabilidad, gerencia no sabe si una visita ocurrió de verdad y el pronóstico de ventas sale de percepciones.

## 2. Objetivo del producto
1. Que **toda** la gestión comercial (planear, ejecutar y documentar visitas) quede registrada desde el celular, incluso sin señal.
2. Que gerencia pueda **verificar** cada visita: la ubicación real del RTC frente a la del cliente.
3. Que cada visita alimente un **forecast** de ventas por RTC, zona, producto y horizonte, comparable con las ventas reales del ERP.
4. Que el ciclo comercial tenga continuidad: embudo, seguimientos, WhatsApp, envío de fichas técnicas y alertas.
5. Que gerencia dirija con datos: tableros, metas, ranking e informes generados con IA.

## 3. Glosario
| Término | Significado |
|---|---|
| **RTC** | Representante técnico comercial. Es el usuario de campo y el rol `RTC` del sistema. |
| **Cliente** | La cuenta comercial (persona o empresa) identificada por NIT o cédula. |
| **Sede / Finca** | Ubicación física de un cliente. Un cliente puede tener varias. **Contra la sede se verifica el GPS.** |
| **Cultivo** | Cultivo presente en una sede (tipo y área en hectáreas). Alimenta el BI agrícola. |
| **Biotecnología** | Producto del catálogo de Natural Control (bioinsumo). |
| **Visita** | Encuentro programado o realizado entre un RTC y un cliente en una sede. |
| **Producto de interés** | Línea de una visita: producto, cantidad, valor y horizonte. Puede ser *concretado* (pedido) o *potencial* (forecast). |
| **Horizonte** | Plazo esperado de compra de un potencial: **corto** (esta semana), **mediano** (este mes), **largo** (hasta 3 meses). |
| **Verificación GPS** | Resultado de comparar la ubicación capturada al cerrar la visita con la de la sede: `VERIFICADA` o `FUERA_DE_RANGO` (que la UI muestra como "Discrepancia"). |
| **Programación semanal** | Plan de visitas de la semana que un RTC debe enviar cuando gerencia se lo exige. |
| **Oportunidad** | Negocio en el embudo (pipeline), asociado a un cliente y a uno o varios productos. |
| **Presupuesto** | Meta de ventas en COP de un RTC para un periodo. |

## 4. Roles
| Rol (código) | Superficie | Alcance de datos | Puede |
|---|---|---|---|
| `RTC` | Campo + Portal | Solo sus clientes, visitas, oportunidades y conversaciones | Crear clientes y sedes, agendar y registrar visitas, enviar su programación, gestionar su embudo, chatear por WhatsApp con sus clientes, ver sus números |
| `LIDER_ZONA` | Consola (+ Campo si también visita) | Su(s) zona(s) y los RTC de su equipo | Todo lo del RTC sobre su equipo, más asignar y reasignar visitas, aprobar programaciones y cambios de ubicación, revisar discrepancias, recibir escalamientos |
| `GERENCIA` | Consola | Toda la operación | Consolidado, estadísticas, forecast, metas, revisión de discrepancias, informes de IA, exportaciones |
| `ADMIN` | Consola | Todo, más configuración | Usuarios, roles, permisos, zonas, carteras, parámetros, plantillas, integraciones, auditoría |
| `ADMIN_PRODUCTO` | Consola | Solo catálogo | Productos, categorías, precios, fichas técnicas y PDF |

- En el kick-off se acordó que se pueden crear **roles intermedios**. Por eso los permisos son una matriz configurable de *módulo × acción* por rol (ver `docs/08` §2), y los cinco roles anteriores son los **roles sembrados** iniciales.
- Un usuario tiene **un** rol. Un líder de zona que también visita clientes usa la App Campo con alcance sobre sus propios registros y la Consola con alcance de zona.

## 5. Decisiones tomadas en el kick-off (28-sep-2026)
Estas decisiones **mandan sobre** la propuesta y el contrato donde difieran. Todas son valores por defecto configurables en `SystemSetting`.

| # | Decisión | Implementación |
|---|---|---|
| K1 | Integrador y decisor final: Emilio (Director Nacional de Ventas) | Es el único aprobador de entregas (§7) |
| K2 | Roles: Comercial (RTC), Gerencia/Dirección Comercial y Administrador, con posibilidad de roles intermedios | Matriz de permisos configurable |
| K3 | La sesión se mantiene activa **hasta 30 días sin uso** | Refresh token deslizante de 30 días por inactividad (`auth.session_idle_days = 30`) |
| K4 | Tolerancia GPS de **1 km** entre el RTC y la sede; fuera de ese rango hay discrepancia | `gps.tolerance_m = 1000`, con posible ajuste por zona |
| K5 | La asignación de clientes es **abierta** por ahora: cada RTC crea y alimenta sus fichas | `crm.portfolio_mode = OPEN`: el creador queda como responsable, con detección de duplicados |
| K6 | Programación semanal anticipada, activable por RTC, con recordatorios y visibilidad para gerencia de quién no la envió | Modelo `ProgramacionSemanal` y bandera `requiere_programacion` en el usuario (HU-3.5) |
| K7 | Indicador de cumplimiento diario frente al presupuesto y a la meta de visitas (ej.: presupuesto de $30M → $1M diario; 15 visitas semanales) | `Meta` por RTC y periodo; meta diaria = presupuesto ÷ días del periodo (HU-6.3) |
| K8 | La ficha y el registro de visita incluyen las biotecnologías que el cliente **ya usa**, las **concretadas** en la visita y las **potenciales**, más cultivos y área | `ClienteBiotecnologia`, `ProductoVisita.tipo`, `Cultivo` (HU-2.3, 2.4, 3.3) |
| K9 | Horizontes de venta: corto (esa semana), mediano (ese mes), largo (máximo 2 a 3 meses) | `ProductoVisita.horizonte` y `fecha_estimada` (HU-3.3) |
| K10 | El forecast muestra lo proyectado por el RTC **y** su comportamiento histórico real | Se compara con `VentaERP` (HU-6.2, E9) |
| K11 | Seguimiento: informe cada lunes, entregas funcionales cada 15 a 20 días, gestión en Notion | Ver `docs/10` |

Ajustes anotados en Notion después del kick-off, que se incorporan: **OTP** en el acceso (HU-1.4), **HU-3.5** (programación semanal para RTC con bajo cumplimiento, con notificaciones al RTC y a gerencia), **HU-5.3** (consolidado de datos de venta: productos, terrenos y tipos de cliente) y **HU-6.3** (estímulos: el RTC ve cómo va en visitas y ventas, y la administración también).

## 6. Mapa de alcance
El spec cubre el **alcance completo**. Cada HU lleva una etiqueta de fase:

- **[F1]** Contratada en la Fase 1 ($7.200.000), con los ajustes del kick-off.
- **[F2]** Fase 2 según la propuesta: embudo, seguimientos, WhatsApp, automatización posterior a la visita, catálogo con fichas e informes con IA.
- **[C]** Está en el alcance completo, pero no en la lista de Fase 2: modo sin conexión, firma del cliente, líder de zona, gamificación, biometría y doble factor, calendario y mapa de planeación, y recurrencia.

> **Regla de construcción:** la Fase 1 se construye sobre el modelo de datos completo (`docs/02`). Las tablas de fases posteriores pueden existir vacías desde el inicio. Lo que no se hace es construir la Fase 1 con atajos que obliguen a migraciones destructivas después.
>
> **Aviso comercial:** el modo sin conexión es **[C]**, pero se recomienda adelantarlo a la Fase 1 porque las visitas rurales ocurren sin señal. El backend ya queda listo para ello desde F1 (`client_uuid`, endpoints de sync). Decisión abierta D1 en `docs/10`.

## 7. Fuera de alcance
- Facturación electrónica y emisión de pedidos en el ERP (solo se **leen** datos del ERP; no se escribe en él).
- Rastreo continuo de la ubicación del RTC en segundo plano (no es posible en una PWA y no se pidió: la ubicación se captura en eventos puntuales).
- Gestión de inventario y logística de despacho.
- App nativa en tiendas (reemplazada por la PWA).
- Multiempresa: el sistema es para un solo inquilino, Natural Control.

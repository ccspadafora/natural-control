# Design System — Natural Control · CRM de Campo

Sistema de diseño para la App Campo (PWA), el Portal del vendedor y la Consola. Versión 1 · 15 de octubre de 2026 · 3 Orillas.

**Contenido:** 1. Brand book · 2. Tokens de color · 3. Tipografía · 4. Espacio, radios, tamaños y sombra · 5. Tokens en CSS · 6. Componentes · 7. Logotipo

---

## 1. Brand book

Sistema de diseño de la plataforma comercial de campo de Natural Control: la App Campo (PWA para los RTC), el Portal del vendedor y la Consola de gerencia. Parte del logotipo 2024 (azul `brand-navy` y flor `brand-orange`) y lo convierte en una interfaz de trabajo legible al sol, con un solo color de acción y estados que siempre se leen en palabras.

### Principios

1. **Neutro primero.** La interfaz es blanca, gris y tinta. Solo dos cosas llevan color: la acción (`primary`) y el estado, y el estado va en un punto, un ícono o una barra, no en fondos. Lo único que se pinta de rojo entero es lo que exige atención (discrepancia, error de sincronización).
2. **Un solo color de acción.** Todo lo que se toca y hace algo es `primary` (el azul del logo, ajustado por tema). Ningún otro color pinta botones de avance.
3. **El estado se lee, no se adivina.** Cada estado lleva palabra e ícono además del color (`Badge`, `GpsCheck`). Verde y rojo nunca se distinguen solo por el tono.
4. **Hecho para el campo.** Pantalla al sol, una mano, guantes, señal intermitente: texto de lectura de 17px (`body-lg`), controles de 48px (`tap-min`), contraste alto y un tema `sol` para exteriores.
5. **Densidad en la Consola, aire en Campo.** La Consola apila tarjetas `surface` sobre `canvas` con texto `body` de 15px; Campo muestra una cosa por pantalla.
6. **Bordes primero.** Las tarjetas se separan con `hairline` sobre `canvas`; la sombra (`shadow-float`) es solo para lo que flota.

### Contenido y tono

- Español de Colombia, tuteo («Registra lo que pasó en la visita»). Con gerencia también tuteo, más sobrio.
- Verbos en botones, en infinitivo y frase corta: «Cerrar visita», «Guardar cliente», «Enviar programación». Mayúscula solo inicial.
- Palabras del dominio, exactas: **RTC**, **visita**, **sede** o **finca**, **cartera**, **programación semanal**, **discrepancia** (nunca «fraude» o «visita falsa»), **horizonte corto, mediano o largo**.
- Cifras: dinero en COP con punto de miles y sin decimales («$ 3.700.000»); áreas en hectáreas con coma («12,5 ha»); distancias «a 85 m», «a 2,3 km»; porcentajes con espacio («87 %»).
- Fechas relativas en listas («hace 12 días», «ayer»), absolutas en detalle («15 oct. 2026, 9:30 a. m.»).
- Errores que dicen qué hacer: «Activa la ubicación para cerrar la visita», no «Error de permisos».
- Sin emojis en la interfaz.

### Color

Tres temas: **Claro** (por defecto), **Oscuro** y **Sol**, el tema de alto contraste para usar en exteriores. En Sol, todo texto tiene al menos 7:1, los bordes reemplazan a las sombras y los trazos pasan a 2px.

| Rol | Tokens | Uso |
|---|---|---|
| Identidad | `brand-navy`, `brand-orange` | Valores exactos del logo. Solo para logo, splash, ícono de la app y portada. |
| Acción | `primary`, `primary-pressed`, `on-primary`, `primary-tint`, `focus` | Botones, enlaces, selección, foco. |
| Acento | `accent`, `on-accent`, `accent-text`, `accent-tint` | La flor, con moderación: el punto de «Nuevo» y «En curso», el aviso de programación semanal y los logros. Como texto, `accent-text`. |
| Superficies | `canvas`, `surface`, `surface-raised`, `surface-sunken`, `scrim` | Fondo de página, tarjetas, hojas, pistas. |
| Texto | `ink`, `ink-secondary`, `ink-tertiary` | Principal, metadatos, ayudas. |
| Líneas | `hairline`, `border-control` | Separadores decorativos y bordes de controles (≥ 3:1). |
| Estado | `success*`, `warning*`, `danger*` | Texto (`success`), fondo (`success-tint`) y relleno fuerte para mapas y semáforo (`success-solid`). |
| Gráficas | `chart-1` … `chart-5` | Series en ese orden; `chart-5` para «Otros» y líneas de meta. |

Reglas:
- Presupuesto de color por pantalla: el azul de acción y, como máximo, puntos o íconos de estado. Los fondos tintados (`*-tint`) son solo para avisos que bloquean o piden acción, nunca para insignias de lista.
- El naranja de la flor (`brand-orange`) tiene 2,6:1 sobre blanco: **nunca es texto**. Para texto naranja use `accent-text`.
- Advertencia **no** es naranja de marca: es `warning` (ámbar), para que «Atrasada» no se confunda con «Nuevo».
- Texto sobre rellenos de estado: `ink` sobre `success-solid` y `warning-solid`; blanco sobre `danger-solid` y `primary`.
- En Oscuro, `primary` se aclara y su texto encima es oscuro (`on-primary`): nunca escriba blanco sobre `primary` en código; use el token.
- Contrastes verificados (WCAG 2): texto principal ≥ 14:1, secundario ≥ 8:1, terciario ≥ 4,9:1 en Claro y Oscuro; todo ≥ 7:1 en Sol; `success-solid` frente a `danger-solid` ≥ 3:1 en luminosidad.

### Tipografía

**Nunito Sans** (Google Fonts) en todo: sus terminaciones redondeadas acompañan el wordmark del logo y es muy legible en tamaños pequeños. **JetBrains Mono** solo para coordenadas, NIT, códigos ERP e identificadores.

- Pesos: 400 para leer, 700 para títulos, botones y etiquetas, 800 para `display`, `kpi` y cejas (`eyebrow`). No use 300, 500 ni 600.
- Campo lee en `body-lg` (17px); Consola y Portal en `body` (15px).
- Una cifra importante por tarjeta en `kpi`, siempre con `font-variant-numeric: tabular-nums`. Lo mismo en tablas y columnas de dinero.
- `eyebrow` (11px, 800, mayúsculas, +0,06em) solo para rótulos cortos, nunca frases.
- Títulos con tracking ligeramente negativo (ya incluido en `display`, `title-lg`, `title`); el texto de lectura, sin tracking.

### Espacio, forma y profundidad

- Base de 4px: `space-1` … `space-12`. Margen lateral: `space-4` en Campo, `space-6` en Consola. Contenido máximo `content-max` (1280px).
- Radios: `radius-pill` en todo lo que es acción o filtro (botones, chips, pestañas, buscador, `GpsCheck`); `radius-md` en tarjetas, campos y fotos; `radius-lg` en hojas inferiores y modales; `radius-sm` en insignias.
- Alto de controles: `tap-min` (48px) en Campo, `control-md` (40px) en escritorio, `control-lg` (52px) para el botón principal de pantalla en Campo.
- Profundidad: tarjetas planas con `hairline`; `shadow-float` solo en hojas, menús, la barra fija de acción y el botón flotante. En Sol, sin sombras.
- Foco: anillo sólido de 2px en `focus`, separado 2px. Nunca se quita.

### Movimiento

Corto y funcional: 80–150 ms. Al presionar, los botones escalan a 0,97. Las hojas inferiores suben en 200 ms. El ícono de sincronización gira. Todo se detiene con `prefers-reduced-motion`.

### Superficies del producto

- **App Campo (móvil):** barra superior blanca, `SyncBanner` debajo cuando hay pendientes, contenido en una columna sobre `canvas`, botón principal `lg` y `block` fijo al pie en la zona del pulgar, navegación inferior de 4 destinos (Hoy, Clientes, Embudo, Mensajes).
- **Portal del vendedor (escritorio):** misma identidad que Campo con densidad de Consola.
- **Consola (escritorio):** barra lateral de navegación con el ítem activo en `primary-tint` y texto `primary`; fila de `StatTile` arriba; tablas en `surface` con encabezado `surface-sunken` y `label`; filtros en chips de píldora.
- **Mapas:** marcadores `success-solid` (verificada), `danger-solid` (discrepancia), `warning-solid` (precisión baja) y `primary` (sede o visita programada); punto real frente a esperado unidos por una línea `ink-secondary` punteada.

### Iconografía

Lucide (`lucide-react`), trazo 2, 18px en botones y 14px en insignias, siempre con `currentColor`. El bundle de este sistema incluye solo los íconos que usan sus componentes (`Icon`). Íconos siempre con palabra, salvo botones de ícono con `aria-label`.

### Logotipo

`assets/Logos/logo-natural-control-2024.png` es un recorte del archivo del cliente sobre su fondo claro: úselo solo sobre blanco. Falta el vector y las versiones en negativo (ver la nota del grupo Logos). No dibuje ni recomponga la flor o el microscopio.

### Componentes

`Button`, `Badge`, `GpsCheck` (la firma: el chip de verificación de visita), `ComplianceMeter` (el semáforo de cumplimiento con marca de meta a la fecha), `VisitCard`, `TextField`, `Tabs`, `SyncBanner`, `StatTile` e `Icon`. Global: `window.NC`. En la aplicación real, estos componentes se reimplementan en `packages/ui` (React + Tailwind) con las mismas clases de tokens; el bundle sirve de referencia viva.

---

## 2. Tokens de color

Valores por tema: **Claro** (`light`), **Oscuro** (`dark`), **Sol (alto contraste)** (`sol`). Un valor `{token}` es un alias de otro token.

| Token | Claro | Oscuro | Sol (alto contraste) | Uso |
|---|---|---|---|---|
| `brand-navy` | `#124481` | `#124481` | `#124481` | Azul del logotipo 2024, valor exacto. Solo identidad: logotipo, splash de la PWA, ícono de la app y bloques de la portada. Para acciones use `primary`. |
| `brand-orange` | `#ea8a26` | `#ea8a26` | `#ea8a26` | Naranja de la flor del logotipo, valor exacto. Solo identidad. Sobre blanco tiene 2,6:1: nunca como texto ni como borde informativo. Para acentos de UI use `accent`. |
| `primary` | `#124481` | `#8db2ee` | `#0b2f5e` | El único color de acción: botón primario, enlaces, pestaña activa, selección y anillo de foco. Texto o borde sobre `surface`, `canvas` y `primary-tint` (≥ 6,5:1 en todos los temas). |
| `primary-pressed` | `#0c335f` | `#a9c6f4` | `#071f40` | Relleno del botón primario presionado. Mismo `on-primary` encima. |
| `on-primary` | `#ffffff` | `#0a1830` | `#ffffff` | Texto e íconos sobre `primary` y `primary-pressed` (≥ 8:1). En oscuro es tinta oscura porque `primary` se aclara. |
| `primary-tint` | `#e7eef8` | `#1a2b47` | `#dce6f5` | Fondo del botón secundario, fila seleccionada, chip activo. Texto encima: `primary`. |
| `focus` | `{primary}` | `{primary}` | `#000000` | Anillo de foco de 2px con 2px de separación (`surface` de por medio). ≥ 7:1 sobre cualquier superficie. |
| `accent` | `#ea8a26` | `#f2a04a` | `#ea8a26` | Acento cálido (la flor): insignia «Nuevo», recordatorio de programación semanal, logros y el marcador de «hoy». Siempre como relleno con `on-accent` encima; nunca como texto. |
| `on-accent` | `#172033` | `#1a1206` | `#000000` | Texto e íconos sobre `accent` (≥ 6,3:1). |
| `accent-text` | `#a04a00` | `#f5b36b` | `#7a3700` | Texto naranja legible (cejas o eyebrows, «Nuevo» en línea) sobre `surface` y `accent-tint`. |
| `accent-tint` | `#fdefdf` | `#3a2512` | `#fbe3c8` | Fondo suave del acento: aviso de programación semanal, insignia «Nuevo» discreta. Texto: `accent-text`. |
| `canvas` | `#f4f6f9` | `#0b111c` | `#ffffff` | Fondo de página: la Consola y la lista de la App Campo. Las tarjetas `surface` se separan sobre él. |
| `surface` | `#ffffff` | `#131c2b` | `#ffffff` | Tarjetas, barras de navegación, formularios, tablas. |
| `surface-raised` | `#ffffff` | `#1a2436` | `#ffffff` | Hojas inferiores (bottom sheets), modales, menús. En claro se distingue con `shadow-float`; en oscuro, por tono. |
| `surface-sunken` | `#edf0f5` | `#0e1522` | `#f2f2f2` | Pistas de pestañas, campos de solo lectura, insignia neutra, encabezado de tabla. |
| `scrim` | `rgba(11, 17, 28, 0.55)` | `rgba(0, 0, 0, 0.6)` | `rgba(0, 0, 0, 0.7)` | Velo detrás de modales y hojas inferiores. |
| `ink` | `#172033` | `#e9edf4` | `#000000` | Títulos y texto principal sobre `surface` y `canvas` (≥ 14:1). Nunca negro puro salvo en Sol. |
| `ink-secondary` | `#44506a` | `#b4bdcc` | `#1f1f1f` | Texto secundario: municipio, metadatos de la visita, etiquetas de campo, sobre `surface` y `canvas` (≥ 8:1). |
| `ink-tertiary` | `#5f6b83` | `#8e99ac` | `#333333` | Texto mínimo: marcas de tiempo, ayudas, placeholders, sobre `surface`, `canvas` y `surface-raised` (≥ 4,9:1). No usar para nada que haya que leer bajo el sol. |
| `hairline` | `#dde2ea` | `#263247` | `#5c5c5c` | Bordes decorativos de 1px: tarjetas, separadores de lista, filas de tabla. No comunica estado. |
| `border-control` | `#8792a8` | `#5d6b83` | `#000000` | Borde de campos, casillas y botón de contorno (≥ 3:1 sobre `surface`). |
| `success` | `#1b7a45` | `#5fd394` | `#0b5a2e` | Texto e ícono de «Verificada», «Realizada», cumplimiento en verde, sobre `surface` y `success-tint`. Siempre acompañado de ícono y palabra. |
| `success-tint` | `#e6f4ec` | `#12301f` | `#d6f0e0` | Fondo de la insignia y del chip de verificación «Verificada». |
| `success-solid` | `#4cc98a` | `#4cc98a` | `#0b5a2e` | Relleno de marcadores de mapa y del segmento verde del semáforo. Ícono encima: `ink` (claro y oscuro) o blanco (Sol). Difiere de `danger-solid` ≥ 3:1 en luminosidad, no solo en tono. |
| `danger` | `#b42318` | `#ff8a7f` | `#8a1208` | Texto e ícono de «Discrepancia», errores de formulario y acciones destructivas, sobre `surface` y `danger-tint`. |
| `danger-tint` | `#fdecea` | `#3a1513` | `#fbdad6` | Fondo de la insignia «Discrepancia» y de los avisos de error. |
| `danger-solid` | `#b42318` | `#a51d14` | `#8a1208` | Relleno de marcador de mapa fuera de rango, botón destructivo y segmento rojo del semáforo. Texto encima: blanco (≥ 6,5:1). |
| `warning` | `#8a5a00` | `#f5c451` | `#5c3b00` | Texto e ícono de «Revisión pendiente», «Precisión baja», «Atrasada» y semáforo amarillo, sobre `surface` y `warning-tint`. |
| `warning-tint` | `#fff4d6` | `#33280b` | `#ffeab0` | Fondo de avisos de advertencia y de la banda «Sin conexión · pendientes». |
| `warning-solid` | `#f2b01e` | `#f2b01e` | `#f2b01e` | Segmento amarillo del semáforo y marcador de mapa de precisión baja. Texto e ícono encima: `ink` claro (#172033). |
| `chart-1` | `#124481` | `#8db2ee` | `#0b2f5e` | Serie 1 de gráficas (la propia del RTC o de la empresa). |
| `chart-2` | `#d9730d` | `#f2a04a` | `#a04a00` | Serie 2 de gráficas (comparativo, periodo anterior). |
| `chart-3` | `#1f8a7f` | `#4dbfb2` | `#0b5a52` | Serie 3 de gráficas. |
| `chart-4` | `#8a5cb8` | `#b48de0` | `#5a2e88` | Serie 4 de gráficas. |
| `chart-5` | `#8792a8` | `#8e99ac` | `#333333` | Serie «Otros» y referencias (meta, promedio). |

---

## 3. Tipografía

| Familia | Pila CSS |
|---|---|
| `sans` | `"Nunito Sans", system-ui, -apple-system, "Segoe UI", sans-serif` |
| `mono` | `"JetBrains Mono", ui-monospace, Menlo, Consolas, monospace` |

Carga (Google Fonts):

```html
<link href="https://fonts.googleapis.com/css2?family=Nunito+Sans:opsz,wght@6..12,400;6..12,700;6..12,800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
```

### Títulos

| Estilo | Tamaño / interlínea | Peso | Tracking | Familia | Ejemplo | Uso |
|---|---|---|---|---|---|---|
| `display` | 32px / 38px | 800 | -0.02em | sans | Visitas de hoy | Título de pantalla en la Consola; saludo de Hoy en Campo. Uno por pantalla. |
| `title-lg` | 24px / 30px | 700 | -0.015em | sans | Finca La Esperanza | Nombre del cliente en la ficha; título de sección en la Consola. |
| `title` | 20px / 26px | 700 | -0.01em | sans | Productos de interés | Encabezados de bloque, títulos de hoja inferior. |
| `subtitle` | 17px / 24px | 700 | 0 | sans | Agroinsumos El Retiro | Título de tarjeta de visita o cliente. |

### Texto

| Estilo | Tamaño / interlínea | Peso | Tracking | Familia | Ejemplo | Uso |
|---|---|---|---|---|---|---|
| `body-lg` | 17px / 26px | 400 | 0 | sans | Registra lo que pasó en la visita y marca el resultado. | Texto de lectura en la App Campo (pantalla al sol, una mano). |
| `body` | 15px / 22px | 400 | 0 | sans | Cliente sin compras en 64 días; ciclo habitual de 30. | Texto por defecto de la Consola y el Portal. |
| `label` | 14px / 20px | 700 | 0 | sans | Guardar visita | Botones, pestañas, etiquetas de campo, encabezados de tabla. |
| `caption` | 13px / 18px | 400 | 0 | sans | Hace 12 días · Rionegro, Antioquia | Metadatos, marcas de tiempo, ayudas de campo. |
| `eyebrow` | 11px / 14px | 800 | 0.06em | sans | PROGRAMADA · 9:30 | Ceja en mayúsculas sobre títulos de tarjeta e insignias. Nunca para frases. |

### Datos

| Estilo | Tamaño / interlínea | Peso | Tracking | Familia | Ejemplo | Uso |
|---|---|---|---|---|---|---|
| `kpi` | 40px / 44px | 800 | -0.02em | sans | 87 % | La cifra de una tarjeta de indicador. Con `font-variant-numeric: tabular-nums`. |
| `money` | 20px / 26px | 700 | 0 | sans | $ 3.700.000 | Valores en COP en tarjetas y totales. Formato colombiano: punto de miles, sin decimales en UI. |
| `mono` | 13px / 18px | 400 | 0 | mono | 6.02194, −75.43120 · ±18 m | Coordenadas, códigos ERP, NIT, IDs técnicos. |

---

## 4. Espacio, radios, tamaños y sombra

### Espaciado

Base de 4px. Las pantallas de Campo usan `space-4` de margen lateral; la Consola, `space-6`.

| Token | Valor | Uso |
|---|---|---|
| `space-1` | `4px` | Entre ícono y texto dentro de una insignia. |
| `space-2` | `8px` | Entre ícono y etiqueta en botones; entre líneas de metadatos. |
| `space-3` | `12px` | Relleno interno de insignias grandes y chips; separación entre tarjetas en listas densas. |
| `space-4` | `16px` | Margen lateral de pantallas en Campo; relleno de tarjetas. |
| `space-5` | `20px` | Relleno de hojas inferiores. |
| `space-6` | `24px` | Relleno de tarjetas de la Consola; margen lateral en escritorio. |
| `space-8` | `32px` | Separación entre bloques de una pantalla. |
| `space-12` | `48px` | Separación entre secciones de la Consola. |

### Radios

| Token | Valor | Uso |
|---|---|---|
| `radius-sm` | `6px` | Insignias rectangulares, casillas, celdas de calendario. |
| `radius-md` | `12px` | Tarjetas, campos de texto, mapas embebidos, miniaturas de foto. |
| `radius-lg` | `20px` | Hojas inferiores (solo esquinas superiores), modales. |
| `radius-pill` | `999px` | Botones, chips de filtro, pestañas segmentadas, chip de verificación GPS, buscador. |

### Tamaños

Objetivos táctiles: en Campo, nada interactivo por debajo de `tap-min`.

| Token | Valor | Uso |
|---|---|---|
| `tap-min` | `48px` | Alto mínimo de cualquier control en la App Campo. |
| `control-md` | `40px` | Alto de botones y campos en la Consola y el Portal. |
| `control-lg` | `52px` | Botón principal de pantalla en Campo (Cerrar visita, Guardar cliente). |
| `content-max` | `1280px` | Ancho máximo del contenido de la Consola. |

### Sombra

Bordes primero. La sombra solo para lo que flota.

| Token | Valor | Uso |
|---|---|---|
| `shadow-float` | Claro: `0 8px 24px rgba(15, 23, 38, 0.14), 0 1px 2px rgba(15, 23, 38, 0.08)` · Oscuro: `0 8px 24px rgba(0, 0, 0, 0.5)` · Sol (alto contraste): `none` | Hojas inferiores, menús, el botón flotante y la barra de acción fija. Nunca en tarjetas en reposo. En Sol se reemplaza por borde `hairline`. |

---

## 5. Tokens en CSS

Copie este bloque en `packages/ui/src/tokens.css`. El tema se cambia con `<html data-theme="light|dark|sol">`. En Tailwind, mapee los colores a estas variables (`colors: { primary: "var(--primary)", … }`).

```css
:root, [data-theme="light"] {
  --brand-navy: #124481;
  --brand-orange: #ea8a26;
  --primary: #124481;
  --primary-pressed: #0c335f;
  --on-primary: #ffffff;
  --primary-tint: #e7eef8;
  --focus: var(--primary);
  --accent: #ea8a26;
  --on-accent: #172033;
  --accent-text: #a04a00;
  --accent-tint: #fdefdf;
  --canvas: #f4f6f9;
  --surface: #ffffff;
  --surface-raised: #ffffff;
  --surface-sunken: #edf0f5;
  --scrim: rgba(11, 17, 28, 0.55);
  --ink: #172033;
  --ink-secondary: #44506a;
  --ink-tertiary: #5f6b83;
  --hairline: #dde2ea;
  --border-control: #8792a8;
  --success: #1b7a45;
  --success-tint: #e6f4ec;
  --success-solid: #4cc98a;
  --danger: #b42318;
  --danger-tint: #fdecea;
  --danger-solid: #b42318;
  --warning: #8a5a00;
  --warning-tint: #fff4d6;
  --warning-solid: #f2b01e;
  --chart-1: #124481;
  --chart-2: #d9730d;
  --chart-3: #1f8a7f;
  --chart-4: #8a5cb8;
  --chart-5: #8792a8;
  --shadow-float: 0 8px 24px rgba(15, 23, 38, 0.14), 0 1px 2px rgba(15, 23, 38, 0.08);
}
[data-theme="dark"] {
  --brand-navy: #124481;
  --brand-orange: #ea8a26;
  --primary: #8db2ee;
  --primary-pressed: #a9c6f4;
  --on-primary: #0a1830;
  --primary-tint: #1a2b47;
  --focus: var(--primary);
  --accent: #f2a04a;
  --on-accent: #1a1206;
  --accent-text: #f5b36b;
  --accent-tint: #3a2512;
  --canvas: #0b111c;
  --surface: #131c2b;
  --surface-raised: #1a2436;
  --surface-sunken: #0e1522;
  --scrim: rgba(0, 0, 0, 0.6);
  --ink: #e9edf4;
  --ink-secondary: #b4bdcc;
  --ink-tertiary: #8e99ac;
  --hairline: #263247;
  --border-control: #5d6b83;
  --success: #5fd394;
  --success-tint: #12301f;
  --success-solid: #4cc98a;
  --danger: #ff8a7f;
  --danger-tint: #3a1513;
  --danger-solid: #a51d14;
  --warning: #f5c451;
  --warning-tint: #33280b;
  --warning-solid: #f2b01e;
  --chart-1: #8db2ee;
  --chart-2: #f2a04a;
  --chart-3: #4dbfb2;
  --chart-4: #b48de0;
  --chart-5: #8e99ac;
  --shadow-float: 0 8px 24px rgba(0, 0, 0, 0.5);
}
[data-theme="sol"] {
  --brand-navy: #124481;
  --brand-orange: #ea8a26;
  --primary: #0b2f5e;
  --primary-pressed: #071f40;
  --on-primary: #ffffff;
  --primary-tint: #dce6f5;
  --focus: #000000;
  --accent: #ea8a26;
  --on-accent: #000000;
  --accent-text: #7a3700;
  --accent-tint: #fbe3c8;
  --canvas: #ffffff;
  --surface: #ffffff;
  --surface-raised: #ffffff;
  --surface-sunken: #f2f2f2;
  --scrim: rgba(0, 0, 0, 0.7);
  --ink: #000000;
  --ink-secondary: #1f1f1f;
  --ink-tertiary: #333333;
  --hairline: #5c5c5c;
  --border-control: #000000;
  --success: #0b5a2e;
  --success-tint: #d6f0e0;
  --success-solid: #0b5a2e;
  --danger: #8a1208;
  --danger-tint: #fbdad6;
  --danger-solid: #8a1208;
  --warning: #5c3b00;
  --warning-tint: #ffeab0;
  --warning-solid: #f2b01e;
  --chart-1: #0b2f5e;
  --chart-2: #a04a00;
  --chart-3: #0b5a52;
  --chart-4: #5a2e88;
  --chart-5: #333333;
  --shadow-float: none;
}
:root {
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-12: 48px;
  --radius-sm: 6px;
  --radius-md: 12px;
  --radius-lg: 20px;
  --radius-pill: 999px;
  --tap-min: 48px;
  --control-md: 40px;
  --control-lg: 52px;
  --content-max: 1280px;
  --font-sans: "Nunito Sans", system-ui, -apple-system, "Segoe UI", sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, Menlo, Consolas, monospace;
}
```

### Estilos de componentes (referencia)

Esta es la implementación de referencia de los componentes. En la app se reimplementan en React + Tailwind con los mismos tokens.

```css
@import url('https://fonts.googleapis.com/css2?family=Nunito+Sans:opsz,wght@6..12,400;6..12,700;6..12,800&family=JetBrains+Mono:wght@400;500&display=swap');

/* Natural Control · CRM de Campo — estilos de componentes. Los valores viven en tokens.json. */
body { margin: 0; background: var(--canvas); color: var(--ink); font-family: var(--font-sans); -webkit-font-smoothing: antialiased; }
.nc-row { display: flex; flex-wrap: wrap; gap: var(--space-3); align-items: center; padding: var(--space-4); }
.nc-col { display: flex; flex-direction: column; gap: var(--space-3); padding: var(--space-4); }
.nc-num { font-variant-numeric: tabular-nums; }
.nc-icon { width: 18px; height: 18px; flex: none; }
.nc-icon-sm { width: 14px; height: 14px; flex: none; }

/* Button */
.nc-btn { display: inline-flex; align-items: center; justify-content: center; gap: var(--space-2); height: var(--control-md); padding: 0 var(--space-5); border-radius: var(--radius-pill); border: 1px solid transparent; font: 700 14px/20px var(--font-sans); cursor: pointer; white-space: nowrap; transition: transform .08s ease, background-color .12s ease; }
.nc-btn:active { transform: scale(0.97); }
.nc-btn:focus-visible { outline: 2px solid var(--focus); outline-offset: 2px; }
.nc-btn[disabled] { cursor: not-allowed; opacity: .45; transform: none; }
.nc-btn-lg { height: var(--control-lg); padding: 0 var(--space-6); font-size: 16px; }
.nc-btn-block { display: flex; width: 100%; }
.nc-btn-primary { background: var(--primary); color: var(--on-primary); }
.nc-btn-primary:active { background: var(--primary-pressed); }
.nc-btn-secondary { background: var(--surface); color: var(--primary); border-color: var(--hairline); }
.nc-btn-outline { background: var(--surface); color: var(--ink); border-color: var(--border-control); }
.nc-btn-quiet { background: transparent; color: var(--primary); padding: 0 var(--space-3); }
.nc-btn-danger { background: var(--danger-solid); color: #ffffff; }

/* Badge — neutra; el estado va en el punto */
.nc-badge { display: inline-flex; align-items: center; gap: 6px; height: 24px; padding: 0 var(--space-2); border-radius: var(--radius-sm); background: var(--surface-sunken); color: var(--ink-secondary); font: 800 11px/14px var(--font-sans); letter-spacing: .06em; text-transform: uppercase; white-space: nowrap; }
.nc-badge-dot { width: 8px; height: 8px; border-radius: 50%; flex: none; background: var(--border-control); }
.nc-badge-primary .nc-badge-dot { background: var(--primary); }
.nc-badge-success .nc-badge-dot { background: var(--success-solid); }
.nc-badge-warning .nc-badge-dot { background: var(--warning-solid); }
.nc-badge-danger .nc-badge-dot { background: var(--danger-solid); }
.nc-badge-accent .nc-badge-dot { background: var(--accent); }
.nc-badge-danger { color: var(--danger); }
.nc-badge-success .nc-icon-sm { color: var(--success); } .nc-badge-warning .nc-icon-sm { color: var(--warning); } .nc-badge-primary .nc-icon-sm { color: var(--primary); }

/* GpsCheck — la firma del sistema. Píldora neutra; el estado vive en el punto */
.nc-gps { display: inline-flex; align-items: center; gap: var(--space-2); min-height: 32px; padding: var(--space-1) var(--space-3) var(--space-1) var(--space-1); border-radius: var(--radius-pill); border: 1px solid var(--hairline); background: var(--surface); color: var(--ink); font: 700 14px/20px var(--font-sans); }
.nc-gps-dot { display: inline-grid; place-items: center; width: 24px; height: 24px; border-radius: 50%; flex: none; }
.nc-gps-dist { font-weight: 400; color: var(--ink-secondary); font-variant-numeric: tabular-nums; }
.nc-gps-ok .nc-gps-dot { background: var(--success-solid); color: #172033; }
.nc-gps-bad { color: var(--danger); border-color: var(--danger); }
.nc-gps-bad .nc-gps-dot { background: var(--danger-solid); color: #ffffff; }
.nc-gps-warn .nc-gps-dot { background: var(--warning-solid); color: #172033; }
.nc-gps-none { color: var(--ink-secondary); }
.nc-gps-none .nc-gps-dot { background: var(--surface-sunken); color: var(--ink-secondary); }
.nc-gps-pre { border-style: dashed; border-color: var(--border-control); }

/* ComplianceMeter */
.nc-meter { background: var(--surface); border: 1px solid var(--hairline); border-radius: var(--radius-md); padding: var(--space-4); display: grid; gap: var(--space-2); min-width: 260px; }
.nc-meter-head { display: flex; justify-content: space-between; align-items: baseline; gap: var(--space-3); }
.nc-meter-label { font: 800 11px/14px var(--font-sans); letter-spacing: .06em; text-transform: uppercase; color: var(--ink-secondary); }
.nc-meter-pct { font: 800 24px/28px var(--font-sans); font-variant-numeric: tabular-nums; display: inline-flex; align-items: center; gap: var(--space-1); }
.nc-meter-track { position: relative; height: 10px; border-radius: var(--radius-pill); background: var(--surface-sunken); overflow: visible; }
.nc-meter-fill { position: absolute; left: 0; top: 0; bottom: 0; border-radius: var(--radius-pill); }
.nc-meter-mark { position: absolute; top: -4px; bottom: -4px; width: 2px; background: var(--ink); border-radius: 1px; }
.nc-meter-foot { display: flex; justify-content: space-between; gap: var(--space-3); font: 400 13px/18px var(--font-sans); color: var(--ink-secondary); font-variant-numeric: tabular-nums; }
.nc-tone-green .nc-icon-sm { color: var(--success); } .nc-fill-green { background: var(--success-solid); }
.nc-tone-yellow .nc-icon-sm { color: var(--warning); } .nc-fill-yellow { background: var(--warning-solid); }
.nc-tone-red { color: var(--danger); } .nc-fill-red { background: var(--danger-solid); }

/* VisitCard */
.nc-visit { display: grid; grid-template-columns: 56px 1fr; gap: var(--space-3); background: var(--surface); border: 1px solid var(--hairline); border-radius: var(--radius-md); padding: var(--space-4); min-height: var(--tap-min); text-align: left; width: 100%; box-sizing: border-box; cursor: pointer; font-family: var(--font-sans); color: var(--ink); }
.nc-visit:focus-visible { outline: 2px solid var(--focus); outline-offset: 2px; }
.nc-visit-time { font: 800 17px/22px var(--font-sans); font-variant-numeric: tabular-nums; color: var(--ink); }
.nc-visit-time small { display: block; font: 400 13px/18px var(--font-sans); color: var(--ink-tertiary); }
.nc-visit-body { display: grid; gap: var(--space-1); min-width: 0; }
.nc-visit-title { font: 700 17px/24px var(--font-sans); margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.nc-visit-meta { font: 400 13px/18px var(--font-sans); color: var(--ink-secondary); display: flex; align-items: center; gap: var(--space-1); }
.nc-visit-foot { display: flex; flex-wrap: wrap; gap: var(--space-2); margin-top: var(--space-1); align-items: center; }
.nc-visit-pending { color: var(--ink-secondary); font: 700 13px/18px var(--font-sans); display: inline-flex; align-items: center; gap: var(--space-1); }
.nc-visit-pending .nc-icon-sm { color: var(--warning); }

/* TextField */
.nc-field { display: grid; gap: 6px; font-family: var(--font-sans); min-width: 240px; }
.nc-field-label { font: 700 14px/20px var(--font-sans); color: var(--ink); }
.nc-field-label .nc-req { color: var(--danger); margin-left: 2px; }
.nc-input { height: var(--tap-min); box-sizing: border-box; border: 1px solid var(--border-control); border-radius: var(--radius-md); background: var(--surface); color: var(--ink); padding: 0 var(--space-4); font: 400 17px/24px var(--font-sans); width: 100%; }
.nc-input::placeholder { color: var(--ink-tertiary); }
.nc-input:focus { outline: 2px solid var(--focus); outline-offset: 0; border-color: var(--focus); }
.nc-field-error .nc-input { border-color: var(--danger); border-width: 2px; }
.nc-field-help { font: 400 13px/18px var(--font-sans); color: var(--ink-secondary); display: flex; gap: var(--space-1); align-items: center; }
.nc-field-error .nc-field-help { color: var(--danger); }

/* Tabs (segmentadas) */
.nc-tabs { display: inline-flex; gap: 2px; padding: 4px; background: var(--surface-sunken); border-radius: var(--radius-pill); }
.nc-tab { display: inline-flex; align-items: center; gap: var(--space-2); min-height: 40px; padding: 0 var(--space-4); border: 0; border-radius: var(--radius-pill); background: transparent; color: var(--ink-secondary); font: 700 14px/20px var(--font-sans); cursor: pointer; }
.nc-tab:focus-visible { outline: 2px solid var(--focus); outline-offset: 1px; }
.nc-tab[aria-selected="true"] { background: var(--surface); color: var(--ink); box-shadow: 0 0 0 1px var(--hairline); }
.nc-tab[aria-selected="true"] .nc-tab-count { color: var(--primary); }
.nc-tab-count { min-width: 20px; height: 20px; padding: 0 6px; box-sizing: border-box; border-radius: var(--radius-pill); background: transparent; color: var(--ink-tertiary); font: 800 12px/20px var(--font-sans); text-align: center; font-variant-numeric: tabular-nums; }

/* SyncBanner */
.nc-sync { display: flex; align-items: center; gap: var(--space-3); padding: var(--space-3) var(--space-4); font: 700 14px/20px var(--font-sans); border-bottom: 1px solid var(--hairline); }
.nc-sync span.nc-sync-text { flex: 1; }
.nc-sync-offline { background: var(--surface); color: var(--ink); }
.nc-sync-offline .nc-icon { color: var(--warning); }
.nc-sync-syncing { background: var(--surface); color: var(--ink-secondary); }
.nc-sync-syncing .nc-icon { color: var(--primary); }
.nc-sync-error { background: var(--danger-tint); color: var(--danger); }
.nc-sync .nc-btn { height: 36px; }
@keyframes nc-spin { to { transform: rotate(360deg); } }
.nc-spin { animation: nc-spin 1s linear infinite; }
@media (prefers-reduced-motion: reduce) { .nc-spin { animation: none; } .nc-btn { transition: none; } }

/* StatTile */
.nc-stat { background: var(--surface); border: 1px solid var(--hairline); border-radius: var(--radius-md); padding: var(--space-5) var(--space-6); display: grid; gap: var(--space-1); min-width: 200px; }
.nc-stat-label { font: 800 11px/14px var(--font-sans); letter-spacing: .06em; text-transform: uppercase; color: var(--ink-secondary); }
.nc-stat-value { font: 800 40px/44px var(--font-sans); letter-spacing: -0.02em; font-variant-numeric: tabular-nums; color: var(--ink); }
.nc-stat-delta { font: 700 13px/18px var(--font-sans); display: inline-flex; align-items: center; gap: var(--space-1); }
.nc-stat-delta-up { color: var(--success); } .nc-stat-delta-down { color: var(--danger); } .nc-stat-delta-flat { color: var(--ink-secondary); }
.nc-stat-caption { font: 400 13px/18px var(--font-sans); color: var(--ink-tertiary); }

/* Tema Sol: bordes en lugar de sombra, trazos más gruesos */
[data-theme="sol"] .nc-visit, [data-theme="sol"] .nc-meter, [data-theme="sol"] .nc-stat { border-width: 2px; }
[data-theme="sol"] .nc-input { border-width: 2px; }
[data-theme="sol"] .nc-gps-ok .nc-gps-dot, [data-theme="sol"] .nc-gps-bad .nc-gps-dot { color: #ffffff; }
[data-theme="sol"] .nc-gps, [data-theme="sol"] .nc-badge { box-shadow: inset 0 0 0 1px var(--hairline); }
[data-theme="sol"] .nc-meter-track { box-shadow: inset 0 0 0 1px var(--hairline); }
[data-theme="sol"] .nc-gps-warn .nc-gps-dot { color: #000000; }
```

---

## 6. Componentes

Props de todos los componentes:

```ts
/** Natural Control · CRM de Campo — tipos de los componentes (documentación). Global: window.NC */
export type IconName = "check" | "x" | "alert" | "pin" | "pinOff" | "cloudOff" | "refresh" | "clock" | "arrowUp" | "arrowDown" | "minus" | "plus" | "camera" | "crosshair";
export interface IconProps { name: IconName; small?: boolean; className?: string }

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** primary: la acción de la pantalla (una por vista). secondary: acción de apoyo. outline: neutra. quiet: enlace. danger: destructiva. */
  variant?: "primary" | "secondary" | "outline" | "quiet" | "danger";
  /** lg = 52px, para el botón principal de pantalla en Campo. */
  size?: "md" | "lg";
  block?: boolean;
  icon?: IconName;
}

export interface BadgeProps { tone?: "neutral" | "primary" | "success" | "warning" | "danger" | "accent"; icon?: IconName; children: React.ReactNode; className?: string }

export type GpsStatus = "VERIFICADA" | "FUERA_DE_RANGO" | "PRECISION_BAJA" | "SIN_UBICACION" | "SIN_REFERENCIA";
export interface GpsCheckProps {
  /** El estado que devolvió el servidor (GpsCheck.status del spec). */
  status: GpsStatus;
  /** Distancia en metros entre el RTC y la sede. */
  distanceM?: number;
  /** Tolerancia aplicada (se muestra en el title). */
  toleranceM?: number;
  /** true = cálculo local sin conexión, antes de que el servidor confirme. */
  preliminary?: boolean;
  className?: string;
}

export interface ComplianceMeterProps {
  label: string;
  /** Lo logrado a la fecha (COP o número de visitas). */
  value: number;
  /** La meta del periodo completo. */
  target: number;
  /** La meta a la fecha (prorrateada). Si falta, se usa target. El % se calcula contra este valor. */
  expected?: number;
  unit?: "money" | "count";
  thresholds?: { green: number; yellow: number };
  /** Texto corto al pie, p. ej. "faltan $ 400.000 hoy". */
  hint?: string;
  className?: string;
}

export interface VisitCardProps {
  client: string;
  site?: string;
  municipality?: string;
  /** Hora local "9:30" o "—" si no está agendada. */
  time?: string;
  duration?: string;
  status: "PROGRAMADA" | "EN_CURSO" | "REALIZADA" | "NO_REALIZADA" | "CANCELADA" | "ATRASADA";
  reason?: string;
  gps?: GpsCheckProps;
  /** Tiene mutaciones sin sincronizar. */
  pending?: boolean;
  onClick?: () => void;
  className?: string;
}

export interface TextFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  helper?: string;
  /** Mensaje de error; reemplaza al helper y marca el campo. */
  error?: string;
  required?: boolean;
}

export interface TabsProps {
  items: { id: string; label: string; count?: number }[];
  value?: string;
  onChange?: (id: string) => void;
  /** aria-label del grupo. */
  label?: string;
  className?: string;
}

export interface SyncBannerProps { state: "offline" | "syncing" | "error"; pending: number; onRetry?: () => void; className?: string }

export interface StatTileProps {
  label: string;
  /** Ya formateado: "87 %", "$ 3.700.000", "142". */
  value: string;
  delta?: string;
  deltaDirection?: "up" | "down" | "flat";
  /** Si subir es bueno (por defecto sí). Para "discrepancias", pase false. */
  deltaGood?: boolean;
  caption?: string;
  className?: string;
}
```

### Button

Botón en forma de píldora; `primary` es la acción por la que existe la pantalla y aparece **una sola vez** por vista.

**Qué provee quien lo usa:** `variant`, el texto (verbo en infinitivo, frase corta en minúscula inicial: «Cerrar visita», «Guardar cliente»), `onClick`, y opcionalmente `icon` (de `Icon`), `size` y `block`.

- `primary` (`primary` / `on-primary`): Cerrar visita, Guardar cliente, Enviar programación. En la App Campo va con `size="lg"` y `block` al pie de la pantalla, dentro de la zona del pulgar.
- `secondary` (`surface` con borde `hairline` y texto `primary`): acción de apoyo junto a la primaria (Agendar visita).
- `outline` (borde `border-control`): acciones neutras o de cancelación.
- `quiet`: acciones de texto (Ver todo, Cambiar). Alto mínimo igual a los demás.
- `danger` (`danger-solid` + blanco): solo para acciones destructivas confirmadas (Cancelar visita, Desactivar usuario). Nunca como primaria por defecto.

**Estados:** al presionar escala a 0,97 y oscurece a `primary-pressed`; foco con anillo de 2px `focus` separado 2px; deshabilitado al 45 % de opacidad (no use deshabilitado para explicar errores: muestre por qué).

**No:** dos primarios en la misma vista; íconos sin texto en acciones primarias; texto en mayúsculas.

### Badge

Etiqueta corta en mayúsculas y neutra (`surface-sunken` + `ink-secondary`) que dice el estado de un registro; el color va solo en un punto de 8px antes de la palabra.

**Qué provee quien lo usa:** `tone` y el texto (1–2 palabras). Opcional `icon`.

| Estado del dominio | `tone` |
|---|---|
| Visita PROGRAMADA | `primary` |
| EN_CURSO, «Nuevo», logro | `accent` (punto naranja de la flor) |
| REALIZADA, verificada | `success` |
| Atrasada, revisión pendiente, precisión baja | `warning` |
| Discrepancia, rechazada | `danger` (único tono que también colorea el texto) |
| Cancelada, no realizada, motivo de visita, tipo de cliente | `neutral` |

**No:** fondos de color en insignias (el fondo de color se reserva para avisos que bloquean); frases dentro de una insignia; más de dos insignias seguidas en una tarjeta de Campo; `accent` para advertencias (el naranja es identidad, la advertencia es `warning`).

### GpsCheck

El chip de verificación de la visita: dice en una línea si el RTC estaba donde dijo, con ícono, palabra y distancia. Es la pieza que identifica a este producto.

**Qué provee quien lo usa:** `status` tal como lo devuelve el servidor (`GpsCheck.status` del spec), `distanceM`, opcional `toleranceM`, y `preliminary` cuando la App Campo calculó la distancia sin conexión.

| `status` | Muestra | Tokens |
|---|---|---|
| `VERIFICADA` | ✓ Verificada · a 85 m | píldora `surface` con borde `hairline`, texto `ink`, punto `success-solid` |
| `FUERA_DE_RANGO` | ✕ Discrepancia · a 2,3 km | borde y texto `danger`, punto `danger-solid` — el único estado que colorea la píldora |
| `PRECISION_BAJA` | ⚠ Precisión baja | texto `ink`, punto `warning-solid` |
| `SIN_UBICACION` | Sin ubicación | texto `ink-secondary`, punto `surface-sunken` |
| `SIN_REFERENCIA` | Sede sin ubicación | texto `ink-secondary`, punto `surface-sunken` |

- La palabra **«Discrepancia»** es la que acordó el cliente; no use «Falsa», «Fraude» ni «Error».
- Distancia: metros enteros hasta 999 («a 85 m»), luego kilómetros con un decimal y coma («a 2,3 km»).
- `preliminary` agrega «Preliminar ·» y un borde punteado: el estado oficial llega al sincronizar.
- Verde y rojo nunca se distinguen solo por el tono: cada estado lleva ícono y palabra, y los puntos `success-solid` / `danger-solid` difieren ≥ 3:1 en luminosidad.

**Dónde:** al pie de `VisitCard`, en el resultado del cierre de visita, en el consolidado de la Consola y en la cola de revisión del mapa.

### ComplianceMeter

El semáforo de cumplimiento: cuánto lleva el RTC frente a su meta, con una marca que indica dónde debería ir hoy.

**Qué provee quien lo usa:** `label`, `value` (logrado), `target` (meta del periodo), `expected` (meta a la fecha, calculada por `goals.selectors.compliance`), `unit` y, si se quiere, `hint` («faltan $ 400.000 hoy»). Los umbrales vienen de `goals.traffic_light` (90 / 70).

- El **%** se calcula contra la meta a la fecha, no contra la del mes: un RTC al día 10 con un tercio del presupuesto está «Al día».
- La barra se llena contra la meta completa; la **marca vertical** (`ink`) es la meta a la fecha. Si la barra pasa la marca, va bien.
- Verde (`success-solid`) «Al día» ≥ 90 %, amarillo (`warning-solid`) «Atento» ≥ 70 %, rojo (`danger-solid`) «Atrasado». El color está en la barra y en el ícono; el porcentaje va en `ink` salvo cuando está atrasado (`danger`). El estado también va en palabra.
- Dinero con `NC.format.money` («$ 3.700.000»), visitas como número entero.

**Dónde:** pantalla Hoy y «Mis números» en Campo (ventas y visitas, uno debajo del otro); columnas del tablero de cumplimiento en la Consola.

### VisitCard

La tarjeta de una visita en la agenda de la App Campo: hora, cliente, sede y municipio, estado y verificación, todo tocable como un solo objetivo.

**Qué provee quien lo usa:** `client`, `site`, `municipality`, `time` (hora local «9:30»; «—» si se registró al vuelo), `status`, opcional `duration`, `reason` (motivo de visita), `gps` (props de `GpsCheck`, solo si está cerrada), `pending` (hay cambios sin sincronizar) y `onClick` (abre el detalle).

- Toda la tarjeta es el botón; mínimo `tap-min` de alto. Nada de acciones secundarias dentro de la tarjeta (se hacen en el detalle).
- El nombre del cliente va en una línea con elipsis; la sede y el municipio, en `ink-secondary`.
- Orden de insignias: estado → motivo → verificación → «Sin sincronizar».
- En listas: separación `space-3` sobre `canvas`, sin sombras.

**No:** mostrar valores en COP en la tarjeta de agenda (van en el detalle); usar color de fondo para el estado.

### TextField

Campo de texto con etiqueta siempre visible arriba, pensado para escribir en campo con una mano: 48px de alto y texto de 17px.

**Qué provee quien lo usa:** `label`, `value`/`onChange` o los atributos de `<input>` que necesite (`inputMode="numeric"` para cantidades, `type="tel"` para teléfonos, `autoComplete`), opcional `helper`, `error` y `required`.

- La etiqueta nunca se reemplaza por el placeholder; el placeholder solo da un ejemplo («Ej.: 310 555 1234»).
- `error` reemplaza la ayuda, pone borde de 2px `danger` y se anuncia por `aria-describedby`. Diga qué hacer: «Escribe el NIT sin dígito de verificación».
- Validación al salir del campo, no mientras se escribe.
- En Campo, un campo por fila; en la Consola, hasta dos columnas.

### Tabs

Pestañas segmentadas en píldora para cambiar entre vistas de la misma lista (Hoy · Pendientes · Realizadas), con contador opcional.

**Qué provee quien lo usa:** `items` (`id`, `label`, `count`), `value`, `onChange` y un `label` accesible para el grupo.

- Máximo 4 pestañas; en Campo ocupan el ancho de la pantalla.
- El contador usa `primary-tint` y cifras tabulares; muestre 0 en lugar de ocultarlo.
- La pestaña activa se marca con superficie blanca y borde `hairline`, no con color de texto únicamente.

### SyncBanner

Banda fija bajo la barra superior de la App Campo que dice si hay registros sin enviar; desaparece cuando todo está al día.

**Qué provee quien lo usa:** `state` (`offline`, `syncing`, `error`), `pending` (cantidad en el outbox) y `onRetry` para el estado de error (abre la pantalla «Pendientes»).

- `offline` en `surface` con texto `ink` e ícono `warning`: no es un error, es una condición normal en finca.
- `syncing` en `surface` con texto `ink-secondary` e ícono `primary` girando (se detiene con `prefers-reduced-motion`).
- `error` en `danger-tint` con el botón «Ver pendientes»: el único estado con fondo de color, porque requiere acción.
- Texto siempre con la cantidad y en singular o plural correcto.

**No:** ocultar la banda mientras haya pendientes; usar modales para avisar de la falta de señal.

### StatTile

Tarjeta de indicador de la Consola: una cifra grande, su etiqueta y la variación frente al periodo anterior.

**Qué provee quien lo usa:** `label`, `value` ya formateado, opcional `delta` («+12 % vs. sep.»), `deltaDirection`, `deltaGood` (pase `false` cuando subir es malo, como en «Discrepancias») y `caption`.

- Cifra en el estilo `kpi` con cifras tabulares; una idea por tarjeta.
- Fila de 3 a 4 tarjetas en la parte superior de cada tablero; en móvil, desplazamiento horizontal.
- La variación lleva flecha y signo; el color sale de si el cambio es bueno o malo, no de si sube.

### Icon

Íconos de trazo de 24×24 en el estilo de Lucide (trazo 2, puntas redondeadas), que heredan el color del texto (`currentColor`).

**Qué provee quien lo usa:** `name` y opcionalmente `small` (14px en lugar de 18px). En la aplicación real se usa el paquete `lucide-react`; este bundle trae solo los íconos que usan los componentes del sistema.

- Siempre junto a una palabra en acciones y estados; un ícono solo, únicamente en botones con `aria-label`.
- Mapa de íconos del dominio: verificación `check` / `x` / `alert`, ubicación `pin` / `pinOff` / `crosshair`, sin conexión `cloudOff`, sincronizar `refresh`, hora `clock`, foto `camera`.

---

## 7. Logotipo

`logo-natural-control-2024.png` — logotipo 2024 (wordmark en `brand-navy` #124481, eslogan en gris, microscopio y flor en `brand-orange` #ea8a26). Es un recorte en mapa de bits del archivo «LOGOTIPO 2024 NATURAL CONTROL SA» que entregó el cliente, sobre su fondo gris claro original.

- Úselo solo sobre `surface` claro (blanco). No sobre `canvas` oscuro ni sobre fotos: el microscopio es blanco y desaparece.
- No lo redibuje, no lo recolore, no separe la flor del wordmark.
- **Pendiente:** pedir a Natural Control el archivo vectorial (SVG o AI), las versiones en negativo y solo-flor para el ícono de la PWA. Hasta tenerlo, el ícono de la app se arma con el nombre en tipografía, no con un símbolo dibujado.


El archivo `logo-natural-control-2024.png` se entrega junto con este documento.
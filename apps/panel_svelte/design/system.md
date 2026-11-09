# Sistema de diseño del panel de agencias — «Bosque de niebla»

Sincronizado de solo lectura sobre `feat/arquitectura-viajero` @ d424c8b. Solo hay valores que existen en las fuentes; cada entrada nombra su `path`.

Fuentes leídas:

- `src/app.css` — única fuente de tokens (`@theme`, `:root`, `.dark`, `@theme inline`) y de las clases compartidas (`.campo`, `.btn`, `.chip`, `.tabla`, `.pildora`, `.tarjeta`, `.prueba`…).
- `src/fuentes.css` — tipografías autoalojadas (`@font-face`).
- `src/lib/shared/ui/*` — `PageHeader`, `Pagina`, `Tarjeta`, `Metrica`, `Dato`, `StatusPill`, `Aviso`, `Empty`, `Select`, `Toast`, `Avatar`, `MarcaTile`, `Icono`, `iconos.ts`, `tonos.ts`, `Curvas`.
- `src/lib/features/agencias/components/Shell.svelte` y `src/lib/features/agencias/model/navegacion.ts` — uso real de los tokens en el marco (solo como evidencia de uso).

Modo: el oscuro se activa con la clase `.dark` en `<html>` (`@custom-variant dark (&:where(.dark, .dark *))`, `src/app.css`). `color-scheme` va en `:root` (light) y `.dark` (dark).

## Colores

Cada token existe en claro y oscuro. Tailwind los expone con `--color-<nombre>` (`@theme inline`, `src/app.css`), por ejemplo `bg-superficie`, `text-tinta-2`, `border-linea`.

| Token | Claro | Oscuro | Uso (según el comentario de `src/app.css`) |
| --- | --- | --- | --- |
| `--niebla` | `#edf0ea` | `#0e1612` | Fondo de página (`body`) |
| `--niebla-2` | `#e1e7df` | `#141f19` | Zonas hundidas: cabecera de tarjeta, cabecera de tabla, hover |
| `--superficie` | `#f9fbf7` | `#18261f` | Tarjetas, campos, menús |
| `--linea` | `#ccd6ca` | `#2a3d33` | Bordes decorativos (no identifican controles) |
| `--contorno` | `#66786b` | `#7c9684` | Borde de controles (≥ 3:1) |
| `--tinta` | `#17261e` | `#e6efe8` | Texto principal |
| `--tinta-2` | `#405146` | `#b7c9bc` | Texto secundario |
| `--tinta-3` | `#566659` | `#97ad9e` | Texto terciario (≥ 4,5:1) |
| `--bosque` | `#1d382a` | `#08100c` | El monte oscuro: riel, barra del celular, tarjeta de dinero |
| `--bosque-2` | `#2b4b3a` | `#14241b` | Superficie elevada sobre el monte |
| `--sobre-bosque` | `#e8f0e4` | `#e6efe8` | Texto sobre el monte |
| `--sobre-bosque-2` | `#b9cdbe` | `#a9bfaf` | Texto secundario sobre el monte |
| `--helecho` | `#3a6b43` | `#8fcb93` | Acción principal, enlaces, barras |
| `--sobre-helecho` | `#ffffff` | `#0b1f11` | Texto sobre `helecho` |
| `--musgo` | `#6a8c4b` | `#7fa35c` | Curvas de nivel, barras secundarias |
| `--relleno` | `#cbddb8` | `#2d4b35` | Relleno de cupos reservados (decorativo, 1,4:1 sobre superficie) |
| `--heliconia` | `#b5361e` | `#ff8f70` | Único acento cálido: hoy, urgente, hito activo, errores |
| `--sobre-heliconia` | `#ffffff` | `#2b0d06` | Texto sobre `heliconia` |
| `--heliconia-bg` | `#fbe9e2` | `#3a1a12` | Fondo de aviso urgente y de error |
| `--pico` | `#9c6208` | `#f0b94d` | Estrellas de reseñas |
| `--prueba-bg` | `#f4e8c6` | `#3a3116` | «Modo de prueba», avisos y notas |
| `--prueba-ink` | `#55400a` | `#f0dda2` | Tinta de `prueba-bg` |
| `--foco` | `#0e5f7a` | `#8bd3ea` | Anillo de foco sobre claro |
| `--foco-bosque` | `#a9dceb` | `#8bd3ea` | Anillo de foco sobre el monte (`.monte` fija `--anillo`) |
| `--bruma` | `rgb(255 255 255 / 0.65)` | `rgb(130 170 150 / 0.1)` | Velo decorativo de la cabecera |

Tonos de aviso (`src/lib/shared/ui/tonos.ts`): `info` = `niebla-2` / `tinta` / borde `linea`; `alerta` = `prueba-bg` / `prueba-ink` / borde `prueba-ink` al 40 %; `error` = `heliconia-bg` / `heliconia` / borde `heliconia`. Brotes del ícono: `info` = `superficie`+`helecho`; `alerta` = `prueba-ink`+`prueba-bg`; `error` = `heliconia`+`sobre-heliconia`.

Mezclas que usan las fuentes (`src/app.css`): `color-mix(in srgb, var(--helecho) 10%, transparent)` (píldora ok), `color-mix(in srgb, var(--foco) 25%, transparent)` (anillo del campo), `color-mix(in srgb, var(--niebla-2) 60%, transparent)` (hover de fila), `color-mix(in srgb, var(--sobre-bosque) 14%, transparent)` (píldora sobre el monte).

## Tipografía

| Token | Pila | Uso | Fuente |
| --- | --- | --- | --- |
| `--font-sans` | `"Atkinson Hyperlegible Next", Calibri, "Segoe UI Variable Text", "Segoe UI", system-ui, sans-serif` | Texto e interfaz (`html`) | `src/app.css`; pesos 400/600/700 en `src/fuentes.css` |
| `--font-titulo` | `"Newsreader", Constantia, "Palatino Linotype", Cambria, Georgia, serif` | `h1–h4` (700), `.cifra` (600), precios, fechas, horas | `src/app.css`; pesos 700 y cursiva 400 en `src/fuentes.css` |

- Cuerpo: `font-size: 17px`, `line-height: 1.5`, `font-variant-numeric: lining-nums` (`body`, `src/app.css`).
- Cifras: `.cifra` = Newsreader 600, `lining-nums tabular-nums` (`src/app.css`).
- Tamaños que aparecen hoy (px, sin escala declarada; L7 de la feature cuenta 24 distintos): 12 (`.pildora`), 12.5, 13 (`.etiqueta-campo`, `.etiqueta-seccion`, `.tabla th`), 14 (`.chip`, `.prueba`, `Metrica` etiqueta), 15 (`.btn`, `.tabla`, `Tarjeta` descripción), 16 (`.campo`), 17 (cuerpo, `PageHeader` contexto, `.tabla td.num`), 18, 19, 22 (`Tarjeta` h2), 23/30 (`Metrica` valor), 24/26 (`.titulo-seccion`), 26 (fecha de la cabecera), 28, 32/40 (`PageHeader` h1), 42/46 (dinero). Fuentes: `src/app.css`, `src/lib/shared/ui/*.svelte`, `Shell.svelte`.
- Etiqueta de sección: 13 px, 700, `letter-spacing: 0.08em`, mayúsculas, `tinta-2` (`.etiqueta-seccion`, `src/app.css`).

## Espaciado

No hay escala propia: se usa la de Tailwind (`@import "tailwindcss"`, `src/app.css`; 1 unidad = 0,25 rem). Valores recurrentes:

- Página: `px-4 pt-6 pb-12`, `sm:px-6`, `lg:px-10 lg:pt-8`; tope `ANCHO_DATOS = 1920` (`src/lib/shared/ui/Pagina.svelte`).
- Tarjeta: cuerpo `p-5`; cabecera `px-5 pt-4 pb-3.5` (`Tarjeta.svelte`).
- Métrica: `px-4 py-4 sm:px-5` (`Metrica.svelte`).
- Botón: `min-height 44px`, `padding 9px 20px`, `gap 8px` (`.btn`); chip `min-height 40px`, `padding 6px 16px` (`.chip`).
- Rejilla del Resumen: `gap-6`, `mt-9`, `mt-11`, `gap-x-10 gap-y-9` (`ResumenPage.svelte`).
- Riel del escritorio: `w-64` (256 px), `px-5 py-7`, `gap-6` (`Shell.svelte`).

## Radios

| Token / valor | Uso | Fuente |
| --- | --- | --- |
| `--radius-hoja` `6px 20px 6px 20px` | `.tarjeta` | `src/app.css` |
| `--radius-hoja-chica` `4px 14px 4px 14px` | Menús de `Select`, bloques de salida | `src/app.css`, `Select.svelte` |
| `--radius-hoja-grande` `8px 30px 8px 30px` | Panel «Quiénes van» | `src/app.css` |
| `--radius-brote` `50% 50% 50% 8px` | Avatar, `MarcaTile`, íconos de aviso | `src/app.css`, `Avatar.svelte`, `MarcaTile.svelte` |
| `999px` | `.btn`, `.chip`, `.pildora`, `.prueba`, `.boton-icono`, `.switch` | `src/app.css` |
| `12px` | `.campo` | `src/app.css` |
| Sueltos (sin token) | `10px` ítems del menú, `8px 24px 8px 24px` aviso, `8px 34px 8px 34px` dinero | `Shell.svelte`, `Aviso.svelte`, `DineroDelMes.svelte` |

## Sombras

- Menús y listas desplegables: `shadow-xl shadow-black/20` (`Select.svelte`); menú de cuenta `0 18px 40px -12px rgb(0 0 0 / 0.35)` (`Shell.svelte`).
- Toast: `shadow-xl` (`Toast.svelte`). Interruptor: `0 1px 3px rgb(0 0 0 / 0.3)` (`.switch::after`, `src/app.css`).
- Anillo de selección de una salida: `0 0 0 4px var(--superficie), 0 0 0 6px var(--heliconia)` (`AgendaSemana.svelte`).

## Foco, movimiento y puntos de quiebre

- `:focus-visible`: `outline: 3px solid var(--anillo, var(--foco)); outline-offset: 3px` (`src/app.css`); `.campo:focus` = borde `foco` + halo del 25 %.
- Animaciones `aparecer` (0,35 s) y `pulso`; con `prefers-reduced-motion: reduce` se anulan animaciones y transiciones (`src/app.css`).
- `--breakpoint-ancho: 86rem` (1376 px) además de los de Tailwind (`src/app.css`); el Shell usa `lg` = 1024 px para pasar de barra inferior a riel (`Shell.svelte`).

## Reglas de componentes

- **Botón** `.btn`: píldora, 44 px mínimo, 15 px/700. Variantes: `.btn-primario` (`helecho`/`sobre-helecho`), `.btn-secundario` (borde `contorno`, fondo `superficie`), `.btn-peligro` (borde y tinta `heliconia`), `.btn-texto` (sin borde, `tinta-2`). Deshabilitado: opacidad 0,55. `.boton-icono`: círculo de 44 px, borde `contorno`. (`src/app.css`)
- **Campo** `.campo`: 44 px, radio 12, borde `contorno`, 16 px; etiqueta `.etiqueta-campo` 13/700 `tinta-2`; inválido = borde `heliconia`. (`src/app.css`)
- **Chip** `.chip`: filtro píldora, 40 px, 14/700; `aria-pressed="true"` = fondo `helecho` + `sobre-helecho`. (`src/app.css`)
- **Píldora de estado** `.pildora`: 12/700, `ok` (`helecho` al 10 %), `alerta` (`prueba-*`), `error` (`heliconia-*`), `neutra` (`niebla-2`); `StatusPill.svelte` mapea los estados (Verificada, En verificación, RNT vigente, RNT por vencer…).
- **Tarjeta** `.tarjeta`: borde `linea`, fondo `superficie`, radio hoja. Con título (`Tarjeta.svelte`): cabecera `niebla-2` con curvas de nivel, h2 de 22 px, acción a la derecha.
- **Métrica** (`Metrica.svelte`): tarjeta con `dt` 14/700 `tinta-2` y `dd` `.cifra` 23/30 px; tonos `acento`, `alerta` (`prueba-ink`), `ok`.
- **Tabla** `.tabla`: 15 px, cabecera `niebla-2` 13/700 con `letter-spacing`, filas con `linea` fina, hover `niebla-2` al 60 %; `td.num` y `td.fecha` en Newsreader 17 px.
- **Encabezado de página** (`PageHeader.svelte`): h1 32/40 px, contexto 17 px `tinta-2` (máx. 68ch), acción principal a la derecha.
- **Aviso** (`Aviso.svelte`): radio `8px 24px 8px 24px`, brote de 36 px con ícono, tonos de `tonos.ts`.
- **Modo de prueba** `.prueba`: píldora con borde de trazos, `prueba-bg`/`prueba-ink`, 14/700.
- **Estado vacío** (`Empty.svelte`): ícono en brote, título de 24 px, mensaje de 16 px, acción opcional.
- **Select** (`Select.svelte`): botón `.campo` con chevron y lista en radio hoja-chica; se cierra con Escape y al perder el foco.
- **Toast** (`Toast.svelte`): píldora `tinta` sobre `niebla`, 15/600, abajo al centro, `role="status"`.
- **Navegación** (`navegacion.ts`, `Shell.svelte`): cinco secciones — Resumen, Planes, Ventas, Liquidaciones, Cuenta para dispersiones (corta «Cuenta»). Riel `bosque` en escritorio; barra inferior de 68 px en el celular.
- **Íconos** (`iconos.ts`, `Icono.svelte`): línea de 1,8 px sobre lienzo de 24, `stroke="currentColor"`, decorativos (los nombra el texto o el `aria-label`).
- **Decoración**: `Curvas.svelte` (curvas de nivel), bordes de trazos (`.prueba`, salidas pasadas), formas de hoja (`Helecho`, `Heliconia`). Hoy aparece en casi todas las pantallas (ver L7 de la feature).

## Lo que las fuentes no definen

No hay escala tipográfica, escala de espaciado ni escala de sombras propias; las direcciones de `panel-profesional` proponen una (marcada como propuesta en cada artboard) sin presentarla como token del proyecto.

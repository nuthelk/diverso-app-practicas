# 3. Arquitectura del panel

Este capítulo responde tres preguntas: **dónde vive cada cosa** en `apps/panel_svelte`, **cómo viaja
un dato** desde Supabase hasta la pantalla y **cómo se pasa de una pantalla a otra** con SvelteKit.
Termina con una lista de pasos para **agregar una pantalla nueva**. Es el capítulo que más te sirve
para empezar a tocar código.

> Volver al [plan de aprendizaje](README.md). Este capítulo cubre las sesiones 1 (secciones 1 y 2)
> y 5 (secciones 3 a 11).
> La estructura salió de la tarea «Arquitectura del panel Svelte»: primero por funcionalidad,
> después con el árbol de **SvelteKit** y por último con las mismas cuatro carpetas por rol dentro de
> cada funcionalidad y las pruebas en `tests/unit/`. Se parece a propósito a la de `apps/viajero`:
> quien conozca una encuentra la otra.
> Lo que se afirma de SvelteKit está comprobado contra la versión instalada (**2.70.3**, en
> `apps/panel_svelte/node_modules/@sveltejs/kit`).

## Contenido

1. [El mapa de carpetas](#1-el-mapa-de-carpetas)
2. [Qué va dónde y por qué](#2-qué-va-dónde-y-por-qué)
3. [Reglas de importación y alias](#3-reglas-de-importación-y-alias)
4. [Cómo viaja un dato: página → `*.api.ts` → Supabase](#4-cómo-viaja-un-dato-página--apits--supabase)
5. [SvelteKit estático y el router por hash](#5-sveltekit-estático-y-el-router-por-hash)
6. [Rutas: carpetas en `src/routes`](#6-rutas-carpetas-en-srcroutes)
7. [Navegar y saber en qué ruta estás](#7-navegar-y-saber-en-qué-ruta-estás)
8. [Layouts y guard de sesión](#8-layouts-y-guard-de-sesión)
9. [Lo que SvelteKit trae y el panel no usa](#9-lo-que-sveltekit-trae-y-el-panel-no-usa)
10. [Convenciones de nombres](#10-convenciones-de-nombres)
11. [Checklist: agregar una pantalla nueva](#11-checklist-agregar-una-pantalla-nueva)

---

## 1. El mapa de carpetas

```
apps/panel_svelte/
|-- svelte.config.js      SvelteKit: adapter-static, router por hash, alias $tests
|-- vite.config.ts        Vite + Tailwind + el plugin de SvelteKit
|-- vitest.config.ts      Vitest (jsdom) + el mismo plugin
|-- tsconfig.json         extiende el que SvelteKit genera en .svelte-kit/ (con los alias)
|-- static/               archivos que se sirven tal cual: favicon, íconos, manifest, logo
|-- tests/
|   |-- fixtures.ts  supabase-falso.ts  pagina-falsa.svelte.ts   ayudas de las pruebas
|   `-- unit/             las pruebas: espejo de src/ (sección 2)
`-- src/
    |-- app.html          la plantilla HTML base: fija el tema (claro/oscuro) antes de pintar
    |-- app.d.ts          tipos globales de SvelteKit (aquí solo la forma del error)
    |-- app.css           Tailwind: colores, tema claro/oscuro y las clases compartidas (.tarjeta, .btn, .campo…)
    |-- hooks.client.ts   qué mostrar cuando un error no se atrapó (handleError)
    |-- params/
    |   `-- doc.ts        matcher del parámetro [doc=doc]: solo documentos legales que existen
    |-- routes/           el enrutamiento por carpetas: una carpeta = una URL
    |   |-- +layout.svelte    raíz: guard de sesión y Toast
    |   |-- +error.svelte     la página de error (404 incluido)
    |   |-- +page.svelte      «/» → manda a /starter
    |   |-- login/  starter/  consentimiento/   páginas sin menú lateral
    |   |-- admin/  admin/dispersiones/     rol admin, sin menú lateral
    |   |-- legal/[[doc=doc]]/              documentos legales (parámetro opcional)
    |   `-- (panel)/          grupo de rutas: no cuenta en la URL, aporta el marco con menú
    |       |-- +layout.svelte    el Shell
    |       `-- dashboard/  planes/  ventas/  liquidaciones/  cuenta-dispersiones/  onboarding/
    `-- lib/              el código reutilizable (alias $lib)
        |-- features/<funcionalidad>/     cada una con pages/ components/ api/ model/
        |   |-- admin/            verificación de agencias y dispersiones (rol admin)
        |   |-- agencias/         onboarding, logo, verificación RNT y el Shell
        |   |-- auth/             login, starter, estado de sesión y guard
        |   |-- legal/            documentos y consentimiento (Ley 1581)
        |   |-- liquidaciones/    liquidaciones, detalle y cuenta de dispersión
        |   |-- planes/           lista de planes, formulario, fechas y cupos
        |   |-- resumen/          el dashboard
        |   `-- ventas/           ventas y conciliación
        `-- shared/
            |-- api/              supabase.ts (el cliente) y errores.ts
            |-- lib/              format.ts, ruta.ts, toast.svelte.ts
            `-- ui/               Aviso, Avatar, Empty, EsqueletoPagina, Icono, Logo, MarcaTile, Metrica,
                                  PageHeader, Pagina, Select, Skeleton, Spinner, StatusPill, Tarjeta, Toast
                                  (y iconos.ts, tonos.ts)
```

Dentro de cada funcionalidad, por ejemplo `src/lib/features/planes/`, **todo archivo vive en una de
cuatro carpetas por rol**; no queda nada suelto en la raíz de la funcionalidad:

```
planes/
|-- pages/                    las pantallas: lo que dibuja un +page.svelte
|   |-- PlanesPage.svelte         la lista
|   `-- PlanFormPage.svelte       el formulario
|-- components/               piezas que solo usa esta funcionalidad
|   |-- FechasModal.svelte
|   `-- plan-form/            las secciones del formulario (Seccion, SeccionEsencial…)
|-- api/
|   `-- planes.api.ts         acceso a datos (Supabase)
`-- model/                    tipos, lógica pura y estado
    |-- plan.ts               borrador del plan, categorías…
    |-- politica.ts           política de cancelación
    `-- duracion.ts           duración
```

Y sus pruebas, en otro árbol con la misma forma (`tests/unit/features/planes/`):

```
planes/
|-- api/planes.api.test.ts
|-- model/                    plan.test.ts  politica.test.ts  duracion.test.ts
`-- pages/PlanFormPage.test.ts
```

Y una ruta, por ejemplo `src/routes/(panel)/planes/`, es solo carpetas con archivos `+page.svelte`:

```
(panel)/planes/
|-- +page.svelte              #/planes
|-- nuevo/+page.svelte        #/planes/nuevo
`-- editar/[[id]]/+page.svelte    #/planes/editar y #/planes/editar/<id>
```

---

## 2. Qué va dónde y por qué

**Primero por funcionalidad, y dentro de ella por rol.** Todo lo que cambia cuando tocas «planes»
está en `lib/features/planes/`, y dentro cada archivo cae en `pages/`, `components/`, `api/` o
`model/` según lo que **hace**. Se lee igual en las ocho funcionalidades. Cada una crea solo las
carpetas que necesita: `auth` y `resumen` tienen `pages/` y `model/`; `ventas`, sin `components/`.
Lo que se evita es la otra mezcla: un `pages/`, un `components/` y un `api/` **para toda la app**
te obliga a abrir tres carpetas lejanas para un solo cambio; aquí las cuatro están juntas bajo
`planes/`.

**`routes/` es el mapa de URLs; `lib/` es el código.** SvelteKit decide qué pantalla mostrar mirando
las carpetas de `src/routes`, y esos archivos son **delgados a propósito**: solo conectan una URL con
la pantalla que vive en `lib/features/`. Cambiar una URL es mover una carpeta; cambiar una pantalla
no toca las rutas.

| Carpeta | Qué contiene | Qué NO va aquí |
|---|---|---|
| `routes/` | Un `+page.svelte` por URL, los `+layout.svelte` y `+error.svelte` | Lógica de negocio ni pantallas con contenido |
| `lib/features/<f>/` | Páginas, componentes, acceso a datos y lógica **de una funcionalidad**, en `pages/`, `components/`, `api/` y `model/` | Archivos sueltos en la raíz de la funcionalidad; nada que otra capa necesite sin depender de la funcionalidad |
| `lib/shared/` | Lo genérico y reutilizable: cliente de Supabase, traducción de errores, formato, `rutaActual`, toast, componentes de UI | Cualquier cosa que nombre una funcionalidad o importe de `$app/*` |
| `params/` | Validadores de parámetros de ruta (*matchers*) | Nada más |
| `tests/` | Las pruebas, en `tests/unit/` (espejo de `src/`), y sus ayudas en la raíz: datos de ejemplo, Supabase falso, `$app/state` falso | Código de producción |
| `static/` | Archivos que se copian tal cual a `dist/` | Nada que Vite deba procesar |

### Qué va dentro de una funcionalidad

| Carpeta | Qué contiene | Cómo se llaman los archivos | Equivale en `apps/viajero` a |
|---|---|---|---|
| `pages/` | Una **pantalla** por archivo: su `+page.svelte` la dibuja; carga datos y reparte a componentes | `<Nombre>Page.svelte` | `views/*_view.dart` |
| `components/` | Piezas de la pantalla que solo esta funcionalidad usa (un grupo grande va en su subcarpeta: `plan-form/`) | `PascalCase.svelte` | `widgets/` de la funcionalidad |
| `api/` | **Acceso a datos**: habla con Supabase y devuelve datos tipados | `<f>.api.ts` | Los *services* y *repositories* |
| `model/` | Tipos y **lógica pura** (sin Svelte, sin red, sin DOM) y el estado reactivo compartido | `<f>.ts` (`plan.ts`, `ventas.ts`…); `<f>.svelte.ts` para estado (solo `auth`) | `packages/diverso_core/lib/models/` y un `ChangeNotifier` global |

Los imports entre esas carpetas van siempre en el mismo sentido: `pages/` → `components/` → `api/` →
`model/`. Una carpeta puede importar de las que tiene a su derecha, nunca de las de su izquierda:
`model/` no conoce a `api/` ni a las pantallas, y por eso se prueba sin montar nada.

Equivalencias del resto de piezas:

| `apps/viajero` (Flutter) | `apps/panel_svelte` |
|---|---|
| `lib/router/app_router.dart` y `app_routes.dart` | Las carpetas de `src/routes/` |
| `lib/router/sesion_redirect.dart` | `src/lib/features/auth/model/sesion.ts` (usado en `src/routes/+layout.svelte`) |
| `lib/ui/shell/app_shell.dart` | `src/lib/features/agencias/components/Shell.svelte` (usado en `src/routes/(panel)/+layout.svelte`) |
| `lib/ui/core/widgets/` | `src/lib/shared/ui/` |
| `ui/features/<f>/view_models/` | No hay clase aparte: el estado vive en el `<script>` de la página (`$state`, `$derived`) y las reglas en el `.ts` puro de `model/` |

> **Por qué el `Shell` vive en `features/agencias/` y no en `shared/`.** El `Shell` muestra la
> tarjeta de la agencia y su aviso de verificación: conoce la funcionalidad `agencias` y `auth`.
> `shared/` no puede importar de las funcionalidades (sección 3), así que el marco que las usa
> pertenece a una de ellas.

> **Por qué la lógica pura va en `model/*.ts` y no dentro del `.svelte`.** Una función de entrada y
> salida (`filtrarVentas`, `validarPolitica`, `rutaActual`, `redireccionSesion`) se prueba con
> `expect(...)` en milisegundos, sin montar nada. El componente queda para lo que solo él puede
> hacer: leer estado, pintar y reaccionar a eventos.

### Dónde viven las pruebas: `tests/unit/`, espejo de `src/`

**`src/` contiene solo código.** Las pruebas están en `tests/unit/`, que repite la estructura de
`src/lib`, `src/params` y `src/routes`: la prueba de un archivo está en **su misma ruta**, con
`src/lib` reemplazado por `tests/unit` y `.test` antes de la extensión.

| Código | Su prueba |
|---|---|
| `src/lib/features/planes/model/plan.ts` | `tests/unit/features/planes/model/plan.test.ts` |
| `src/lib/features/planes/api/planes.api.ts` | `tests/unit/features/planes/api/planes.api.test.ts` |
| `src/lib/features/planes/pages/PlanFormPage.svelte` | `tests/unit/features/planes/pages/PlanFormPage.test.ts` |
| `src/lib/shared/lib/ruta.ts` | `tests/unit/shared/lib/ruta.test.ts` |
| `src/params/doc.ts` | `tests/unit/params/doc.test.ts` |
| Todos los `src/routes/**/+page.svelte` | `tests/unit/routes/arbol.test.ts` (una sola prueba que lee el árbol) |

Se eligió así porque el listado de una carpeta de `src/` muestra solo lo que se compila (sin un
`*.test.ts` al lado de cada archivo), un único patrón de Vitest (`tests/**/*.test.ts`) encuentra todo,
y es el árbol de SvelteKit que se tomó de modelo (`tests/` en la raíz). **El costo frente a
tener la prueba junto al archivo:**

- Son dos árboles con la misma forma, y **ninguna herramienta comprueba que coincidan**: si mueves
  `plan.ts`, mueves también `plan.test.ts`.
- La prueba no puede importar con `./`: usa `$lib/…` y `$tests/…` (sección 3). Para `src/params` y
  `src/routes`, que no cuelgan de `$lib`, el import es relativo: `../../../src/params/doc`.
- Para saber si un archivo tiene prueba, la buscas en el árbol espejo en vez de verla al lado.

La mecánica de las pruebas (qué se mockea y cómo) está en el [capítulo 4](04-pruebas-y-herramientas.md#4-vitest-y-testing-library).

### Las piezas visuales compartidas

Todas las pantallas comparten el mismo lenguaje visual (tarjetas aireadas, píldoras, bordes finos,
etiquetas tenues). Para que no se copie en cada página, cada patrón vive en **un solo sitio**: o en
`src/app.css` (clases) o en `src/lib/shared/ui/` (componentes).

| Pieza | Qué resuelve | Se usa en |
|---|---|---|
| `app.css` | Los colores y, en `@layer components`, las clases repetidas: `.tarjeta`, `.btn` (`btn-primario`, `btn-secundario`, `btn-peligro`, `btn-texto`), `.campo`, `.etiqueta-campo`, `.chip`, `.tabla`, `.pildora-*`, `.switch`, `.boton-icono`, `.enlace`, `.etiqueta-seccion` | todas las pantallas |
| `Pagina` | Contenedor de una pantalla: mismo aire a los lados y arriba, ancho máximo | las páginas con menú y las de administración |
| `PageHeader` | Cabecera: título (h1), una línea de contexto y la acción principal a la derecha | Resumen, Planes, Ventas, Liquidaciones, Cuenta, Admin, Onboarding, formulario de plan |
| `Tarjeta` | Tarjeta con título (h2), descripción y acción opcionales | Ventas, Liquidaciones, detalle de liquidación, formulario de plan |
| `Aviso` | Franja de aviso con ícono según el tono (`info`, `alerta`, `error`) | Resumen, documentos legales, aviso de modo de prueba |
| `Metrica` | Una cifra con su etiqueta, con la tinta del lado de la plata en que está | Ventas, Liquidaciones, detalle de liquidación |
| `Icono` + `iconos.ts` | Ícono de línea decorativo; los trazos viven en un solo archivo | casi todas |
| `MarcaTile` | El colibrí sobre el azul de la marca | marco, login, starter, legal, error |
| `Spinner`, `Skeleton`, `EsqueletoPagina`, `Empty` | Estados de carga y de vacío | las pantallas que piden datos |

La regla: si un patrón aparece en dos pantallas, se mueve a una de estas piezas; si es un color o un
borde que cambia con el tema, se usa el token de `app.css` (`text-suave`, `border-linea`,
`text-acento-ink`…) en vez de repetir `dark:…` en cada página.

---

## 3. Reglas de importación y alias

SvelteKit trae **un alias propio**: `$lib` significa `src/lib`. El panel suma otro, `$tests`, que
apunta a `tests/` (la configuración está en el [capítulo 4](04-pruebas-y-herramientas.md#2-vite-sveltekit-y-los-alias)).

| De → a | ¿Permitido? | Cómo se escribe |
|---|---|---|
| Dentro de una funcionalidad (entre sus `pages/`, `components/`, `api/` y `model/`) | Sí | **Relativo**: `../api/planes.api`, `../model/plan`, `../components/FechasModal.svelte`; en la misma carpeta, `./Seccion.svelte`; desde `components/plan-form/`, `../../model/plan` |
| Entre carpetas distintas de `lib/` | Sí | **Con `$lib/`**: `$lib/shared/lib/toast.svelte`, `$lib/features/agencias/api/agencias.api` |
| Funcionalidad → `shared/` | Sí | `$lib/shared/…` |
| Funcionalidad → otra funcionalidad | Sí, **hacia sus modelos, su `.api.ts` y algunos componentes** | `$lib/features/agencias/model/agencia` |
| `shared/` → funcionalidad, `routes/` o `$app/*` | **Nunca** | — |
| Funcionalidad → `routes/` | **Nunca** | — |
| `routes/` → `lib/` | Sí | `$lib/features/…` |
| Una prueba (`tests/unit/`) → el código que prueba | Sí | **Siempre `$lib/…`**, y `$tests/…` para las ayudas; nunca `./`. Solo `src/params` y `src/routes` (que no cuelgan de `$lib`) van relativos: `../../../src/params/doc` |

Por qué la regla: dentro de una funcionalidad el relativo es corto (`../model/plan`, a lo sumo
`../../model/plan`) y la funcionalidad entera se puede mover sin tocar nada; fuera de ella, un
relativo largo (`../../../shared/…`) rompería al mover el archivo, mientras que con `$lib` no depende
de cuántas carpetas hay.

Ejemplos reales. En `apps/panel_svelte/src/lib/features/ventas/api/ventas.api.ts`, `ventas` usa a
`agencias` y a `planes` a través de su `.api.ts`:

```ts
import { supabase } from '$lib/shared/api/supabase';
import { miAgencia } from '$lib/features/agencias/api/agencias.api';
```

Y en `apps/panel_svelte/src/lib/features/planes/api/planes.api.ts`, lo que vive en otra carpeta de la
misma funcionalidad (`model/`) se importa relativo:

```ts
import { draftToRow, type Plan, type PlanDraft } from '../model/plan';
import { conPoliticaGenerada } from '../model/politica';
```

Comprobación de la regla clave: `grep -rn "features\|routes\|\$app" apps/panel_svelte/src/lib/shared`
no encuentra nada. `shared/` es una capa **hoja**: se puede usar desde cualquier
sitio justo porque no depende de nadie, ni siquiera de SvelteKit. Por eso `rutaActual` recibe una
`URL` en lugar de leer `page` ella misma (sección 7).

Entre funcionalidades hay dependencias reales: `ventas`, `planes`, `resumen`, `admin` y
`liquidaciones` usan a `agencias`; `resumen` usa a cuatro de ellas. El único par que se mira mutuamente
es `auth` ↔ `legal` (`StarterPage` usa `legal.api`; `AceptarDocumentosPage` usa `signOut`), pero
siempre hacia archivos que no importan nada de la otra funcionalidad, así que no hay ciclo entre
archivos. **Conviene que siga así**: si dos funcionalidades se necesitan por completo, probablemente
lo común debe bajar a `shared/`.

---

## 4. Cómo viaja un dato: página → `*.api.ts` → Supabase

```
clic / carga de la página
        │
        ▼
 pages/<F>Page.svelte  ── estado de la pantalla: cargando, error, datos ($state)
        │  llama
        ▼
 api/<f>.api.ts        ── una función por consulta: supabase.from(...)...
        │  si Supabase devuelve error → throw error
        ▼
 Supabase              ── Postgres + RLS; las reglas críticas viven en la base
        ▲
        │  la página captura el error
 mensajeError(e)       ── lib/shared/api/errores.ts: traduce códigos SQL a texto para la agencia
        │
        ▼
 error = '…'  o  avisar('…')   ── se muestra en la pantalla o en el Toast
```

No hay `load` de SvelteKit en este camino: la página pide sus datos desde el navegador, igual que
antes de usar SvelteKit (sección 9 explica por qué).

### La capa de datos: `*.api.ts`

Cada función hace **una** consulta, tipa el resultado y **lanza** el error de Supabase en lugar de
devolverlo. `apps/panel_svelte/src/lib/features/planes/api/planes.api.ts`:

```ts
export async function publicarPlan(planId: string, publicado: boolean): Promise<void> {
  const { error } = await supabase
    .from('plans')
    .update({ estado: publicado ? 'publicado' : 'borrador' })
    .eq('id', planId);
  if (error) throw error;
}
```

Todos importan el **mismo cliente** de `apps/panel_svelte/src/lib/shared/api/supabase.ts`
(`createClient` con `VITE_SUPABASE_URL` y `VITE_SUPABASE_KEY`, y valores del Supabase local por
defecto), lo que permite sustituirlo en las pruebas (capítulo 4).

### La página: estado de carga + captura de errores

El patrón se repite en `PlanesPage`, `VentasPage`, `LiquidacionesPage`…
(`apps/panel_svelte/src/lib/features/planes/pages/PlanesPage.svelte`):

```svelte
  async function cargar() {
    cargando = true;
    error = '';
    try {
      const r = await misVentas();
      planes = r.planes;
    } catch (e) {
      error = mensajeError(e);
    } finally {
      cargando = false;
    }
  }
```

y la plantilla pinta uno de tres estados (`{#if cargando}` esqueleto, `{:else if error}` aviso de
fallo, `{:else}` contenido; ver el [capítulo 1](01-svelte-para-quien-sabe-react.md#3-plantilla-texto-atributos-y-condicionales)).
Para una acción del usuario, el error va al *toast* en lugar de al estado:

```svelte
  async function alternarPublicacion(p: Plan) {
    const publicado = p.estado === 'publicado';
    try {
      await publicarPlan(p.id, !publicado);
      avisar(publicado ? 'Plan pasado a borrador.' : 'Plan publicado en el catálogo 🎉');
      await cargar();
    } catch (e) {
      avisar(mensajeError(e));
    }
  }
```

### La traducción de errores: `mensajeError`

Supabase devuelve errores técnicos (`FECHA_CON_RESERVAS`, `agencies_rnt_formato`, `Failed to fetch`).
`apps/panel_svelte/src/lib/shared/api/errores.ts` los convierte en frases para la agencia:

```ts
export function mensajeError(e: unknown): string {
  const m = (e as { message?: string })?.message ?? String(e);
  for (const [clave, texto] of Object.entries(ERRORES)) {
    if (m.includes(clave)) return texto;
  }
  return m;
}
```

Es una **función pura** (por eso las pruebas de las páginas no la mockean). Si el error no está en
la tabla `ERRORES`, devuelve el mensaje original: nunca oculta un fallo desconocido. La usa también
`hooks.client.ts` (sección 9) para los errores que nadie atrapó.

### Dónde va cada regla

| Regla | Dónde vive | Ejemplo |
|---|---|---|
| «Qué filas se piden» | `api/<f>.api.ts` | `misPlanes`, `ventas(agencyId, desde?)` |
| «Qué significa el dato» (filtros, totales, validaciones) | `model/<f>.ts`, puro | `filtrarVentas`, `totalesVentas` |
| «Qué se ve ahora» (cargando, filtro elegido) | `$state` en la página | `let filtro = $state<FiltroVentas>('todas')` |
| «Qué se muestra, derivado» | `$derived` en la página | `const filtradas = $derived(filtrarVentas(ventas, filtro))` |
| Reglas críticas (cupos, dinero) | **La base de datos** | funciones SQL, no el panel |

---

## 5. SvelteKit estático y el router por hash

**SvelteKit** es el framework de aplicaciones que va encima de Svelte: aporta el enrutamiento por
carpetas, los layouts, el manejo de errores y la compilación para producción. Puede correr con un
servidor que dibuja las páginas (SSR) o producir **solo archivos**. El panel eligió lo segundo, con
dos decisiones que viven en `apps/panel_svelte/svelte.config.js`:

```js
import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
export default {
  preprocess: vitePreprocess(),
  kit: {
    // Sitio estático sin servidor: `dist/` con el shell (index.html) como página de respaldo.
    adapter: adapter({ pages: 'dist', assets: 'dist', fallback: 'index.html' }),
    // El hosting no devuelve index.html para otras rutas: las URLs son `#/planes`. Con el router por
    // hash Kit ya no hace SSR ni prerender, y el build falla si una ruta declara `ssr` o `prerender`.
    router: { type: 'hash' },
    // `$lib` ya viene de Kit; los helpers de los tests viven fuera de `src/`.
    alias: { $tests: 'tests' },
  },
};
```

| Decisión | Qué hace | Por qué |
|---|---|---|
| `adapter-static` con `fallback: 'index.html'` | `npm run build` deja en `dist/` solo HTML, JS y CSS; `index.html` es la página que arranca la app | Cualquier hosting de archivos sirve el panel; el build sigue saliendo en `dist/` |
| `router: { type: 'hash' }` | La ruta se guarda **después del `#`**: `https://…/#/planes/nuevo` | Un hosting estático solo devuelve `index.html` en `/`; con rutas «normales» (`/planes`) recargar la página daría 404. Con `#/…` el servidor siempre ve `/` |

Lo que cambia por el router por hash, y que conviene saber antes de leer el código (las rutas de
archivo de esta lista y de las secciones 7 y 9 son relativas a `node_modules/@sveltejs/kit/src`):

- **No hay SSR ni prerender.** Kit lo desactiva solo. Por eso **no hay** un `+layout.ts` con
  `export const ssr = false`, que es lo habitual en una SPA con SvelteKit: aquí, declarar `ssr` o
  `prerender` en un `+page.ts`/`+layout.ts` **rompe el build** (`Page options are ignored when
  router.type === 'hash'`, en `core/postbuild/analyse.js`).
- **No hay archivos de servidor.** `+page.server.ts`, `+layout.server.ts` y `+server.ts` se rechazan
  al sincronizar (`Cannot use server-only files in an app with router.type === 'hash'`, en
  `core/sync/create_manifest_data/index.js`).
- **Las URLs son `#/…`.** Todo lo que navega (enlaces, `goto`) lleva el `#` (sección 7).
- **Se arranca solo.** No hay un `main.ts` que haga `mount`: el `dist/index.html` generado llama a
  `kit.start(app, element)` y Kit monta el componente raíz dentro del `%sveltekit.body%` de
  `app.html`.

`apps/panel_svelte/src/app.html` es la plantilla de esa página. Lleva dos cosas del panel y dos
marcadores de Kit:

```html
<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/png" href="%sveltekit.assets%/favicon.png" />
    <!-- … -->
    <script>
      // Tema antes del primer render para evitar destello: claro salvo que se haya elegido oscuro.
      try {
        if (localStorage.getItem('diverso-panel-theme') === 'dark') document.documentElement.classList.add('dark');
      } catch (_) {}
    </script>
    %sveltekit.head%
  </head>
  <body data-sveltekit-preload-data="off">
    <div style="display: contents">%sveltekit.body%</div>
  </body>
</html>
```

`%sveltekit.assets%` es la ruta base de los archivos de `static/`, `%sveltekit.head%` recibe los `<link>` y `<script>`
que Kit genera, y `%sveltekit.body%` es donde se monta la app. `data-sveltekit-preload-data="off"`
apaga la precarga de datos al pasar el ratón sobre un enlace: aquí no hay `load` que precargar.

---

## 6. Rutas: carpetas en `src/routes`

En SvelteKit **la URL sale de las carpetas**: cada carpeta de `src/routes` es un segmento, y el
archivo `+page.svelte` de una carpeta es la página de esa URL. Con el router por hash, la «URL» es lo
que va después del `#`.

| Archivo especial | Qué es | Dónde está en el panel |
|---|---|---|
| `+page.svelte` | La página de esa carpeta | Uno por pantalla: `routes/login/+page.svelte`… |
| `+layout.svelte` | Un marco que envuelve a las páginas de su carpeta y de las de abajo | `routes/+layout.svelte` y `routes/(panel)/+layout.svelte` |
| `+error.svelte` | Lo que se pinta si falla la navegación o no hay ruta (404) | `routes/+error.svelte` |

### La tabla: URL → archivo → pantalla

| URL | Archivo en `src/routes/` | Marco | Pantalla (`lib/features/…`) |
|---|---|---|---|
| `#/` | `+page.svelte` | — | Manda a `#/starter` |
| `#/login` | `login/+page.svelte` | solo raíz | `auth/pages/LoginPage` |
| `#/starter` | `starter/+page.svelte` | solo raíz | `auth/pages/StarterPage` |
| `#/consentimiento` | `consentimiento/+page.svelte` | solo raíz | `legal/pages/AceptarDocumentosPage` |
| `#/legal` y `#/legal/<doc>` | `legal/[[doc=doc]]/+page.svelte` | solo raíz | `legal/pages/LegalPage` (`#/legal` a secas muestra «Documento no encontrado») |
| `#/admin` | `admin/+page.svelte` | solo raíz | `admin/pages/AdminAgenciasPage` |
| `#/admin/dispersiones` | `admin/dispersiones/+page.svelte` | solo raíz | `admin/pages/AdminDispersionesPage` |
| `#/dashboard` | `(panel)/dashboard/+page.svelte` | `Shell` | `resumen/pages/ResumenPage` |
| `#/planes` | `(panel)/planes/+page.svelte` | `Shell` | `planes/pages/PlanesPage` |
| `#/planes/nuevo` | `(panel)/planes/nuevo/+page.svelte` | `Shell` | `planes/pages/PlanFormPage` |
| `#/planes/editar/<id>` | `(panel)/planes/editar/[[id]]/+page.svelte` | `Shell` | `planes/pages/PlanFormPage` |
| `#/ventas` | `(panel)/ventas/+page.svelte` | `Shell` | `ventas/pages/VentasPage` |
| `#/onboarding` | `(panel)/onboarding/+page.svelte` | `Shell` | `agencias/pages/OnboardingPage` |
| `#/liquidaciones/<id>` | `(panel)/liquidaciones/[id]/+page.svelte` | `Shell` | `liquidaciones/pages/LiquidacionDetallePage` |
| cualquier otra | — | solo raíz | `routes/+error.svelte` |

(Recorte: faltan `liquidaciones` y `cuenta-dispersiones`, las dos dentro de `(panel)` y con el mismo patrón;
sus pantallas son `liquidaciones/pages/LiquidacionesPage` y `liquidaciones/pages/CuentaDispersionPage`.)

### Una página es un adaptador de tres líneas

El `+page.svelte` no tiene pantalla propia: importa la de `lib/` y se la pasa. Sin parámetros
(`apps/panel_svelte/src/routes/login/+page.svelte`):

```svelte
<script lang="ts">
  import Pagina from '$lib/features/auth/pages/LoginPage.svelte';
</script>

<Pagina />
```

Con un parámetro, la página recibe `params` y lo reparte como prop
(`apps/panel_svelte/src/routes/(panel)/liquidaciones/[id]/+page.svelte`):

```svelte
<script lang="ts">
  import type { PageProps } from './$types';
  import Pagina from '$lib/features/liquidaciones/pages/LiquidacionDetallePage.svelte';

  let { params }: PageProps = $props();
</script>

<Pagina id={params.id} />
```

`./$types` no existe en el repo: Kit lo **genera** en `.svelte-kit/types/` (carpeta sin versionar,
creada por `npm run prepare`/`dev`/`check`) y tipa `params` según el nombre de la carpeta (`[id]` →
`params.id: string`). La pantalla de `lib/` no sabe nada de rutas: recibe `id` como cualquier prop,
y por eso se prueba sin SvelteKit.

### Parámetros: `[id]`, `[[id]]` y `[[doc=doc]]`

| Carpeta | Qué acepta | `params` |
|---|---|---|
| `[id]` | Un segmento **obligatorio**: `#/liquidaciones/l-9` | `{ id: 'l-9' }`. `#/liquidaciones/` es otra ruta (la lista) |
| `[[id]]` | Un segmento **opcional**: `#/planes/editar` y `#/planes/editar/p-1` | `{ id: undefined }` o `{ id: 'p-1' }` |
| `[[doc=doc]]` | Opcional **y validado** por el matcher `doc` | `{ doc: 'privacidad' }`; si el matcher dice que no, la ruta no coincide |

El matcher es una función que recibe el texto del segmento y responde si vale
(`apps/panel_svelte/src/params/doc.ts`):

```ts
import type { ParamMatcher } from '@sveltejs/kit';
import { DOCUMENTOS } from '$lib/features/legal/model/legal';

/** Solo los ids de documentos legales que existen: otro texto en `/legal/…` cae en la página de error. */
export const match: ParamMatcher = (param) => Object.hasOwn(DOCUMENTOS, param);
```

El nombre del archivo (`doc.ts`) es el que va tras el `=` en la carpeta (`[[doc=doc]]`). Se usa
`Object.hasOwn` y no `param in DOCUMENTOS` para que `constructor` o `__proto__` no pasen por el
prototipo del objeto (lo fija `tests/unit/params/doc.test.ts`). La página de legal pasa `params.doc ?? ''`
a `LegalPage` (`routes/legal/[[doc=doc]]/+page.svelte`).

### Grupos de rutas: `(panel)`

Una carpeta entre paréntesis **no cuenta en la URL**: `(panel)/planes` es `#/planes`. Sirve para
agrupar rutas que comparten un `+layout.svelte` sin que el nombre aparezca. Las páginas dentro de
`(panel)` se dibujan dentro del `Shell`; las de fuera (login, legal, admin…) no (sección 8).

### Dos páginas, un mismo componente: cada ruta es su propia instancia

`planes/nuevo/+page.svelte` y `planes/editar/[[id]]/+page.svelte` dibujan **la misma**
`PlanFormPage`, pero son archivos de ruta distintos. SvelteKit pinta cada nivel con el componente de
esa ruta (en `.svelte-kit/generated/root.svelte`, `<Pyramid_2 … />` es `constructors[2]`); cuando
cambia el archivo de la ruta, el componente cambia y Svelte **destruye el anterior y monta uno
nuevo**. Pasar de `#/planes/editar/p-1` a `#/planes/nuevo` reinicia el formulario. El
[capítulo 2, sección 7.3](02-reactividad-con-runes.md#73-por-qué-cada-ruta-es-su-propia-instancia)
cuenta por qué esto importa.

### Lo que ya no existe: coincidencia por prefijo y orden

El router anterior ignoraba los segmentos de más (`/planes/x` era «Planes») y obligaba a ordenar la
tabla. SvelteKit exige **la ruta entera**, y elige la más específica sin depender del orden de las
carpetas: `#/ventas/x` no coincide con nada y cae en `+error.svelte`. Otras diferencias aceptadas al
migrar: la página de error se dibuja **sin** `Shell`, `#/` lleva a `#/starter`, y un documento legal
desconocido (`#/legal/nada`) cae en la página de error (antes lo resolvía `LegalPage` con su
«Documento no encontrado»; esa rama sigue ahí para `#/legal` a secas, que llega con `doc = ''`).

`apps/panel_svelte/src/routes/+error.svelte` distingue el 404 de un error inesperado con `page.status`:

```svelte
<script lang="ts">
  import { page } from '$app/state';
  import MarcaTile from '$lib/shared/ui/MarcaTile.svelte';
</script>

<div class="grid min-h-screen place-items-center px-6 py-12">
  <div class="aparecer flex max-w-sm flex-col items-center text-center">
    <MarcaTile tam={48} />
    <h1 class="mt-5 text-[20px] leading-snug font-extrabold tracking-tight">
      {#if page.status === 404}
        No encontramos esta sección.
      {:else}
        {page.error?.message}
      {/if}
    </h1>
    <a class="btn btn-primario mt-6" href="#/dashboard">Volver al resumen</a>
  </div>
</div>
```

---

## 7. Navegar y saber en qué ruta estás

### Navegar: enlaces y `goto`

Un enlace es un `<a href="#/planes/nuevo">` normal (`PlanesPage.svelte`): cambia el hash, Kit carga la
ruta nueva sin recargar la página y el botón «atrás» del navegador funciona sin código extra. Desde código se
usa `goto`, de `$app/navigation`. **Con el router por hash `goto` recibe `'#/ruta'`, con el `#`**
(`apps/panel_svelte/src/lib/features/planes/pages/PlanFormPage.svelte`):

```svelte
      goto('#/planes');
```

y con opciones, para no dejar una entrada en el historial
(`apps/panel_svelte/src/routes/+page.svelte`):

```svelte
    if (auth.userId) goto('#/starter', { replaceState: true });
```

> **La trampa: `goto('/planes')` no funciona.** Sin el `#`, Kit ve una URL con otro `pathname` que el
> del documento y la trata como **externa**: en producción hace una navegación nativa
> (`location.href = …`), y en un hosting estático eso es un **404**; en desarrollo muestra una página
> de error con «did you forget the hash?». Está en el código de Kit, en `node_modules/@sveltejs/kit/src/`:
> `runtime/client/utils.js` (`is_external_url`: con router por hash, «externa» es todo lo que cambie
> el `pathname`) y `runtime/client/client.js` (`native_navigation`).

### Leer la ruta: `page.url.hash` y `rutaActual`

`page`, de `$app/state`, es un objeto **reactivo** de SvelteKit con la URL actual (`page.url`), los
parámetros (`page.params`), el estado HTTP (`page.status`) y el error (`page.error`). Leerlo en un
`$derived` o en la plantilla se actualiza al navegar (capítulo 2, sección 6).

Con el router por hash, el `pathname` es siempre el del documento (`/`): **la ruta vive en
`page.url.hash`**. `apps/panel_svelte/src/lib/shared/lib/ruta.ts` la extrae:

```ts
/** Ruta de una URL del router por hash: `http://host/#/planes?x=1` → `/planes`. */
export function rutaActual(url: URL): string {
  return url.hash.replace(/^#/, '').replace(/[?#].*/, '') || '/';
}
```

Quita el `#` y descarta lo que viene tras un `?` o un segundo `#`. Se usa así en `Shell.svelte`:

```svelte
  const path = $derived(rutaActual(page.url));
```

Es una función pura que recibe la `URL`: se prueba con `new URL('http://localhost/#/ventas?mes=10')`
(`ruta.test.ts`) y vive en `shared/` porque no importa nada de SvelteKit.

### Una sorpresa: editar el hash a mano recarga la página

Si alguien cambia `#/planes` por `#/ventas` **escribiendo en la barra de direcciones**, Kit hace un
`location.reload()` a propósito, «para alinearse con el comportamiento del router por pathname»
(`runtime/client/client.js` de Kit, en el listener de `popstate`). Con el router de antes, el mismo cambio
solo actualizaba la ruta sin recargar. Los enlaces y `goto` no recargan.

---

## 8. Layouts y guard de sesión

Un `+layout.svelte` envuelve a todas las páginas que están en su carpeta y por debajo, y las recibe
como `children` (el mismo snippet del [capítulo 1, sección 7](01-svelte-para-quien-sabe-react.md#7-contenido-hijo-children-y-snippets)).
El panel tiene dos capas:

```
routes/+layout.svelte          guard de sesión + pantalla de carga + <Toast />
  └─ routes/(panel)/+layout.svelte    <Shell>…</Shell>  (solo las páginas del grupo)
       └─ +page.svelte
```

### El marco con menú: `(panel)/+layout.svelte`

Es completo y minúsculo (`apps/panel_svelte/src/routes/(panel)/+layout.svelte`):

```svelte
<script lang="ts">
  import type { Snippet } from 'svelte';
  import Shell from '$lib/features/agencias/components/Shell.svelte';

  let { children }: { children: Snippet } = $props();
</script>

<Shell>{@render children()}</Shell>
```

El `Shell` recibe la página como `children` y la pone en su `<main>`:

```svelte
    <main id="principal" tabindex="-1" bind:this={principal} class="min-w-0 flex-1 pb-20 outline-none md:pb-0">
      {@render children()}
    </main>
```

El layout de un grupo **se conserva entre páginas hermanas**: al pasar de Planes a Ventas el `Shell`
sigue montado y solo cambia lo de dentro. Por eso el `Shell` observa la ruta (`void path;`, capítulo
2, sección 5) para recargar el aviso de la agencia al navegar. `Shell` contiene además el menú
(`SECCIONES`, de `model/navegacion.ts`), la tarjeta de la agencia, el cambio de tema y «Cerrar sesión».

### El guard de sesión

La decisión de «¿esta persona puede ver esta ruta?» es una función pura de dos parámetros
(`apps/panel_svelte/src/lib/features/auth/model/sesion.ts`):

```ts
/** Guard de sesión (equivale al redirect global de go_router): a dónde mandar, o null si no hace falta. */
export function redireccionSesion(path: string, userId: string | null | undefined): string | null {
  const publica = path === '/login' || path === '/starter' || path.startsWith('/legal/');
  if (!userId && !publica) return '/login';
  if (userId && path === '/login') return '/starter';
  return null;
}
```

| Situación | Resultado |
|---|---|
| Sin sesión en una ruta que no es `/login`, `/starter` ni `/legal/…` | `'/login'` |
| Con sesión en `/login` | `'/starter'` |
| Cualquier otra | `null` (no hace falta redirigir) |

Quien la aplica es el layout raíz, con un `$effect` (capítulo 2, sección 5, uso 1) que **espera a
`auth.ready`**: mientras Supabase aún no ha dicho si hay sesión, la pantalla muestra un indicador de
carga **en lugar de las páginas**. `apps/panel_svelte/src/routes/+layout.svelte`:

```svelte
<script lang="ts">
  import type { Snippet } from 'svelte';
  import '../app.css';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { auth } from '$lib/features/auth/model/auth.svelte';
  import { redireccionSesion } from '$lib/features/auth/model/sesion';
  import { rutaActual } from '$lib/shared/lib/ruta';
  import Toast from '$lib/shared/ui/Toast.svelte';
  import Spinner from '$lib/shared/ui/Spinner.svelte';

  let { children }: { children: Snippet } = $props();

  // Guards de sesión: la decisión vive en sesion.ts.
  $effect(() => {
    if (!auth.ready) return;
    const destino = redireccionSesion(rutaActual(page.url), auth.userId);
    if (destino) goto('#' + destino);
  });
</script>

{#if !auth.ready}
  <div class="grid min-h-screen place-items-center" role="status" aria-label="Cargando">
    <Spinner />
  </div>
{:else}
  {@render children()}
{/if}

<Toast />
```

Fíjate en tres detalles: `import '../app.css'` es lo que carga Tailwind (antes lo hacía `main.ts`);
la ruta se calcula con `rutaActual(page.url)` y el destino se navega con `'#' + destino`; y
`<Toast />` queda **fuera** del `{#if}`, así que se ve siempre.

Dos consecuencias a tener presentes:

- Como un `$effect` corre **después** de actualizar el DOM, la página protegida ya se montó cuando el
  guard redirige. Una página no debe asumir que hay sesión en el primer instante (por ejemplo, `miAgencia()` devuelve
  `null` si no hay usuario).
- El guard solo mira **si hay sesión**, no el rol. `StarterPage` envía al admin a `#/admin` según
  `perfilActual()`, pero nada en `routes/` impide que otro rol escriba esa URL; lo que protege los datos
  son las políticas RLS de la base (`supabase/migrations/0001_schema.sql`).

Es el equivalente del `redirect` global de `go_router` en la app del viajero
(`apps/viajero/lib/router/sesion_redirect.dart`).

---

## 9. Lo que SvelteKit trae y el panel no usa

El árbol típico de un proyecto SvelteKit incluye piezas de servidor. Aquí **faltan a propósito**:

| Pieza de SvelteKit | ¿Está? | Por qué |
|---|---|---|
| `src/hooks.server.ts` (middleware: auth, logs) | No | El build es estático: no hay proceso del servidor que lo ejecute |
| `src/lib/server/` (código solo de servidor) | No | Kit **prohíbe** importarlo desde código del navegador (`Cannot import … into code that runs in the browser`, en `exports/vite/index.js`), y aquí todo corre en el navegador: nadie podría usarlo |
| `+page.server.ts`, `+layout.server.ts`, `+server.ts` | No | Con el router por hash Kit los rechaza (sección 5) |
| `+page.ts` / `+layout.ts` con `load` | No | Se permitirían, pero los datos se piden desde la página (sección 4); no hay SSR que justifique un `load` |
| `export const ssr` / `prerender` | No | Con el router por hash rompen el build (sección 5) |
| `src/hooks.client.ts` | **Sí** | Es de navegador: decide qué mostrar ante un error que nadie atrapó |
| `src/app.d.ts` | **Sí**, mínimo | Sin servidor no hay `Locals` ni `PageData`: solo la forma del error |

Los dos archivos del navegador son pequeños. `apps/panel_svelte/src/hooks.client.ts`:

```ts
import type { HandleClientError } from '@sveltejs/kit';
import { mensajeError } from '$lib/shared/api/errores';

/**
 * Error no previsto al navegar o dibujar: se registra y la página de error muestra el texto legible.
 * Una ruta que no existe (404) es esperada: la página de error la explica y no se registra.
 */
export const handleError: HandleClientError = ({ error, status }) => {
  if (status !== 404) console.error(error);
  return { message: mensajeError(error) };
};
```

y `apps/panel_svelte/src/app.d.ts`:

```ts
declare global {
  namespace App {
    interface Error {
      message: string;
    }
  }
}

export {};
```

Lo que `handleError` devuelve es lo que `+error.svelte` lee en `page.error` (sección 6).

**¿Dónde viven entonces los secretos y la seguridad?** El panel habla con Supabase directamente
desde el navegador con la clave pública, y lo que protege los datos son las **políticas RLS** de la
base. Lo que necesita secretos (los pagos con Wompi) vive en las **Edge Functions** de Supabase
(`supabase/functions/`), no en el panel.

**¿Cuándo tendría sentido `hooks.server.ts` o `$lib/server`?** Si el panel necesitara algo que no
puede hacerse en el navegador: una clave secreta de un tercero, una sesión por cookies leída en el
servidor, un contenido que deba llegar ya dibujado (SSR). Eso implica otro adaptador (`adapter-node`,
Vercel…), cambiar a `router: { type: 'pathname' }` (URLs `/planes` sin `#`) y un hosting con
servidor: es una decisión de despliegue, no un cambio de carpetas. Hoy nada del panel lo pide.

---

## 10. Convenciones de nombres

| Qué | Convención | Ejemplos |
|---|---|---|
| Página de ruta | `+page.svelte` dentro de la carpeta de la URL; delgada | `routes/login/+page.svelte` |
| Carpeta de URL | Minúsculas, en español, con guiones | `cuenta-dispersiones/` |
| Parámetro de ruta | `[id]` obligatorio, `[[id]]` opcional, `[[x=matcher]]` validado | `liquidaciones/[id]`, `legal/[[doc=doc]]` |
| Grupo de rutas | Nombre entre paréntesis | `(panel)` |
| Pantalla (la dibuja una página de ruta) | `<Nombre>Page.svelte` en `lib/features/<f>/pages/` | `PlanesPage.svelte`, `LoginPage.svelte` |
| Componente de una funcionalidad | `PascalCase.svelte` dentro de `lib/features/<f>/components/` | `FechasModal.svelte` |
| Componente genérico | `PascalCase.svelte` en `lib/shared/ui/` | `Select.svelte`, `Tarjeta.svelte` |
| Lógica pura de la funcionalidad | `<funcionalidad>.ts` (nombre en minúscula) en `model/` | `model/ventas.ts`, `model/plan.ts` |
| Acceso a datos | `<funcionalidad>.api.ts` en `api/` | `api/planes.api.ts` |
| Estado reactivo en un módulo | `<nombre>.svelte.ts` en `model/` de la funcionalidad, o en `shared/lib/` si es genérico | `auth/model/auth.svelte.ts`, `shared/lib/toast.svelte.ts` |
| Matcher de parámetro | `src/params/<nombre>.ts` exporta `match` | `params/doc.ts` |
| Pruebas | `<archivo>.test.ts` en `tests/unit/`, **misma ruta que el archivo** (los helpers, en la raíz de `tests/`) | `tests/unit/features/auth/model/sesion.test.ts`, `tests/unit/features/planes/api/planes.api.test.ts` |
| Props-callback | `on` + verbo, en minúscula | `onactualizado`, `onelegir`, `oncerrar` |
| Prop de clases extra | `clase` | `<Skeleton clase="h-[150px]" />` |
| Idioma | Dominio y nombres en **español**; palabras de Svelte, SvelteKit y TypeScript en su idioma | `misPlanes`, `cargando`, `$state`, `+page.svelte` |

---

## 11. Checklist: agregar una pantalla nueva

Ejemplo ficticio: una pantalla «Reportes» en `#/reportes`, dentro del menú. **Nada de esto está en el
repo**; es la receta. Las rutas de archivo son las que usarías.

1. **Elige la funcionalidad.** ¿Es de una existente (`ventas/`) o nueva? Si es nueva, crea
   `src/lib/features/reportes/` con solo las carpetas que vayas necesitando (`model/`, `api/`,
   `pages/`, `components/`).
2. **Escribe la lógica pura primero** en `src/lib/features/reportes/model/reportes.ts` (tipos,
   filtros, totales) y su prueba en `tests/unit/features/reportes/model/reportes.test.ts` (la misma
   ruta, bajo `tests/unit/`; importa con `$lib/features/reportes/model/reportes`). Es lo más rápido
   de probar y lo que más cambia.
3. **Escribe el acceso a datos** en `src/lib/features/reportes/api/reportes.api.ts`: una función por
   consulta, con `supabase` de `$lib/shared/api/supabase`, que haga `if (error) throw error;`. Importa
   sus tipos de `../model/reportes`. Si arma filas, pruébala en
   `tests/unit/features/reportes/api/reportes.api.test.ts` con `supabase-falso` (capítulo 4, sección 6).
4. **Escribe la pantalla** `src/lib/features/reportes/pages/ReportesPage.svelte` con el patrón de la
   sección 4: `cargando`/`error`/datos, `$effect(() => { cargar(); })`, `mensajeError(e)` y los tres
   estados en la plantilla (`EsqueletoPagina` mientras carga, `Empty` si falla o no hay datos). Dibuja
   el resultado con `Pagina` + `PageHeader` y las piezas compartidas de la sección 2. Importa relativo dentro de la funcionalidad (`../api/reportes.api`,
   `../model/reportes`) y con `$lib/` lo demás.
5. **Parte la pantalla** si crece: lo repetido o con estado propio va a
   `src/lib/features/reportes/components/` (como `plan-form/`). Un componente que edita un dato del
   padre lo declara `$bindable()`; uno que solo avisa recibe un callback `on…`.
6. **Crea la ruta**: una carpeta con un `+page.svelte` delgado. Si va con el menú, dentro de `(panel)`:

   ```svelte
   <!-- src/routes/(panel)/reportes/+page.svelte -->
   <script lang="ts">
     import Pagina from '$lib/features/reportes/pages/ReportesPage.svelte';
   </script>

   <Pagina />
   ```

   Si necesita un parámetro, la carpeta lleva `[id]` (o `[[id]]` si es opcional) y la página recibe
   `let { params }: PageProps = $props();` como en la sección 6. No hace falta registrarla en ningún
   sitio: Kit la descubre por la carpeta. Si el parámetro debe validarse, crea un matcher en
   `src/params/` y úsalo como `[[x=matcher]]`.
7. **Decide si es pública.** Si debe verse sin sesión, añádela a la lista de `publica` en
   `src/lib/features/auth/model/sesion.ts` y a `tests/unit/features/auth/model/sesion.test.ts`. Las rutas de `routes/` fuera de `(panel)`
   (como `login/`) no llevan `Shell`: elige la carpeta según el marco que quieras.
8. **Añádela al menú**, si va ahí: una entrada en `SECCIONES` de
   `src/lib/features/agencias/model/navegacion.ts` (con el trazo de su ícono).
9. **Navega con `#`**: enlaces `href="#/reportes"` y `goto('#/reportes')`. Sin el `#`, 404 (sección 7).
10. **Prueba la pantalla** en `tests/unit/features/reportes/pages/ReportesPage.test.ts`, mockeando
    `$lib/features/reportes/api/reportes.api` (capítulo 4, sección 5). Añade también la ruta nueva a
    `ESPERADO` en `tests/unit/routes/arbol.test.ts`: esa prueba falla si `routes/` tiene una ruta que
    no figura ahí.
11. **Verifica** (capítulo 4, sección 10): `npm test`, `npm run build` y `npm run check`.

---

**Siguiente:** [capítulo 4, Pruebas y herramientas](04-pruebas-y-herramientas.md).

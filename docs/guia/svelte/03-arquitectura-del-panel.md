# 3. Arquitectura del panel

Este capítulo responde tres preguntas: **dónde vive cada cosa** en `apps/panel_svelte`, **cómo viaja
un dato** desde Supabase hasta la pantalla y **cómo se pasa de una pantalla a otra**. Termina con
una lista de pasos para **agregar una pantalla nueva**. Es el capítulo que más te sirve para empezar
a tocar código.

> Volver al [plan de aprendizaje](README.md). Este capítulo cubre las sesiones 1 (secciones 1 y 2)
> y 5 (secciones 3 a 9).
> La estructura salió de la tarea «Arquitectura del panel Svelte» y se parece a propósito a la de
> `apps/viajero`: quien conozca una encuentra la otra.

## Contenido

1. [El mapa de carpetas](#1-el-mapa-de-carpetas)
2. [Qué va dónde y por qué](#2-qué-va-dónde-y-por-qué)
3. [Reglas de importación](#3-reglas-de-importación)
4. [Cómo viaja un dato: página → `*.api.ts` → Supabase](#4-cómo-viaja-un-dato-página--apits--supabase)
5. [El router por hash y la tabla de rutas](#5-el-router-por-hash-y-la-tabla-de-rutas)
6. [El guard de sesión](#6-el-guard-de-sesión)
7. [Layouts: `sola` y `panel`](#7-layouts-sola-y-panel)
8. [Convenciones de nombres](#8-convenciones-de-nombres)
9. [Checklist: agregar una pantalla nueva](#9-checklist-agregar-una-pantalla-nueva)

---

## 1. El mapa de carpetas

```
apps/panel_svelte/
|-- index.html            carga /src/main.ts y fija el tema (claro/oscuro) antes de pintar
|-- vite.config.ts        Vite + Tailwind + alias @
|-- vitest.config.ts      Vitest (jsdom) + el mismo alias
|-- svelte.config.js      TypeScript dentro de los .svelte
|-- tsconfig.json         TypeScript estricto + paths @/*
`-- src/
    |-- main.ts           monta <App />
    |-- app.css           Tailwind: colores de marca, variante dark
    |-- app/              el esqueleto de la aplicación
    |   |-- App.svelte    decide qué pantalla y qué marco pintar
    |   |-- rutas.ts      la tabla de rutas y resolverRuta (pura)
    |   |-- sesion.ts     el guard de sesión (puro)
    |   |-- Shell.svelte  el marco con menú lateral
    |   `-- Toast.svelte  el aviso emergente global
    |-- features/<funcionalidad>/
    |   |-- admin/            verificación de agencias y dispersiones (rol admin)
    |   |-- agencias/         onboarding, logo, verificación RNT
    |   |-- auth/             login, starter, estado de sesión
    |   |-- legal/            documentos y consentimiento (Ley 1581)
    |   |-- liquidaciones/    liquidaciones, detalle y cuenta de dispersión
    |   |-- planes/           lista de planes, formulario, fechas y cupos
    |   |-- resumen/          el dashboard
    |   `-- ventas/           ventas y conciliación
    |-- shared/
    |   |-- api/              supabase.ts (el cliente) y errores.ts
    |   |-- lib/              format.ts, router.svelte.ts, toast.svelte.ts
    |   `-- ui/               Avatar, Empty, Logo, Select, Skeleton, StatusPill
    `-- test/                 fixtures.ts y supabase-falso.ts (ayudas de pruebas)
```

Dentro de cada funcionalidad, por ejemplo `src/features/planes/`:

```
planes/
|-- PlanesPage.svelte         una pantalla (lista)
|-- PlanFormPage.svelte       otra pantalla (formulario)
|-- components/               piezas que solo usa esta funcionalidad
|   |-- FechasModal.svelte
|   `-- plan-form/            las secciones del formulario (Seccion, SeccionEsencial…)
|-- plan.ts                   tipos y lógica pura (borrador del plan, categorías…)
|-- politica.ts               lógica pura de la política de cancelación
|-- duracion.ts               lógica pura de la duración
|-- planes.api.ts             acceso a datos (Supabase)
`-- *.test.ts                 las pruebas, junto al archivo que prueban
```

---

## 2. Qué va dónde y por qué

**Organizado por funcionalidad, no por tipo de archivo.** Todo lo que cambia cuando tocas «planes»
está en `features/planes/`. La alternativa (carpetas `pages/`, `components/`, `api/`, `types/` para
toda la app) te obliga a abrir cuatro carpetas para un solo cambio.

| Carpeta | Qué contiene | Qué NO va aquí |
|---|---|---|
| `app/` | Lo que conoce **toda** la aplicación: la tabla de rutas, el guard, los marcos | Pantallas ni lógica de negocio |
| `features/<f>/` | Páginas, componentes, lógica y acceso a datos **de una funcionalidad** | Nada que otra capa necesite sin depender de la funcionalidad |
| `shared/` | Lo genérico y reutilizable: cliente de Supabase, traducción de errores, formato, router, toast, componentes de UI | Cualquier cosa que nombre una funcionalidad |
| `test/` | Ayudas para las pruebas (datos de ejemplo, Supabase falso) | Código de producción |

### Qué va dentro de una funcionalidad

| Archivo | Rol | Equivale en `apps/viajero` a |
|---|---|---|
| `<F>Page.svelte` | Una **pantalla**: la ruta apunta a ella; carga datos y reparte a componentes | `views/*_view.dart` |
| `components/*.svelte` | Piezas de la pantalla que solo esta funcionalidad usa | `widgets/` de la funcionalidad |
| `<f>.ts` (`plan.ts`, `ventas.ts`…) | Tipos y **lógica pura**: sin Svelte, sin red, sin DOM | `packages/diverso_core/lib/models/` |
| `<f>.api.ts` | **Acceso a datos**: habla con Supabase y devuelve datos tipados | Los *services* y *repositories* |
| `<f>.svelte.ts` | Estado reactivo compartido (solo `auth`) | Un `ChangeNotifier` global |

Equivalencias del resto de piezas:

| `apps/viajero` (Flutter) | `apps/panel_svelte` |
|---|---|
| `lib/router/app_router.dart` y `app_routes.dart` | `src/app/rutas.ts` |
| `lib/router/sesion_redirect.dart` | `src/app/sesion.ts` |
| `lib/ui/shell/app_shell.dart` | `src/app/Shell.svelte` |
| `lib/ui/core/widgets/` | `src/shared/ui/` |
| `ui/features/<f>/view_models/` | No hay clase aparte: el estado vive en el `<script>` de la página (`$state`, `$derived`) y las reglas en el `<f>.ts` puro |

> **Por qué la lógica pura va en `.ts` y no dentro del `.svelte`.** Una función de entrada y salida
> (`filtrarVentas`, `validarPolitica`, `resolverRuta`, `redireccionSesion`) se prueba con `expect(...)`
> en milisegundos, sin montar nada. El componente queda para lo que solo él puede hacer: leer
> estado, pintar y reaccionar a eventos.

---

## 3. Reglas de importación

| De → a | ¿Permitido? | Cómo se escribe |
|---|---|---|
| Dentro de una funcionalidad | Sí | **Relativo**: `./planes.api`, `../../plan`, `./components/FechasModal.svelte` |
| Entre carpetas distintas | Sí | **Con `@/`**: `@/shared/lib/toast.svelte`, `@/features/agencias/agencias.api` |
| Funcionalidad → `shared/` | Sí | `@/shared/…` |
| Funcionalidad → otra funcionalidad | Sí, **hacia sus modelos, su `.api.ts` y algunos componentes** | `@/features/agencias/agencia` |
| `shared/` → funcionalidad o `app/` | **Nunca** | — |
| Funcionalidad → `app/` | **Nunca** | — |
| `app/` → funcionalidades y `shared/` | Sí | `@/features/…` |

`@/` significa `src/` (la configuración está en el [capítulo 4](04-pruebas-y-herramientas.md#2-vite-y-el-alias-de-rutas)).
Por qué la regla: con rutas relativas largas (`../../../shared/…`) un archivo deja de poder moverse
sin romper sus imports; con `@/` no depende de cuántas carpetas hay.

Ejemplos reales. En `apps/panel_svelte/src/features/ventas/ventas.api.ts`, `ventas` usa a `agencias`
y a `planes` a través de su `.api.ts`:

```ts
import { supabase } from '@/shared/api/supabase';
import { miAgencia } from '@/features/agencias/agencias.api';
```

Y en `apps/panel_svelte/src/features/planes/planes.api.ts`, lo que vive en la misma carpeta se
importa relativo:

```ts
import { draftToRow, type Plan, type PlanDraft } from './plan';
import { conPoliticaGenerada } from './politica';
```

Comprobación de la regla clave: `grep -rn "@/features\|@/app" apps/panel_svelte/src/shared` no
encuentra nada. `shared/` es una capa **hoja**: se puede usar desde cualquier sitio justo porque no
depende de nadie.

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
 <F>Page.svelte        ── estado de la pantalla: cargando, error, datos ($state)
        │  llama
        ▼
 <f>.api.ts            ── una función por consulta: supabase.from(...)...
        │  si Supabase devuelve error → throw error
        ▼
 Supabase              ── Postgres + RLS; las reglas críticas viven en la base
        ▲
        │  la página captura el error
 mensajeError(e)       ── shared/api/errores.ts: traduce códigos SQL a texto para la agencia
        │
        ▼
 error = '…'  o  avisar('…')   ── se muestra en la pantalla o en el Toast
```

### La capa de datos: `*.api.ts`

Cada función hace **una** consulta, tipa el resultado y **lanza** el error de Supabase en lugar de
devolverlo. `apps/panel_svelte/src/features/planes/planes.api.ts`:

```ts
export async function publicarPlan(planId: string, publicado: boolean): Promise<void> {
  const { error } = await supabase
    .from('plans')
    .update({ estado: publicado ? 'publicado' : 'borrador' })
    .eq('id', planId);
  if (error) throw error;
}
```

Todos importan el **mismo cliente** de `apps/panel_svelte/src/shared/api/supabase.ts`
(`createClient` con `VITE_SUPABASE_URL` y `VITE_SUPABASE_KEY`, y valores del Supabase local por
defecto), lo que permite sustituirlo en las pruebas (capítulo 4).

### La página: estado de carga + captura de errores

El patrón se repite en `PlanesPage`, `VentasPage`, `LiquidacionesPage`…
(`apps/panel_svelte/src/features/planes/PlanesPage.svelte`):

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
`apps/panel_svelte/src/shared/api/errores.ts` los convierte en frases para la agencia:

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
la tabla `ERRORES`, devuelve el mensaje original: nunca oculta un fallo desconocido.

### Dónde va cada regla

| Regla | Dónde vive | Ejemplo |
|---|---|---|
| «Qué filas se piden» | `<f>.api.ts` | `misPlanes`, `ventas(agencyId, desde?)` |
| «Qué significa el dato» (filtros, totales, validaciones) | `<f>.ts`, puro | `filtrarVentas`, `totalesVentas` |
| «Qué se ve ahora» (cargando, filtro elegido) | `$state` en la página | `let filtro = $state<FiltroVentas>('todas')` |
| «Qué se muestra, derivado» | `$derived` en la página | `const filtradas = $derived(filtrarVentas(ventas, filtro))` |
| Reglas críticas (cupos, dinero) | **La base de datos** | funciones SQL, no el panel |

---

## 5. El router por hash y la tabla de rutas

### El router: `router.svelte.ts`

El panel no usa SvelteKit ni librería de rutas. Una URL como `https://…/#/planes/nuevo` guarda la
ruta **después del `#`**; así un servidor de archivos estáticos no necesita reglas de reescritura.
`apps/panel_svelte/src/shared/lib/router.svelte.ts` completo en lo esencial:

```ts
/** Mini router por hash (#/ruta) — el estático no sirve fallback de paths. */

export const router = $state({ path: location.hash.slice(1) || '/' });

addEventListener('hashchange', () => {
  router.path = location.hash.slice(1) || '/';
});

export function go(path: string): void {
  location.hash = '#' + path;
}
```

- `router.path` es estado reactivo (capítulo 2, sección 6): cualquier cosa que lo lea se actualiza.
- **Navegar** es cambiar el hash: `go('/planes')` o un enlace normal `<a href="#/planes/nuevo">`
  (`PlanesPage.svelte`). El botón «atrás» del navegador funciona sin código extra.
- `segmentos(path)` parte una ruta en partes: `/planes/editar/xyz` → `['planes','editar','xyz']`.

### La tabla de rutas: `rutas.ts`

Cada pantalla se declara en **una lista**, y una función pura decide cuál gana
(`apps/panel_svelte/src/app/rutas.ts`):

```ts
/** En orden: gana la primera que coincide (las más específicas van antes). */
const RUTAS: Ruta[] = [
  { patron: '/legal/:doc?', componente: Legal, layout: 'sola', props: (p) => ({ doc: p.doc ?? '' }) },
  { patron: '/login', componente: Login, layout: 'sola' },
  { patron: '/admin/dispersiones', componente: AdminDispersiones, layout: 'sola' },
  { patron: '/admin', componente: Admin, layout: 'sola' },
  { patron: '/planes/nuevo', componente: PlanForm, layout: 'panel', props: () => ({}) },
  { patron: '/planes/editar/:planId?', componente: PlanForm, layout: 'panel' },
  { patron: '/planes', componente: Planes, layout: 'panel' },
  { patron: '/liquidaciones/:id', componente: LiquidacionDetalle, layout: 'panel' },
];
```

(Recorte: la lista real tiene 15 entradas.) Las reglas:

| Elemento | Significado |
|---|---|
| `patron` | Segmentos literales (`planes`), `:param` obligatorio, `:param?` opcional |
| **Coincidencia por prefijo** | Los segmentos de más se ignoran: `/planes/x` también es «Planes». Por eso las rutas más específicas van **antes** (`/planes/nuevo` antes de `/planes`) |
| `componente` | La página (un import de la funcionalidad) |
| `layout` | `'sola'` o `'panel'` (sección 7) |
| `props` | Cómo pasar los parámetros como props. Sin `props`, los parámetros se pasan tal cual (`{ id: 'l-9' }`) |

`resolverRuta(path)` devuelve `{ patron, componente, props, layout }`, o una ruta «no encontrada»
(`componente: null`), y `App.svelte` la consume con
`const ruta = $derived(resolverRuta(router.path));`. Como es pura, sus casos se prueban sin
montar nada (`apps/panel_svelte/src/app/rutas.test.ts`). El motivo de que devuelva el `patron`
(el `{#key}` de `App`) está en el [capítulo 2, sección 7.3](02-reactividad-con-runes.md#73-por-qué-app-usa-key-rutapatron).

---

## 6. El guard de sesión

La decisión de «¿esta persona puede ver esta ruta?» es una función pura de dos parámetros
(`apps/panel_svelte/src/app/sesion.ts`):

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

Quien la aplica es `App.svelte`, con un `$effect` (capítulo 2, sección 5, uso 1) que **espera a
`auth.ready`**: mientras Supabase aún no ha dicho si hay sesión, la pantalla muestra un indicador de
carga en lugar de decidir demasiado pronto.

```svelte
{#if !auth.ready}
  <div class="grid min-h-screen place-items-center" role="status" aria-label="Cargando">
```

Dos consecuencias a tener presentes:

- Como un `$effect` corre **después** de actualizar el DOM, la página protegida ya se montó cuando el
  guard redirige. Una página no debe asumir que hay sesión en el primer instante (por ejemplo, `miAgencia()` devuelve
  `null` si no hay usuario).
- El guard solo mira **si hay sesión**, no el rol. `StarterPage` envía al admin a `/admin` según
  `perfilActual()`, pero nada en `app/` impide que otro rol escriba esa URL; lo que protege los datos
  son las políticas RLS de la base (`supabase/migrations/0001_schema.sql`).

Es el equivalente del `redirect` global de `go_router` en la app del viajero
(`apps/viajero/lib/router/sesion_redirect.dart`).

---

## 7. Layouts: `sola` y `panel`

Cada ruta dice si va **dentro** del marco con menú lateral (`'panel'`) o sola (`'sola'`: login,
documentos legales, administración). `apps/panel_svelte/src/app/App.svelte` decide el marco con el
`layout` de la ruta resuelta:

```svelte
{:else if ruta.layout === 'panel'}
  <Shell>{@render pagina()}</Shell>
{:else}
  {@render pagina()}
{/if}
```

La página en sí es un *snippet* local (`{#snippet pagina()}`, capítulo 1, sección 7) que se pinta
en una u otra rama. `Shell.svelte` recibe la página como `children` y la pone en su `<main>`:

```svelte
    <main class="min-w-0 flex-1 pb-20 md:pb-0">
      {@render children()}
    </main>
```

`Shell` también contiene el menú (`secciones`), la tarjeta de la agencia, el aviso de verificación,
el cambio de tema y «Cerrar sesión». `Toast.svelte` se pinta fuera de ambos, siempre.

---

## 8. Convenciones de nombres

| Qué | Convención | Ejemplos |
|---|---|---|
| Pantalla (la apunta una ruta) | `<Nombre>Page.svelte` | `PlanesPage.svelte`, `LoginPage.svelte` |
| Componente de una funcionalidad | `PascalCase.svelte` dentro de `components/` | `FechasModal.svelte` |
| Componente genérico | `PascalCase.svelte` en `shared/ui/` | `Select.svelte`, `Empty.svelte` |
| Lógica pura de la funcionalidad | `<funcionalidad>.ts` (nombre en minúscula) | `ventas.ts`, `plan.ts` |
| Acceso a datos | `<funcionalidad>.api.ts` | `planes.api.ts` |
| Estado reactivo en un módulo | `<nombre>.svelte.ts` | `auth.svelte.ts`, `router.svelte.ts` |
| Pruebas | `<archivo>.test.ts` **junto** al archivo | `rutas.test.ts`, `planes.api.test.ts` |
| Props-callback | `on` + verbo, en minúscula | `onactualizado`, `onelegir` (la excepción: `oncCerrar`, capítulo 1) |
| Prop de clases extra | `clase` | `<Skeleton clase="h-[150px]" />` |
| Idioma | Dominio y nombres en **español**; palabras de Svelte, Vite y TypeScript en su idioma | `misPlanes`, `cargando`, `$state` |

---

## 9. Checklist: agregar una pantalla nueva

Ejemplo ficticio: una pantalla «Reportes» en `#/reportes`. **Nada de esto está en el repo**; es la
receta. Las rutas de archivo son las que usarías.

1. **Elige la funcionalidad.** ¿Es de una existente (`ventas/`) o nueva? Si es nueva, crea
   `src/features/reportes/`.
2. **Escribe la lógica pura primero** en `src/features/reportes/reportes.ts` (tipos, filtros,
   totales) y su `reportes.test.ts`. Es lo más rápido de probar y lo que más cambia.
3. **Escribe el acceso a datos** en `src/features/reportes/reportes.api.ts`: una función por
   consulta, con `supabase` de `@/shared/api/supabase`, que haga `if (error) throw error;`.
   Si arma filas, pruébala con `supabase-falso` (capítulo 4, sección 6).
4. **Escribe la página** `src/features/reportes/ReportesPage.svelte` con el patrón de la sección 4:
   `cargando`/`error`/datos, `$effect(() => { cargar(); })`, `mensajeError(e)` y los tres estados en
   la plantilla. Importa relativo (`./reportes.api`) dentro de la funcionalidad y con `@/` lo demás.
5. **Parte la página** si crece: lo repetido o con estado propio va a `components/` (como
   `plan-form/`). Un componente que edita un dato del padre lo declara `$bindable()`; uno que solo
   avisa recibe un callback `on…`.
6. **Regístrala en `src/app/rutas.ts`**: importa la página y añade una fila a `RUTAS` **antes** de
   cualquier ruta más general que la capture por prefijo:

   ```ts
   { patron: '/reportes', componente: Reportes, layout: 'panel' },
   ```

   y un caso en `src/app/rutas.test.ts`. Si la misma página sirve a dos patrones, recuerda que
   `App` reinicia la instancia por patrón (capítulo 2, sección 7.3).
7. **Decide si es pública.** Si debe verse sin sesión, añádela a la lista de `publica` en
   `src/app/sesion.ts` y a `sesion.test.ts`.
8. **Añádela al menú**, si va ahí: una entrada en `secciones` de `src/app/Shell.svelte`.
9. **Verifica** (capítulo 4, sección 10): `npm test`, `npm run build` y `npx svelte-check`.

---

**Siguiente:** [capítulo 4, Pruebas y herramientas](04-pruebas-y-herramientas.md).

# 1. Svelte para quien sabe React

Este capítulo te enseña a **leer cualquier archivo `.svelte` del panel**: qué es cada parte del
archivo, qué hace cada llave `{#…}` de la plantilla y cómo se conectan los componentes entre sí
(props, eventos, `bind:`). La reactividad (`$state`, `$derived`, `$effect`) tiene su propio
capítulo, el [2](02-reactividad-con-runes.md); aquí solo la nombramos.

> Volver al [plan de aprendizaje](README.md). Este capítulo cubre la sesión 2.
> Todo el código citado es del panel (`apps/panel_svelte`, Svelte **5.57**), con su ruta.

## Contenido

1. [Un archivo `.svelte`: script, plantilla y estilo](#1-un-archivo-svelte-script-plantilla-y-estilo)
2. [Estilos con alcance y `:global`](#2-estilos-con-alcance-y-global)
3. [Plantilla: texto, atributos y condicionales](#3-plantilla-texto-atributos-y-condicionales)
4. [Listas: `{#each}` y la clave](#4-listas-each-y-la-clave)
5. [`{#key}` y `{@const}`](#5-key-y-const)
6. [Componentes dinámicos](#6-componentes-dinámicos)
7. [Contenido hijo: `children` y snippets](#7-contenido-hijo-children-y-snippets)
8. [Eventos: atributos y callbacks](#8-eventos-atributos-y-callbacks)
9. [`bind:`](#9-bind)
10. [`class` y `style`](#10-class-y-style)
11. [Tabla de equivalencias React ↔ Svelte](#11-tabla-de-equivalencias-react--svelte)

---

## 1. Un archivo `.svelte`: script, plantilla y estilo

En React un componente es una **función** que devuelve JSX y se vuelve a ejecutar en cada render.
En Svelte un componente es un **archivo** con hasta tres partes, y el compilador lo convierte en
código que **no se vuelve a ejecutar entero**: el `<script>` corre **una vez por instancia** y la
plantilla se actualiza por trozos (más en el [capítulo 2](02-reactividad-con-runes.md#1-el-modelo-mental-compilado-no-re-render)).

`apps/panel_svelte/src/lib/shared/ui/Skeleton.svelte` es el componente completo más corto del panel:

```svelte
<script lang="ts">
  let { clase = 'h-24 rounded-2xl' }: { clase?: string } = $props();
</script>

<div class="pulso rounded-2xl bg-slate-200/70 dark:bg-ink-700 {clase}"></div>
```

| Parte | Qué es | Equivalente en React |
|---|---|---|
| `<script lang="ts">` | Código del componente, en TypeScript. Declara props, estado y funciones | El cuerpo de la función del componente |
| La plantilla (todo lo que no es `<script>` ni `<style>`) | HTML con `{expresiones}` y bloques `{#if}`. No hay un `return` ni un único nodo raíz | El JSX del `return`, sin `<>…</>` |
| `<style>` | CSS **con alcance** al componente (ver la sección 2) | CSS Modules |

Cosas que ya puedes notar:

- **Varios nodos raíz están permitidos.** `routes/+layout.svelte` pinta un bloque `{#if}` y después `<Toast />`;
  `PlanesPage.svelte` pinta dos bloques `{#if}` seguidos. Ninguno necesita un contenedor.
- **No hay `import React`** ni runtime que importar: `$props`, `$state`… son *runes*, palabras que
  entiende el compilador y que no se importan.
- **Un componente se importa como un valor**: `import Skeleton from '$lib/shared/ui/Skeleton.svelte';`
  y se usa con mayúscula inicial, `<Skeleton clase="h-[150px]" />`. Un nombre en minúscula sería
  un elemento HTML.
- **No escribes el punto de entrada.** En React llamarías `createRoot(...).render(<App />)`; aquí
  no hay `main.ts` ni `mount(...)`: **SvelteKit** arranca la app y monta el componente raíz dentro
  del `<body>` de `src/app.html`. Lo que tú escribes son páginas y *layouts* en `src/routes/`
  ([capítulo 3, sección 5](03-arquitectura-del-panel.md#5-sveltekit-estático-y-el-router-por-hash)).

> **¿Por qué el script, la plantilla y el estilo van en el mismo archivo?** Es el diseño de Svelte:
> un componente es **un solo archivo**. El estilo con alcance (sección 2) funciona porque el
> compilador ve la plantilla y el `<style>` juntos: marca con un hash los elementos del archivo y
> reescribe cada selector. Además `vitePreprocess()` (en `svelte.config.js`) solo procesa lo que está
> escrito dentro del `<style>`: no existe un `<style src="…">` que traiga el CSS de otro archivo. El
> costo es menor de lo que parece: de los 65 archivos `.svelte` de `src/` solo 3 tienen `<style>`
> (`FechasModal`, `PlanFormPage` y `Select`; compruébalo con `grep -rl '<style' src --include=*.svelte`),
> y el resto se estila con clases de Tailwind en la plantilla (capítulo 4, sección 3). Lo que no es
> presentación sale del componente: la lógica pura vive en `.ts` de `model/`, con sus pruebas
> (capítulo 3, sección 2).

### `<script module>`: código que corre una vez por archivo

Un segundo bloque `<script module>` se ejecuta **una vez cuando se carga el módulo**, no por cada
instancia, y sus `export` salen del archivo. `apps/panel_svelte/src/lib/features/planes/pages/PlanesPage.svelte`
lo usa para derivar tablas de búsqueda a partir de `CATEGORIAS`:

```svelte
<script module lang="ts">
  import { CATEGORIAS } from '../model/plan';
  export const CATEGORIA_LABELS = Object.fromEntries(CATEGORIAS.map((c) => [c.valor, c.label]));
  export const CATEGORIA_EMOJIS = CATEGORIAS;
</script>
```

Equivale a declarar una constante **fuera** de la función del componente en React. (La forma vieja,
`<script context="module">`, está obsoleta: el compilador avisa con `script_context_deprecated`.)

---

## 2. Estilos con alcance y `:global`

Todo lo que escribes en `<style>` vale **solo para los elementos de ese archivo**. El compilador
añade una clase con hash a esos elementos y a cada selector. `apps/panel_svelte/src/lib/shared/ui/Select.svelte`:

```svelte
<style>
  .campo {
    border-radius: 12px;
    border: 1px solid rgb(0 0 0 / 0.1);
    /* … */
  }
  :global(.dark) .campo {
    border-color: rgb(255 255 255 / 0.09);
    background: rgb(255 255 255 / 0.04);
  }
  .campo:focus {
    border-color: var(--color-brand-400);
  }
</style>
```

Compilado con `svelte/compiler`, el CSS queda así (el sufijo `svelte-…` cambia con la ruta del archivo):

```css
.campo.svelte-14qqlli { border-radius: 12px; … }
.dark .campo.svelte-14qqlli { border-color: rgb(255 255 255 / 0.09); … }
```

`:global(.dark)` le dice al compilador «esta parte del selector **no** la toques»: la clase `dark`
vive en `<html>` (la fija `app.html` y la alterna `alternarTema` de `Shell.svelte`), fuera del
componente. Sin `:global`, el selector nunca coincidiría.

### El caso inverso: estilar elementos de componentes hijos

Los elementos que pintan los **hijos** no llevan el hash del padre. Por eso
`apps/panel_svelte/src/lib/features/planes/pages/PlanFormPage.svelte` ancla el selector en su propio
`<form class="plan-form">` y marca como global lo que está dentro:

```svelte
<style>
  .plan-form :global(.etiqueta) {
    display: block;
    margin-bottom: 6px;
    /* … */
  }
  :global(.dark) .plan-form :global(.etiqueta) {
    color: rgb(148 163 184);
  }
  .plan-form :global(.campo:focus) {
    border-color: var(--color-brand-400);
  }
</style>
```

Resultado: `.etiqueta` y `.campo` (las usan `SeccionEsencial`, `SeccionIncluye`… ) quedan estiladas **solo
dentro de ese formulario** (`.plan-form.svelte-1iio6wl .etiqueta`). Es el patrón para «el padre
define el aspecto de los campos de sus hijos» sin que el CSS se escape al resto de la app.

> **Tailwind.** La mayoría del estilo del panel no está en `<style>` sino en clases de utilidad
> dentro de `class="…"`. `<style>` se reserva para lo que Tailwind no expresa bien (el interruptor
> `.switch`, el foco de `.campo`). Ver [capítulo 4](04-pruebas-y-herramientas.md#3-tailwind-4).

---

## 3. Plantilla: texto, atributos y condicionales

| Quieres | En Svelte | Ejemplo del panel |
|---|---|---|
| Mostrar un valor | `{expresión}` | `{toast.mensaje}` (`Toast.svelte`) |
| Atributo dinámico | `atributo={expr}` (sin comillas) | `href={'#' + s.ruta}` (`Shell.svelte`) |
| Atributo con texto mezclado | `class="fijo {expr}"` | `class="pulso … {clase}"` (`Skeleton.svelte`) |
| Pasar una variable con su mismo nombre | `{nombre}` (atajo de `nombre={nombre}`) | `<AvatarAgencia {agencia} tam={72} />` (`LogoAgencia.svelte`) |
| Esparcir props | `{...objeto}` | `<Componente {...props} />`, igual que en React (el panel hoy no la usa) |
| Condicional | `{#if}` `{:else if}` `{:else}` `{/if}` | ver abajo |

No hay `&&` ni ternarios de JSX: los condicionales de **bloque** son `{#if}`.
`apps/panel_svelte/src/lib/features/planes/pages/PlanesPage.svelte` los encadena para los tres estados
típicos de una pantalla que carga datos:

```svelte
{#if cargando}
  <!-- … -->
{:else if error}
  <Empty icono="📡" titulo="Sin conexión" mensaje={error} />
{:else if planes.length === 0}
  <!-- … -->
{:else}
  <!-- … -->
{/if}
```

Dentro de una expresión sí puedes usar ternarios normales de JavaScript
(`{publicado ? 'Despublicar' : '🚀 Publicar'}`, en la misma página).

---

## 4. Listas: `{#each}` y la clave

`{#each lista as elemento, indice (clave)}` es el `.map` de React. La clave entre paréntesis hace
lo mismo que `key`: dice qué elemento es cuál cuando la lista cambia. `PlanesPage.svelte`:

```svelte
{#each planes as p (p.id)}
  {@const publicado = p.estado === 'publicado'}
  {@const futuras = fechasFuturas(p)}
```

- **Con clave** (`(p.id)`): Svelte conserva el DOM y el estado de cada fila aunque cambie el orden
  o se borre una del medio. Úsala siempre que las filas tengan identidad (planes, fechas, opciones).
- **Sin clave** (`{#each Array(3) as _}`, en la misma página): se reutiliza por posición. Vale para
  listas de relleno, como los esqueletos de carga.
- **`{:else}`**: lo que se muestra si la lista está vacía. `FechasModal.svelte`:

```svelte
{#each fechas as f (f.id)}
  <!-- … -->
{:else}
  <p class="py-6 text-center text-[13px] text-slate-500 dark:text-slate-400">
    Sin fechas todavía — agrega la primera.
  </p>
{/each}
```

---

## 5. `{#key}` y `{@const}`

**`{#key expresión}`** destruye y vuelve a crear su contenido cada vez que el valor de la expresión
cambia. Es el `key` de React aplicado a un componente suelto. **El panel no lo usa hoy**: lo necesitó
el router anterior, y con SvelteKit el mismo efecto sale de las carpetas de rutas (cada archivo
`+page.svelte` es su propio componente). El [capítulo 2](02-reactividad-con-runes.md#73-por-qué-cada-ruta-es-su-propia-instancia)
cuenta la historia. Su forma, en un ejemplo **ilustrativo (no está en el repo)**:

```svelte
{#key planId}
  <PlanFormPage {planId} />
{/key}
```

**`{@const nombre = expresión}`** declara una constante local **dentro de un bloque**
(`{#if}`, `{#each}`, `{:else}`…, siempre como hijo directo). Es la forma de no repetir una
expresión en la plantilla sin crear un componente. Arriba lo usa `PlanesPage.svelte` dentro de su
`{#each}`.

---

## 6. Componentes dinámicos

En React guardas un componente en una variable y lo renderizas como `<Componente />`. En Svelte 5
es igual: **cualquier variable con mayúscula inicial que contenga un componente se puede usar como
etiqueta**. No existe ni hace falta `<svelte:component>` (en modo *runes* el compilador avisa con
`svelte_component_deprecated`: «components are dynamic by default»).

En el panel lo hace SvelteKit por ti. El archivo que genera, `.svelte-kit/generated/root.svelte` (no
se versiona: aparece al correr `npm run dev` o `npm run prepare`), guarda el componente de cada nivel
de la ruta (`constructors`) y lo pinta como etiqueta:

```svelte
{:else}
	{@const Pyramid_0 = constructors[0]}
	<!-- svelte-ignore binding_property_non_reactive -->
	<Pyramid_0 bind:this={components[0]} data={data_0} {form} params={page.params} />

{/if}
```

Si `Pyramid_0` pasa a ser **otro** componente, Svelte destruye el anterior y monta el nuevo; si sigue
siendo el **mismo**, conserva la instancia y solo actualiza las props. Esa segunda mitad es la fuente
de una trampa real, y la razón de que `planes/nuevo` y `planes/editar/[[id]]` sean dos archivos de
ruta distintos (capítulo 2, sección 7.3).

`Component` es el tipo de «un componente Svelte» (`import type { Component } from 'svelte'`);
`Snippet` (sección siguiente) es el de «un trozo de plantilla».

---

## 7. Contenido hijo: `children` y snippets

Aquí Svelte 5 cambió respecto a lo que quizá leas por internet: **ya no se usan `<slot>`** (el
compilador avisa con `slot_element_deprecated`). Se usan *snippets*.

### `children`: lo que va dentro de la etiqueta

Todo lo que escribes entre `<Componente>` y `</Componente>` llega al componente como una prop
llamada `children`, y se pinta con `{@render children()}`: exactamente el `children` de React.
`apps/panel_svelte/src/lib/features/planes/components/plan-form/Seccion.svelte` completo:

```svelte
<script lang="ts">
  import type { Snippet } from 'svelte';

  /** Tarjeta con título en versalitas que envuelve cada bloque del formulario de plan. */
  let { titulo, children }: { titulo: string; children: Snippet } = $props();
</script>

<section
  class="rounded-2xl border border-slate-200/80 bg-white p-6
    dark:border-ink-600 dark:bg-ink-800"
>
  <h2 class="mb-4 text-[11.5px] font-bold tracking-[0.12em] text-slate-400">{titulo}</h2>
  {@render children()}
</section>
```

Y así la usa `SeccionEsencial.svelte` (el contenido de la tarjeta es lo que va entre las etiquetas):

```svelte
<Seccion titulo="LO ESENCIAL">
  <div class="space-y-3">
```

Si el contenido es opcional, el tipo es `children?: Snippet` y se pinta con `{@render children?.()}`.

### Snippets con nombre: pasar más de un trozo

Una prop también puede ser un snippet con nombre; es lo que en React sería una *render prop* o
varios «slots». `apps/panel_svelte/src/lib/shared/ui/Empty.svelte` acepta dos formas de recibir el
botón de acción y elige la que exista:

```svelte
  accion?: Snippet;
  children?: Snippet;
```

```svelte
  {#if accion || children}
    <div class="mt-5">{@render (accion ?? children)?.()}</div>
  {/if}
```

(`PlanesPage.svelte` le pasa el enlace «+ Nuevo plan» como contenido hijo.)

### Snippets locales: componentes sin archivo

`{#snippet nombre()}…{/snippet}` define un trozo de plantilla **dentro del mismo archivo** para
reutilizarlo con `{@render nombre()}`. Es lo que en React harías con una función auxiliar que
devuelve JSX. `apps/panel_svelte/src/lib/features/agencias/components/Shell.svelte` define la navegación una vez y la pinta en
la barra lateral de escritorio **y** en el menú desplegable móvil:

```svelte
{#snippet navegacion()}
  <nav class="flex flex-col gap-0.5" aria-label="Secciones">
    {#each secciones as s}
```

```svelte
    <div class="mt-5 mb-1.5 px-2 text-[10px] font-bold tracking-[0.1em] text-slate-400">GESTIÓN</div>
    {@render navegacion()}
```

Los `+layout.svelte` de SvelteKit son la otra mitad de `children`: reciben la página como
`children: Snippet` y la pintan dentro de su marco. `routes/(panel)/+layout.svelte` se la pasa al
`Shell` con `<Shell>{@render children()}</Shell>` (capítulo 3, sección 8).

Un snippet puede recibir parámetros (`{#snippet fila(item)}` + `{@render fila(x)}`), y su tipo es
`Snippet<[TipoDelParametro]>`. En las pruebas, como un snippet no se puede escribir en un `.ts`,
se fabrica con `createRawSnippet` (`apps/panel_svelte/tests/unit/features/agencias/components/Shell.test.ts`):

```ts
const children = createRawSnippet(() => ({ render: () => '<p>contenido de la página</p>' }));
```

---

## 8. Eventos: atributos y callbacks

### Eventos del DOM

Un evento es un **atributo en minúscula** cuyo valor es una función: `onclick`, `oninput`,
`onsubmit`, `onkeydown`. Sin `on:click` (la forma de Svelte 4; el compilador avisa con
`event_directive_deprecated`) y sin camelCase de React (`onClick`).
`apps/panel_svelte/src/lib/features/agencias/components/Shell.svelte`:

```svelte
    onclick={alternarTema}
```

```svelte
    onclick={() => signOut()}
```

Los modificadores de Svelte 4 (`on:submit|preventDefault`) ya no existen en esta sintaxis: se hace a
mano, como en React. `apps/panel_svelte/src/lib/features/planes/pages/PlanFormPage.svelte`:

```svelte
  async function guardar(e: SubmitEvent) {
    e.preventDefault();
```

```svelte
    <form id="form-plan" class="plan-form space-y-4" onsubmit={guardar}>
```

### Callbacks entre componentes

Para que un hijo avise al padre, el padre le pasa **una función como prop**, como en React. La
convención del panel es nombrarlas `on…` en minúscula. `apps/panel_svelte/src/lib/features/agencias/components/LogoAgencia.svelte`:

```svelte
    /** Recibe la URL pública nueva, o null cuando se quitó el logo. */
    onactualizado: (logoUrl: string | null) => void;
```

```svelte
      onactualizado(await subirLogo(agencia, archivo));
```

Y `apps/panel_svelte/src/lib/features/admin/pages/AdminAgenciasPage.svelte` pasa el suyo:

```svelte
    <FiltrosAgencias {filtro} {conteos} bind:busqueda onelegir={elegirFiltro} />
```

> **Convención.** Los callbacks van en minúscula, `on` + verbo, igual que los eventos del DOM
> (`onclick`): `FechasModal.svelte` declara `let { plan, oncerrar }: { plan: Plan; oncerrar: () => void } = $props();`.

En Svelte 5 `createEventDispatcher` está marcado `@deprecated` en los tipos de `svelte` (recomienda
props-callback): los componentes se comunican con props-callback. Es más simple: una función tipada,
como en React.

---

## 9. `bind:`

`bind:` enlaza **en los dos sentidos** una variable con un atributo o con una prop. Es lo que en
React serían `value` + `onChange` escritos a mano.

| Forma | Qué hace | Ejemplo del panel |
|---|---|---|
| `bind:value={x}` | Input ↔ variable. En `type="number"` entrega un número (o `null` si está vacío) | `<input required bind:value={d.titulo} class="campo" />` (`SeccionEsencial.svelte`) |
| `bind:checked={x}` | Checkbox ↔ booleano | `<input type="checkbox" bind:checked={d.incluyeTransporte} class="switch" />` (`SeccionIncluye.svelte`) |
| `bind:this={x}` | Guarda el elemento DOM en `x` (el `useRef`) | `bind:this={raiz}` con `let raiz: HTMLDivElement;` (`Select.svelte`) |
| `bind:prop={x}` en un componente | La prop es de **doble vía**: si el hijo la cambia, cambia en el padre | `<SeccionIncluye bind:d />` (`PlanFormPage.svelte`) |

La cuarta fila necesita que el hijo declare la prop como `$bindable()`; se explica con el flujo
completo del formulario en el [capítulo 2](02-reactividad-con-runes.md#4-props-y-bindable).

Ejemplo de la tercera fila: `Select.svelte` necesita su propio elemento raíz para saber si el foco
salió de él.

```svelte
  function alPerderFoco(e: FocusEvent) {
    if (!raiz.contains(e.relatedTarget as Node)) abierto = false;
  }
```

> **`bind:` o callback.** Para formularios (muchos campos que el padre necesita leer),
> `bind:` ahorra código. Para «ha ocurrido algo» (elegir un filtro, cerrar un modal) usa un
> callback. `FiltrosAgencias` usa ambos: `bind:busqueda` para el texto y `onelegir` para el filtro.

---

## 10. `class` y `style`

`class` es `class`, no `className`. Se compone con interpolación y ternarios de JavaScript, igual
que una plantilla de texto. `apps/panel_svelte/src/lib/shared/ui/Select.svelte`:

```svelte
      class="size-4 shrink-0 text-slate-400 transition-transform {abierto ? 'rotate-180' : ''}"
```

`style` es una **cadena CSS**, no un objeto. `apps/panel_svelte/src/lib/features/agencias/components/Shell.svelte`:

```svelte
      style="grid-template-columns: repeat({secciones.length}, minmax(0, 1fr))"
```

Svelte 5 además acepta objetos y arreglos en `class` (al estilo `clsx`; el tipo `ClassValue` está en
`svelte/elements`) y las directivas `class:nombre={cond}` y `style:prop={valor}`. **El panel no las
usa**: todo son cadenas con ternarios. Si lees otro código Svelte que sí las use, ya sabes qué son.

---

## 11. Tabla de equivalencias React ↔ Svelte

| React / React Native | Svelte 5 (en este panel) |
|---|---|
| Componente de función + JSX | Archivo `.svelte` |
| `ReactDOM.createRoot(el).render(<App />)` | Nada que escribir: SvelteKit monta la app en `app.html` |
| React Router / rutas de Next | Carpetas en `src/routes` con `+page.svelte` y `+layout.svelte` |
| `useNavigate()` / `<Link to>` | `goto('#/ruta')` de `$app/navigation` / `<a href="#/ruta">` |
| `function C({ a, b = 1 })` | `let { a, b = 1 } = $props()` |
| `children` | `children: Snippet` + `{@render children()}` |
| Render props / varios slots | Props de tipo `Snippet` + `{@render x()}` |
| Función auxiliar que devuelve JSX | `{#snippet x()}` + `{@render x()}` |
| `useState` | `$state` |
| `useMemo` | `$derived` / `$derived.by` (sin lista de dependencias) |
| `useEffect(fn, [deps])` | `$effect(fn)` (dependencias automáticas) |
| `useCallback`, `React.memo` | No hacen falta: el componente no se re-ejecuta |
| `useRef` + `ref={r}` | `let r; … bind:this={r}` |
| Context + Provider | Módulo `.svelte.ts` con `$state` (`auth`, `toast`); la ruta actual, `page` de `$app/state` |
| `key` en listas | `(clave)` en `{#each}` |
| `key` para reiniciar un componente | `{#key expr}` |
| `{cond && <X />}` / ternario | `{#if}` / `{:else}` |
| `lista.map(...)` | `{#each lista as x (clave)}` |
| `onClick`, `onChange` | `onclick`, `oninput` / `onchange` |
| Input controlado (`value` + `onChange`) | `bind:value` |
| `className`, `style={{…}}` | `class`, `style="…"` (cadena) |
| CSS Modules | `<style>` con alcance + `:global(...)` |
| `<Componente {...props} />` | `<Componente {...props} />` (igual) |
| `render` de Testing Library | `render` de `@testing-library/svelte` (igual API) |

---

**Siguiente:** [capítulo 2, Reactividad con *runes*](02-reactividad-con-runes.md).

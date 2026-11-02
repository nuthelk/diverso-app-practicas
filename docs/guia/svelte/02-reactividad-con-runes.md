# 2. Reactividad con *runes*

Este capítulo explica cómo Svelte 5 sabe **qué parte de la pantalla actualizar** cuando cambia un
dato, y cómo se usan las cinco herramientas que el panel emplea para eso: `$state`, `$derived`,
`$props`/`$bindable` y `$effect`, más el estado compartido en módulos `.svelte.ts`. Termina con las
**trampas reales** que ya aparecieron en este repo.

> Volver al [plan de aprendizaje](README.md). Este capítulo cubre las sesiones 3 y 4.
> Lo que se afirma de Svelte está comprobado contra la versión instalada (**5.57.1**, en
> `apps/panel_svelte/node_modules/svelte`): su compilador, sus tipos y sus mensajes de aviso.

## Contenido

1. [El modelo mental: compilado, no re-render](#1-el-modelo-mental-compilado-no-re-render)
2. [`$state`](#2-state)
3. [`$derived`](#3-derived)
4. [Props y `$bindable`](#4-props-y-bindable)
5. [`$effect` (y cuándo no usarlo)](#5-effect-y-cuándo-no-usarlo)
6. [Estado compartido en módulos `.svelte.ts`](#6-estado-compartido-en-módulos-sveltets)
7. [Trampas reales de este repo](#7-trampas-reales-de-este-repo)
8. [Chuleta](#8-chuleta)

---

## 1. El modelo mental: compilado, no re-render

| | React | Svelte 5 |
|---|---|---|
| Qué se ejecuta al cambiar un dato | **Toda la función** del componente, otra vez | **Solo** el trozo que lee ese dato |
| Qué se compara | El árbol de elementos nuevo contra el anterior (*reconciliación*) | Nada: el compilador ya sabe qué nodo depende de qué dato |
| El cuerpo del componente | Corre en cada render | El `<script>` corre **una vez** por instancia |
| Evitar trabajo repetido | `useMemo`, `useCallback`, `React.memo` | No hace falta |

Para verlo, esto es lo que genera el compilador (`svelte/compiler`, versión 5.57.1) con un
componente mínimo. **No está en el repo**: lo compilé para esta guía.

```svelte
<script>
  let n = $state(0);
  const doble = $derived(n * 2);
</script>
<button onclick={() => n++}>{n} · {doble}</button>
```

```js
export default function Contador($$anchor) {
	let n = $.state(0);
	const doble = $.derived(() => $.get(n) * 2);
	var button = root();
	var text = $.only_child(button);

	$.template_effect(() => $.set_text(text, `${$.get(n) ?? ''} · ${$.get(doble) ?? ''}`));
	$.delegated('click', button, () => $.update(n));
	$.append($$anchor, button);
}
```

Lo importante: `Contador` se ejecuta **una vez**. `n` pasa a ser una *señal* (`$.state`); el texto
del botón queda registrado como un efecto que lee `n` y `doble`; cuando `n` cambia, **solo ese
`set_text`** se vuelve a ejecutar. Por eso en Svelte «declarar una variable dentro del componente»
no tiene el coste ni las trampas de los *closures* viejos de React.

La contrapartida: las **reglas** de qué se lee y dónde importan (sección 7).

---

## 2. `$state`

`$state(valor)` declara un dato reactivo. Es el `useState`, pero **sin setter**: lees y asignas la
variable directamente. `apps/panel_svelte/src/features/planes/PlanFormPage.svelte`:

```svelte
  let d = $state<PlanDraft>(draftVacio());
  let cargando = $state(!!planId);
  let guardando = $state(false);
  let error = $state('');
```

### Profundo: los objetos y arreglos son *proxies*

Si el valor es un objeto simple o un arreglo, Svelte lo envuelve en un `Proxy` y **cada propiedad
anidada es reactiva**. Se muta directamente, sin copiar como en React (`setD({ ...d, titulo })`).
`apps/panel_svelte/src/features/planes/components/plan-form/SeccionIncluye.svelte`:

```svelte
      d.incluye = lista;
```

```svelte
            onclick={() => (d.incluye = d.incluye.filter((_, j) => j !== i))}
```

Precisiones que se pueden comprobar en `node_modules/svelte/src/internal/client/proxy.js`:

- Solo se envuelven los objetos cuyo prototipo es `Object.prototype` o `Array.prototype`. Una
  instancia de clase, un `Map`, un `Set` o una `Date` **no** se envuelven: su contenido no es
  reactivo.
- `$state.raw(valor)` declara un dato **sin** proxy: solo cuenta reasignarlo
  (`items = [...items, x]`). Sirve para datos grandes que nunca mutas por dentro.
- `$state.snapshot(d)` devuelve una **copia simple** sin proxy. Úsala cuando algo no tolera
  proxies (`structuredClone`, algunas librerías) o para registrar en consola.

### Los datos que llegan del servidor también quedan envueltos

`planes = r.planes` (en `PlanesPage.svelte`) asigna un arreglo de objetos a un `$state`: pasan a ser
proxies. Para el código del panel es transparente (`p.titulo`, `.map`, `.filter` funcionan igual).

### Dónde se puede declarar

`$state` vale dentro de `.svelte` y de archivos `.svelte.ts` (sección 6). **No** se puede exportar
un `$state` que se reasigna: el compilador lo rechaza con `state_invalid_export` («Cannot export
state from a module if it is reassigned. Either export a function returning the state value or only
mutate the state value's properties»). Por eso `router`, `auth` y `toast` son **objetos** que se
mutan por propiedad.

---

## 3. `$derived`

`$derived(expresión)` es un valor **calculado** a partir de otros datos reactivos. Es el `useMemo`,
sin lista de dependencias: Svelte anota qué leyó la expresión. `PlanFormPage.svelte`:

```svelte
  const erroresPolitica = $derived(validarPolitica(d));
  const politicaValida = $derived(Object.keys(erroresPolitica).length === 0);
  const textoVistaPrevia = $derived(
    politicaValida ? textoPoliticaCompleto(d) : 'Completa la política de cancelación para ver el texto que leerá el viajero.',
  );
```

Cuando el usuario escribe en un campo de la política, cambia una propiedad de `d`; `validarPolitica`
leyó esa propiedad, así que `erroresPolitica` se recalcula, y con él `politicaValida` y
`textoVistaPrevia`. Nadie escribe un `setX` en cadena.

Dos formas más del panel. En `apps/panel_svelte/src/shared/ui/Select.svelte` la etiqueta visible
sale del `valor` actual y de la lista de opciones:

```svelte
  const etiqueta = $derived(opciones.find((o) => o.valor === valor)?.etiqueta ?? valor);
```

Y para lógica con varios `if`, `$derived.by(() => { … })`
(`apps/panel_svelte/src/features/liquidaciones/LiquidacionesPage.svelte`):

```svelte
  const anticipo = $derived.by(() => {
    if (!agencia) return '';
    if (agencia.anticipo_bloqueado) {
```

**Reglas:**

- Una expresión derivada debe ser **pura**. Si escribe estado dentro, Svelte lanza
  `state_unsafe_mutation` («Updating state inside `$derived(...)`, `$inspect(...)` or a template
  expression is forbidden»). Lo mismo vale para una expresión `{…}` de la plantilla.
- Una derivada se **lee**, no se actualiza «a mano»; si necesitas cambiarla, cambia el dato del que
  sale.
- La lógica no trivial de una derivada va en **funciones puras fuera del componente**:
  `validarPolitica` y `textoPoliticaCompleto` viven en `apps/panel_svelte/src/features/planes/politica.ts`
  y se prueban sin DOM (capítulo 4).

---

## 4. Props y `$bindable`

### `$props`

Las props se declaran **desestructurando `$props()`**, con su tipo y valores por defecto en la misma
sentencia. `apps/panel_svelte/src/shared/ui/Select.svelte`:

```svelte
  let {
    opciones,
    valor,
    onchange,
    clase = '',
  }: {
    opciones: Opcion[];
    valor: string;
    onchange: (nuevo: string) => void;
    clase?: string;
  } = $props();
```

Son reactivas: cuando el padre pasa otro `valor`, `etiqueta` (la derivada de la sección anterior)
se recalcula. (En el JS compilado de `Skeleton.svelte`, por ejemplo, `clase` ya no es una variable
sino una función, `clase()`: cada lectura le pide el valor actual al padre. Por eso leerla dentro de
la plantilla o de un `$derived` funciona, y copiarla al nivel superior del script, no: sección 7.1.) Un componente **no** debe cambiar las props que recibe (sección 7.2).

`Select` es un componente **controlado**, igual que un `<select value onChange>` de React: recibe
`valor` y avisa por `onchange`. `SeccionEsencial.svelte` lo usa así:

```svelte
          valor={d.categoria}
          onchange={(v) => (d.categoria = v as CategoriaValor)}
```

### `$bindable`: una prop de doble vía

Cuando varios campos de un formulario viven en un objeto del padre, pasar `valor` y `onchange` por
cada campo es ruido. Una prop declarada con `$bindable()` permite que el padre escriba `bind:` y el
hijo **modifique** el dato directamente. El recorrido completo del formulario del plan:

| Paso | Código |
|---|---|
| 1. El padre es dueño del dato (`PlanFormPage.svelte`) | `let d = $state<PlanDraft>(draftVacio());` |
| 2. Lo pasa con `bind:` | `<SeccionIncluye bind:d />` |
| 3. El hijo declara la prop como enlazable (`SeccionIncluye.svelte`) | `let { d = $bindable() }: { d: PlanDraft } = $props();` |
| 4. El hijo lo modifica | `d.incluye = lista;` |
| 5. Se propaga hacia arriba | `erroresPolitica` y `textoVistaPrevia` del padre se recalculan solos |

Un hijo también puede reenviar el enlace a un nieto, incluso sobre una **propiedad** anidada
(`SeccionEncuentro.svelte`):

```svelte
    <FotosPlan bind:fotos={d.fotos} />
```

y `FotosPlan.svelte` declara `let { fotos = $bindable() }: { fotos: string[] } = $props();` y
**reasigna** la prop (`fotos = lista;`), lo que escribe `d.fotos` en el padre original.

**Regla del panel:** los componentes que *editan* un dato del padre lo declaran `$bindable()`
(`SeccionDescripcion`, `SeccionEncuentro`, `FiltrosAgencias`…); los que solo *avisan* de algo usan un
callback `on…` (`onelegir`, `onactualizado`). Un hijo que modifica una prop **sin** haberla
declarado enlazable es la trampa 7.2.

---

## 5. `$effect` (y cuándo no usarlo)

`$effect(() => { … })` ejecuta código **después de que el DOM se actualiza**, y lo vuelve a ejecutar
cada vez que cambia algo que leyó **de forma síncrona** en su cuerpo. Es el `useEffect` con las
dependencias automáticas. Si devuelve una función, se llama antes de volver a ejecutarse y al
desmontar el componente. No corre en renderizado de servidor (aquí no aplica: el panel es una SPA).

Los cuatro usos del panel:

**1. Reaccionar a la sesión y la ruta** (`apps/panel_svelte/src/app/App.svelte`). Lee `auth.ready`,
`router.path` y `auth.userId`; si hay que redirigir, navega:

```svelte
  $effect(() => {
    if (!auth.ready) return;
    const destino = redireccionSesion(router.path, auth.userId);
    if (destino) go(destino);
  });
```

**2. Recargar al navegar, declarando una dependencia a propósito**
(`apps/panel_svelte/src/app/Shell.svelte`). `void router.path;` no hace nada con el valor: solo
**lo lee** para que el efecto se vuelva a ejecutar en cada cambio de ruta.

```svelte
  $effect(() => {
    if (!auth.userId) return;
    // Se recarga al navegar para reflejar cambios de verificación sin F5.
    void router.path;
    miAgencia()
```

**3. Cargar datos al montar** (`apps/panel_svelte/src/features/planes/PlanesPage.svelte`):

```svelte
  $effect(() => {
    cargar();
  });
```

Se ejecuta una sola vez porque `cargar()` solo **escribe** estado (`cargando = true`…) antes de su
primer `await`. Si alguien añade ahí una **lectura** de estado (por ejemplo `if (planes.length)`),
el efecto pasaría a depender de `planes` y se repetiría. Solo cuenta lo que se lee antes del primer
`await`.

**4. Cargar cuando cambia una prop** (`PlanFormPage.svelte`). Lee `planId` antes del `await`, así que
si el padre pasa otro `planId`, el efecto vuelve a cargar:

```svelte
  $effect(() => {
    if (!planId) return;
    (async () => {
      try {
        const agencia = await miAgencia();
```

### Cuándo NO usar `$effect`

El error más común viniendo de React es usar el efecto para todo. En Svelte casi nunca es lo
correcto. Casos reales del panel donde **se evitó**:

| Necesidad | No uses `$effect`; usa | Dónde está en el panel |
|---|---|---|
| Un valor que se calcula de otros (`erroresPolitica` desde `d`) | `$derived` | `PlanFormPage.svelte` |
| Reaccionar a un clic o a un envío | El *handler* del evento | `alternarTema` en `Shell.svelte`, `guardar` en `PlanFormPage.svelte` |
| Copiar un dato a otra variable «para mantenerla sincronizada» | `$derived`, o un solo dueño del dato (`bind:`) | `aviso = $derived(…)` en `Shell.svelte` |
| Compartir estado entre pantallas | Un módulo `.svelte.ts` | `auth`, `router`, `toast` (sección 6) |

Un efecto es para **sincronizar con algo de fuera de Svelte**: la red, el navegador, otra
librería. Si tu efecto solo escribe en otros `$state` a partir de otros `$state`, casi seguro es un
`$derived`.

Y un efecto que **lee y escribe el mismo estado** entra en bucle: Svelte lo corta con
`effect_update_depth_exceeded` («Maximum update depth exceeded. This typically indicates that an
effect reads and writes the same piece of state»).

> **Alternativas que existen y el panel no usa:** `$effect.pre` (corre *antes* de actualizar el DOM)
> y `onMount` (una vez al montar). Para «cargar al montar», el panel eligió `$effect` sin lecturas;
> `onMount` sería equivalente.

---

## 6. Estado compartido en módulos `.svelte.ts`

En React compartirías `auth`, la ruta y los avisos con Context o un *store*. En Svelte 5 basta un
**módulo** que exporta un objeto `$state`. Funciona porque los *runes* también se compilan en
archivos cuyo nombre termina en **`.svelte.ts`** (o `.svelte.js`); en un `.ts` normal no.

`apps/panel_svelte/src/shared/lib/router.svelte.ts`:

```ts
export const router = $state({ path: location.hash.slice(1) || '/' });

addEventListener('hashchange', () => {
  router.path = location.hash.slice(1) || '/';
});

export function go(path: string): void {
  location.hash = '#' + path;
}
```

`apps/panel_svelte/src/features/auth/auth.svelte.ts`:

```ts
export const auth = $state({
  ready: false,
  userId: null as string | null,
  email: null as string | null,
});

supabase.auth.onAuthStateChange((_evento, sesion) => {
  auth.userId = sesion?.user?.id ?? null;
```

`apps/panel_svelte/src/shared/lib/toast.svelte.ts`:

```ts
export const toast = $state({ mensaje: '' });
let timer: ReturnType<typeof setTimeout> | undefined;

export function avisar(mensaje: string): void {
  toast.mensaje = mensaje;
```

Cómo se usan:

- **Leer** es leer una propiedad: `router.path`, `auth.userId`, `toast.mensaje`. Dentro de una
  plantilla, un `$derived` o un `$effect`, esa lectura queda registrada. `App.svelte` hace
  `const ruta = $derived(resolverRuta(router.path));` y la pantalla cambia sola cuando cambia el hash.
- **Escribir** es asignar la propiedad, normalmente desde una función del propio módulo (`go`,
  `avisar`, el *callback* de `onAuthStateChange`). Así hay un solo lugar que cambia cada dato.
- Se exporta un **objeto** y se muta por propiedad (no `export let path`), por la regla de la
  sección 2.
- El import lleva `.svelte` pero no `.ts`: `import { auth } from '@/features/auth/auth.svelte'`
  resuelve `auth.svelte.ts`.
- Es un **singleton global**. En una SPA es lo que quieres; en las pruebas hay que reiniciarlo
  (`router.path = '/'` en el `afterEach` de `Shell.test.ts`) o sustituirlo con `vi.mock` (capítulo 4).

---

## 7. Trampas reales de este repo

Las tres salen del propio código; las dos primeras las avisa Svelte, la tercera es un error de
lógica que hubo que corregir en la reorganización.

### 7.1 Leer un prop o un estado una sola vez

Svelte avisa con **`state_referenced_locally`**. El compilador lo emite cuando lees, en el **nivel
superior del `<script>`**, un `$state` que se reasigna, una derivada o una prop: la lectura captura
el valor **de ese instante** y no se actualiza.

El panel tiene exactamente un caso, en `PlanFormPage.svelte`:

```svelte
  let { planId }: { planId?: string } = $props();

  let d = $state<PlanDraft>(draftVacio());
  let cargando = $state(!!planId);
```

`svelte-check` lo imprime como el único aviso (warning) del proyecto (línea 20):

```
This reference only captures the initial value of `planId`. Did you mean to reference it inside a derived instead?
https://svelte.dev/e/state_referenced_locally
```

Aquí el aviso se acepta (hoy no se corrige): `cargando` solo debe empezar en `true` si se está
editando un plan, y eso se decide al montar. Pero tiene una consecuencia: si `planId` cambiara con la misma instancia viva, `cargando` y `d` no se
reiniciarían. Por eso `App.svelte` obliga a montar una instancia nueva por ruta (7.3).

Cómo distinguirlo:

| Dónde lees el prop o el estado | ¿Se actualiza? |
|---|---|
| En la plantilla (`{planId}`), en `$derived`, en `$effect` | Sí |
| Dentro de una función que se llama después (un *handler*, `guardar`) | Sí: lee el valor de **ese** momento |
| En el nivel superior del script (`const x = planId`, `$state(planId)`) | **No**: solo el valor inicial |
| Desestructurando un objeto reactivo (ilustrativo, no está en el repo): `const { userId } = auth;` | **No**: es una foto de `auth.userId` |

La corrección habitual de un `const x = prop * 2` es `const x = $derived(prop * 2)`.

### 7.2 Modificar una prop que no es `$bindable`

Si un hijo cambia una propiedad de un objeto reactivo que le llegó **sin `bind:`**, Svelte (en
desarrollo y en las pruebas) imprime **`ownership_invalid_mutation`**: «Mutating unbound props
(`d`, at …) is strongly discouraged. Consider using `bind:d={...}` in … (or using a callback)
instead».

**El panel no la dispara**: todo componente que edita `d` lo declara `$bindable()` y su padre usa
`bind:` (sección 4). Para ver la advertencia hay que romper esa regla. El siguiente ejemplo es
**ilustrativo, no está en el repo**; lo ejecuté en una prueba desechable (Vitest + Testing Library
+ jsdom, la misma pila del panel) y la advertencia salió tal cual:

```svelte
<!-- Hijo.svelte -->
<script lang="ts">
  let { d }: { d: { nombre: string } } = $props();
</script>
<button onclick={() => (d.nombre = 'cambiado')}>{d.nombre}</button>
```

```svelte
<!-- Padre.svelte -->
<script lang="ts">
  import Hijo from './Hijo.svelte';
  let d = $state({ nombre: 'original' });
</script>
<Hijo {d} />
```

Al hacer clic, el botón pasa a decir «cambiado» (el objeto es un proxy compartido) **y** aparece el
aviso. Funciona, pero el hijo está cambiando un dato del que no es dueño, y quien lee el padre no
puede saberlo. Hay dos arreglos legítimos:

1. **`bind:`** si el hijo es un editor del dato: `<Hijo bind:d />` y `let { d = $bindable() } = $props()`.
2. **Un callback** si el hijo solo avisa: `<Hijo {d} onrenombrar={(n) => (d.nombre = n)} />`.

El mismo aviso sale si el hijo **sí** declara `$bindable()` pero el padre olvida el `bind:` y escribe
`<Hijo {d} />` (también lo comprobé): la prop solo es de doble vía cuando **los dos lados** lo dicen.
Es la forma más fácil de provocarlo en el panel (sesión 4 del plan).

En producción el aviso se reduce a una URL (`https://svelte.dev/e/ownership_invalid_mutation`), así
que se ve en desarrollo y en `npm test`, no en la página publicada.

### 7.3 Por qué `App` usa `{#key ruta.patron}`

Es la trampa más instructiva del repo, y la documenta el registro de la tarea (L7).

**El problema.** Svelte, igual que React, **reutiliza la instancia** de un componente cuando, en el
mismo sitio de la plantilla, sigue siendo el mismo componente. `App.svelte` pinta `<Pagina
{...ruta.props} />` con `Pagina` tomado de la tabla de rutas, y la tabla tiene dos entradas que
apuntan a la **misma** página (`apps/panel_svelte/src/app/rutas.ts`):

```ts
  { patron: '/planes/nuevo', componente: PlanForm, layout: 'panel', props: () => ({}) },
  { patron: '/planes/editar/:planId?', componente: PlanForm, layout: 'panel' },
```

Pasar de `/planes/editar/p-1` a `/planes/nuevo` resuelve el **mismo** `PlanForm`, así que Svelte no
lo volvía a montar: el `<script>` no se ejecutaba de nuevo, y `d` seguía siendo el plan editado,
**con su `id`**. Como `guardar` decide con `if (d.id == null)` entre crear y actualizar,
«Nuevo plan» habría terminado **actualizando el plan anterior**. (Antes de la reorganización, `App.svelte`
—en el commit `7c1c17a`— tenía una rama `{:else if}` distinta para cada una, `<PlanForm />` y
`<PlanForm planId={seg[2]} />`; cambiar de rama destruye y recrea el componente, y por eso el
problema no existía.)

**La solución.** `resolverRuta` devuelve también el `patron` que coincidió, y `App.svelte` envuelve
la página en un `{#key}` sobre ese patrón:

```svelte
    {#key ruta.patron}
      <Pagina {...ruta.props} />
    {/key}
```

Cuando el patrón cambia, el bloque se destruye y se vuelve a crear: instancia nueva, `d` nuevo
(`draftVacio()`), `cargando` recalculado. Pruebas en `apps/panel_svelte/src/app/rutas.test.ts`:

```ts
  it('nuevo y editar usan PlanForm con patrones distintos (App los separa con {#key})', () => {
    expect(resolverConPatron('/planes/nuevo').patron).toBe('/planes/nuevo');
    expect(resolverConPatron('/planes/editar/p-1').patron).toBe('/planes/editar/:planId?');
  });
```

**¿Por qué el patrón y no el path completo?** Porque dentro de una misma ruta
(`/planes/editar/a` → `/planes/editar/b`) el patrón no cambia: se conserva la instancia y solo
cambian las props, y el `$effect` de `PlanFormPage` (sección 5, uso 4) recarga el plan. La prueba
siguiente lo fija:

```ts
  it('dentro de la misma ruta el patrón no cambia: solo cambian las props', () => {
    expect(resolverConPatron('/planes/editar/a').patron).toBe(resolverConPatron('/planes/editar/b').patron);
  });
```

**La lección general:** en Svelte (como en React), «misma posición + mismo componente» = misma
instancia. Si una pantalla guarda estado inicial al montar, tienes que reiniciarla a mano con
`{#key}` (React: `key`).

> **Una pregunta abierta para la sesión 4.** El `$effect` de `PlanFormPage` no tiene función de
> limpieza. Si pasas de `/planes/editar/a` a `/planes/editar/b` antes de que responda la primera
> carga, ¿qué impide que la respuesta tardía de `a` pise a `b`? Hoy no hay protección explícita;
> piensa cómo sería (pista: la función que devuelve un `$effect`).

---

## 8. Chuleta

| Quiero… | Uso | Ejemplo en el panel |
|---|---|---|
| Un dato que cambia | `$state(v)` | `let cargando = $state(true)` |
| Un dato sin proxy | `$state.raw(v)` | (no se usa) |
| Una copia simple de un proxy | `$state.snapshot(x)` | (no se usa) |
| Un valor calculado | `$derived(expr)` / `$derived.by(fn)` | `erroresPolitica`, `anticipo` |
| Recibir props | `let { a, b = 1 } = $props()` | `Select.svelte` |
| Que el hijo edite una prop | `$bindable()` + `bind:` | `SeccionIncluye.svelte` |
| Que el hijo avise | Prop-callback `on…` | `onactualizado`, `onelegir` |
| Sincronizar con el exterior | `$effect(fn)` | `App.svelte`, `Shell.svelte` |
| Compartir entre pantallas | Objeto `$state` exportado de `*.svelte.ts` | `auth`, `router`, `toast` |
| Reiniciar un componente | `{#key expr}` | `App.svelte` |

---

**Siguiente:** [capítulo 3, Arquitectura del panel](03-arquitectura-del-panel.md).

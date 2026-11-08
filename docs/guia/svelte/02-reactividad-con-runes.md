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
variable directamente. `apps/panel_svelte/src/lib/features/planes/pages/PlanFormPage.svelte`:

```svelte
  let d = $state<PlanDraft>(draftVacio());
  let cargando = $state(!!planId);
  let guardando = $state(false);
  /** No se pudo abrir el plan a editar: no se muestra el formulario (guardarlo vacío crearía otro plan). */
  let errorCarga = $state('');
```

### Profundo: los objetos y arreglos son *proxies*

Si el valor es un objeto simple o un arreglo, Svelte lo envuelve en un `Proxy` y **cada propiedad
anidada es reactiva**. Se muta directamente, sin copiar como en React (`setD({ ...d, titulo })`).
`apps/panel_svelte/src/lib/features/planes/components/plan-form/SeccionIncluye.svelte`:

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
mutate the state value's properties»). Por eso `auth`, `toast`, `tema` y `pendiente` (de `confirmar`) son **objetos** que se
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

Dos formas más del panel. En `apps/panel_svelte/src/lib/shared/ui/Select.svelte` la etiqueta visible
sale del `valor` actual y de la lista de opciones:

```svelte
  const etiquetaActual = $derived(opciones.find((o) => o.valor === valor)?.etiqueta ?? valor);
```

Y para lógica con varios `if`, `$derived.by(() => { … })`
(`apps/panel_svelte/src/lib/features/liquidaciones/pages/LiquidacionesPage.svelte`):

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
  `validarPolitica` y `textoPoliticaCompleto` viven en `apps/panel_svelte/src/lib/features/planes/model/politica.ts`
  y se prueban sin DOM (capítulo 4).

---

## 4. Props y `$bindable`

### `$props`

Las props se declaran **desestructurando `$props()`**, con su tipo y valores por defecto en la misma
sentencia. `apps/panel_svelte/src/lib/shared/ui/Select.svelte`:

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
desmontar el componente. No corre en renderizado de servidor (aquí no aplica: con el router por hash SvelteKit no hace SSR, capítulo 3, sección 5).

Los cuatro usos del panel:

**1. Reaccionar a la sesión y la ruta** (`apps/panel_svelte/src/routes/+layout.svelte`). Lee
`auth.ready`, `page.url` (vía `rutaActual`) y `auth.userId`; si hay que redirigir, navega:

```svelte
  $effect(() => {
    if (!auth.ready) return;
    const destino = redireccionSesion(rutaActual(page.url), auth.userId);
    if (destino) goto('#' + destino);
  });
```

El mismo layout tiene un segundo efecto, el del tema: `$effect(() => untrack(iniciarTema))` (sección 6).

**2. Recargar al navegar, declarando una dependencia a propósito**
(`apps/panel_svelte/src/lib/features/agencias/components/Shell.svelte`). `path` es un
`$derived(rutaActual(page.url))`; `void path;` no hace nada con el valor: solo **lo lee** para que el
efecto se vuelva a ejecutar en cada cambio de ruta.

```svelte
  $effect(() => {
    if (!auth.userId) return;
    // Se recarga al navegar para reflejar cambios de verificación sin F5.
    void path;
    miAgencia()
```

**3. Cargar datos al montar** (`apps/panel_svelte/src/lib/features/planes/pages/PlanesPage.svelte`):

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
si el padre (la página de ruta, con `params.id`) pasa otro `planId`, el efecto vuelve a cargar:

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
| Reaccionar a un clic o a un envío | El *handler* del evento | `elegirTema` (lo llama el selector de `MenuCuenta.svelte`), `guardar` en `PlanFormPage.svelte` |
| Copiar un dato a otra variable «para mantenerla sincronizada» | `$derived`, o un solo dueño del dato (`bind:`) | `aviso = $derived(…)` en `Shell.svelte` |
| Compartir estado entre pantallas | Un módulo `.svelte.ts` | `auth`, `toast`, `tema`, `confirmar` y `page` de SvelteKit (sección 6) |

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

`apps/panel_svelte/src/lib/features/auth/model/auth.svelte.ts`:

```ts
export const auth = $state({
  ready: false,
  userId: null as string | null,
  email: null as string | null,
});

supabase.auth.onAuthStateChange((_evento, sesion) => {
  auth.userId = sesion?.user?.id ?? null;
```

`apps/panel_svelte/src/lib/shared/lib/toast.svelte.ts`:

```ts
export const toast = $state({ mensaje: '' });
let timer: ReturnType<typeof setTimeout> | undefined;

export function avisar(mensaje: string): void {
  toast.mensaje = mensaje;
```

Cómo se usan:

- **Leer** es leer una propiedad: `auth.userId`, `toast.mensaje`. Dentro de una plantilla, un
  `$derived` o un `$effect`, esa lectura queda registrada: `Toast.svelte` pinta `{toast.mensaje}` y
  aparece o desaparece solo.
- **Escribir** es asignar la propiedad, normalmente desde una función del propio módulo (`avisar`,
  el *callback* de `onAuthStateChange`). Así hay un solo lugar que cambia cada dato.
- Se exporta un **objeto** y se muta por propiedad (no `export let userId`), por la regla de la
  sección 2.
- El import lleva `.svelte` pero no `.ts`: `import { auth } from '$lib/features/auth/model/auth.svelte'`
  resuelve `auth.svelte.ts`.
- Es un **singleton global**. En una SPA es lo que quieres; en las pruebas hay que sustituirlo con
  `vi.mock` (capítulo 4) o reiniciarlo.

### Un ejemplo completo: `confirmar()`

Hasta aquí el módulo guarda un dato. `apps/panel_svelte/src/lib/shared/lib/confirmar.svelte.ts` guarda
además **una promesa a medio resolver**: cualquier pantalla pregunta con `await confirmar({…})` y recibe
`true` o `false`, sin montar un diálogo ni pasar *callbacks*. Es el estado compartido de esta sección con
dos funciones, una que abre la pregunta y otra que la cierra:

```ts
export const pendiente = $state<{ pregunta: Pregunta | null }>({ pregunta: null });

let resolver: ((respuesta: boolean) => void) | null = null;

export function confirmar(pregunta: Pregunta): Promise<boolean> {
  resolver?.(false); // otra pregunta sin responder: se da por cancelada
  return new Promise((resolve) => {
    resolver = resolve;
    pendiente.pregunta = pregunta;
  });
}

export function responder(respuesta: boolean): void {
  const resolve = resolver;
  resolver = null;
  pendiente.pregunta = null;
  resolve?.(respuesta);
}
```

| Pieza | Dónde | Qué hace |
|---|---|---|
| `confirmar(pregunta)` | `shared/lib/confirmar.svelte.ts` | Guarda la función `resolve` de la promesa y escribe `pendiente.pregunta`; devuelve la promesa |
| `DialogoConfirmar` | `shared/ui/DialogoConfirmar.svelte`, montado una vez en `routes/+layout.svelte` | **Lee** `pendiente.pregunta`: si hay una, dibuja un `Dialogo` con rol `alertdialog` |
| `responder(respuesta)` | `shared/lib/confirmar.svelte.ts` | Lo llaman los botones, Escape y el clic en el fondo (`false`); vacía la pregunta y resuelve la promesa |

El dato reactivo (`pendiente`) lo lee el componente; el que no es reactivo (`resolver`) es una variable
normal del módulo, porque nadie necesita enterarse de que cambió. Quien pregunta ni sabe que existe un
diálogo. `apps/panel_svelte/src/lib/features/planes/pages/PlanesPage.svelte`, al publicar o despublicar:

```ts
    const seguir = await confirmar(
    // …
    if (!seguir) return;
```

Dos reglas salen del propio código: **solo hay una pregunta a la vez** (una segunda cancela la primera
con `resolver?.(false)`, y el `{#key}` de `DialogoConfirmar` rehace el diálogo, capítulo 1, sección 5), y
con `peligro: true` el botón es el urgente y el foco empieza en «Cancelar». La prueba
(`tests/unit/shared/ui/Confirmar.test.ts`) monta `DialogoConfirmar`, llama a `confirmar` y comprueba la
respuesta; las pruebas de página usan el `responder` real para contestar.

### Otro ejemplo: el tema

`apps/panel_svelte/src/lib/shared/lib/tema.svelte.ts` guarda lo que **eligió** la persona y lo que se
**muestra**:

```ts
export const tema = $state<{ preferencia: Preferencia; oscuro: boolean }>({ preferencia: 'sistema', oscuro: false });
```

`elegirTema` lo escribe y lo guarda en `localStorage`; `iniciarTema` lo lee al arrancar y sigue los
cambios del sistema operativo mientras la preferencia sea «sistema». El layout raíz lo arranca con
`$effect(() => untrack(iniciarTema))`: `untrack` evita que el efecto se repita cada vez que alguien elige
un tema, porque `iniciarTema` lee `tema` al aplicarlo (capítulo 3, sección 8). El único control es el
selector del menú de cuenta.

### La ruta actual también es estado compartido: `page`

Con el router por hash ya no hay un módulo del panel que guarde la ruta: la guarda **SvelteKit**, y la
ofrece como `page` en `$app/state`. Es el mismo patrón, hecho por Kit. Por dentro
(`node_modules/@sveltejs/kit/src/runtime/client/state.svelte.js`) es una clase cuyos campos son `$state.raw` (sección 2): `url`,
`params`, `status`, `error`… Kit **reasigna** el valor entero en cada navegación (`page.url` pasa a ser
otra `URL`), y por eso funciona sin proxies.

```svelte
  import { page } from '$app/state';
  import { rutaActual } from '$lib/shared/lib/ruta';
  // …
  const path = $derived(rutaActual(page.url));
```

(`Shell.svelte`.) Cuando cambia el hash, `page.url` cambia, `path` se recalcula y todo lo que lo lea
—el menú activo, los dos efectos— se entera solo. Reglas: se **lee** (no se asigna), y se lee dentro
de una plantilla, un `$derived` o un `$effect`; si lo copias al nivel superior del script
(`const url = page.url;`) tendrás la foto de ese momento (7.1). En las pruebas, `$app/state` se
sustituye por un `page` falso que se mueve con `irA('/ruta')` (capítulo 4, sección 5).

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

`svelte-check` lo imprime como el único aviso (warning) del proyecto (línea 28):

```
This reference only captures the initial value of `planId`. Did you mean to reference it inside a derived instead?
https://svelte.dev/e/state_referenced_locally
```

Aquí el aviso se acepta (hoy no se corrige): `cargando` solo debe empezar en `true` si se está
editando un plan, y eso se decide al montar. Pero tiene una consecuencia: si `planId` cambia con la instancia viva (de `#/planes/editar/a` a
`#/planes/editar/b` la ruta es la misma), `cargando` no vuelve a `true` y solo el `$effect` recarga
`d`. De `editar` a `nuevo` sí hay instancia nueva, porque cada ruta es la suya (7.3).

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

### 7.3 Por qué cada ruta es su propia instancia

Es la trampa más instructiva del repo: nació con el router anterior, la documenta el registro de la
tarea (L7) y hoy la resuelve SvelteKit con la estructura de carpetas.

**El problema.** Svelte, igual que React, **reutiliza la instancia** de un componente cuando, en el
mismo sitio de la plantilla, sigue siendo el mismo componente. El router anterior tenía una tabla de
rutas y un `App.svelte` que pintaba `<Pagina {...ruta.props} />`; la tabla tenía dos entradas que
apuntaban a la **misma** página (código histórico, ya no está en el repo; se ve con
`git show 90ba75b~1:apps/panel_svelte/src/app/rutas.ts`):

```ts
  { patron: '/planes/nuevo', componente: PlanForm, layout: 'panel', props: () => ({}) },
  { patron: '/planes/editar/:planId?', componente: PlanForm, layout: 'panel' },
```

Pasar de `/planes/editar/p-1` a `/planes/nuevo` resolvía el **mismo** `PlanForm`, así que Svelte no
lo volvía a montar: el `<script>` no se ejecutaba de nuevo, y `d` seguía siendo el plan editado,
**con su `id`**. Como `guardar` decide con `if (d.id == null)` entre crear y actualizar,
«Nuevo plan» habría terminado **actualizando el plan anterior**. Se arregló envolviendo la página en
un `{#key ruta.patron}`, que destruye y recrea el bloque cuando cambia el patrón.

**Cómo está hoy.** Con SvelteKit no hace falta el `{#key}`: `planes/nuevo` y `planes/editar/[[id]]`
son **dos archivos de ruta**, y Kit pinta cada nivel con *el componente de su ruta*. En el archivo
que genera (`.svelte-kit/generated/root.svelte`, sin versionar) el nivel de la página es
`<Pyramid_2 … />` con `Pyramid_2 = constructors[2]`. Los dos `+page.svelte` dibujan lo mismo, pero
son componentes distintos, así que pasar de uno al otro destruye y monta: formulario nuevo, `d` nuevo
(`draftVacio()`), `cargando` recalculado.

```
#/planes/editar/p-1 ──► (panel)/planes/editar/[[id]]/+page.svelte  ─┐
                                                                      ├─ PlanFormPage (instancias distintas)
#/planes/nuevo      ──► (panel)/planes/nuevo/+page.svelte         ─┘
```

**Dentro de una misma ruta, la instancia se conserva.** De `#/planes/editar/a` a
`#/planes/editar/b` el archivo es el mismo: Kit actualiza `page.params`, el `+page.svelte` recibe
`params.id` nuevo, `PlanFormPage` recibe otro `planId` y su `$effect` (sección 5, uso 4) recarga el
plan. Eso es lo que se quiere cuando solo cambia el parámetro.

**La lección general:** en Svelte (como en React), «misma posición + mismo componente» = misma
instancia. Si una pantalla guarda estado inicial al montar, hay que reiniciarla a mano con `{#key}`
(React: `key`) o, como aquí, dar a cada caso su propio archivo de ruta.

> **Un detalle de SvelteKit que cambia cómo reproducir esto.** Si cambias el hash **a mano en la
> barra de direcciones**, Kit recarga la página entera a propósito (capítulo 3, sección 7), así que
> no sirve para probar este tipo de trampa: el estado se pierde por la recarga. Hay que navegar con
> un enlace o con `goto`. La sesión 4 del plan lo trabaja.

> **Dos preguntas abiertas para la sesión 4.**
> 1. El `$effect` de `PlanFormPage` no tiene función de limpieza. Si pasas de `/planes/editar/a` a
>    `/planes/editar/b` antes de que responda la primera carga, ¿qué impide que la respuesta tardía de
>    `a` pise a `b`? Hoy no hay protección explícita; piensa cómo sería (pista: la función que
>    devuelve un `$effect`).
> 2. `editar/[[id]]` también atiende `#/planes/editar` **sin** id, que es la misma ruta que
>    `#/planes/editar/a`. Por la lectura del código (no lo he ejecutado), al pasar de una a otra con la
>    instancia viva `planId` pasa a `undefined`, el efecto sale temprano y `d` conserva el plan de
>    antes, con su `id`. ¿Qué cambio de una línea en `routes/(panel)/planes/editar/[[id]]/+page.svelte`
>    reiniciaría la instancia? (Pista: la sección 5 del capítulo 1.)

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
| Sincronizar con el exterior | `$effect(fn)` | `routes/+layout.svelte`, `Shell.svelte` |
| Compartir entre pantallas | Objeto `$state` exportado de `*.svelte.ts` | `auth`, `toast`, `tema` |
| Preguntar y esperar la respuesta | Una promesa guardada en un módulo `.svelte.ts` | `confirmar()` (sección 6) |
| Saber en qué ruta estoy | `page` de `$app/state` | `rutaActual(page.url)` en `Shell.svelte` |
| Reiniciar un componente | `{#key expr}` | `DialogoConfirmar.svelte` (las rutas no lo necesitan: cada una es su archivo, 7.3) |

---

**Siguiente:** [capítulo 3, Arquitectura del panel](03-arquitectura-del-panel.md).

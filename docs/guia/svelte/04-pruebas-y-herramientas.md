# 4. Pruebas y herramientas

El día a día del panel: cómo se compila (SvelteKit sobre Vite), cómo se estila (Tailwind 4), cómo se prueba (Vitest
y Testing Library), cómo se analiza (`svelte-check`) y **qué tres comprobaciones** hacen falta antes
de dar un cambio por terminado, y por qué las tres.

> Volver al [plan de aprendizaje](README.md). Este capítulo cubre la sesión 6.
> Todos los comandos se ejecutan desde `apps/panel_svelte`.

## Contenido

1. [Tabla de equivalencias](#1-tabla-de-equivalencias)
2. [Vite, SvelteKit y los alias](#2-vite-sveltekit-y-los-alias)
3. [Tailwind 4](#3-tailwind-4)
4. [Vitest y Testing Library](#4-vitest-y-testing-library)
5. [Mockear el `*.api.ts` de una funcionalidad](#5-mockear-el-apits-de-una-funcionalidad)
6. [`supabase-falso` y los datos de ejemplo](#6-supabase-falso-y-los-datos-de-ejemplo)
7. [Lógica pura frente a componentes](#7-lógica-pura-frente-a-componentes)
8. [`svelte-check`](#8-svelte-check)
9. [`npm run build` y por qué cuenta como verificación](#9-npm-run-build-y-por-qué-cuenta-como-verificación)
10. [Antes de dar algo por terminado](#10-antes-de-dar-algo-por-terminado)

---

## 1. Tabla de equivalencias

| Tarea | Panel (Node) | App del viajero (Flutter) |
|---|---|---|
| Instalar dependencias | `npm install` | `flutter pub get` |
| Ejecutar en desarrollo | `npm run dev` (SvelteKit sobre Vite) | `flutter run` |
| Analizar tipos y avisos | `npm run check` | `flutter analyze` |
| Ejecutar las pruebas | `npm test` (= `vitest run`) | `flutter test` |
| Compilar para producción | `npm run build` (= `vite build`, SvelteKit + `adapter-static`) | `flutter build web` |
| Servir lo compilado | `npm run preview` | — |
| Regenerar los tipos de SvelteKit | `npm run prepare` (= `svelte-kit sync`) | — |
| Formatear | No hay formateador configurado | `dart format` |

Los scripts están en `apps/panel_svelte/package.json` (`dev`, `build`, `preview`, `prepare`, `check`,
`test`). `npm run check` ejecuta `svelte-kit sync` y después `svelte-check` (sección 8); `prepare`
corre solo tras `npm install`.

---

## 2. Vite, SvelteKit y los alias

Vite es el servidor de desarrollo y el empaquetador; **SvelteKit es un plugin de Vite**. Por eso
`npm run dev` sigue siendo `vite`, y recarga la pantalla al guardar un archivo.
`apps/panel_svelte/vite.config.ts` completo:

```ts
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [tailwindcss(), sveltekit()],
});
```

- `sveltekit()` (de `@sveltejs/kit/vite`) hace de plugin de Svelte (compila los `.svelte`; el
  TypeScript de dentro lo prepara `vitePreprocess()` en `svelte.config.js`), lee `src/routes`, genera
  la carpeta `.svelte-kit/` y, en `npm run build`, aplica el adaptador (`adapter-static`, capítulo 3,
  sección 5).
- `tailwindcss()` procesa Tailwind (sección siguiente).
- **Los alias ya no están en `vite.config.ts`.** Los pone SvelteKit:

| Alias | Apunta a | Dónde se declara |
|---|---|---|
| `$lib` | `src/lib` | Viene con SvelteKit |
| `$tests` | `tests/` | `apps/panel_svelte/svelte.config.js`: `alias: { $tests: 'tests' }` |
| `$app/navigation`, `$app/state` | Módulos virtuales de SvelteKit (`goto`, `page`…) | SvelteKit |

**Un solo sitio, no tres.** SvelteKit escribe `.svelte-kit/tsconfig.json` con los `paths` de los alias
(`$lib`, `$lib/*`, `$tests`, `$tests/*`), y `apps/panel_svelte/tsconfig.json` solo lo extiende:

```json
{
  "extends": "./.svelte-kit/tsconfig.json",
  "compilerOptions": {
    "strict": true,
    "skipLibCheck": true
  }
}
```

`vitest.config.ts` usa el mismo plugin `sveltekit()` (sección 4), así que las pruebas ven los mismos
alias. Antes había que repetir el alias en tres archivos; ahora basta `svelte.config.js`.

> **Si el editor marca `$tests`, `$lib` o `./$types` como inexistentes**, falta regenerar
> `.svelte-kit/` (no se versiona): corre `npm run prepare`. `npm run dev` y `npm run check` también
> lo regeneran.

**Configuración por entorno.** `apps/panel_svelte/src/lib/shared/api/supabase.ts` lee las variables
`VITE_SUPABASE_URL` y `VITE_SUPABASE_KEY` (solo las que empiezan por `VITE_` llegan al navegador) y,
si no existen, usa los valores del Supabase local:

```ts
export const supabase = createClient(
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? 'http://127.0.0.1:54331',
```

(SvelteKit tiene su propio sistema, `$env/static/public`, con prefijo `PUBLIC_`; el panel sigue con
`import.meta.env` de Vite.)

**Puerto.** `npm run dev` abre `http://localhost:5173`. Si está ocupado, Vite elige el siguiente
(`5174`) y lo imprime en la consola: usa el que te diga.

---

## 3. Tailwind 4

El estilo del panel son **clases de utilidad** en el atributo `class`
(`class="mt-3.5 flex flex-wrap items-center gap-1 border-t border-linea pt-3"`) más unas pocas
**clases de componente** que viven en `app.css` (`.tarjeta`, `.btn`, `.campo`, `.chip`…). Con Tailwind 4 no hay `tailwind.config.js`: se
configura en CSS, y el plugin `tailwindcss()` de Vite (arriba) hace el resto. El CSS se carga con
`import '../app.css'` en `src/routes/+layout.svelte`.
`apps/panel_svelte/src/app.css`:

```css
@import "tailwindcss";

@custom-variant dark (&:where(.dark, .dark *));

@theme {
  --font-sans: "Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto,
  /* Azul pizarra de la marca (panel) */
  --color-brand-600: #2d4a73;
```

| Pieza | Qué hace |
|---|---|
| `@import "tailwindcss"` | Carga Tailwind |
| `@theme { --color-brand-600: … }` | Crea los colores de marca: `bg-brand-600`, `text-brand-700`. También `ok-500` (verde de estados positivos), `ink-800` (fondos oscuros) y `paper` |
| `@custom-variant dark (…)` | Define `dark:` como «un ancestro tiene la clase `dark`», no como «el sistema está en modo oscuro» |

**Modo oscuro por clase.** `src/app.html` arranca en **claro**: un pequeño script, antes del primer
render, añade la clase `dark` a `<html>` solo si en `localStorage` hay `diverso-panel-theme = dark`; el
botón de `Shell.svelte` la alterna y guarda la elección. Por eso en los componentes se escribe
`bg-white dark:bg-ink-800`. Los colores que cambian con el tema (`--suave`, `--linea`, `--acento-ink`…)
se declaran una vez en `app.css` (en `:root` y en `.dark`) y se usan como utilidades: `text-suave`,
`border-linea`, `text-acento-ink`.

Dos reglas prácticas:

- **Las clases tienen que aparecer completas en el código.** Tailwind busca los nombres de clase en
  el texto de los archivos; `bg-${color}-600` no se encuentra. Por eso `shared/ui/tonos.ts`
  guarda **cadenas enteras** en un objeto (`TONOS_AVISO`) y `Aviso.svelte` elige una.
- **Valores a medida** con corchetes: `text-[13.5px]`, `w-[236px]`, `max-w-[820px]`.

El `<style>` de Svelte (capítulo 1, sección 2) no se usa en el panel: lo que las utilidades no expresan
bien (el interruptor `.switch`, el anillo de foco de `.campo`, `.tarjeta`, `.tabla`) vive en `app.css`,
dentro de `@layer components`.

---

## 4. Vitest y Testing Library

`apps/panel_svelte/vitest.config.ts`:

```ts
export default defineConfig({
  plugins: [sveltekit(), svelteTesting()],
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.ts'],
  },
});
```

- **`sveltekit()`** es el mismo plugin del build: da los alias (`$lib`, `$tests`) y compila los
  `.svelte`. Los módulos `$app/*` también resuelven, pero necesitan el runtime de Kit en marcha, que
  en las pruebas no existe: por eso se **mockean** (sección 5).
- **`include: ['tests/**/*.test.ts']`**: se ejecuta todo `*.test.ts` bajo `tests/`; `src/` no tiene
  pruebas. Los *helpers* de la raíz de `tests/` (sección 6) no terminan en `.test.ts`, así que no se
  ejecutan como pruebas.
- **`jsdom`** simula un navegador (DOM, `location.hash`, eventos) dentro de Node. No hay Tailwind en
  las pruebas: no hay CSS, y no hace falta.
- **`svelteTesting()`** (de `@testing-library/svelte/vite`) se encarga de tres cosas: que Svelte se
  cargue en su versión de navegador, que el DOM se **limpie solo** tras cada prueba y que las
  dependencias de Testing Library se procesen como el resto. Sin él habría que desmontar a mano.
- **Las pruebas están en `tests/unit/`, espejo de `src/`**, y hoy son **34 archivos y 512 pruebas**
  (se explica abajo).
- Vitest compila los componentes en **modo desarrollo**: los avisos de Svelte (como
  `ownership_invalid_mutation`, capítulo 2) salen en la consola de las pruebas.

### Dónde está la prueba y cómo importa lo que prueba

`src/` contiene solo código; `tests/unit/` repite su estructura (capítulo 3, sección 2). La prueba de
`src/lib/features/auth/model/sesion.ts` es `tests/unit/features/auth/model/sesion.test.ts`: el mismo
camino, sin el `lib/` y con `.test` en el nombre. Por eso **no puede importar con `./`** y usa el alias
`$lib`, que apunta a `src/lib`. `apps/panel_svelte/tests/unit/features/auth/model/sesion.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { redireccionSesion } from '$lib/features/auth/model/sesion';
```

Las ayudas se importan con `$tests` (`import { agencia, texto } from '$tests/fixtures'`). Lo único que
no cuelga de `$lib` son `src/params` y `src/routes`, así que sus pruebas importan relativo.
`apps/panel_svelte/tests/unit/params/doc.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { DOCUMENTOS } from '$lib/features/legal/model/legal';
import { match } from '../../../src/params/doc';
```

Si añades un archivo a `src/`, su prueba va en la ruta espejo; ninguna herramienta lo comprueba.

### Una prueba de componente

`apps/panel_svelte/tests/unit/shared/ui/StatusPill.test.ts` renderiza el componente con sus props y mira el
DOM resultante:

```ts
function pill(estado: string): HTMLElement {
  const { container } = render(StatusPill, { estado });
  return container.querySelector('span') as HTMLElement;
}
```

```ts
  it('un estado desconocido se muestra tal cual en tono neutro', () => {
    const el = pill('en_revision');
    expect(el.textContent?.trim()).toBe('en_revision');
    expect(el.className).toContain('pildora-neutra');
  });
```

### Interacción y asincronía

Svelte aplica los cambios en una microtarea, no en el acto. Las funciones de
`@testing-library/svelte` ya lo resuelven: `fireEvent` es **asíncrona** y espera a Svelte
(`await tick()`), así que se usa siempre con `await`. Para datos que llegan de una promesa se
usan `await screen.findByText(...)` o `await vi.waitFor(...)`.
`apps/panel_svelte/tests/unit/features/planes/pages/PlanFormPage.test.ts`:

```ts
    await fireEvent.input(screen.getByLabelText(PARCIAL_H), { target: { value: '48' } });
    await fireEvent.input(screen.getByLabelText(PARCIAL_PCT), { target: { value: '50' } });
    await fireEvent.submit(container.querySelector('form')!);
    await vi.waitFor(() => expect(texto(container)).toContain('La ventana parcial debe ser menor que la de cancelación gratuita.'));
```

`fireEvent.input(campo, { target: { value } })` es lo que dispara el `bind:value` del campo (capítulo 1,
sección 9). Se buscan los elementos como los vería una persona: `getByLabelText`, `getByRole`,
`findByText`, no por clases.

### Componentes con contenido hijo

Un componente que recibe `children` necesita un *snippet*; en un `.ts` se fabrica con
`createRawSnippet` (`apps/panel_svelte/tests/unit/features/agencias/components/Shell.test.ts`):

```ts
const children = createRawSnippet(() => ({ render: () => '<p>contenido de la página</p>' }));
```

y se pasa como prop: `render(Shell, { children })`.

---

## 5. Mockear el `*.api.ts` de una funcionalidad

Una **página** pide datos a su `*.api.ts`. En su prueba se sustituye ese módulo con `vi.mock` para
no tocar la red y para decidir qué datos «llegan». `apps/panel_svelte/tests/unit/features/planes/pages/PlanFormPage.test.ts`:

```ts
vi.mock('$app/navigation', () => ({ goto: vi.fn() }));
vi.mock('$lib/features/agencias/api/agencias.api', () => ({
  miAgencia: vi.fn(),
}));
vi.mock('$lib/features/planes/api/planes.api', () => ({
  misPlanes: vi.fn(),
  crearPlan: vi.fn(),
  actualizarPlan: vi.fn(),
}));

import { goto } from '$app/navigation';
import { actualizarPlan, crearPlan, misPlanes } from '$lib/features/planes/api/planes.api';
```

```ts
const miAgenciaMock = vi.mocked(miAgencia);
const misPlanesMock = vi.mocked(misPlanes);
```

```ts
afterEach(() => {
  vi.resetAllMocks();
});
```

Reglas que se ven ahí:

- **`vi.mock` se eleva** (Vitest lo ejecuta antes de los `import`), por eso el patrón pone los
  `vi.mock` arriba y los `import` de los módulos mockeados debajo.
- **El mock se escribe con `$lib/…`, aunque la página importe relativo.** La página dice
  `from '../api/planes.api'` y la prueba mockea `'$lib/features/planes/api/planes.api'`: Vitest mockea
  por archivo resuelto, y ambos caminos llevan al mismo `planes.api.ts`.
- El mock **solo declara las funciones que la página usa**. Si la página importa otra y no está en
  el mock, la prueba falla con un error que nombra la función que falta: te dice qué dependencias tiene la página.
- Cada prueba decide la respuesta: `miAgenciaMock.mockResolvedValue(agencia())` y comprueba lo que la
  página mandó: `expect(crearMock.mock.calls[0][1]).toMatchObject({ … })`.
- El `afterEach` llama a `vi.resetAllMocks()` para que una prueba no contamine a la siguiente.
- **`goto` también se mockea** (`vi.mock('$app/navigation', () => ({ goto: vi.fn() }))`): la prueba
  comprueba **a dónde mandó** la página, con el `#` incluido:
  `expect(goto).toHaveBeenCalledWith('#/planes')`. Si la página llamara `goto('/planes')`, la prueba lo
  delataría (capítulo 3, sección 7).
- Se mockea el `*.api.ts`, **no** `errores.ts`: `mensajeError` es una función pura y se deja real, así
  la prueba comprueba también el mensaje que ve la persona.

### Módulos con estado compartido

El estado de `auth.svelte.ts` se sustituye con un objeto simple, y `$app/state` (la ruta actual, capítulo 2,
sección 6) con un **`page` falso** que vive en `apps/panel_svelte/tests/pagina-falsa.svelte.ts`:

```ts
export const page = $state({ url: new URL(ORIGEN) });

export function irA(ruta: string): void {
  page.url = new URL('#' + ruta, ORIGEN);
}
```

`apps/panel_svelte/tests/unit/features/agencias/components/Shell.test.ts` los une:

```ts
vi.mock('$app/state', () => import('$tests/pagina-falsa.svelte'));
vi.mock('$lib/features/agencias/api/agencias.api', () => ({
  miAgencia: vi.fn(),
}));
vi.mock('$lib/features/auth/model/auth.svelte', () => ({
  auth: { userId: 'u-1', email: 'agencia@diverso.app' },
  signOut: vi.fn(),
}));

import { irA } from '$tests/pagina-falsa.svelte';
```

`irA('/liquidaciones/liq-1')` simula la navegación por hash (cambia `page.url`, igual que haría Kit), y
el `afterEach` lo deja en `irA('/')` para no contaminar la prueba siguiente.

> **La ruta del `vi.mock` sigue al archivo.** Si mueves un módulo y el mock sigue apuntando a la ruta
> vieja, la prueba mockea un módulo que ya nadie importa y el real se carga sin avisar. Es una de las
> razones de la sección 9.

---

## 6. `supabase-falso` y los datos de ejemplo

Para probar un `*.api.ts` **de verdad** (qué fila manda, a qué tabla, con qué filtro) se sustituye
el cliente de Supabase por uno falso que **registra** lo que recibe.
`apps/panel_svelte/tests/supabase-falso.ts` abre con su manual de uso:

```ts
/**
 * Supabase falso para probar la capa de datos sin red: registra en `rec` lo que el panel le manda.
 * Uso: `vi.mock('$lib/shared/api/supabase', () => import('$tests/supabase-falso'))` y `beforeEach(reiniciar)`.
 */
```

y `apps/panel_svelte/tests/unit/features/planes/api/planes.api.test.ts` lo usa:

```ts
vi.mock('$lib/shared/api/supabase', () => import('$tests/supabase-falso'));

beforeEach(reiniciar);
```

```ts
  it('crearPlan escribe el texto generado y las columnas numéricas en la misma fila', async () => {
    await crearPlan('ag-1', draft);
    expect(rec.tabla).toBe('plans');
    expect(rec.insert).toMatchObject({
```

El falso expone `rec` (la «grabación»: `insert`, `update`, `eq`, `tabla`, `rpc`…) y `reiniciar`.
Cubre la parte de la API de Supabase que el panel usa (`from(...).insert/update/select/upsert`,
`rpc`); si un `*.api.ts` nuevo usa otra, se añade ahí.

**Datos de ejemplo.** `apps/panel_svelte/tests/fixtures.ts` tiene constructores con valores
razonables y `Partial` para cambiar solo lo que importa en la prueba:

```ts
export function agencia(parcial: Partial<Agency> = {}): Agency {
```

```ts
export function texto(el: Element | null): string {
```

`agencia({ comision_pct: 15 })`, `venta({ booking_estado: 'completada', … })`, `plan('Guatapé', [])`.
`texto(el)` devuelve el texto visible normalizado (espacios, saltos y NBSP en un solo espacio): lo
que se compara en casi todas las pruebas de páginas.

---

## 7. Lógica pura frente a componentes

La regla de la arquitectura (capítulo 3, sección 2) tiene su reflejo en las pruebas: lo que es una
función se prueba como función.

| Qué pruebas | Cómo | Ejemplo |
|---|---|---|
| Lógica pura (`model/<f>.ts`, `ruta.ts`, `sesion.ts`, `errores.ts`, `format.ts`, el *matcher* `params/doc.ts`) | Llamas la función y comparas. Sin DOM, sin mocks | `sesion.test.ts`, `ruta.test.ts`, `doc.test.ts`, `ventas.test.ts` |
| Acceso a datos (`*.api.ts`) | `supabase-falso` y miras `rec` | `planes.api.test.ts` |
| Un componente | `render(Componente, props)` y consultas por rol o etiqueta | `StatusPill.test.ts`, `LogoAgencia.test.ts` |
| Una página | Mock del `*.api.ts` + `render` + eventos | `PlanFormPage.test.ts`, `VentasPage.test.ts` |
| Un marco con estado compartido | Mock de `auth` y `$app/state` falso (`irA`) | `Shell.test.ts` |
| Una página de ruta (`+page.svelte`) | No se prueba una por una: es un adaptador de tres líneas. `arbol.test.ts` lee todas y comprueba qué pantalla de `lib/` dibuja cada una; la pantalla se prueba aparte | `arbol.test.ts` |

Todas viven en `tests/unit/`, en la ruta espejo del archivo que prueban. Una prueba de lógica pura es
la más barata. `apps/panel_svelte/tests/unit/features/auth/model/sesion.test.ts`:

```ts
    it('trata el userId vacío como sin sesión', () => {
      expect(redireccionSesion('/dashboard', '')).toBe('/login');
    });
```

Tres pruebas del panel también **leen archivos del repo** para no desalinearse de la base de datos
y de la app móvil: `politica.test.ts` compara el texto de la política con los vectores de las pruebas
SQL (`supabase/tests/0005_endurecimiento_pagos.sql` y otras), `legal.test.ts` compara la versión de los
documentos con `documento_legal.dart` y las migraciones, y `Logo.test.ts` compara el PNG del panel con
el de Flutter. Usan `node:fs` y `process` (rutas desde `apps/panel_svelte`, el directorio donde corre
`npm test`, no desde la carpeta de la prueba), y eso explica los errores conocidos de la sección
siguiente.

---

## 8. `svelte-check`

`svelte-check` es el equivalente de `flutter analyze`: revisa los tipos de TypeScript **dentro de
los `.svelte`** y los avisos del compilador de Svelte (accesibilidad, CSS sin usar,
`state_referenced_locally`…).

```bash
cd apps/panel_svelte
npm run check
```

`npm run check` es `svelte-kit sync && npx -y svelte-check@4 --tsconfig ./tsconfig.json`: primero
regenera `.svelte-kit/` (alias y tipos `./$types`) y después corre `svelte-check`. Éste no es una
dependencia del proyecto: `npx` lo descarga la primera vez (necesita red).

**Línea base conocida: 12 errores y 1 aviso, en 4 archivos.** Son anteriores a la reorganización y
siguen igual tras migrar a SvelteKit. «Terminado» significa **no sumar ninguno más**.

| Archivo | Errores | Causa |
|---|---|---|
| `tests/unit/features/planes/model/politica.test.ts` | 7 | `node:fs`, `node:path` y `process` sin tipos de Node |
| `tests/unit/features/legal/model/legal.test.ts` | 4 | lo mismo + un parámetro `f` implícitamente `any` |
| `tests/unit/shared/ui/Logo.test.ts` | 1 | `node:fs` sin tipos de Node |
| `src/lib/features/planes/pages/PlanFormPage.svelte` | (aviso) | `state_referenced_locally` en `planId` (capítulo 2, sección 7.1) |

Los 12 errores vienen de que esas pruebas usan APIs de Node y el proyecto no tiene `@types/node`
(`node_modules/@types` no lo trae). Vitest las ejecuta sin problema (por eso `npm test` pasa); solo el
chequeo de tipos protesta. Arreglarlos es añadir `@types/node` como dependencia de desarrollo; no se
hizo para no mezclarlo con la reorganización ni con la migración a SvelteKit.

`svelte-check` cubre también lo que SvelteKit genera: `import type { PageProps } from './$types'` en
las páginas con parámetros se resuelve gracias a `.svelte-kit/types/` (capítulo 3, sección 6).

---

## 9. `npm run build` y por qué cuenta como verificación

```bash
npm run build      # vite build → SvelteKit + adapter-static → dist/
```

Genera `dist/` (`index.html`, la carpeta `_app/` con el JS y CSS empaquetados, y lo de `static/`; la
carpeta no se versiona) y termina con `✓ built in …`. `npm run preview` sirve ese resultado para verlo
como en producción.

**Por qué es parte de la verificación y no un extra.** Cuando se movió el código a `features/` y
`shared/`, la primera vez **las pruebas pasaban y el build fallaba**: `auth.svelte.ts` seguía
importando `./supabase` (su ruta vieja), pero las pruebas **mockean `auth`**, así que ninguna cargaba
el archivo real. Solo el empaquetador, que sigue todos los imports de verdad, lo detectó.

Con SvelteKit el build detecta además cosas propias de Kit que ninguna prueba ve:

- Una ruta con `export const ssr`/`prerender` (error `Page options are ignored when router.type ===
  'hash'`).
- Un archivo de servidor (`+page.server.ts`, `+server.ts`) con el router por hash.
- Un `$lib/server/…` importado desde código del navegador.
- Dos carpetas de `routes/` que resuelven a la misma URL.

Las `+page.svelte` delgadas no tienen pruebas propias: `arbol.test.ts` fija qué pantalla dibuja cada
una, pero el «mapa de rutas» es el sistema de archivos, y quien lo valida al compilar es `sveltekit()`.

| Comprobación | Qué detecta | Qué NO detecta |
|---|---|---|
| `npm test` | Comportamiento: lógica, páginas, componentes | Un import roto en un módulo que las pruebas sustituyen con un mock; el mapa de rutas |
| `npm run check` | Tipos, accesibilidad, avisos de Svelte | Comportamiento, ni lo que solo falla al empaquetar |
| `npm run build` | Imports, sintaxis y reglas de SvelteKit que el empaquetador no pueda resolver | Comportamiento ni tipos (Vite no comprueba tipos) |

Las tres son baratas (segundos) y se solapan poco: por eso van **juntas** y **cada vez**.

---

## 10. Antes de dar algo por terminado

Desde `apps/panel_svelte`:

```bash
npm test             # 34 archivos, 512 pruebas, todas verdes
npm run build        # termina con ✓ built
npm run check        # 12 errores y 1 aviso: los de la sección 8, ninguno nuevo
```

- [ ] Las tres pasan.
- [ ] Si añadiste una pantalla, pruébala (su `…Page.test.ts` en `tests/unit/features/<f>/pages/`),
      comprueba que su `+page.svelte` existe en la carpeta de la URL y añádela a `ESPERADO` en
      `tests/unit/routes/arbol.test.ts` (capítulo 3, sección 11).
- [ ] Si cambiaste la regla de quién ve qué, `sesion.test.ts`; si tocaste `rutaActual` o el matcher
      `doc`, `ruta.test.ts` / `doc.test.ts`.
- [ ] Si tocaste un `*.api.ts`, su prueba con `supabase-falso` comprueba la fila que se manda.
- [ ] Moviste o renombraste un módulo: su prueba se movió a la ruta espejo y los `vi.mock` apuntan a
      la ruta nueva.
- [ ] Toda navegación nueva lleva el `#`: `goto('#/ruta')`, `href="#/ruta"`.

---

**Volver al** [plan de aprendizaje](README.md).

# 4. Pruebas y herramientas

El día a día del panel: cómo se compila (Vite), cómo se estila (Tailwind 4), cómo se prueba (Vitest
y Testing Library), cómo se analiza (`svelte-check`) y **qué tres comprobaciones** hacen falta antes
de dar un cambio por terminado, y por qué las tres.

> Volver al [plan de aprendizaje](README.md). Este capítulo cubre la sesión 6.
> Todos los comandos se ejecutan desde `apps/panel_svelte`.

## Contenido

1. [Tabla de equivalencias](#1-tabla-de-equivalencias)
2. [Vite y el alias de rutas](#2-vite-y-el-alias-de-rutas)
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
| Ejecutar en desarrollo | `npm run dev` | `flutter run` |
| Analizar tipos y avisos | `npx svelte-check` | `flutter analyze` |
| Ejecutar las pruebas | `npm test` (= `vitest run`) | `flutter test` |
| Compilar para producción | `npm run build` (= `vite build`) | `flutter build web` |
| Servir lo compilado | `npm run preview` | — |
| Formatear | No hay formateador configurado | `dart format` |

Los scripts están en `apps/panel_svelte/package.json` (`dev`, `build`, `preview`, `test`).

---

## 2. Vite y el alias de rutas

Vite es el servidor de desarrollo y el empaquetador. Con él, `npm run dev` recarga la pantalla al
guardar un archivo.
`apps/panel_svelte/vite.config.ts`:

```ts
export default defineConfig({
  plugins: [tailwindcss(), svelte()],
  // `@/…` = src/ (`/src` es relativo a la raíz): los imports no dependen de cuántos `../` hay.
  resolve: { alias: { '@': '/src' } },
});
```

- `svelte()` (de `@sveltejs/vite-plugin-svelte`) compila los `.svelte`; el TypeScript de dentro lo
  prepara `vitePreprocess()` en `svelte.config.js`.
- `tailwindcss()` procesa Tailwind (sección siguiente).
- **El alias `@` apunta a `src/`**, por eso `@/shared/lib/toast.svelte` es
  `src/shared/lib/toast.svelte.ts`. Se escribe `'/src'` (relativo a la raíz del proyecto) en lugar de
  construir una ruta absoluta con `path.resolve`, para no depender de los tipos de Node (la
  decisión quedó registrada al reorganizar el panel: no se añadió `@types/node`).

**El alias tiene que declararse en tres sitios**, y los tres deben coincidir:

| Archivo | Para quién |
|---|---|
| `vite.config.ts` | `npm run dev` y `npm run build` |
| `vitest.config.ts` | `npm test` (Vitest lee su propia configuración) |
| `tsconfig.json` (`"paths": { "@/*": ["./src/*"] }`) | El editor y `svelte-check` |

Si un import `@/…` funciona en la app pero falla en las pruebas, falta el alias en
`vitest.config.ts`; si funciona en ambas pero el editor lo marca, falta en `tsconfig.json`.

**Configuración por entorno.** `apps/panel_svelte/src/shared/api/supabase.ts` lee las variables
`VITE_SUPABASE_URL` y `VITE_SUPABASE_KEY` (solo las que empiezan por `VITE_` llegan al navegador) y,
si no existen, usa los valores del Supabase local:

```ts
export const supabase = createClient(
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? 'http://127.0.0.1:54331',
```

**Puerto.** `npm run dev` abre `http://localhost:5173`. Si está ocupado, Vite elige el siguiente
(`5174`) y lo imprime en la consola: usa el que te diga.

---

## 3. Tailwind 4

El estilo del panel son **clases de utilidad** en el atributo `class`
(`class="rounded-2xl border bg-white p-6"`). Con Tailwind 4 no hay `tailwind.config.js`: se
configura en CSS, y el plugin `tailwindcss()` de Vite (arriba) hace el resto.
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

**Modo oscuro por clase.** `index.html` nace con `<html class="dark">` y un pequeño script quita la
clase si en `localStorage` hay `diverso-panel-theme = light`; el botón de `Shell.svelte` la
alterna. Por eso en los componentes se escribe `bg-white dark:bg-ink-800`.

Dos reglas prácticas:

- **Las clases tienen que aparecer completas en el código.** Tailwind busca los nombres de clase en
  el texto de los archivos; `bg-${color}-600` no se encuentra. Por eso `Shell.svelte` y
  `StatusPill.svelte` guardan **cadenas enteras** en un objeto (`TONOS`, `MAPA`) y eligen una.
- **Valores a medida** con corchetes: `text-[13.5px]`, `w-[236px]`, `max-w-[820px]`.

`<style>` de Svelte (capítulo 1, sección 2) queda para lo que las utilidades no expresan bien
(el interruptor `.switch`, el anillo de foco de `.campo`).

---

## 4. Vitest y Testing Library

`apps/panel_svelte/vitest.config.ts`:

```ts
export default defineConfig({
  plugins: [svelte(), svelteTesting()],
  resolve: { alias: { '@': '/src' } },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts'],
  },
});
```

- **`jsdom`** simula un navegador (DOM, `location.hash`, eventos) dentro de Node. No hay Tailwind en
  las pruebas: no hay CSS, y no hace falta.
- **`svelteTesting()`** (de `@testing-library/svelte/vite`) se encarga de tres cosas: que Svelte se
  cargue en su versión de navegador, que el DOM se **limpie solo** tras cada prueba y que las
  dependencias de Testing Library se procesen como el resto. Sin él habría que desmontar a mano.
- **Las pruebas están junto a lo que prueban** (`ventas.ts` + `ventas.test.ts`), y hoy son **31
  archivos y 509 pruebas**.
- Vitest compila los componentes en **modo desarrollo**: los avisos de Svelte (como
  `ownership_invalid_mutation`, capítulo 2) salen en la consola de las pruebas.

### Una prueba de componente

`apps/panel_svelte/src/shared/ui/StatusPill.test.ts` renderiza el componente con sus props y mira el
DOM resultante:

```ts
function pill(estado: string): HTMLElement {
  const { container } = render(StatusPill, { estado });
  return container.querySelector('span') as HTMLElement;
}
```

```ts
  it('un estado desconocido se muestra tal cual en gris', () => {
    const el = pill('en_revision');
    expect(el.textContent?.trim()).toBe('en_revision');
    expect(el.className).toContain('text-slate-500');
  });
```

### Interacción y asincronía

Svelte aplica los cambios en una microtarea, no en el acto. Las funciones de
`@testing-library/svelte` ya lo resuelven: `fireEvent` es **asíncrona** y espera a Svelte
(`await tick()`), así que se usa siempre con `await`. Para datos que llegan de una promesa se
usan `await screen.findByText(...)` o `await vi.waitFor(...)`.
`apps/panel_svelte/src/features/planes/PlanFormPage.test.ts`:

```ts
    await fireEvent.input(screen.getByLabelText(PARCIAL_H), { target: { value: '24' } });
    await fireEvent.input(screen.getByLabelText(PARCIAL_PCT), { target: { value: '50' } });
    await fireEvent.submit(container.querySelector('form')!);
    await vi.waitFor(() => expect(texto(container)).toContain('La ventana parcial debe ser menor que la de cancelación gratuita.'));
```

`fireEvent.input(campo, { target: { value } })` es lo que dispara el `bind:value` del campo (capítulo 1,
sección 9). Se buscan los elementos como los vería una persona: `getByLabelText`, `getByRole`,
`findByText`, no por clases.

### Componentes con contenido hijo

Un componente que recibe `children` necesita un *snippet*; en un `.ts` se fabrica con
`createRawSnippet` (`apps/panel_svelte/src/app/Shell.test.ts`):

```ts
const children = createRawSnippet(() => ({ render: () => '<p>contenido de la página</p>' }));
```

y se pasa como prop: `render(Shell, { children })`.

---

## 5. Mockear el `*.api.ts` de una funcionalidad

Una **página** pide datos a su `*.api.ts`. En su prueba se sustituye ese módulo con `vi.mock` para
no tocar la red y para decidir qué datos «llegan». `apps/panel_svelte/src/features/planes/PlanFormPage.test.ts`:

```ts
vi.mock('@/features/agencias/agencias.api', () => ({
  miAgencia: vi.fn(),
}));
vi.mock('./planes.api', () => ({
  misPlanes: vi.fn(),
  crearPlan: vi.fn(),
  actualizarPlan: vi.fn(),
}));

import { actualizarPlan, crearPlan, misPlanes } from './planes.api';
```

```ts
const miAgenciaMock = vi.mocked(miAgencia);
const misPlanesMock = vi.mocked(misPlanes);
```

```ts
afterEach(() => {
  vi.resetAllMocks();
  location.hash = '';
});
```

Reglas que se ven ahí:

- **`vi.mock` se eleva** (Vitest lo ejecuta antes de los `import`), por eso el patrón pone los
  `vi.mock` arriba y los `import` de los módulos mockeados debajo.
- El mock **solo declara las funciones que la página usa**. Si la página importa otra y no está en
  el mock, la prueba falla con un error que nombra la función que falta: te dice qué dependencias tiene la página.
- Cada prueba decide la respuesta: `miAgenciaMock.mockResolvedValue(agencia())` y comprueba lo que la
  página mandó: `expect(crearMock.mock.calls[0][1]).toMatchObject({ … })`.
- El `afterEach` llama a `vi.resetAllMocks()` y reinicia el estado global (`location.hash`, `router.path`) se reinician para
  que una prueba no contamine a la siguiente.
- Se mockea el `*.api.ts`, **no** `errores.ts`: `mensajeError` es una función pura y se deja real, así
  la prueba comprueba también el mensaje que ve la persona.

### Módulos con estado compartido

El estado de `auth.svelte.ts` se sustituye con un objeto simple (`Shell.test.ts`):

```ts
vi.mock('@/features/auth/auth.svelte', () => ({
  auth: { userId: 'u-1', email: 'agencia@diverso.app' },
  signOut: vi.fn(),
}));
```

y `router` (que no se mockea) se reinicia: `router.path = '/';` en el `afterEach`.

> **La ruta del `vi.mock` sigue al archivo.** Si mueves un módulo y el mock sigue apuntando a la ruta
> vieja, la prueba mockea un módulo que ya nadie importa y el real se carga sin avisar. Es una de las
> razones de la sección 9.

---

## 6. `supabase-falso` y los datos de ejemplo

Para probar un `*.api.ts` **de verdad** (qué fila manda, a qué tabla, con qué filtro) se sustituye
el cliente de Supabase por uno falso que **registra** lo que recibe.
`apps/panel_svelte/src/test/supabase-falso.ts` abre con su manual de uso:

```ts
/**
 * Supabase falso para probar la capa de datos sin red: registra en `rec` lo que el panel le manda.
 * Uso: `vi.mock('@/shared/api/supabase', () => import('@/test/supabase-falso'))` y `beforeEach(reiniciar)`.
 */
```

y `apps/panel_svelte/src/features/planes/planes.api.test.ts` lo usa:

```ts
vi.mock('@/shared/api/supabase', () => import('@/test/supabase-falso'));

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

**Datos de ejemplo.** `apps/panel_svelte/src/test/fixtures.ts` tiene constructores con valores
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
| Lógica pura (`<f>.ts`, `rutas.ts`, `sesion.ts`, `errores.ts`, `format.ts`) | Llamas la función y comparas. Sin DOM, sin mocks | `sesion.test.ts`, `rutas.test.ts`, `ventas.test.ts` |
| Acceso a datos (`*.api.ts`) | `supabase-falso` y miras `rec` | `planes.api.test.ts` |
| Un componente | `render(Componente, props)` y consultas por rol o etiqueta | `StatusPill.test.ts`, `LogoAgencia.test.ts` |
| Una página | Mock del `*.api.ts` + `render` + eventos | `PlanFormPage.test.ts`, `VentasPage.test.ts` |
| Un marco con estado compartido | Mock de `auth`, reinicio de `router` | `Shell.test.ts` |

Una prueba de lógica pura es la más barata. `apps/panel_svelte/src/app/sesion.test.ts`:

```ts
    it('trata el userId vacío como sin sesión', () => {
      expect(redireccionSesion('/dashboard', '')).toBe('/login');
    });
```

Dos pruebas del panel también **leen archivos del repo** para no desalinearse de la base de datos:
`politica.test.ts` compara el texto de la política con los vectores de las pruebas SQL
(`supabase/tests/0005_endurecimiento_pagos.sql` y otras). Usan `node:fs` y `process`, y eso explica
los errores conocidos de la sección siguiente.

---

## 8. `svelte-check`

`svelte-check` es el equivalente de `flutter analyze`: revisa los tipos de TypeScript **dentro de
los `.svelte`** y los avisos del compilador de Svelte (accesibilidad, CSS sin usar,
`state_referenced_locally`…).

```bash
cd apps/panel_svelte
npx svelte-check
```

No está en `package.json`: `npx` lo descarga la primera vez (necesita red).

**Línea base conocida: 12 errores y 1 aviso, en 4 archivos.** Son anteriores a la reorganización y
siguen igual. «Terminado» significa **no sumar ninguno más**.

| Archivo | Errores | Causa |
|---|---|---|
| `src/features/planes/politica.test.ts` | 7 | `node:fs`, `node:path` y `process` sin tipos de Node |
| `src/features/legal/legal.test.ts` | 4 | lo mismo + un parámetro `f` implícitamente `any` |
| `src/shared/ui/Logo.test.ts` | 1 | `node:fs` sin tipos de Node |
| `src/features/planes/PlanFormPage.svelte` | (aviso) | `state_referenced_locally` en `planId` (capítulo 2, sección 7.1) |

Los 12 errores vienen de que esas pruebas usan APIs de Node y el `tsconfig.json` solo declara
`"types": ["vite/client"]` y no hay `@types/node`. Vitest las ejecuta sin problema (por eso `npm test`
pasa); solo el chequeo de tipos protesta. Arreglarlos es añadir `@types/node` y `"node"` a `types`;
no se hizo para no mezclarlo con la reorganización.

---

## 9. `npm run build` y por qué cuenta como verificación

```bash
npm run build      # vite build → dist/
```

Genera `dist/` (HTML, JS y CSS empaquetados; la carpeta no se versiona) y termina con
`✓ built in …`. `npm run preview` sirve ese resultado para verlo como en producción.

**Por qué es parte de la verificación y no un extra.** Cuando se movió el código a `features/` y
`shared/`, la primera vez **las pruebas pasaban y el build fallaba**: `auth.svelte.ts` seguía
importando `./supabase` (su ruta vieja), pero las pruebas **mockean `auth`**, así que ninguna cargaba
el archivo real. Solo el empaquetador, que sigue todos los imports de verdad, lo detectó.

| Comprobación | Qué detecta | Qué NO detecta |
|---|---|---|
| `npm test` | Comportamiento: lógica, páginas, componentes | Un import roto en un módulo que las pruebas sustituyen con un mock |
| `npx svelte-check` | Tipos, accesibilidad, avisos de Svelte | Comportamiento, ni lo que solo falla al empaquetar |
| `npm run build` | Cualquier import o sintaxis que el empaquetador no pueda resolver | Comportamiento ni tipos (Vite no comprueba tipos) |

Las tres son baratas (segundos) y se solapan poco: por eso van **juntas** y **cada vez**.

---

## 10. Antes de dar algo por terminado

Desde `apps/panel_svelte`:

```bash
npm test             # 31 archivos, 509 pruebas, todas verdes
npm run build        # termina con ✓ built
npx svelte-check     # 12 errores y 1 aviso: los de la sección 8, ninguno nuevo
```

- [ ] Las tres pasan.
- [ ] Si añadiste una pantalla, una fila en `rutas.test.ts` (capítulo 3, sección 9).
- [ ] Si tocaste un `*.api.ts`, su prueba con `supabase-falso` comprueba la fila que se manda.
- [ ] Moviste o renombraste un módulo: los `vi.mock` de las pruebas apuntan a la ruta nueva.

---

**Volver al** [plan de aprendizaje](README.md).

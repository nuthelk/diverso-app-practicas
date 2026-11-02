# Guía: entender el panel de agencias y aprender Svelte 5

Una guía para entender cómo está hecho el **panel de agencias de Diverso** (`apps/panel_svelte`) y
aprender **Svelte 5** usando **su propio código**. Está escrita para quien ya sabe React (o React
Native) y TypeScript, y cada concepto se explica a partir de lo que ya conoces. Todos los ejemplos
son código real del repo, con su ruta.

**Camino corto:** corre el panel ([abajo](#cómo-correr-el-panel)) y sigue las 6 sesiones del
[plan de aprendizaje](#plan-de-aprendizaje) en orden. Cada una te dice qué leer, qué hacer sobre la
app y cómo saber que ya la entendiste.

## Para quién es

- Sabes **React** (o React Native) y **TypeScript**, y **no conoces Svelte**.
- Prefieres aprender con una app real, con pantallas reales, que con ejemplos de juguete.
- No necesitas conocer el backend: la guía solo toca Supabase donde el panel lo llama.

Qué **no** cubre: SvelteKit (el panel no lo usa), las migraciones SQL, las Edge Functions, ni las
apps Flutter (para esas está la [guía de Flutter y Dart](../README.md)). Para correr todo el
sistema, el [README principal](../../../README.md).

## El panel en 5 líneas

1. Es la **cara B2B de Diverso**: las agencias turísticas gestionan sus planes, fechas y cupos,
   ven sus ventas y liquidaciones, y el rol admin verifica agencias (RNT) y ejecuta dispersiones.
2. **Svelte 5 + Vite + Tailwind 4**, en TypeScript. **Sin SvelteKit**: es una SPA con un router por
   hash (`#/planes`) escrito en unas pocas líneas.
3. El código está organizado **por funcionalidad** (`src/features/planes/`, `ventas/`, `admin/`…),
   con un esqueleto en `src/app/` y lo reutilizable en `src/shared/`, igual que `apps/viajero`.
4. Los datos vienen de **Supabase** a través de un archivo `*.api.ts` por funcionalidad; las reglas
   se prueban como **funciones puras** y las pantallas con Vitest + Testing Library.
5. Hoy: **509 pruebas en 31 archivos**; `npm run build` y `npx svelte-check` son parte de cada
   verificación.

## Cómo está organizada la guía

| Capítulo | De dónde partes | A dónde llegas |
|---|---|---|
| [1. Svelte para quien sabe React](01-svelte-para-quien-sabe-react.md) | Componentes, JSX, props, `children` | Leer cualquier archivo `.svelte` del panel |
| [2. Reactividad con *runes*](02-reactividad-con-runes.md) | `useState`, `useMemo`, `useEffect`, Context | Usar `$state`, `$derived`, `$effect`, `$props`; evitar las trampas reales del repo |
| [3. Arquitectura del panel](03-arquitectura-del-panel.md) | Carpetas por tipo de archivo | Saber dónde vive cada cosa, cómo viaja un dato y cómo agregar una pantalla |
| [4. Pruebas y herramientas](04-pruebas-y-herramientas.md) | Jest, Webpack/Vite, ESLint | Probar, analizar y compilar con confianza |

## Cómo correr el panel

Necesitas **Node** (el README principal usó la 24) y, para ver datos reales, el **Supabase local**
(`supabase start`, desde la raíz del repo; requisitos y detalles en
[Cómo correr](../../../README.md#cómo-correr-desarrollo-local)). Las **pruebas no necesitan** Supabase
ni red.

```bash
cd apps/panel_svelte
npm install
npm run dev          # desarrollo: http://localhost:5173
```

- **Puerto.** Si el 5173 está ocupado, Vite usa el siguiente (el panel ha corrido en el **5174**).
  Mira la URL que imprime la consola.
- **Cuenta para entrar:** `graffiti@demo.com` (agencia verificada), `patrimonio@demo.com`
  (en verificación) o `admin@demo.com`; contraseña `demo1234`
  ([Cuentas demo](../../../README.md#cuentas-demo-contraseña-demo1234)).
- **Backend.** Sin variables de entorno, el panel apunta a `http://127.0.0.1:54331` (el Supabase
  local). `VITE_SUPABASE_URL` y `VITE_SUPABASE_KEY` lo cambian.

Las tres comprobaciones del día a día (capítulo 4, sección 10):

```bash
npm test             # Vitest: 31 archivos, 509 pruebas
npm run build        # Vite: genera dist/ y termina con ✓ built
npx svelte-check     # tipos y avisos de Svelte: 12 errores y 1 aviso conocidos (capítulo 4, sección 8)
```

## Plan de aprendizaje

Seis sesiones, pensadas para 45–60 minutos cada una, en este orden. Los ejercicios de lectura no
cambian nada; los que modifican un archivo te dicen cómo deshacerlo
(`git restore <archivo>`).

| # | Sesión | Lees | Haces |
|---|---|---|---|
| 1 | [Correr el panel y ubicarte](#sesión-1-correr-el-panel-y-ubicarte) | Cap. 3 §1–2 | Recorrer las pantallas y mapearlas a archivos |
| 2 | [Un archivo `.svelte`](#sesión-2-un-archivo-svelte) | Cap. 1 | Traducir un componente a React y leer otro |
| 3 | [`$state`, `$derived` y props](#sesión-3-state-derived-y-props) | Cap. 2 §1–4 | Seguir el formulario del plan y leer el JS compilado |
| 4 | [Efectos, estado compartido y trampas](#sesión-4-efectos-estado-compartido-y-trampas) | Cap. 2 §5–7 | Provocar a propósito las dos trampas |
| 5 | [Datos, rutas y sesión](#sesión-5-datos-rutas-y-sesión) | Cap. 3 §3–9 | Seguir «Publicar» de punta a punta y registrar una ruta |
| 6 | [Pruebas y herramientas](#sesión-6-pruebas-y-herramientas) | Cap. 4 | Escribir tu primera prueba |

Las rutas parten de `apps/panel_svelte/src/` salvo que se indique otra cosa.

---

### Sesión 1: correr el panel y ubicarte

**Objetivo.** Tener el panel andando y saber qué carpeta contiene qué.

**Lee.**
- Capítulo 3, secciones 1 y 2 (mapa de carpetas y qué va dónde).
- `index.html` (qué carga) y `main.ts` (qué hace `mount`).
- `app/App.svelte` y, de `app/rutas.ts`, solo la lista `RUTAS`.

**Ejercicio.**
1. Levanta el Supabase local y el panel (sección anterior) y entra con `graffiti@demo.com`.
2. Recorre Resumen, Planes, Ventas, Liquidaciones y Cuenta. Mira cómo cambia el `#/…` de la barra
   de direcciones. Para cada una apunta: la fila de `RUTAS` que la declara y el archivo
   `features/<funcionalidad>/…Page.svelte` que la dibuja.
3. Abre `#/login` y `#/planes/nuevo` y compara qué rodea a cada página (con menú lateral o sin él).
   Busca en `rutas.ts` el campo que lo decide.

**Ya lo entendí si…**
- [ ] Dices, sin mirar, qué archivo dibuja el título «Mis planes».
- [ ] Explicas qué hace `mount(App, …)` y de dónde sale el `<div id="app">`.
- [ ] Distingues `app/`, `features/` y `shared/` y dices en cuál pondrías un componente `Boton`.
- [ ] Sabes a qué carpeta apunta `@/`.

---

### Sesión 2: un archivo `.svelte`

**Objetivo.** Leer un componente de Svelte como lees uno de React.

**Lee.**
- Capítulo 1 completo.
- `shared/ui/Skeleton.svelte`, `shared/ui/StatusPill.svelte` y `shared/ui/Empty.svelte`.
- `features/planes/components/plan-form/Seccion.svelte` y `SeccionIncluye.svelte`.

**Ejercicio.**
1. Traduce `Skeleton.svelte` y `Seccion.svelte` a TSX en papel: sus props, el valor por defecto de
   `clase` y cómo llega el contenido de dentro (`children`).
2. En `SeccionIncluye.svelte` marca con colores: cada `bind:`, cada evento (`onclick`, `onkeydown`),
   el `{#each}` con su clave y la función que cambia `d.incluye`.
3. Ejecuta las pruebas de `StatusPill` y lee sus nombres como una lista de comportamientos:

   ```bash
   cd apps/panel_svelte
   npx vitest run src/shared/ui/StatusPill.test.ts
   ```

**Ya lo entendí si…**
- [ ] Explicas por qué `Seccion.svelte` no tiene un `return` y puede tener varios nodos raíz.
- [ ] Dices la diferencia entre `{@render children()}` y un snippet con nombre como `accion` en `Empty`.
- [ ] Explicas por qué `.plan-form :global(.etiqueta)` necesita `:global` (pista: quién pinta `.etiqueta`).
- [ ] Sabes por qué `onclick` y no `onClick`, y por qué ya no existe `on:click`.

---

### Sesión 3: `$state`, `$derived` y props

**Objetivo.** Entender cómo un dato cambia y qué se actualiza como consecuencia.

**Lee.**
- Capítulo 2, secciones 1 a 4.
- `features/ventas/VentasPage.svelte` (el `<script>`).
- `features/planes/PlanFormPage.svelte` (`<script>` y plantilla).
- `features/planes/components/plan-form/SeccionEncuentro.svelte` y `PoliticaCancelacion.svelte`.
- `shared/ui/Select.svelte`.

**Ejercicio.**
1. En `VentasPage.svelte` dibuja el grafo: `filtro` → `filtradas`, `ventas` → `totales`. Antes de
   probar, predice qué se recalcula al pulsar un filtro. Compruébalo en la pantalla de Ventas.
2. En «Nuevo plan», cambia las horas de cancelación gratuita y mira la vista previa «Lo que verá el
   viajero». Encuentra la cadena completa: el `bind:` del campo → `d` → `erroresPolitica` →
   `textoVistaPrevia`.
3. Lee el JS que genera el compilador para un componente pequeño:

   ```bash
   cd apps/panel_svelte
   node --input-type=module -e "import { compile } from 'svelte/compiler'; import { readFileSync } from 'node:fs'; console.log(compile(readFileSync('src/shared/ui/Skeleton.svelte', 'utf8'), { filename: 'Skeleton.svelte', generate: 'client' }).js.code)"
   ```

**Ya lo entendí si…**
- [ ] Explicas por qué no hay `useMemo` ni lista de dependencias en `erroresPolitica`.
- [ ] Dices por qué `SeccionIncluye` declara `d = $bindable()` y qué pasaría si el padre olvidara el `bind:`.
- [ ] Distingues un componente **controlado** (`Select`: `valor` + `onchange`) de uno **enlazado** (`bind:d`).
- [ ] Dices qué pasa si escribes un `$state` dentro de un `$derived`.

---

### Sesión 4: efectos, estado compartido y trampas

**Objetivo.** Usar `$effect` solo cuando corresponde y reconocer las dos trampas del repo.

**Lee.**
- Capítulo 2, secciones 5 a 7.
- `app/App.svelte`, el `<script>` de `app/Shell.svelte`.
- `shared/lib/router.svelte.ts`, `features/auth/auth.svelte.ts`, `shared/lib/toast.svelte.ts`.
- El último `describe` de `app/rutas.test.ts`.

**Ejercicio.**
1. Para cada uno de los cuatro `$effect` del capítulo (App, Shell, PlanesPage, PlanFormPage) anota
   qué **lee** (sus dependencias) y qué **escribe**. ¿Cuál tiene una dependencia declarada «a
   propósito»?
2. **Provoca la trampa del `{#key}`.** En `app/App.svelte` quita las dos líneas `{#key ruta.patron}` y
   `{/key}`. En Planes pulsa «Editar» en un plan y, estando en el formulario, cambia a mano la URL a
   `#/planes/nuevo`. Verás el formulario con los datos del plan anterior. Corre
   `npx vitest run src/app`: **sigue en verde**, porque las pruebas cubren la tabla de rutas, no el
   montaje de `App`. Deshaz con `git restore apps/panel_svelte/src/app/App.svelte`.
3. **Provoca `ownership_invalid_mutation`.** En `features/planes/PlanFormPage.svelte` cambia
   `<SeccionIncluye bind:d />` por `<SeccionIncluye {d} />`. Con `npm run dev`, abre «Nuevo plan»,
   añade un ítem en «Qué incluye» y mira la consola del navegador. Deshaz con `git restore`.
4. Piensa (sin código): si pasas de `#/planes/editar/a` a `#/planes/editar/b` antes de que `a`
   termine de cargar, ¿qué impide que su respuesta pise a `b`? (Capítulo 2, nota final.)

**Ya lo entendí si…**
- [ ] Explicas por qué `erroresPolitica` es un `$derived` y no un `$effect` que escribe un `$state`.
- [ ] Dices qué hace `void router.path;` en `Shell.svelte`.
- [ ] Explicas por qué `export const router = $state({ … })` es un objeto y no `export let path`.
- [ ] Explicas, con tus palabras, por qué «misma posición + mismo componente» conserva la instancia.
- [ ] Dices por qué `state_referenced_locally` en `planId` es aceptable hoy y cuándo dejaría de serlo.

---

### Sesión 5: datos, rutas y sesión

**Objetivo.** Seguir un dato de punta a punta y saber agregar una pantalla.

**Lee.**
- Capítulo 3, secciones 3 a 9.
- `features/planes/PlanesPage.svelte` (`<script>`), `features/planes/planes.api.ts`
  y `shared/api/errores.ts`.
- `app/rutas.ts` completo y `app/sesion.ts`.
- `features/ventas/ventas.api.ts` (cómo una funcionalidad usa a otras).

**Ejercicio.**
1. Con el código abierto, completa una tabla con cada flecha de «Publicar un plan»: *archivo y
   función* por paso. Empieza en el `onclick` del botón de `PlanesPage.svelte` y termina en el aviso
   que ve la persona y en la recarga de la lista.
2. Predice, sin ejecutar: si `publicarPlan` lanzara un error con el mensaje `FECHA_CON_RESERVAS`,
   ¿qué texto sale y dónde? (Mira `errores.ts`.)
3. Comprueba cómo se agrega una ruta: en `app/rutas.ts` añade temporalmente
   `{ patron: '/prueba', componente: Planes, layout: 'panel' },` al final de `RUTAS` y abre
   `#/prueba`. Luego `git restore apps/panel_svelte/src/app/rutas.ts`.
4. En papel, aplica el checklist de la sección 9 a una pantalla «Reportes»: lista los archivos que
   crearías y los que editarías.
5. Lee las pruebas de la capa de app como documentación:

   ```bash
   cd apps/panel_svelte
   npx vitest run src/app
   ```

**Ya lo entendí si…**
- [ ] Dices por qué `/planes/nuevo` va antes que `/planes` en `RUTAS`.
- [ ] Dices qué devuelve `resolverRuta('/nada')` y quién pinta el aviso.
- [ ] Explicas por qué el guard espera a `auth.ready` y por qué es una función pura.
- [ ] Dices por qué `shared/` no puede importar de `features/`.
- [ ] Sabes dónde pondrías la lógica de un total nuevo y dónde la consulta que trae sus datos.

---

### Sesión 6: pruebas y herramientas

**Objetivo.** Usar el ciclo diario (probar, analizar, compilar) y escribir una prueba propia.

**Lee.**
- Capítulo 4 completo.
- `vitest.config.ts`, `vite.config.ts` y `tsconfig.json` (el alias `@` en los tres).
- `shared/ui/StatusPill.test.ts`, `features/planes/PlanFormPage.test.ts` (hasta `llenarBasicos`) y
  `features/planes/planes.api.test.ts`.
- `test/supabase-falso.ts` y `test/fixtures.ts`.

**Ejercicio.**
1. Ejecuta las tres comprobaciones y anota el resultado de cada una: archivos y pruebas de
   `npm test`, `✓ built` de `npm run build` y los 12 errores de `npx svelte-check` (¿en qué tres
   archivos están?).
2. Crea `apps/panel_svelte/src/shared/ui/Skeleton.test.ts`:

   ```ts
   import { describe, expect, it } from 'vitest';
   import { render } from '@testing-library/svelte';
   import Skeleton from './Skeleton.svelte';

   describe('Skeleton', () => {
     it('usa la clase por defecto', () => {
       const { container } = render(Skeleton);
       expect(container.firstElementChild?.className).toContain('h-24');
     });
     it('añade la clase que le pasan', () => {
       const { container } = render(Skeleton, { clase: 'h-[150px]' });
       expect(container.firstElementChild?.className).toContain('h-[150px]');
     });
   });
   ```

3. Córrela con `npx vitest run src/shared/ui/Skeleton.test.ts`. Cambia `'h-24'` por `'h-25'` y mira
   cómo falla. **Al terminar, borra el archivo**: es un ejercicio, no parte del repo.
4. En `features/planes/PlanFormPage.test.ts`, localiza dónde se decide la respuesta de `miAgencia` y
   qué `expect` comprueba lo que la página mandó a `crearPlan`.

**Ya lo entendí si…**
- [ ] Dices qué tres comandos ejecutarías antes de dar un cambio por terminado y qué detecta cada uno.
- [ ] Explicas por qué `fireEvent` se usa con `await`.
- [ ] Dices cuándo usar `vi.mock('./planes.api', …)` y cuándo `supabase-falso`.
- [ ] Explicas por qué la primera vez que se reorganizó el panel el build falló con las pruebas en verde.
- [ ] Sabes que «sin errores nuevos» en `svelte-check` significa «no más de 12».

---

## Glosario

| Término | Qué es | Equivalente en React |
|---|---|---|
| **Rune** | Palabra que empieza por `$` (`$state`, `$derived`…) y que entiende el compilador; no se importa | Un hook, pero resuelto en compilación |
| **`$state`** | Dato reactivo; los objetos y arreglos simples son *proxies* profundos | `useState` |
| **`$derived`** | Valor calculado a partir de otros datos reactivos | `useMemo` |
| **`$effect`** | Código que corre tras actualizar el DOM y se repite cuando cambia lo que leyó | `useEffect` |
| **`$props`** | Declaración de las props del componente | Los parámetros de la función |
| **`$bindable`** | Prop que el hijo puede modificar y propaga al padre (`bind:`) | `value` + `onChange` |
| **Snippet** | Trozo de plantilla reutilizable y que se puede pasar como prop; se pinta con `{@render}` | Función que devuelve JSX / `children` |
| **`bind:`** | Enlace de doble vía entre una variable y un campo o una prop | Input controlado |
| **Alcance de estilos** | El `<style>` de un componente solo afecta a sus elementos; `:global()` lo evita | CSS Modules |
| **`.svelte.ts`** | Módulo donde los *runes* funcionan fuera de un componente | Un store o un Context |
| **Funcionalidad (*feature*)** | Carpeta con las pantallas, componentes, lógica y datos de un tema | La carpeta `features/<f>/` de `apps/viajero` |
| **`*.api.ts`** | Archivo que habla con Supabase para una funcionalidad | Un *service* / *repository* |
| **Layout `sola` / `panel`** | Si la página se dibuja sin marco o dentro del `Shell` | Un layout de ruta |
| **Guard** | Función que decide si una ruta exige sesión y a dónde mandar | El `redirect` de `go_router` |

---

**Empieza por** la [sesión 1](#sesión-1-correr-el-panel-y-ubicarte).

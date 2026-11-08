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

Qué **no** cubre: de SvelteKit, solo lo que el panel usa (rutas por carpetas, layouts, `$app/*`,
adapter estático; no hay `load`, acciones de formulario ni SSR), las migraciones SQL, las Edge
Functions, ni las apps Flutter (para esas está la [guía de Flutter y Dart](../README.md)). Para correr todo el
sistema, el [README principal](../../../README.md).

## El panel en 5 líneas

1. Es la **cara B2B de Diverso**: las agencias turísticas gestionan sus planes, fechas y cupos,
   ven sus ventas y liquidaciones, y el rol admin verifica agencias (RNT) y ejecuta dispersiones.
2. **Svelte 5 + SvelteKit 2 + Vite + Tailwind 4**, en TypeScript. SvelteKit en modo **estático**
   (`adapter-static`, sale a `dist/`) y con **router por hash**: las URLs son `#/planes`, y cualquier
   hosting de archivos sirve el panel. No hay servidor propio.
3. Las pantallas se declaran con **carpetas en `src/routes/`** (un `+page.svelte` por URL, delgado),
   y el código está organizado **por funcionalidad** (`src/lib/features/planes/`, `ventas/`,
   `admin/`…), cada una con las mismas carpetas por rol (`pages/`, `components/`, `api/` y `model/`),
   y con lo reutilizable en `src/lib/shared/`, igual que `apps/viajero`.
4. Los datos vienen de **Supabase** a través de un archivo `api/<f>.api.ts` por funcionalidad; las
   reglas se prueban como **funciones puras** y las pantallas con Vitest + Testing Library. Las
   pruebas viven en `tests/unit/`, espejo de `src/`: `src/` queda solo con código.
5. Hoy: **998 pruebas en 72 archivos**; `npm run build` y `npm run check` son parte de cada
   verificación.

## Cómo está organizada la guía

| Capítulo | De dónde partes | A dónde llegas |
|---|---|---|
| [1. Svelte para quien sabe React](01-svelte-para-quien-sabe-react.md) | Componentes, JSX, props, `children` | Leer cualquier archivo `.svelte` del panel |
| [2. Reactividad con *runes*](02-reactividad-con-runes.md) | `useState`, `useMemo`, `useEffect`, Context | Usar `$state`, `$derived`, `$effect`, `$props`; evitar las trampas reales del repo |
| [3. Arquitectura del panel](03-arquitectura-del-panel.md) | Carpetas por tipo de archivo, React Router | Saber dónde vive cada cosa, cómo viaja un dato, cómo funcionan las rutas de SvelteKit, qué pieza visual usar y cómo agregar una pantalla |
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

- **`npm run dev`** arranca SvelteKit (es un plugin de Vite). La primera vez genera `.svelte-kit/`
  (tipos y alias); no se versiona.
- **Puerto.** Si el 5173 está ocupado, Vite usa el siguiente (el panel ha corrido en el **5174**).
  Mira la URL que imprime la consola.
- **Cuenta para entrar:** `graffiti@demo.com` (agencia verificada), `patrimonio@demo.com`
  (en verificación) o `admin@demo.com`; contraseña `demo1234`
  ([Cuentas demo](../../../README.md#cuentas-demo-contraseña-demo1234)). Con `npm run dev` el login
  las ofrece como botones; el build publicado no las incluye (`import.meta.env.DEV` en `LoginPage.svelte`).
- **Backend.** Sin variables de entorno, el panel apunta a `http://127.0.0.1:54331` (el Supabase
  local). `VITE_SUPABASE_URL` y `VITE_SUPABASE_KEY` lo cambian.

Las tres comprobaciones del día a día (capítulo 4, sección 10):

```bash
npm test             # Vitest: 72 archivos, 998 pruebas
npm run build        # SvelteKit + Vite: genera dist/ y termina con ✓ built
npm run check        # tipos y avisos de Svelte: 12 errores y 1 aviso conocidos (capítulo 4, sección 8)
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
| 5 | [Datos, rutas y sesión](#sesión-5-datos-rutas-y-sesión) | Cap. 3 §3–11 | Seguir «Publicar» de punta a punta y crear una ruta |
| 6 | [Pruebas y herramientas](#sesión-6-pruebas-y-herramientas) | Cap. 4 | Escribir tu primera prueba |

Las rutas de archivo parten de `apps/panel_svelte/src/`; las que empiezan por `tests/` (y los
comandos `npx vitest run tests/…`) parten de `apps/panel_svelte/`.

---

### Sesión 1: correr el panel y ubicarte

**Objetivo.** Tener el panel andando y saber qué carpeta contiene qué.

**Lee.**
- Capítulo 3, secciones 1 y 2 (mapa de carpetas, qué va dónde y el sistema visual).
- `app.html` (qué carga) y `routes/+layout.svelte` (qué rodea a todas las páginas).
- `routes/(panel)/+layout.svelte` y un `+page.svelte` delgado, como `routes/login/+page.svelte`.

**Ejercicio.**
1. Levanta el Supabase local y el panel (sección anterior) y entra con `graffiti@demo.com`.
2. Recorre Resumen, Planes, Ventas, Liquidaciones y Cuenta. Mira cómo cambia el `#/…` de la barra
   de direcciones. Para cada una apunta: la carpeta de `routes/(panel)/…` con su `+page.svelte` y el
   archivo `lib/features/<funcionalidad>/pages/…Page.svelte` que dibuja la pantalla.
3. Abre `#/login` y `#/planes/nuevo` y compara qué rodea a cada página (con la barra de secciones o
   sin ella). Busca qué carpeta lo decide.
4. Abre `lib/features/planes/` y ubica cada archivo en `pages/`, `components/`, `api/` o `model/`.
   Después busca su prueba en `tests/unit/features/planes/`: es la misma ruta, sin el `lib/`.
5. Abre el menú de cuenta (arriba a la derecha) y elige Sistema, Claro y Oscuro. Busca en qué archivo
   está ese control (`features/auth/components/MenuCuenta.svelte`) y en cuál se guarda la elección
   (`shared/lib/tema.svelte.ts`). Hay **un solo** control de tema en todo el panel.

**Ya lo entendí si…**
- [ ] Dices, sin mirar, qué archivo dibuja el título «Planes».
- [ ] Explicas quién monta la app (no hay `main.ts`) y de qué marcador de `app.html` cuelga.
- [ ] Distingues `routes/`, `lib/features/` y `lib/shared/` y dices en cuál pondrías un componente `Boton`.
- [ ] Sabes a qué carpeta apunta `$lib`.
- [ ] Dices en qué carpeta de una funcionalidad iría un tipo nuevo, una consulta, un botón y una pantalla.
- [ ] Dices en qué archivo cambiarías el tamaño del texto de los títulos o el color de la acción principal, y por qué es uno solo.

---

### Sesión 2: un archivo `.svelte`

**Objetivo.** Leer un componente de Svelte como lees uno de React.

**Lee.**
- Capítulo 1 completo.
- `lib/shared/ui/Skeleton.svelte`, `lib/shared/ui/StatusPill.svelte` y `lib/shared/ui/Empty.svelte`.
- `lib/features/planes/components/plan-form/Seccion.svelte`, `lib/shared/ui/Tarjeta.svelte` y `SeccionIncluye.svelte`.

**Ejercicio.**
1. Traduce `Skeleton.svelte` y `Seccion.svelte` a TSX en papel: sus props, el valor por defecto de
   `clase` y cómo llega el contenido de dentro (`children`).
2. En `SeccionIncluye.svelte` marca con colores: cada `bind:`, cada evento (`onclick`, `onkeydown`),
   el `{#each}` con su clave y la función que cambia `d.incluye`.
3. Ejecuta las pruebas de `StatusPill` y lee sus nombres como una lista de comportamientos:

   ```bash
   cd apps/panel_svelte
   npx vitest run tests/unit/shared/ui/StatusPill.test.ts
   ```

**Ya lo entendí si…**
- [ ] Explicas por qué `Seccion.svelte` no tiene un `return` y puede tener varios nodos raíz.
- [ ] Dices la diferencia entre `{@render children()}` y un snippet con nombre como `accion` en `Empty`.
- [ ] Explicas por qué, en el ejemplo del capítulo 1 (sección 2), `.plan-form :global(.etiqueta)` necesita `:global` (pista: quién pinta `.etiqueta`).
- [ ] Sabes por qué `onclick` y no `onClick`, y por qué ya no existe `on:click`.

---

### Sesión 3: `$state`, `$derived` y props

**Objetivo.** Entender cómo un dato cambia y qué se actualiza como consecuencia.

**Lee.**
- Capítulo 2, secciones 1 a 4.
- `lib/features/ventas/pages/VentasPage.svelte` (el `<script>`).
- `lib/features/planes/pages/PlanFormPage.svelte` (`<script>` y plantilla).
- `lib/features/planes/components/plan-form/SeccionEncuentro.svelte` y `PoliticaCancelacion.svelte`.
- `lib/shared/ui/Select.svelte`.

**Ejercicio.**
1. En `VentasPage.svelte` dibuja el grafo: `filtro` → `filtradas`, `ventas` → `totales`. Antes de
   probar, predice qué se recalcula al pulsar un filtro. Compruébalo en la pantalla de Ventas.
2. En «Nuevo plan», cambia las horas de cancelación gratuita y mira la vista previa «Lo que verá el
   viajero». Encuentra la cadena completa: el `bind:` del campo → `d` → `erroresPolitica` →
   `textoVistaPrevia`.
3. Lee el JS que genera el compilador para un componente pequeño:

   ```bash
   cd apps/panel_svelte
   node --input-type=module -e "import { compile } from 'svelte/compiler'; import { readFileSync } from 'node:fs'; console.log(compile(readFileSync('src/lib/shared/ui/Skeleton.svelte', 'utf8'), { filename: 'Skeleton.svelte', generate: 'client' }).js.code)"
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
- `routes/+layout.svelte` y el `<script>` de `lib/features/agencias/components/Shell.svelte`.
- `lib/features/auth/model/auth.svelte.ts`, `lib/shared/lib/toast.svelte.ts`, `lib/shared/lib/confirmar.svelte.ts`,
  `lib/shared/lib/tema.svelte.ts` y `lib/shared/lib/ruta.ts`.
- `lib/shared/ui/DialogoConfirmar.svelte` y cómo lo usa `lib/features/planes/pages/PlanesPage.svelte` (`alternarPublicacion`).
- `routes/(panel)/planes/editar/[[id]]/+page.svelte` y `routes/(panel)/planes/nuevo/+page.svelte`.

**Ejercicio.**
1. Para cada uno de los cuatro `$effect` del capítulo (layout raíz, Shell, PlanesPage, PlanFormPage)
   anota qué **lee** (sus dependencias) y qué **escribe**. ¿Cuál tiene una dependencia declarada «a
   propósito»?
2. **Provoca la trampa de la instancia compartida.** En
   `routes/(panel)/planes/editar/[[id]]/+page.svelte` añade, encima de `<Pagina planId={params.id} />`,
   un enlace: `<a href="#/planes/editar">sin id</a>`. En Planes pulsa «Editar» en un plan y, en el
   formulario, pulsa «sin id». Antes, predice qué verás: la ruta es **la misma**, así que la instancia
   se conserva. Si ves el formulario con los datos del plan, acabas de reproducir la trampa del
   capítulo 2, sección 7.3. Ahora envuelve la página en `{#key params.id}` … `{/key}` y repite: el
   formulario se reinicia. Deshaz con
   `git restore "apps/panel_svelte/src/routes/(panel)/planes/editar/[[id]]/+page.svelte"`.
   (No cambies el hash a mano en la barra de direcciones: Kit recarga la página entera y el estado se
   pierde, capítulo 3, sección 7.)
3. **Provoca `ownership_invalid_mutation`.** En `lib/features/planes/pages/PlanFormPage.svelte` cambia
   `<SeccionIncluye bind:d />` por `<SeccionIncluye {d} />`. Con `npm run dev`, abre «Nuevo plan»,
   añade un ítem en «Qué incluye» y mira la consola del navegador. Deshaz con `git restore`.
4. Piensa (sin código): si pasas de `#/planes/editar/a` a `#/planes/editar/b` antes de que `a`
   termine de cargar, ¿qué impide que su respuesta pise a `b`? (Capítulo 2, primera pregunta abierta
   de la sección 7.3.)
5. **Sigue `confirmar()`.** En Planes pulsa «Publicar» y mira el diálogo. Encuentra dónde se escribe
   `pendiente.pregunta`, quién lo lee para dibujar el diálogo y qué función resuelve la promesa que
   espera `PlanesPage.svelte` (capítulo 2, sección 6).

**Ya lo entendí si…**
- [ ] Explicas por qué `erroresPolitica` es un `$derived` y no un `$effect` que escribe un `$state`.
- [ ] Dices qué hace `void path;` en `Shell.svelte` y de dónde sale `path`.
- [ ] Explicas por qué `export const auth = $state({ … })` es un objeto y no `export let userId`.
- [ ] Explicas, con tus palabras, por qué «misma posición + mismo componente» conserva la instancia, y
      por qué `planes/nuevo` y `planes/editar/[[id]]` son dos archivos de ruta.
- [ ] Dices por qué `state_referenced_locally` en `planId` es aceptable hoy y cuándo dejaría de serlo.
- [ ] Explicas cómo `await confirmar({…})` devuelve `true` o `false` si el estado vive en un módulo y el diálogo en otro componente.

---

### Sesión 5: datos, rutas y sesión

**Objetivo.** Seguir un dato de punta a punta y saber agregar una pantalla.

**Lee.**
- Capítulo 3, secciones 3 a 11.
- `lib/features/planes/pages/PlanesPage.svelte` (`<script>`), `lib/features/planes/api/planes.api.ts`
  y `lib/shared/api/errores.ts`.
- `routes/+layout.svelte`, `lib/features/auth/model/sesion.ts`, `params/doc.ts` y `routes/+error.svelte`.
- `lib/features/ventas/api/ventas.api.ts` (cómo una funcionalidad usa a otras).

**Ejercicio.**
1. Con el código abierto, completa una tabla con cada flecha de «Publicar un plan»: *archivo y
   función* por paso. Empieza en el `onclick` del botón de `PlanesPage.svelte`, pasa por la
   confirmación (`confirmar`) y termina en el aviso que ve la persona y en la recarga de la lista.
2. Predice, sin ejecutar: si `publicarPlan` lanzara un error con el mensaje `FECHA_CON_RESERVAS`,
   ¿qué texto sale y dónde? (Mira `errores.ts`.)
3. Comprueba cómo se agrega una ruta: crea `routes/(panel)/prueba/+page.svelte` con
   `<h1 class="p-10 text-xl font-bold">Prueba</h1>` y abre `#/prueba` (con `npm run dev` Kit descubre la
   carpeta; recarga la página si no aparece). La verás **dentro del Shell**. Mueve la carpeta a
   `routes/prueba/` y recarga: sin Shell. **Al terminar, borra la carpeta `prueba/`**: es un
   ejercicio, no parte del repo.
4. Comprueba la trampa del `#`. En `routes/+page.svelte` cambia `goto('#/starter', …)` por
   `goto('/starter', …)` y abre `http://localhost:5173/` con sesión iniciada. Según el código de Kit
   deberías ver la página de error con «did you forget the hash?». Deshaz con `git restore`.
5. En papel, aplica el checklist de la sección 11 a una pantalla «Reportes»: lista los archivos que
   crearías y los que editarías.
6. Lee las pruebas de las piezas de rutas como documentación:

   ```bash
   cd apps/panel_svelte
   npx vitest run tests/unit/shared/lib/ruta.test.ts tests/unit/params/doc.test.ts tests/unit/features/auth/model/sesion.test.ts
   ```

**Ya lo entendí si…**
- [ ] Dices qué archivo atiende `#/planes/editar/p-1` y qué trae `params.id` ahí y en `#/planes/editar`.
- [ ] Dices qué pasa con `#/ventas/x` (y por qué ya no hay coincidencia por prefijo) y qué se dibuja.
- [ ] Explicas por qué `goto('/planes')` no sirve y por qué la ruta vive en `page.url.hash`.
- [ ] Explicas por qué el guard espera a `auth.ready` y por qué es una función pura.
- [ ] Dices por qué `shared/` no puede importar de `features/` ni de `$app/*`.
- [ ] Sabes dónde pondrías la lógica de un total nuevo y dónde la consulta que trae sus datos.
- [ ] Explicas por qué el panel no tiene `hooks.server.ts` ni `$lib/server`, y cuándo cambiaría eso.

---

### Sesión 6: pruebas y herramientas

**Objetivo.** Usar el ciclo diario (probar, analizar, compilar) y escribir una prueba propia.

**Lee.**
- Capítulo 4 completo.
- `vite.config.ts`, `vitest.config.ts`, `svelte.config.js` y `tsconfig.json` (dónde nace el alias `$tests`).
- `tests/unit/shared/ui/StatusPill.test.ts`, `tests/unit/shared/ui/Confirmar.test.ts`, `tests/unit/features/planes/pages/PlanFormPage.test.ts` (hasta `llenarBasicos`) y
  `tests/unit/features/planes/api/planes.api.test.ts`.
- `tests/supabase-falso.ts`, `tests/fixtures.ts` y `tests/pagina-falsa.svelte.ts`.

**Ejercicio.**
1. Ejecuta las tres comprobaciones y anota el resultado de cada una: archivos y pruebas de
   `npm test`, `✓ built` de `npm run build` y los 12 errores de `npm run check` (¿en qué tres
   archivos están?).
2. Crea `apps/panel_svelte/tests/unit/shared/ui/Skeleton.test.ts` (la ruta espejo de
   `src/lib/shared/ui/Skeleton.svelte`):

   ```ts
   import { describe, expect, it } from 'vitest';
   import { render } from '@testing-library/svelte';
   import Skeleton from '$lib/shared/ui/Skeleton.svelte';

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

3. Córrela con `npx vitest run tests/unit/shared/ui/Skeleton.test.ts`. Cambia `'h-24'` por `'h-25'` y mira
   cómo falla. **Al terminar, borra el archivo**: es un ejercicio, no parte del repo.
4. En `tests/unit/features/planes/pages/PlanFormPage.test.ts`, localiza dónde se decide la respuesta de `miAgencia`,
   qué `expect` comprueba lo que la página mandó a `crearPlan` y cuál comprueba a dónde navegó (`goto`).

**Ya lo entendí si…**
- [ ] Dices qué tres comandos ejecutarías antes de dar un cambio por terminado y qué detecta cada uno.
- [ ] Explicas por qué `fireEvent` se usa con `await`.
- [ ] Dices cuándo usar `vi.mock('$lib/features/planes/api/planes.api', …)` y cuándo `supabase-falso`.
- [ ] Dices en qué ruta va la prueba de `src/lib/features/ventas/model/ventas.ts` y por qué importa con `$lib` y no con `./`.
- [ ] Explicas por qué `goto` y `$app/state` se mockean en las pruebas y qué hace `irA`.
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
| **`confirmar()`** | Función de `shared/lib/confirmar.svelte.ts`: `await confirmar({…})` abre un diálogo y responde `true` o `false`; lo dibuja `DialogoConfirmar` | Un `window.confirm` propio, con foco y texto a medida |
| **Token de diseño** | Color, tamaño de letra o radio con nombre, declarado una vez en `src/app.css` (`bg-superficie`, `text-detalle`, `rounded-campo`) | Un tema de Tailwind / un objeto de *design tokens* |
| **Funcionalidad (*feature*)** | Carpeta con las pantallas (`pages/`), componentes (`components/`), datos (`api/`) y lógica pura (`model/`) de un tema | La carpeta `features/<f>/` de `apps/viajero` |
| **`*.api.ts`** | Archivo de `api/` que habla con Supabase para una funcionalidad | Un *service* / *repository* |
| **`tests/unit/`** | Las pruebas, en la misma ruta que el archivo que prueban (sin el `lib/`); `src/` queda solo con código | Jest con `__tests__/` aparte |
| **SvelteKit** | Framework sobre Svelte y Vite: rutas por carpetas, layouts, errores y build. Aquí, en modo estático | Next.js / Remix |
| **`+page.svelte`** | La página de una carpeta de `src/routes`: define esa URL | Un componente de ruta (`pages/x.tsx`) |
| **`+layout.svelte`** | Marco que envuelve a las páginas de su carpeta y de las de abajo; recibe `children` | Un layout de ruta con `<Outlet />` |
| **Grupo de rutas `(panel)`** | Carpeta entre paréntesis: agrupa rutas bajo un layout sin aparecer en la URL | Los *route groups* de Next |
| **Parámetro `[id]`, `[[id]]`, `[[doc=doc]]`** | Segmento dinámico obligatorio, opcional, u opcional validado por un *matcher* de `src/params/` | `:id`, `:id?` de React Router |
| **`$lib`** | Alias de `src/lib`; `$tests` apunta a `tests/` | Un alias `@/` |
| **`$app/navigation`, `$app/state`** | `goto` para navegar; `page` con la URL, los parámetros y el error actuales | `useNavigate`, `useLocation` |
| **`adapter-static`** | Hace que `npm run build` deje solo archivos en `dist/` | `next export` |
| **Router por hash** | La ruta va tras el `#` (`#/planes`): el hosting estático siempre sirve `/` | `HashRouter` |
| **Guard** | Función que decide si una ruta exige sesión y a dónde mandar | El `redirect` de `go_router` |

---

**Empieza por** la [sesión 1](#sesión-1-correr-el-panel-y-ubicarte).

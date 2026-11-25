# Arquitectura del Panel de Agencias (React)

Este documento explica cómo está organizado `apps/panel`, el panel web donde las agencias de turismo publican planes,
gestionan cupos y concilian sus pagos (y donde el administrador verifica agencias y ejecuta dispersiones).

El panel nació en **Svelte 5 + SvelteKit** (`apps/panel_svelte`) y se migró a **React 19**. La migración tiene una regla:
**no se pierde ninguna función ni ningún detalle de diseño**. Por eso el documento termina con una tabla de
equivalencias Svelte → React y con las convenciones que se siguieron en cada archivo.

---

## 1. Tecnologías

| Pieza | Elección | Para qué |
| --- | --- | --- |
| Lenguaje | TypeScript (modo `strict`) | Tipos en todo el código y los tests |
| Interfaz | React 19 | Componentes y hooks |
| Empaquetador | Vite 7 (`@vitejs/plugin-react`) | Servidor de desarrollo y build estático (`dist/`) |
| Rutas | React Router 7 (`createHashRouter`, modo «data») | URLs con hash: `#/planes`, `#/liquidaciones/123` |
| Estilos | Tailwind CSS 4 (`@tailwindcss/vite`) + `src/app.css` | Tokens de diseño «Bosque de niebla», claro y oscuro |
| Tipografía | `@fontsource/atkinson-hyperlegible-next` | Fuente autoalojada (sin peticiones a Google) |
| Datos | `@supabase/supabase-js` | Autenticación, tablas, funciones SQL y almacenamiento |
| Pruebas | Vitest 5 + jsdom + Testing Library (React) | Pruebas unitarias y de componentes |

**¿Por qué URLs con hash?** El panel se publica como sitio estático. El hosting solo entrega `index.html` en la raíz; si
la URL fuera `/planes`, el servidor respondería 404. Con `#/planes` el servidor siempre entrega `index.html` y es el
router del navegador el que lee lo que va después del `#`.

Comandos (desde `apps/panel`):

```bash
npm install      # dependencias
npm run dev      # servidor de desarrollo
npm test         # todas las pruebas (vitest run)
npm run check    # chequeo de tipos (tsc --noEmit)
npm run build    # chequeo de tipos + build estático en dist/
```

---

## 2. La idea central: arquitectura «que grita» (Screaming Architecture)

Al abrir `src/features/` lo primero que se ve es **de qué trata el negocio**, no qué framework se usa:

```
src/features/
  auth/           entrar, salir, decidir a dónde va cada quien
  agencias/       registro (onboarding), perfil, marco del panel (Shell)
  planes/         crear, editar y publicar planes con sus fechas y cupos
  resumen/        tablero operativo: por resolver, cifras, salidas del período
  ventas/         reservas vendidas y conciliación de comisión
  resenas/        reseñas de los viajeros
  liquidaciones/  pagos semanales a la agencia y su cuenta bancaria
  legal/          términos, privacidad y consentimientos
  admin/          verificación de agencias y dispersiones (rol administrador)
```

Una analogía de construcción: en vez de organizar un edificio por materiales («todo el cemento en un piso, todos los
cables en otro»), se organiza por **apartamentos**. Cada apartamento (feature) tiene su propia cocina, baño y
habitaciones (capas), y comparte con los demás solo lo común: la estructura y las tuberías generales (`shared/`).

Ventajas que se pueden defender:

- **Cambios localizados**: un cambio en «liquidaciones» toca casi siempre una sola carpeta.
- **Equipos en paralelo**: cada feature se puede migrar o mantener sin pisar a las demás (así se hizo esta migración).
- **Se lee el dominio**: una persona nueva entiende qué hace el sistema mirando nombres de carpetas.

---

## 3. Estructura completa

```
apps/panel/
  index.html              Documento base: idioma, metadatos, manifest PWA y el script de tema (sin destello)
  public/                 Archivos servidos tal cual: favicon, íconos PWA, logo_diverso.png, manifest
  src/
    main.tsx              Punto de entrada: crea el router y lo monta en <div id="root">
    app.css, fuentes.css  Tokens de diseño, clases compartidas (.btn, .campo, .tarjeta…) y fuentes
    app/                  CAPA DE APLICACIÓN: une las features
      router.tsx          Árbol de rutas (todas las URLs del panel)
      layouts/
        RaizLayout.tsx    Envuelve TODO: tema, guard de sesión, spinner inicial, Toast y Confirmación
        PanelLayout.tsx   Envuelve las secciones de la agencia con el marco (Shell)
      AnunciadorRuta.tsx  Anuncia el cambio de página a lectores de pantalla (reemplaza el #svelte-announcer de SvelteKit)
      ErrorPage.tsx       Página de error (404 y errores inesperados)
      InicioPage.tsx      «/»: con sesión manda al Starter
      manejarError.ts     Registra los errores inesperados (no los 404)
      params/doc.ts       Valida el documento legal de /legal/:doc
    features/<feature>/   CAPA DE NEGOCIO, una carpeta por funcionalidad (ver §4)
      api/                Acceso a datos (Supabase)
      model/              Reglas de negocio y estado
      hooks/              Lógica con estado de React (cargar datos, navegar…)
      components/         Componentes de presentación de la feature
      pages/              Pantallas completas (contenedores)
    shared/               CAPA COMPARTIDA: lo que usan varias features
      api/                Cliente de Supabase y traducción de errores
      lib/                Formato (moneda, fechas), tema, toast, confirmación, store, useTrasDibujar
      ui/                 Sistema de diseño: Dialogo, Select, TablaDatos, Tarjeta, Campo…
  tests/
    unit/                 Pruebas, con la MISMA estructura de carpetas que src/
    fixtures.ts           Datos de ejemplo (agencia, plan, venta, liquidación…)
    supabase-falso.ts     Supabase simulado para probar la capa api/ sin red
    auth-falso.ts         Sesión simulada para probar pantallas
    render.tsx            renderConRuta(): dibuja un componente dentro de un router en memoria
    pagina-espia.tsx      Reemplaza una página por un espía que muestra sus props
```

Alias de importación (configurados en Vite, Vitest y TypeScript):

- `@/…` → `src/…` (por ejemplo `import Tarjeta from '@/shared/ui/Tarjeta'`)
- `@tests/…` → `tests/…`

### Reglas de dependencia entre capas

```
app/  ──usa──▶  features/  ──usa──▶  shared/
                    │
                    └── una feature puede usar el api/ o model/ de otra (p. ej. ventas lee planes),
                        pero shared/ NUNCA importa de features/ ni de app/
```

`shared/` es la base del edificio: no sabe qué apartamentos hay encima.

---

## 4. Capas dentro de una feature

Cada feature se divide en capas con una responsabilidad clara. Ejemplo con `auth`:

| Capa | Qué contiene | ¿Conoce React? | Ejemplo |
| --- | --- | --- | --- |
| `api/` | Llamadas a Supabase. Reciben y devuelven datos, lanzan errores. | No | `agencias.api.ts → miAgencia()` |
| `model/` | Reglas de negocio puras (cálculos, validaciones, textos) y el estado global de la feature. | No (salvo el hook del store) | `sesion.ts → redireccionSesion()` |
| `hooks/` | Lógica con estado de React: cargar datos, reaccionar a cambios, navegar. | Sí | `useDestinoStarter()` |
| `components/` | Piezas visuales de la feature. Reciben props y avisan con callbacks. | Sí | `MenuCuenta` |
| `pages/` | Pantallas completas: usan hooks y arman componentes. | Sí | `StarterPage` |

La capa `model/` es **TypeScript puro**: se probó en Svelte y se copió **sin cambios** a React. Es el corazón del
negocio y no depende del framework; por eso la migración no tocó ninguna regla de negocio.

---

## 5. Patrón Contenedor / Presentacional con hooks propios

Las pantallas se dividen en dos tipos de componentes:

- **Contenedor** (las `pages/`): sabe **de dónde** salen los datos. Usa hooks, decide qué mostrar (cargando, error,
  datos) y pasa todo por props.
- **Presentacional** (`components/` y `shared/ui/`): sabe **cómo** se ve. Recibe props y avisa con callbacks
  (`onchange`, `oncerrar`…). No llama a la API ni al router.

La lógica con estado se extrae a **hooks propios** en `hooks/`. Ejemplo real (`auth`):

```tsx
// hooks/useDestinoStarter.ts — la lógica: a dónde va quien entra
export function useDestinoStarter() {
  const { ready, userId } = useAuth();
  const navegar = useNavigate();
  const [fallo, setFallo] = useState('');
  // …lee el perfil, la agencia y los consentimientos y navega a /admin, /onboarding, /consentimiento o /dashboard
  return { fallo, reintentar };
}

// pages/StarterPage.tsx — el contenedor: usa el hook y dibuja
export default function StarterPage() {
  const { fallo, reintentar } = useDestinoStarter();
  const cerrarSesion = useCerrarSesion();
  return fallo ? <…mensaje y botones…/> : <…«Preparando tu panel…»…/>;
}
```

Para cargar datos, los hooks siguen una forma común: `{ cargando, error, datos, recargar }`.

```tsx
const { cargando, error, datos, recargar } = useVentas();
if (cargando) return <EsqueletoPagina />;
if (error) return <AlertaError>{error}</AlertaError>;
return <TablaVentas filas={datos} />;
```

Beneficios: los componentes de presentación se prueban solo con props; la lógica se prueba en el hook o en la página; y
si mañana cambia la fuente de datos, la vista no se entera.

---

## 6. Estado global sin librerías: `crearStore` + `useSyncExternalStore`

Hay pocos estados que viven fuera de una pantalla: la **sesión**, el **tema**, el **toast**, la **confirmación** en
curso y la señal **«la agencia cambió»**. No hace falta Redux ni Zustand para eso; basta un store mínimo
(`src/shared/lib/store.ts`, 40 líneas):

```ts
const toast = crearStore({ mensaje: '' });      // valor inicial
toast.get();                                    // leer (fuera de React: modelo, tests)
toast.set({ mensaje: 'Plan guardado.' });       // cambiar (mezcla un objeto parcial)
toast.set((previo) => ({ ...previo }));          // o con una función
const { mensaje } = useStore(toast);            // leer DESDE React: el componente se redibuja al cambiar
```

`useStore` usa `useSyncExternalStore`, el hook oficial de React para suscribirse a datos externos. El valor es
inmutable (cada `set` crea un objeto nuevo), así React detecta el cambio comparando referencias.

Cada módulo de estado expone las **mismas funciones que tenía en Svelte** y suma un hook para los componentes:

| Módulo | Estado | Funciones | Hook |
| --- | --- | --- | --- |
| `features/auth/model/auth.ts` | `auth` `{ ready, userId, email }` | `signIn`, `signOut`, `perfilActual` | `useAuth()` |
| `shared/lib/tema.ts` | `tema` `{ preferencia, oscuro }` | `iniciarTema`, `elegirTema`, `leerPreferencia`, `CLAVE_TEMA` | `useTema()` |
| `shared/lib/toast.ts` | `toast` `{ mensaje }` | `avisar` | `useToast()` |
| `shared/lib/confirmar.ts` | `pendiente` `{ pregunta }` | `confirmar` (promesa true/false), `responder` | `usePendiente()` |
| `features/agencias/model/cambios-agencia.ts` | `cambiosAgencia` `{ version }` | `avisarCambioAgencia` | `useCambiosAgencia()` |

Ejemplo de uso de la confirmación global desde cualquier pantalla:

```ts
if (await confirmar({ titulo: '¿Eliminar la fecha?', confirmar: 'Eliminar', peligro: true })) { … }
```

---

## 7. Rutas, guard de sesión y errores

### 7.1 Árbol de rutas (`src/app/router.tsx`)

```
RaizLayout                         (tema, guard, spinner inicial, Toast, DialogoConfirmar, AnunciadorRuta)
└── (errorElement: ErrorPage)      los errores y 404 se dibujan DENTRO del layout raíz
    ├── /                          InicioPage → con sesión va a /starter
    ├── /login                     LoginPage
    ├── /starter                   StarterPage (reparte por rol)
    ├── /consentimiento            AceptarDocumentosPage
    ├── /legal/:doc?               LegalPage (doc debe existir; si no, 404)
    ├── /admin                     AdminAgenciasPage
    ├── /admin/dispersiones        AdminDispersionesPage
    ├── PanelLayout (Shell)        secciones de la agencia, con el marco y la navegación
    │   ├── /dashboard             ResumenPage
    │   ├── /planes                PlanesPage
    │   ├── /planes/nuevo          PlanFormPage
    │   ├── /planes/editar/:id?    PlanFormPage planId={id}
    │   ├── /ventas                VentasPage
    │   ├── /resenas               ResenasPage
    │   ├── /liquidaciones         LiquidacionesPage
    │   ├── /liquidaciones/:id     LiquidacionDetallePage id={id}
    │   ├── /cuenta-dispersiones   CuentaDispersionPage
    │   ├── /onboarding            OnboardingPage
    │   └── /perfil                PerfilAgenciaPage
    └── *                          404
```

Las páginas **no leen la URL**: reciben los parámetros como props. Un pequeño envoltorio de ruta los saca con
`useParams()`:

```tsx
export function EditarPlanRuta() {
  const { id } = useParams();
  return <PlanFormPage key={id ?? ''} planId={id} />;   // key: otro plan = página nueva, sin estado arrastrado
}
```

Así una página se prueba dibujándola con sus props, sin router.

### 7.2 Guard de sesión

La regla vive en `features/auth/model/sesion.ts` (TypeScript puro, probado aparte):

- sin sesión, toda ruta que no sea `/login`, `/starter` o `/legal/…` → `/login`;
- con sesión, `/login` → `/starter`.

`RaizLayout` la aplica en un efecto cada vez que cambia la sesión o la ruta. Mientras Supabase no confirma si hay
sesión (`auth.ready` falso) se muestra un spinner en vez de la página.

### 7.3 Errores

- Una ruta que no existe, o `/legal/<documento-que-no-existe>`, produce un **404** (el router lanza `data(null, { status: 404 })`).
- Un error inesperado al cargar o dibujar produce un **500**.
- `ErrorPage` (contenedor) lee el error con `useRouteError()`, lo registra con `manejarError` (solo si no es 404) y se lo
  pasa a `PantallaError` (presentacional), que muestra un título, un mensaje legible (los códigos de Supabase se traducen
  con `mensajeError`) y el camino de vuelta: «Ir al resumen» con sesión o «Iniciar sesión» sin ella.

---

## 8. Diseño visual: idéntico al de Svelte

- `src/app.css` y `src/fuentes.css` se copiaron **sin cambios**. Contienen los tokens (colores claro/oscuro, escala
  tipográfica de 7 pasos, radios «hoja» y «brote») y las clases compartidas (`.btn`, `.campo`, `.tarjeta`, `.chip`,
  `.tabla`, `.pildora`…) dentro de `@layer components`.
- Cada componente conserva **exactamente** las mismas clases de Tailwind, atributos `aria-*`, textos y manejo de foco y
  teclado que su versión Svelte.
- El tema se decide en un `<script>` dentro de `index.html` **antes** del primer dibujo, para que no haya destello
  blanco en modo oscuro. Después, `iniciarTema()` lo mantiene en vivo.
- Las pruebas `tokens.test` y `estilos-compartidos.test` fijan el sistema de diseño: que los tokens existan en ambos
  temas, que el contraste llegue a AA y que ningún componente redeclare una clase compartida.

---

## 9. Pruebas: el contrato de la migración

Cada prueba de Svelte se portó a React **conservando cada `it(…)` y cada aserción**: mismos nombres, mismas
expectativas. Solo cambia la mecánica de dibujar (`render(<Componente {...props} />)`) y cómo se simulan el router y
la sesión. Si las pruebas pasan, el comportamiento es el mismo.

| Necesidad | Svelte | React |
| --- | --- | --- |
| Dibujar con props | `render(Comp, { props })` | `render(<Comp {...props} />)` |
| Contenido de un slot | `createRawSnippet(() => ({ render: () => '<b>x</b>' }))` | JSX directo: `<b>x</b>` |
| Esperar a que se redibuje | `await tick()` | No hace falta (Testing Library envuelve los eventos en `act`); para cambios fuera de un evento: `await act(async () => …)` |
| Sesión simulada | `vi.mock('…/auth.svelte', () => ({ auth: {...} }))` | `vi.mock('@/features/auth/model/auth', async () => (await import('@tests/auth-falso')).authFalso({ userId: 'u-1' }))` y `auth.set({...})` |
| Simular navegación | `vi.mock('$app/navigation', () => ({ goto: vi.fn() }))` + `expect(goto).toHaveBeenCalledWith('#/x')` | `const { ruta } = renderConRuta(<Pagina />, { ruta: '/login' })` + `expect(ruta()).toBe('/x')` |
| Cambiar de ruta | `irA('/ventas')` (pagina-falsa) | `await irA('/ventas')` (devuelto por `renderConRuta`) |
| Supabase sin red | `vi.mock('$lib/shared/api/supabase', () => import('$tests/supabase-falso'))` | `vi.mock('@/shared/api/supabase', () => import('@tests/supabase-falso'))` |

---

## 10. Tabla de equivalencias Svelte → React

| Svelte 5 / SvelteKit | React 19 / React Router 7 | Dónde se ve |
| --- | --- | --- |
| Componente `.svelte` | Función `.tsx` que devuelve JSX | todo `src/` |
| `let { a, b = 1 } = $props()` | `function C({ a, b = 1 }: Props)` | todos los componentes |
| `$state(valor)` local | `useState(valor)` | `Select`, `MenuCuenta`, `LoginPage` |
| `$derived(expr)` | Cálculo directo en el cuerpo, o `useMemo` si es costoso | `Avatar`, `StatusPill` |
| `$effect(() => …)` | `useEffect(() => …, [dependencias])` (o un hook propio) | `RaizLayout`, `useDestinoStarter` |
| `untrack(fn)` | Dejar fuera de las dependencias del efecto | `RaizLayout` (iniciar tema una vez) |
| Módulo `x.svelte.ts` con `$state` global | `crearStore()` + hook con `useSyncExternalStore` | `auth.ts`, `tema.ts`, `toast.ts`… |
| `{#if}` / `{:else}` | `cond && <X/>` / `cond ? <X/> : <Y/>` | todos |
| `{#each lista as x (x.id)}` | `lista.map((x) => <X key={x.id} />)` | `Chips`, `TablaDatos` |
| `{#key valor}` | Prop `key={valor}` (rehace el componente) | `DialogoConfirmar` |
| Snippet `children` | Prop `children: ReactNode` | `Tarjeta`, `Pagina` |
| Snippet con nombre (`accion`, `pie`, `vacio`) | Prop `ReactNode` | `PageHeader`, `Dialogo`, `TablaDatos` |
| Snippet con parámetros (`celda(fila, col)`) | Función que devuelve JSX: `celda: (fila, col) => ReactNode` | `TablaDatos`, `Campo.control`, `MenuCuenta.avatar` |
| `bind:value` | Input controlado: `value` + `onChange` | `LoginPage` |
| `bind:this={el}` | `useRef` + `ref={el}` | `Select`, `Segmentado`, `Dialogo` |
| Prop `$bindable()` | Prop de valor + función para cambiarlo: `x` y `setX` (ver §11) | features de planes y admin |
| `use:accion` | `useLayoutEffect`/`useEffect` con una ref | `Dialogo` (foco y Tab atrapado) |
| Mover un nodo a `<body>` | `createPortal(…, document.body)` | `Dialogo` |
| `$props.id()` | `useId()` | `Campo`, `Tarjeta`, `Select` |
| `<svelte:window onkeydown>` | `useEffect` que agrega y quita el oyente en `window` | `MenuCuenta` |
| `class="a {cond ? 'b' : ''}"` / `class:x={cond}` | `` className={`a ${cond ? 'b' : ''}`} `` | todos |
| `style="width:{n}px"` / `style:--var={v}` | `style={{ width: n }}` / `style={{ '--var': v }}` | `Avatar`, `FranjaMetricas` |
| `onclick`, `oninput`, `onfocusout` | `onClick`, `onChange`, `onBlur` | todos |
| `await tick()` antes de enfocar, al abrir algo | `useEffect` que enfoca cuando cambia el estado | `Select`, `MenuCuenta` |
| `await tick()` antes de enfocar, tras una acción | `trasDibujar(() => el.focus())` (ver §11) | `CalendarioActividad`, `usePlanForm`, `useResenas` |
| Salto de línea entre etiquetas (queda un espacio) | `{' '}` explícito (ver §11) | `Metrica`, `Campo`, `TusPlanes` |
| `src/routes/**/+page.svelte` | Entradas de `rutas` en `app/router.tsx` | `router.tsx` |
| `routes/+layout.svelte` | `RaizLayout` con `<Outlet />` | `app/layouts/` |
| Grupo `(panel)/+layout.svelte` | Ruta sin `path` con `PanelLayout` | `router.tsx` |
| `[id]`, `[[id]]` | `:id`, `:id?` | `router.tsx` |
| Matcher `[[doc=doc]]` (`src/params/doc.ts`) | `loader` que lanza 404 si `match(doc)` es falso | `router.tsx`, `app/params/doc.ts` |
| `+error.svelte` + `hooks.client.ts` | `errorElement: <ErrorPage />` + `manejarError` | `app/ErrorPage.tsx` |
| `goto('#/x')` | `const navegar = useNavigate(); navegar('/x')` | `LoginPage`, `useDestinoStarter` |
| `page.url` / `rutaActual(page.url)` | `useLocation().pathname` | `MenuCuenta`, `RaizLayout` |
| `page.params.id` | `useParams().id` (en el envoltorio de ruta) | `router.tsx` |
| `$lib/…`, `$tests/…` | `@/…`, `@tests/…` | imports |
| `static/` | `public/` | archivos servidos |
| `src/app.html` | `index.html` | documento base |
| `import.meta.env.DEV` | Igual (Vite) | `LoginPage` (cuentas demo solo en desarrollo) |

---

## 11. Convenciones (obligatorias para todo el código migrado)

1. **`api/*.ts` y `model/*.ts` se copian TAL CUAL** de Svelte (solo cambian los imports `$lib/` → `@/`). Sus pruebas
   también. Ya están todos copiados en `src/features/*/api` y `src/features/*/model`.
2. **Estado global**: nunca un `useState` compartido por contexto improvisado; usar `crearStore` + un hook `useX()`
   en el mismo módulo, conservando los nombres de funciones de Svelte. Los archivos pierden el `.svelte` del nombre
   (`auth.svelte.ts` → `auth.ts`).
3. **Navegación**:
   - Los enlaces quedan como en Svelte: `<a href="#/planes">` (el router por hash los entiende y el HTML y el CSS
     quedan idénticos). **No se usa `<Link>`.**
   - Navegar desde código: `useNavigate()` y rutas **sin** `#`: `navegar('/planes')`.
   - Ruta actual: `useLocation().pathname`.
   - Parámetros: SOLO en los envoltorios de `app/router.tsx`; las páginas los reciben como props (`planId`, `id`, `doc`).
4. **Cerrar sesión**: `signOut()` ya no navega (el modelo no conoce el router). Desde la interfaz se usa
   `useCerrarSesion()` (`features/auth/hooks/`), que cierra la sesión y lleva a `/login`. Además, el guard del layout
   raíz manda a `/login` a quien quede sin sesión en una ruta privada. (El hook hace falta porque `/starter` es una
   ruta pública: ahí el guard no redirige.)
5. **Slots de Svelte**: `children` → `children: ReactNode`; snippets con nombre → props `ReactNode` (`accion`, `pie`,
   `vacio`, `contexto`, `junto`, `estado`); snippets con parámetros → funciones (`celda: (fila: T, c: Columna) => ReactNode`).
6. **Clases y diseño**: `class` → `className`; `class:x={cond}` → clase condicional en el string. **Se conservan TODAS
   las clases** (Tailwind y propias) en el mismo orden. Una prop llamada `clase` sigue llamándose `clase`.
7. **Derivados y efectos**: `$derived` → cálculo directo (o `useMemo` si es costoso). Un `$effect` que carga datos →
   hook propio en `hooks/` que devuelve `{ cargando, error, datos, recargar }`, usado por la página (contenedor). Los
   efectos asíncronos ignoran la respuesta si el efecto se repitió o se desmontó (bandera `vigente`).
8. **Acciones y portales**: `use:x` → `useEffect`/`useLayoutEffect` con refs; contenido que va a `<body>` →
   `createPortal`. `$props.id()` → `useId()`.
9. **Eventos y callbacks**: `onclick` → `onClick`, `oninput` → `onChange` (inputs controlados). Las props de callback
   **conservan su nombre en español** (`oncerrar`, `onchange`, `onactualizado`…) para que la API del componente sea
   idéntica.
10. **`$bindable`** → valor + función para cambiarlo, con el nombre del setter de React: `busqueda` + `setBusqueda`
    (tipo `Dispatch<SetStateAction<T>>`, así el padre pasa directamente su `setX` de `useState`). Para un objeto que
    los hijos editan (`d: PlanDraft`), el hijo llama `setD((d) => ({ ...d, titulo }))`.
11. **Nombres y comentarios en español**, como en el código original.
12. **Pruebas**: cada `tests/unit/**/X.test.ts` de Svelte se porta a `tests/unit/**/X.test.tsx` conservando cada `it`
    y cada aserción. Herramientas en `tests/`: `renderConRuta`, `authFalso`, `paginaEspia`/`propsDe`,
    `supabase-falso`, `fixtures`. Si una aserción era sobre algo propio de Svelte, se adapta a su equivalente React
    y se deja un comentario explicando el cambio. **Una prueba nunca se adapta para tapar una diferencia del
    componente**: si el texto o el foco no salen igual que antes, se corrige el componente (ver los puntos 13 y 14).
13. **Espacios entre etiquetas: `{' '}`**. Svelte (igual que HTML) convierte el salto de línea entre dos etiquetas en
    un espacio; JSX, en cambio, **lo borra**. El mismo marcado da textos distintos:

    ```html
    <dt>Ventas pagadas</dt>
    <dd>$ 300.000</dd>
    ```

    En Svelte el texto es «Ventas pagadas $ 300.000»; en JSX, «Ventas pagadas$ 300.000».

    En pantalla casi nunca se nota (entre bloques, o dentro de un `flex` o un `grid`, ese espacio no se dibuja), pero
    sí en lo que lee un lector de pantalla, en lo que se copia y pega, y en las pruebas (`texto(container)`). Regla:
    **donde el original tenía un espacio entre dos elementos con texto, se escribe `{' '}` en ese mismo lugar**:

    ```tsx
    <dt className="…">{etiqueta}</dt>{' '}
    <dd className="mt-1">…</dd>
    ```

    No hace falta junto a un ícono (no tiene texto). Está aplicado en `shared/ui` (`Metrica`, `Aviso`, `Campo`,
    `Dialogo`, `DialogoConfirmar`, `Empty`, `PageHeader`, `Select`, `Tarjeta`, `Chips`) y en las features donde el
    texto lo necesita (`TusPlanes`, `LiquidacionesPage`, `Shell`…).
14. **Enfocar después de dibujar: `useTrasDibujar`**. En React, `setX(…)` no dibuja en el momento: el cambio se
    ve cuando termina el evento. Si justo después se hace `ref.current.focus()`, el elemento todavía no existe (o es el
    viejo). Svelte lo resolvía con `await tick()`. En React hay dos casos:
    - **El foco depende de un estado** («al abrir, el foco entra»): un `useEffect` que mira ese estado
      (`useEffect(() => { if (abierto) … }, [abierto])`). Así lo hacen `Select` y `MenuCuenta`, porque el menú se
      puede abrir de varias formas y siempre hay que enfocar.
    - **El foco lo pide una acción concreta** (guardar con errores, cambiar de mes, «Cargar más»): el hook compartido
      `shared/lib/useTrasDibujar.ts`.

    ```ts
    const trasDibujar = useTrasDibujar();
    function guardar() {
      setIntentado(true);                                  // marca los campos inválidos…
      trasDibujar(() => formulario.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
    }                                                      // …y el foco va al primero, ya dibujado
    ```

    Por dentro guarda la función en un estado (eso provoca un dibujo) y un `useEffect` la ejecuta cuando React ya
    dibujó. La usan `CalendarioActividad`, `PeriodoSelector`, `SalidasDelPeriodo`, `usePlanForm`,
    `useRegistroAgencia`, `useEdicionDatosAgencia`, `useAceptarDocumentos` y `useResenas`. La función debe leer el DOM
    por refs (no estado del componente), porque corre una sola vez con lo que vio al pedirse.

---

## 12. Flujo completo de un caso real: «entrar al panel»

1. La persona abre `https://…/#/`. `index.html` ya aplicó el tema guardado.
2. `main.tsx` crea el router por hash y dibuja `RaizLayout`. Supabase aún no responde: se ve el spinner.
3. Supabase avisa que no hay sesión (`auth.set({ ready: true, userId: null })`). El guard ve `/` sin sesión → `/login`.
4. `LoginPage` envía correo y contraseña con `signIn()` (`model/auth.ts`). Al entrar navega a `/starter`.
5. `StarterPage` usa `useDestinoStarter()`: lee el perfil (`perfilActual`), la agencia (`agencias.api`) y los
   consentimientos (`legal.api`), y navega a `/dashboard`.
6. `/dashboard` está dentro de `PanelLayout`: se dibuja el `Shell` (marco con navegación y `MenuCuenta`) y, dentro,
   `ResumenPage`.
7. Desde `MenuCuenta` la persona elige «Oscuro» (`elegirTema`: guarda la preferencia y pone la clase `dark`) o
   «Cerrar sesión» (`useCerrarSesion`: `signOut()` y vuelta a `/login`).

---

## 13. Estado de la migración

**Terminada.** No quedan stubs ni `TODO(migracion)`: las 9 features, `shared/` y `app/` están en React, y ni el
código ni las pruebas importan nada de Svelte. `npm run check` y `npm test` pasan completos.

| Parte | Componentes y páginas (`.tsx`) | Lógica sin JSX (`.ts`) | Archivos de prueba | Pruebas (`it`) |
| --- | ---: | ---: | ---: | ---: |
| auth | 4 | 4 | 5 | 34 |
| agencias | 5 | 12 | 10 | 141 |
| planes | 12 | 8 | 8 | 123 |
| resumen | 10 | 11 | 11 | 199 |
| ventas | 1 | 3 | 3 | 22 |
| resenas | 1 | 3 | 2 | 14 |
| liquidaciones | 4 | 5 | 4 | 68 |
| legal | 3 | 5 | 4 | 21 |
| admin | 12 | 4 | 5 | 57 |
| shared | 23 | 11 | 19 | 123 |
| app y rutas | 6 | 2 | 7 | 34 |
| **Total** | | | **78** | **836** |

Las 836 pruebas escritas se ejecutan como **1103 casos**: cada `it.each` corre una vez por fila de su tabla.

Cómo se comprobó que no se perdió nada (un script comparó los dos árboles, `apps/panel_svelte` —ya eliminado— y
`apps/panel`):

- **Pruebas**: los 76 archivos de prueba de Svelte tienen su par en React con la **misma cantidad de `it`** (820).
  Dos cambiaron de carpeta: `hooks.client.test` → `app/manejarError.test` y `params/doc.test` → `app/params/doc.test`.
  React suma 16 pruebas nuevas para lo que en SvelteKit resolvía el framework: `app/RaizLayout.test` (6, el guard de
  sesión y el anunciador montado una vez), `app/AnunciadorRuta.test` (4, el aviso de navegación para lectores de
  pantalla), `routes/arbol.test` (+4, el árbol de rutas) y `routes/error.test` (+2, la página de error en el router).
- **En el navegador**: con las dos apps levantadas contra el mismo Supabase local se comparó, en 17 rutas y con las
  tres cuentas demo, una huella del DOM (texto visible + etiquetas, clases, roles, `aria-*` y enlaces). Coincidieron
  todas. Las únicas diferencias fueron el anunciador de rutas de SvelteKit (replicado en `AnunciadorRuta`) y un
  espacio que Svelte recortaba por error en «Nuevo plan» y React respeta.
- **Aserciones**: los textos esperados son los mismos; solo cambian las de navegación (`goto('#/x')` → la ruta
  `'/x'`, ver §9).
- **Componentes**: los 75 `.svelte` de `src/lib` tienen su `.tsx` en la misma ruta (sin `lib/`). Los 21 archivos de
  `src/routes` se convirtieron en el árbol de `app/router.tsx` con sus envoltorios de ruta, `RaizLayout`,
  `PanelLayout`, `ErrorPage` e `InicioPage`.

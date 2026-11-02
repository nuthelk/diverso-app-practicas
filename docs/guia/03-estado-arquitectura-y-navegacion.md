# 3. Estado, arquitectura y navegación

Este capítulo responde tres preguntas: **dónde vive cada cosa** en el repo, **cómo llega un dato
desde Supabase hasta un widget** y **cómo se pasa de una pantalla a otra**. Es el capítulo que
más te sirve para empezar a tocar código.

> Volver al [plan de aprendizaje](README.md). Este capítulo cubre las sesiones 6 y 7.

> ### En construcción
> La fase **F4a** ya separó en `diverso_core` los *services* (consultas) de los *repositories*
> (mapeo y reglas) y pasó el cliente de Supabase por constructor; la **F4b** dejó un solo punto de
> creación de dependencias, partió el router y pasó el consentimiento a un redirect. La fase
> **F5** va a mover reglas a los modelos y a hacer privado el estado de los view models.
> Las rutas y los nombres de este capítulo describen el repo **ahora**; algunos cambiarán.
> **Este capítulo se actualiza al terminar.** Los puntos que van a cambiar están marcados con
> "Hoy".

## Contenido

1. [El mapa de carpetas](#1-el-mapa-de-carpetas)
2. [Las capas](#2-las-capas)
3. [`ChangeNotifier`: el view model](#3-changenotifier-el-view-model)
4. [`ListenableBuilder`: suscribirse y repintar](#4-listenablebuilder-suscribirse-y-repintar)
5. [`Provider`: el contexto de React](#5-provider-el-contexto-de-react)
6. [Dónde se crea todo: `main.dart`](#6-dónde-se-crea-todo-maindart)
7. [Seguir un toque de punta a punta](#7-seguir-un-toque-de-punta-a-punta)
8. [Navegación con `go_router`](#8-navegación-con-go_router)

---

## 1. El mapa de carpetas

Hay dos paquetes: la **app** (`apps/viajero`) y el **núcleo compartido** (`packages/diverso_core`),
que también usa el panel Flutter legado (`apps/panel_agencias`).

```
apps/viajero/lib/
|-- main.dart                 arranque: Supabase + dependencias + runApp
|-- app.dart                  MaterialApp.router + tema; crea el router una sola vez
|-- router/
|   |-- app_routes.dart       constantes de rutas y helpers que arman cada URL
|   |-- sesion_redirect.dart  función pura: sesión + consentimiento + ubicación -> redirect
|   |-- app_router.dart       la tabla de rutas (GoRoute, pestañas, errorBuilder)
|   `-- go_router_refresh_stream.dart   Stream de sesión -> router
`-- ui/
    |-- core/                 lo compartido por todas las pantallas
    |   |-- theme/            app_theme, app_radii, theme_mode_view_model
    |   `-- widgets/          {feedback,page,plan,rating}/ + section_label, agency_avatar
    |-- shell/                app_shell (barra inferior de pestañas), pagina_no_encontrada_view
    `-- features/<funcionalidad>/      agencies, auth, bookings, catalog, checkout,
        |-- views/                     legal, plan, profile
        |-- view_models/
        `-- widgets/

packages/diverso_core/lib/
|-- diverso_core.dart         barril: re-exporta todo lo público
|-- data/
|   |-- services/             *_api.dart: consultas crudas a Supabase y a las Edge Functions
|   `-- repositories/         *_repository.dart: convierten filas en modelos y aplican reglas
|-- errors/                   DiversoException y los mensajes en español de cada código
|-- models/                   Plan, Booking, enums... (clases de datos)
|-- utils/                    formatters, hora de Bogotá, búsqueda
|-- config/                   DiversoConfig (URL y llave de Supabase)
|-- legal/                    documentos legales
|-- comparison/               filas del comparador
`-- ui/                       logo y transiciones de página compartidas
```

Una carpeta de funcionalidad (`catalog`, `bookings`…) agrupa **todo lo de esa pantalla**; lo que
no es de ninguna funcionalidad vive en `ui/core`. Dentro de una funcionalidad:

| Carpeta | Contiene | Ejemplo |
|---|---|---|
| `views/` | La pantalla completa (un widget que una ruta muestra) | `catalog/views/catalog_view.dart` |
| `view_models/` | El estado y las acciones de esa pantalla | `catalog/view_models/catalog_view_model.dart` |
| `widgets/` | Piezas de esa funcionalidad, no reutilizables fuera | `catalog/widgets/plan_card.dart` |

Regla de nombres: **un archivo se llama como su clase principal, en `snake_case`**
(`CatalogViewModel` -> `catalog_view_model.dart`).

## 2. Las capas

Es el patrón recomendado por la guía oficial de arquitectura de Flutter (MVVM por capas):

```
 +------------------------ UI (apps/viajero/lib/ui) ------------------------+
 |                                                                          |
 |   View (widgets)  --- escucha / reenvía eventos --->  ViewModel          |
 |                                                       (ChangeNotifier)   |
 +-------------------------------------------------------+-----------------+
                                                         | llama
 +--------------- Datos (packages/diverso_core/lib) -----v-----------------+
 |                                                                          |
 |   Repository  --- pide filas --->  Service (Api)  --->  Supabase /       |
 |       |                                                Edge Functions    |
 |       `---- devuelve --->  Models (Plan, Booking, ...)                   |
 +--------------------------------------------------------------------------+
```

| Capa | Responsabilidad | Equivale en tu mundo RN | Dónde |
|---|---|---|---|
| View | Pintar y reenviar eventos del usuario | el componente / pantalla | `ui/features/*/views`, `widgets` |
| ViewModel | Estado de la pantalla y qué hacer ante cada evento | un custom hook o un store | `ui/features/*/view_models` |
| Repository | Convertir filas en modelos, aplicar reglas de datos y traducir errores a `DiversoException` | un hook de datos o un repositorio sobre el cliente HTTP | `diverso_core/lib/data/repositories` |
| Service (Api) | Hablar con el backend y devolver filas (consultas, RPC, funciones) | el cliente HTTP / `api/` | `diverso_core/lib/data/services` |
| Model | Datos tipados y reglas simples | tipos + funciones puras | `diverso_core/lib/models` |

Reglas de dependencia (quién puede importar a quién):

- Una **View** puede usar su ViewModel, los widgets de `ui/core` y los modelos.
- Un **ViewModel** no dibuja nada: importa `package:flutter/foundation.dart` (para `ChangeNotifier`),
  no `material.dart`. La excepción es `ThemeModeViewModel`, que usa `ThemeMode`.
- Un **Repository** usa uno o más Services, devuelve modelos y lanza `DiversoException`; no sabe
  que existe la UI.
- Un **Service** no sabe que existe la UI ni los modelos: recibe el `SupabaseClient` por
  constructor y devuelve filas (`Map<String, dynamic>`).
- Un **Model** no depende de nadie más que de otros modelos y utilidades.

Por qué las reglas viven en modelos y view models y no en el widget: se **prueban sin dibujar
nada**. `Plan.esNuevo` o `BookingsViewModel.activas` se verifican con un `test(...)` normal.

> **Hoy.** Varias vistas leen repositorios con `context.read<...Repository>()` y los llaman ellas
> mismas (`checkout_loader.dart`, `reserva_view.dart`, `login_view.dart`) en vez de pasar por un
> view model. Las fases F5 las dejan solo con su ViewModel.

## 3. `ChangeNotifier`: el view model

Un **view model** es una clase que guarda el estado de una pantalla y expone acciones. Cuando el
estado cambia, llama a `notifyListeners()` y quien lo escuche se repinta.

**React Native** — el mismo concepto como custom hook:

```ts
function useCatalogo(api: CatalogApi) {
  const [planes, setPlanes] = useState<Plan[]>([]);
  const [cargando, setCargando] = useState(true);
  const cargar = async () => {
    setCargando(true);
    try { setPlanes(await api.search()); } finally { setCargando(false); }
  };
  return { planes, cargando, cargar };
}
```

**Flutter** — `apps/viajero/lib/ui/features/catalog/view_models/catalog_view_model.dart`
(recortado):

```dart
class CatalogViewModel extends ChangeNotifier {
  CatalogViewModel({required CatalogRepository catalogo}) : _catalogo = catalogo;

  final CatalogRepository _catalogo;

  List<Plan> planes = const [];
  bool cargando = true;
  String? error;

  Future<void> cargar() async {
    cargando = true;
    notifyListeners();
    // … await _catalogo.search(...), planes = resultados, finally cargando = false …
  }
```

Diferencias con un hook:

| Hook / store | ViewModel |
|---|---|
| Estado inmutable: `setPlanes(nuevo)` | Campos que **se mutan** y luego se avisa con `notifyListeners()` |
| React decide cuándo repintar | **Tú** llamas a `notifyListeners()` (si lo olvidas, no se repinta) |
| Vive y muere con el componente | Es un objeto: alguien lo crea y alguien lo libera con `dispose()` |
| Se prueba montando un componente | Se prueba con `test(...)` y un repositorio falso |

El view model más pequeño del repo, `viajero/ui/core/theme/theme_mode_view_model.dart`, ya tiene
la forma ideal: estado **privado** y un *getter* de solo lectura:

```dart
class ThemeModeViewModel extends ChangeNotifier {
  ThemeMode _mode = ThemeMode.system;

  ThemeMode get mode => _mode;

  void setMode(ThemeMode mode) {
    _mode = mode;
    notifyListeners();
  }
}
```

Los **valores derivados** son getters, como un selector o un `useMemo`.
`viajero/ui/features/bookings/view_models/bookings_view_model.dart`:

```dart
List<Booking> get activas =>
    reservas.where(_vigente).toList()..sort((a, b) => a.salida!.compareTo(b.salida!));
```

La lista de reservas se guarda una vez y "próximas" se calcula a partir de ella. `BookingsViewModel`
recibe un reloj (`DateTime Function()? reloj`) para que las pruebas fijen la hora.

> **Hoy.** `CatalogViewModel` y `BookingsViewModel` exponen `planes`, `cargando`, `error`… como
> **campos públicos** (la vista podría escribirlos). La fase F5 los hará privados con getters de
> solo lectura, como `ThemeModeViewModel`. El patrón con `_seleccion` en `CatalogViewModel`
> (`final List<String> _seleccion` + `List<Plan> get seleccion`) ya es el definitivo.

## 4. `ListenableBuilder`: suscribirse y repintar

`ListenableBuilder` recibe un objeto escuchable (un `ChangeNotifier`) y un `builder`. Cada vez
que el objeto avisa, el `builder` se ejecuta de nuevo. Es lo más parecido a
`useSyncExternalStore` o a `useStore(selector)` de Zustand.

`viajero/ui/features/catalog/views/catalog_view.dart` (recortado):

```dart
body: ListenableBuilder(
  listenable: _controller,
  builder: (context, _) {
    final c = _controller;
    return RefreshIndicator(
      onRefresh: c.cargar,
      child: CustomScrollView(
        slivers: [
          // … lee c.cargando, c.error, c.planes …
```

Y quién crea y libera el view model: el `State` de la vista.

```dart
@override
void initState() {
  super.initState();
  _controller = CatalogViewModel(catalogo: context.read<CatalogRepository>())..cargar();
}

@override
void dispose() {
  _searchCtrl.dispose();
  _controller.dispose();
  super.dispose();
}
```

`initState` es "al montar" y `dispose` es la limpieza (capítulo 2, sección 3). `..cargar()` es la
cascada del capítulo 1: crea el view model **y** dispara la primera carga. El campo todavía se
llama `_controller` aunque la clase ya es `CatalogViewModel`; se renombra en F5.

Solo se repinta lo que está **dentro** del `builder`. El catálogo usa varios
`ListenableBuilder`; dos de ellos son el del cuerpo y el de la bandeja de comparación (el
`bottomNavigationBar`), y cada uno repinta solo su parte.

## 5. `Provider`: el contexto de React

El paquete `provider` reparte objetos por el árbol, como un Context.

| React | `provider` | Se usa en este repo |
|---|---|---|
| `<Ctx.Provider value={…}>` | `Provider<T>(create: (_) => …)` | `main.dart` |
| varios providers anidados | `MultiProvider(providers: […])` | `main.dart` |
| provider de algo que cambia | `ChangeNotifierProvider(create: …)` | `main.dart` (tema) |
| `useContext(Ctx)` sin suscribirse | `context.read<T>()` | `catalog_view.dart`, `profile_view.dart`… |
| `useContext` que se suscribe | `context.watch<T>()` | no se usa en el repo |
| `<Ctx.Consumer>` | `Consumer<T>(builder: …)` | `app.dart`, `profile_view.dart` |

Dos puntos finos:

- `context.read<T>()` **no** repinta cuando `T` cambia: se usa para obtener una herramienta
  (un repositorio) o llamar a un método. Para repintar con los cambios se usa `Consumer` o
  `ListenableBuilder`.
- `Provider<T>` guarda un objeto simple; `ChangeNotifierProvider` además lo escucha y lo
  libera. Por defecto la creación es perezosa: el objeto se crea la primera vez que alguien lo lee.

En las pruebas se reemplaza lo registrado con un doble:
`Provider<CatalogRepository>.value(value: _Catalogo(plan))`
(`apps/viajero/test/ui/core/widgets/rating/puntaje_nueva_test.dart`). Es el "mock del
contexto" de las pruebas con React Native Testing Library (capítulo 4).

## 6. Dónde se crea todo: `main.dart`

`apps/viajero/lib/main.dart` hace, en orden:

1. `WidgetsFlutterBinding.ensureInitialized()` — prepara Flutter antes de código asíncrono.
2. `usePathUrlStrategy()` — URLs de web sin `#`, para que `/reserva/:id` funcione tras recargar.
3. `initializeDateFormatting('es')` — fechas en español.
4. `Supabase.initialize(url: DiversoConfig.supabaseUrl, publishableKey: DiversoConfig.supabaseKey)`.
5. `runApp(MultiProvider(...))`.

Es tu `index.js` más el `AppRegistry.registerComponent`. El paso 5 es el que registra las
dependencias (recortado):

```dart
final client = Supabase.instance.client;
final edgeFunctions = EdgeFunctionsApi(client: client);

runApp(
  MultiProvider(
    providers: [
      ChangeNotifierProvider(create: (_) => ThemeModeViewModel()),
      Provider<BookingRepository>.value(
        value: BookingRepository(api: BookingApi(client: client), edgeFunctions: edgeFunctions),
      ),
      Provider<CatalogRepository>.value(
        value: CatalogRepository(api: CatalogApi(client: client)),
      ),
      Provider<ReviewRepository>.value(value: ReviewRepository(client: client)),
      Provider<AuthRepository>.value(value: AuthRepository(client: client)),
      ChangeNotifierProvider(create: (context) => ConsentViewModel(auth: context.read())),
      Provider<PaymentGateway>.value(value: WompiPaymentGateway(edgeFunctions: edgeFunctions)),
    ],
    child: const DiversoApp(),
```

Es el **único** sitio donde se crean el cliente, los services y los repositories: cada uno recibe
lo que necesita **por constructor** (`BookingRepository` recibe su `BookingApi`, y este el
`SupabaseClient`). Nada en `diverso_core` lee `Supabase.instance`, así que en las pruebas basta
con pasar un doble donde iría el real. Las pantallas no crean nada: hacen
`context.read<BookingRepository>()`.

La URL y la llave de Supabase salen de `DiversoConfig` (`packages/diverso_core/lib/config/diverso_config.dart`),
que lee `--dart-define=SUPABASE_URL=...` al compilar. Por eso en el emulador de Android se ejecuta
con `--dart-define=SUPABASE_URL=http://10.0.2.2:54331` (ver el [README principal](../../README.md#cómo-correr-desarrollo-local)).

`PaymentGateway` es la única abstracción del repo: una clase abstracta con una implementación
real (`WompiPaymentGateway`) que los tests reemplazan por un doble.

El router tampoco toca `Supabase.instance`: `DiversoApp` lo construye con el `AuthRepository` y el
`ConsentViewModel` que salen de este mismo `MultiProvider` (sección 8). Desde `main.dart` no hay
ningún otro lugar en `lib/` que lea el global.

## 7. Seguir un toque de punta a punta

La mejor forma de entender la arquitectura es seguir un evento real. Dos recorridos, del más
corto al más completo.

### A. Cambiar a modo oscuro (sin red)

```
[Perfil] toque en "Oscuro"
   |  profile_view.dart: SegmentedButton.onSelectionChanged -> modo.setMode(ThemeMode.dark)
   v
ThemeModeViewModel.setMode      _mode = dark;  notifyListeners();
   |
   v
Consumer<ThemeModeViewModel>    (app.dart) se reconstruye
   |
   v
MaterialApp.router(themeMode: modo.mode)  ->  todo Theme.of(context) usa el esquema oscuro
```

El router **no** se reconstruye con el tema: `DiversoApp` lo crea una sola vez en `initState` y el
`Consumer` solo repinta el `MaterialApp.router` (sección 8, «Se crea una sola vez»).

### B. Elegir una categoría en el catálogo (con red)

```
[Explorar] toque en un chip de categoría
   |  catalog_view.dart: _ChipCategoria(onTap: () => c.toggleCategoria(cat))
   v
CatalogViewModel.toggleCategoria    categoria = cat;  await cargar();
   v
cargar()   cargando = true;  notifyListeners()
   |        ListenableBuilder repinta -> c.cargando -> esqueletos (Skeleton)
   v
CatalogRepository.search(FiltrosCatalogo(...))   -> CatalogApi.planesPublicados: consulta a `plans` de Supabase
   |        Plan.fromMap(fila) por cada fila, filtro de fecha   (catalog_repository.dart, models/plan.dart)
   v
cargar()   planes = resultados;  cargando = false;  notifyListeners()
   v
ListenableBuilder repinta -> SliverGrid con un PlanCard por plan
```

Para cada flecha hay un archivo y una función: ese es el ejercicio de la sesión 6.

## 8. Navegación con `go_router`

La navegación vive en tres archivos de `apps/viajero/lib/router/`:

| Archivo | Qué contiene |
|---|---|
| `app_routes.dart` | `AppRoutes`: los patrones (`/plan/:id`) y los helpers que arman cada URL (`AppRoutes.plan(id)`, `AppRoutes.pagoDeReserva(id)`, `AppRoutes.compararPlanes(ids)`). Ninguna pantalla escribe una ruta a mano |
| `sesion_redirect.dart` | `sesionRedirect(...)`: una función pura que decide a dónde mandar al usuario |
| `app_router.dart` | `buildViajeroRouter(auth:, consentimiento:)`: la tabla de rutas, que devuelve un `GoRouter` |

`app.dart` entrega ese router a `MaterialApp.router(routerConfig: …)`.

**Una diferencia de fondo con expo-router:** aquí **no hay rutas por archivos**. Todas las rutas
están declaradas en un solo árbol de `GoRoute`.

| expo-router / React Navigation | `go_router` | Ejemplo en el repo |
|---|---|---|
| `app/plan/[id].tsx` | `GoRoute(path: AppRoutes.planPatron, …)` | `app_router.dart`, `app_routes.dart` |
| `useLocalSearchParams().id` | `state.pathParameters['id']!` | idem |
| `?id=…` (search params) | `state.uri.queryParameters['id']` | ruta `/pago/resultado` |
| `router.push('/x')` | `context.push(AppRoutes.plan(id))` | `plan_card.dart` |
| `router.replace` / navegar | `context.go('/x')` | `bookings_view.dart` |
| `router.back()` | `context.pop()` | `agencia_view.dart` |
| parámetros-objeto (`params`) | `state.extra` (solo como atajo) | `/resena/:bookingId`, `/comparar?ids=…` |
| `(tabs)/_layout.tsx` | `StatefulShellRoute.indexedStack` | `app_router.dart` |
| `<Tabs>` con su barra | el widget `AppShell` | `ui/shell/app_shell.dart` |
| guardia con `<Redirect>` en el layout | `redirect:` | `sesion_redirect.dart` |
| `<Stack.Screen options>` / animación | `pageBuilder` + `DiversoPageTransitions` | `app_router.dart` (`_ruta`) |
| pantalla `+not-found.tsx` | `errorBuilder:` | `pagina_no_encontrada_view.dart` |

### Rutas con parámetros

```dart
_ruta(
  AppRoutes.planPatron,                      // '/plan/:id'
  DiversoPageTransitions.sharedAxisX,
  (state) => PlanDetailView(planId: state.pathParameters['id']!),
),
```

`_ruta` (en `app_router.dart`) es un ayudante pequeño que arma el `GoRoute` con su
`pageBuilder` y la transición; evita repetir quince veces
`DiversoPageTransitions.X(key: state.pageKey, child: …)`.

La ruta pasa solo el **id** a la vista y la vista carga el plan del backend. Así la pantalla se
reconstruye igual si se recarga la página en web. `DiversoPageTransitions` (en
`packages/diverso_core/lib/ui/page_transitions.dart`) define las animaciones de entrada.

Los objetos pasados con `state.extra` se **pierden al recargar** en web; por eso **todas** las
pantallas llevan sus ids en la URL (`/checkout/:planId/:fechaId`, `/reserva/:bookingId`,
`/pago/resultado?id=…`, `/resena/:bookingId`, `/comparar?ids=a,b`) y cargan sus datos del backend.
`extra` queda solo como atajo para pintar al instante lo que ya se tenía: `/resena/:bookingId`
recibe la `Booking` de «Mis reservas» y `/comparar` los `Plan` del catálogo (`ReviewLoader` y
`ComparatorLoader` los usan solo si coinciden con los ids de la URL; si no, los piden).

### Pestañas: `StatefulShellRoute`

```dart
StatefulShellRoute.indexedStack(
  builder: (context, state, shell) => AppShell(shell: shell),
  branches: [
    StatefulShellBranch(
      routes: [
        GoRoute(
          path: '/',
          pageBuilder: (context, state) => DiversoPageTransitions.fadeThrough(
            key: state.pageKey,
            child: const CatalogView(),
```

Cada `StatefulShellBranch` es una pestaña con su **propia pila de navegación** (Explorar `/`,
Agencias `/agencias`, Reservas `/reservas`, Perfil `/perfil`). `indexedStack` mantiene vivas las
pestañas que ya abriste: es el comportamiento de `<Tabs>` en expo-router. `AppShell` recibe el
`StatefulNavigationShell` y dibuja la barra inferior; para cambiar de pestaña llama a
`shell.goBranch(i, initialLocation: i == shell.currentIndex)` (tocar la pestaña activa vuelve a su
raíz).

### `redirect`: la guardia de sesión y de consentimiento

```dart
redirect: (context, state) => sesionRedirect(
  haySesion: auth.currentUserId != null,
  consentimiento: consentimiento.estado,
  ubicacion: state.matchedLocation,
),
```

Se ejecuta en **cada** navegación. Devolver una ruta redirige; devolver `null` deja pasar. Es tu
guardia de autenticación, y la decisión vive en una función pura (`sesion_redirect.dart`) que se
prueba sin Flutter (`test/router/sesion_redirect_test.dart`):

| Sesión | Consentimiento | Resultado |
|---|---|---|
| no | (da igual) | todo va a `/login`, salvo `/login` y `/legal/*` |
| sí | `verificando`, `pendiente` o `error` | todo va a `/consentimiento?desde=<ubicación>`, salvo él mismo y `/legal/*` |
| sí | `aceptado` | `/login` va a `/`; `/consentimiento` vuelve a `desde` (o a `/`) |

Para que reaccione al login y logout sin que el usuario navegue, `refreshListenable` junta el
`GoRouterRefreshStream(auth.onAuthStateChanged)` (el `Stream` del capítulo 1, sección 10) con el
`ConsentViewModel`: cualquier cambio de sesión o de consentimiento reevalúa el `redirect`. La
sesión se lee del `AuthRepository`, no de `Supabase.instance`.

### El consentimiento es estado de enrutamiento

La Ley 1581 de 2012 exige la autorización vigente de los documentos legales. Antes, `AppShell`
la consultaba una vez en `initState` y, si la consulta fallaba (sin red), nunca volvía a mirar.
Ahora `ConsentViewModel` (`ui/features/legal/view_models/`) expone un `EstadoConsentimiento`:

- `verificando`: consulta en curso o sin sesión. Tampoco deja pasar: la pantalla de consentimiento
  muestra un indicador de progreso y ninguna pantalla protegida se abre ni carga datos antes de
  saber si el usuario aceptó.
- `pendiente`: falta aceptar algún documento.
- `aceptado`: al día.
- `error`: la consulta falló, **no se sabe**; se trata como pendiente. `ConsentView` se muestra con
  un aviso y el botón «Reintentar» en vez de dejar entrar.

**El enlace original no se pierde.** El redirect manda a `/consentimiento?desde=<ubicación original,
codificada>` (por ejemplo `/consentimiento?desde=%2Freservas%2Fb-1`). Cuando el consentimiento
queda `aceptado`, quien está en `/consentimiento` vuelve a `desde`. Como `desde` viene de la URL, no
se confía en él: `destinoSeguro` (en `sesion_redirect.dart`) solo lo acepta si empieza por `/`, no
por `//` ni `/\`, no lleva esquema (`https:`) y no es `/login` ni `/consentimiento`; si no, se va a
`/`. Es la defensa contra un *open redirect*.

**Una consulta colgada no abre la puerta.** `ConsentViewModel` le pone un límite de tiempo
(`ConsentViewModel.tiempoLimite`, 15 s) a la consulta: si el servidor no responde, el estado pasa a
`error` y la pantalla ofrece «Reintentar».

Se vuelve a consultar cuando **cambia la sesión** (otro usuario), al pulsar **«Reintentar»** y al
**volver a primer plano** si el último intento falló (`DiversoApp` escucha el ciclo de vida de la
app y llama a `reintentar()`). Es el MVVM de siempre: la vista solo pinta el estado del view model
y el router lo usa para decidir la pantalla.

### Se crea una sola vez

`DiversoApp` es un `StatefulWidget` que llama a `buildViajeroRouter` en `initState` y guarda el
`GoRouter`. Si se construyera en `build` (por ejemplo dentro del `Consumer<ThemeModeViewModel>`),
cada cambio de tema crearía un router nuevo y la navegación volvería a `/`. Es la misma idea que no
crear un `NavigationContainer` nuevo en cada render en React Navigation.

### Página no encontrada

`errorBuilder` muestra `PaginaNoEncontradaView` («No encontramos esta página») con el botón «Ir al
inicio» cuando la URL no coincide con ninguna ruta.

### Probar el router

`buildViajeroRouter` recibe un `AuthRepository` y un `ConsentViewModel`; las pruebas usan
`AuthFalso` (`test/support/auth_falso.dart`) y `routerDePrueba(url)`
(`test/support/router_de_prueba.dart`), por ejemplo `routerDePrueba('/checkout/plan-1/fecha-1')`
en `apps/viajero/test/router/rutas_pago_test.dart`.

### Tabla de rutas

| Ruta | Vista | Notas |
|---|---|---|
| `/login` | `LoginView` | inicio de sesión y registro |
| `/legal/:doc` | `LegalView` | pública (se lee antes de registrarse) |
| `/consentimiento` | `ConsentView` | destino del redirect cuando falta (o no se pudo verificar) la autorización |
| `/` | `CatalogView` | pestaña Explorar |
| `/agencias` | `AgenciasView` | pestaña Agencias |
| `/reservas` | `BookingsView` | pestaña Reservas |
| `/perfil` | `ProfileView` | pestaña Perfil |
| `/agencia/:id` | `AgenciaView` | |
| `/plan/:id` | `PlanDetailView` | |
| `/checkout/:planId/:fechaId` | `CheckoutLoader` | carga el plan y muestra `CheckoutView` |
| `/pago/resultado` | `PagoResultadoView` | `?id=` (transacción) o `?reserva=` |
| `/reserva/:bookingId` | `ReservaView` | confirmación de una reserva |
| `/reservas/:bookingId` | `ReservaDetalleView` | detalle desde "Mis reservas" |
| `/resena/:bookingId` | `ReviewLoader` | carga la reserva y muestra `ReviewView`; `extra` opcional |
| `/comparar?ids=a,b` | `ComparatorLoader` | carga los planes y muestra `ComparatorView`; `extra` opcional |
| `/checkout`, `/exito`, `/resena` | (redirigen) | rutas antiguas que ya no existen como pantalla |
| cualquier otra | `PaginaNoEncontradaView` | `errorBuilder` |

`/pago/resultado` es `DiversoConfig.pagoResultadoPath` (`diverso_config.dart`), la URL a la que
Wompi devuelve al viajero.

---

**Anterior:** [2. Flutter para quien sabe React Native](02-flutter-para-quien-sabe-react-native.md) ·
**Siguiente:** [4. Herramientas y pruebas](04-herramientas-y-pruebas.md)

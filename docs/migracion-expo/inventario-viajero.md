# Inventario funcional y de diseño — `apps/viajero` (Flutter → React Native + Expo)

> Especificación de lo que NO se puede perder al reescribir la app del viajero. Fuente: lectura
> completa de `apps/viajero/lib`, `apps/viajero/test`, `apps/viajero/web`, `apps/viajero/README.md`
> y `apps/viajero/pubspec.yaml` (rama `feat/migracion-expo`).
> `packages/diverso_core` se inventaría aparte: aquí solo se nombra qué clase/repo de core usa cada
> pantalla. Todas las rutas de archivo son relativas a `apps/viajero/` salvo que se diga otra cosa.

## 0. Panorama

| Ítem | Valor |
|---|---|
| Nombre / versión | `viajero` 0.1.0+1 — «Diverso App — reserva planes turísticos de agencias antioqueñas verificadas.» (`pubspec.yaml`) |
| SDK | Dart `^3.8.1` |
| Dependencias | `flutter`, `flutter_web_plugins`, `supabase_flutter ^2.9.0`, `intl ^0.20.2`, `diverso_core` (path `../../packages/diverso_core`), `go_router ^18.0.2`, `provider ^6.1.5+1`, `webview_flutter ^4.14.1`, `url_launcher ^6.3.3` |
| Dev | `flutter_test`, `flutter_lints ^6.0.0` |
| Assets / fuentes propias | **Ninguno**. `pubspec.yaml` solo declara `uses-material-design: true`. No hay carpeta `assets/` ni `fonts:`. El logo es un widget de core (`DiversoLogo`), los íconos son Material Icons (variantes `_rounded`/`_outlined`) y las fotos vienen por red (`Image.network`). |
| README | Plantilla por defecto de Flutter («A new Flutter project.»): no aporta nada funcional. |
| Arquitectura | MVVM: cada pantalla crea su ViewModel (`ChangeNotifier` + mixin `NotificaSiVive`) en `initState`, lo escucha con `ListenableBuilder` y lo `dispose`a. Repos inyectados con `provider` (`context.read<X>()`). |
| Idioma de UI | Español (Colombia), textos literales en el código (no hay i18n/ARB). |

### 0.1 Arranque (`lib/main.dart`)

1. `WidgetsFlutterBinding.ensureInitialized()`.
2. `usePathUrlStrategy()` — URLs **sin `#`** en web (para que `/pago/resultado` y `/reserva/:id` se puedan cargar directo y tras recargar).
3. `await initializeDateFormatting('es')` — datos de fecha de `intl` en español.
4. `Supabase.initialize(url: DiversoConfig.supabaseUrl, publishableKey: DiversoConfig.supabaseKey)` (constantes de core).
5. Cableado (composición manual):
   - `client = Supabase.instance.client`; `edgeFunctions = EdgeFunctionsApi(client)`.
   - `AuthRepository(client)`, `BookingRepository(api: BookingApi(client), edgeFunctions)`, `CatalogRepository(api: CatalogApi(client))`, `ReviewRepository(client)`, `WompiPaymentGateway(edgeFunctions)` (tipo `PaymentGateway`).
6. `runApp(buildViajeroApp(...))`.

### 0.2 Raíz de composición (`lib/composition_root.dart`)

`buildViajeroApp({auth, reservas, catalogo, resenas, pasarela})` → `MultiProvider` con:
`ChangeNotifierProvider(ThemeModeViewModel)`, `Provider<BookingRepository>`, `Provider<CatalogRepository>`,
`Provider<ReviewRepository>`, `Provider<AuthRepository>`, `ChangeNotifierProvider(ConsentViewModel(auth))`,
`Provider<PaymentGateway>`; hijo `DiversoApp`. Las pruebas de arranque usan la misma función con dobles
(`test/app_arranque_test.dart`): si una pantalla pide algo no provisto falla con `ProviderNotFoundException`.

### 0.3 `DiversoApp` (`lib/app.dart`)

- `StatefulWidget` + `WidgetsBindingObserver`. El router se crea **una sola vez** en `initState`
  (`buildViajeroRouter(auth, consentimiento)`); si se creara en `build` (dentro del `Consumer` del tema)
  cambiar el tema reiniciaría la navegación.
- `didChangeAppLifecycleState(resumed)` → `ConsentViewModel.reintentar()` (si la verificación del
  consentimiento falló sin red, se reintenta al volver a la app).
- `MaterialApp.router(title: 'Diverso App', debugShowCheckedModeBanner: false, theme: AppTheme.viajeroLight(), darkTheme: AppTheme.viajeroDark(), themeMode: ThemeModeViewModel.mode, routerConfig: _router)`.

---

## 1. Rutas (go_router) — `lib/router/`

Archivos: `app_router.dart` (tabla), `app_routes.dart` (constantes y helpers; **ninguna pantalla escribe
una ruta a mano**), `sesion_redirect.dart` (guard puro), `go_router_refresh_stream.dart` (Stream→Listenable).

### 1.1 Tabla completa

| Path | Params | Query | Pantalla (archivo) | Transición | Dentro del shell | Notas |
|---|---|---|---|---|---|---|
| `/login` | — | — | `LoginView` (`ui/features/auth/views/login_view.dart`) | fadeThrough | No | Solo accesible sin sesión (con sesión+consentimiento aceptado redirige a `/`). |
| `/legal/:doc` | `doc` (`privacidad`, `terminos-viajeros`, …) | — | `LegalView(docId)` (`ui/features/legal/views/legal_view.dart`) | sharedAxisX | No | Accesible **siempre** (con o sin sesión, con o sin consentimiento). |
| `/consentimiento` | — | `desde` (ubicación original codificada) | `ConsentView` (`ui/features/legal/views/consent_view.dart`) | fadeThrough | No | Gate Ley 1581. |
| `/` | — | — | `CatalogView` (Explorar) | fadeThrough | **Rama 0** | `initialLocation` por defecto. |
| `/agencias` | — | — | `AgenciasView` | fadeThrough | **Rama 1** | |
| `/reservas` | — | — | `BookingsView` (Mis reservas) | fadeThrough | **Rama 2** | |
| `/perfil` | — | — | `ProfileView` | fadeThrough | **Rama 3** | |
| `/agencia/:id` | `id` | — | `AgenciaView(agencyId)` | sharedAxisX | No (pantalla completa, encima del shell) | |
| `/plan/:id` | `id` | — | `PlanDetailView(planId)` | sharedAxisX | No | |
| `/checkout/:planId/:fechaId` | `planId`, `fechaId` | — | `CheckoutLoader(planId, fechaId)` | sharedAxisX | No | |
| `/pago/resultado` (`DiversoConfig.pagoResultadoPath`) | — | `id` (transacción Wompi), `reserva` (bookingId) | `PagoResultadoView(transactionId, bookingId)` | fadeThrough | No | URL de retorno de Wompi. |
| `/reserva/:bookingId` | `bookingId` | — | `ReservaView(bookingId)` (confirmación) | **zoomIn** | No | |
| `/reservas/:bookingId` | `bookingId` | — | `ReservaDetalleView(bookingId, booking: extra as Booking?)` | sharedAxisX | No (ruta de nivel superior, no hija de la rama) | `extra` opcional. Devuelve `bool` al hacer pop (¿hubo cambios?). |
| `/resena/:bookingId` | `bookingId` | — | `ReviewLoader(bookingId, booking: extra as Booking?)` | sharedAxisX | No | Devuelve `true` al hacer pop si se publicó. |
| `/comparar` | — | `ids=a,b,c` | `ComparatorLoader(ids, planes: extra as List<Plan>?)` | sharedAxisX | No | `ids` se parte por `,`, sin vacíos, sin repetidos, máx. `CatalogViewModel.maxComparar` (=3). |
| `/checkout` (legado) | — | — | redirect → `/` | — | — | Rutas viejas que dependían de `extra`. |
| `/exito` (legado) | — | — | redirect → `/reservas` | — | — | |
| `/resena` (legado, `resenaBase`) | — | — | redirect → `/reservas` | — | — | |
| cualquier otra | — | — | `PaginaNoEncontradaView(ubicacion)` (`errorBuilder`) | — | — | 404 interno. |

Helpers de `AppRoutes` (deben replicarse 1:1):

| Helper | Resultado |
|---|---|
| `consentimientoDesde(ubicacion)` | `/consentimiento?desde=${Uri.encodeQueryComponent(ubicacion)}` |
| `legal(doc)` | `/legal/$doc` |
| `agencia(id)` | `/agencia/$id` |
| `plan(id)` | `/plan/$id` |
| `checkout(planId, fechaId)` | `/checkout/$planId/$fechaId` |
| `reserva(bookingId)` | `/reserva/$bookingId` (confirmación) |
| `reservaDetalle(bookingId)` | `/reservas/$bookingId` |
| `resena(bookingId)` | `/resena/$bookingId` |
| `pagoDeTransaccion(txId)` | `/pago/resultado?id=${encodeQueryComponent(txId)}` |
| `pagoDeReserva(bookingId)` | `/pago/resultado?reserva=${encodeQueryComponent(bookingId)}` («Ya pagué, verificar») |
| `compararPlanes(ids)` | `/comparar?ids=` + ids codificados unidos con `,` |

### 1.2 Guard de sesión y consentimiento (`lib/router/sesion_redirect.dart`)

Función pura `sesionRedirect({haySesion, consentimiento: EstadoConsentimiento, ubicacion})` (ubicación
= `state.uri.toString()` **con query**). `haySesion = auth.currentUserId != null`.

```
enLegal = path.startsWith('/legal/'); enLogin = path == '/login'; enConsentimiento = path == '/consentimiento'
si !haySesion        → (enLogin || enLegal) ? null : '/login'          // TODA la app exige sesión, incluso el catálogo
si enLegal           → null
si consentimiento == aceptado:
    enLogin          → '/'
    enConsentimiento → destinoSeguro(query['desde']) ?? '/'
    otro             → null
si no (verificando / pendiente / error) → enConsentimiento ? null : consentimientoDesde(ubicacion)
```

`destinoSeguro(desde)` (anti open-redirect): null si `desde` es null, no empieza por `/`, empieza por
`//`, contiene `\`, no parsea, tiene esquema o autoridad, o su path es `/login` o `/consentimiento`
(evita bucles). Si pasa, devuelve `desde` tal cual (con su query).

Reevaluación: `refreshListenable = Listenable.merge([GoRouterRefreshStream(auth.onAuthStateChanged), consentimiento])`.
Es decir, el router se reevalúa cuando cambia la sesión de Supabase **o** el estado del `ConsentViewModel`.
Importante: un fallo de red en la verificación del consentimiento **nunca deja entrar** (estado `error`
también redirige a `/consentimiento`).

### 1.3 Shell / pestañas (`lib/ui/shell/app_shell.dart`)

- `StatefulShellRoute.indexedStack` con 4 ramas (estado preservado por pestaña; además `AgenciasView`
  y `BookingsView` usan `AutomaticKeepAliveClientMixin`).
- `AppShell`: `Scaffold(body: shell, bottomNavigationBar: Column[Divider(height:1, thickness:1), NavigationBar])`
  (key `ValueKey('barra-inferior')`).
- Destinos (ícono / ícono seleccionado / label):
  1. `explore_outlined` / `explore_rounded` / **Explorar**
  2. `storefront_outlined` / `storefront_rounded` / **Agencias**
  3. `receipt_long_outlined` / `receipt_long_rounded` / **Reservas**
  4. `person_outline_rounded` / `person_rounded` / **Perfil**
- `onDestinationSelected(i)` → `shell.goBranch(i, initialLocation: i == shell.currentIndex)` (tocar la
  pestaña activa vuelve a su raíz).
- No hay `NavigationRail` en la app pese a existir el tema (en anchos grandes se sigue usando la barra inferior).
- El shell NO pide consentimiento: lo decide el redirect.

### 1.4 Transiciones (`DiversoPageTransitions`, de core)

Cada ruta se envuelve en `CustomTransitionPage` vía `DiversoPageTransitions.{fadeThrough|sharedAxisX|zoomIn}(key: state.pageKey, child)`:
fade-through para login/consentimiento/pestañas/resultado de pago, shared-axis horizontal para flujos
(agencia, plan, checkout, detalle de reserva, reseña, comparar, legal) y **zoom** para la confirmación
`/reserva/:bookingId`. (Duraciones/curvas viven en core.)

### 1.5 Web vs móvil / deep links

- **Todas** las pantallas llevan sus ids en la URL y cargan sus datos del backend → sobreviven a recarga
  en web y a deep links. `state.extra` solo **adelanta** datos (detalle de reserva, reseña, comparar)
  para pintar al instante; nunca es obligatorio.
- `usePathUrlStrategy()` → rutas limpias sin `#` (requiere que el hosting sirva `index.html` para cualquier ruta).
- Patrón «volver»: cuando la pantalla se abrió directo (no hay historial) `context.canPop()` es false y
  se hace `context.go(<raíz lógica>)` en vez de `pop` (agencia → `/agencias`; plan → `/`; detalle de
  reserva → `/reservas`; reseña → `/reservas`; comparar → `/`; legal → login/consentimiento/`/`; ver cada pantalla).
- La URL de retorno de Wompi es `/pago/resultado?id=<txId>` (web: misma pestaña; móvil: se intercepta
  en el WebView, ver §5).
- No hay configuración de deep links nativos (no se revisó Android/iOS, fuera de alcance de `lib/`; el
  enrutado por URL es el de go_router).

---

## 2. Features: pantallas y ViewModels

Convenciones comunes a TODOS los ViewModels (replicar en RN, p. ej. con hooks/zustand por pantalla):

- Extienden `ChangeNotifier` con el mixin `NotificaSiVive` (`lib/ui/core/notifica_si_vive.dart`):
  `notificar()` = `notifyListeners()` salvo que ya se haya hecho `dispose`; `desechado` permite
  abandonar trabajo async tras cerrar la pantalla (en RN: guardar `mounted`/`AbortController`).
- Patrón de carga: `cargar()` pone `cargando=true`, limpia `error`, notifica; `try` → datos; `catch` →
  `error` (texto usuario) + a veces `errorDetalle = e.toString()` (se muestra en monospace bajo el
  mensaje para soporte); `finally` → `cargando=false` + notifica. Se loguea con `debugPrint('<VM>.<método>: $e')`.
- `mensajeDeError(Object e)` (`lib/ui/core/mensaje_de_error.dart`): si `e is DiversoException` usa su
  `mensajeUsuario`; si no, `DiversoException.fromPostgrest(e).mensajeUsuario` (core).
- La vista crea el VM en `initState` con repos de `context.read<…>()`, lo escucha con
  `ListenableBuilder` y lo destruye en `dispose`. **Ningún VM es global** salvo `ThemeModeViewModel` y
  `ConsentViewModel` (providers raíz).
- Botones de «Reintentar» siempre llaman al mismo `cargar()`.
- Pull-to-refresh (`RefreshIndicator`) en catálogo, agencias, página de agencia, reservas (por lista).
- Breakpoint único: `AppTheme.bpCompact = 640` px → por encima, grid (`SliverGridDelegateWithMaxCrossAxisExtent`),
  por debajo, lista. Se decide con el ancho de la **ventana** (`MediaQuery.sizeOf`), no con constraints
  del sliver (comentario de rendimiento a 120 Hz en `catalog_view.dart`).

### 2.1 Shell (`lib/ui/shell/`)

| Pantalla | Detalle |
|---|---|
| `AppShell` (`app_shell.dart`) | Ver §1.3. |
| `PaginaNoEncontradaView` (`pagina_no_encontrada_view.dart`) | `Scaffold(SafeArea(EmptyState))`: ícono `explore_off_rounded`, título **«No encontramos esta página»**, mensaje **«El enlace puede estar mal escrito o la página ya no existe.»**, `detalle` = la ubicación (monospace), acción `FilledButton` **«Ir al inicio»** → `go('/')`. |

### 2.2 Auth (`lib/ui/features/auth/`)

#### `LoginView` (`views/login_view.dart`) + `LoginViewModel` (`view_models/login_view_model.dart`)

Core: `AuthRepository.signIn(email, password)`, `AuthRepository.signUpViajero(nombre, email, password, aceptaDocumentos)`, `DiversoLogo`.

**Estado del VM:** `esRegistro` (false), `cargando`, `aceptaDatos`, `aceptaTerminos`, `intentoRegistro`
(ya se intentó crear cuenta → resaltar casillas), `error`, `ofreceCuentaDemo` (= flag `cuentaDemo` &&
`!esRegistro`; flag por defecto `kDebugMode`, la vista lo recibe en `mostrarCuentaDemo`).
Constantes: `correoDemo = 'viajero@demo.com'`, `claveDemo = 'demo1234'` (cuenta del seed).

**Comandos:**
- `alternarModo()`: invierte `esRegistro`, limpia `error` e `intentoRegistro`.
- `cambiarAceptaDatos(bool)`, `cambiarAceptaTerminos(bool)`.
- `enviar({formularioValido, nombre, email, password})`:
  1. Si `cargando` → ignora (anti doble envío).
  2. Si registro: `intentoRegistro = true` + notifica; si falta alguna casilla → **no envía nada**.
  3. Si `!formularioValido` → return.
  4. `cargando=true`, `error=null`. Registro → `signUpViajero(nombre.trim(), email.trim(), password, aceptaDocumentos: aceptaDatos && aceptaTerminos)`; entrar → `signIn(email.trim(), password)`.
  5. Error → registro: **«No pudimos crear la cuenta. ¿Ese correo ya está registrado?»**; entrar: **«Correo o contraseña incorrectos, o no hay conexión.»**
  6. En éxito no navega: **el router saca al usuario** (cambia `onAuthStateChanged` → redirect).

**Validaciones (en la vista, `widgets/formulario_login.dart`):**
- Nombre (solo registro): `trim().length < 2` → «Escribe tu nombre». `textCapitalization: words`, ícono `person_outline_rounded`, label «Tu nombre».
- Correo: `!v.contains('@')` → «Correo inválido». Teclado email, ícono `mail_outline_rounded`, label «Correo». Submit del teclado → enviar.
- Contraseña: `length < 6` → «Mínimo 6 caracteres». `obscureText`, ícono `lock_outline_rounded`, label «Contraseña». Submit → enviar.

**Layout:** `LayoutBuilder`: ancho > 640 → `Row[Expanded(PanelMarca), Expanded(Center(formulario))]`;
si no → `SafeArea(Center(SingleChildScrollView(padding: 24, formulario)))`. Formulario `maxWidth 400`,
padding horizontal 24. En angosto (<640) arriba un contenedor `primaryContainer` radio 20 padding 16
con `DiversoLogo(size 42, color onPrimaryContainer)` + 14 de aire.

**Textos visibles:** título «Bienvenido de vuelta» / «Crea tu cuenta» (26, w800, ls -.8); subtítulo
«Entra para seguir explorando Antioquia.» / «Explora y reserva planes de agencias verificadas.» (14,
onSurfaceVariant); botón primario «Entrar» / «Crear cuenta» (spinner 19×19 stroke 2 mientras carga,
deshabilitado); `TextButton` «Crear cuenta nueva» / «Ya tengo cuenta — entrar»; (debug) `OutlinedButton.icon`
«Usar cuenta demo» (ícono `science_outlined` 18, altura 46, rellena correo y clave sin enviar); pie
con dos `TextButton` (12.5 w600 onSurfaceVariant): «Política de datos» → `push('/legal/privacidad')`,
«Términos y condiciones» → `push('/legal/terminos-viajeros')`. Error en `cs.error` 13.5 centrado.
En registro aparecen las `ConsentCheckboxes` (ver Legal).

**`PanelMarca`** (`widgets/panel_marca.dart`): contenedor `cs.primary`, padding 48, columna centrada
verticalmente/alineada a la izquierda: `DiversoLogo(64, onPrimary)`, 20, «Diverso» (42 w800 ls -1.5
onPrimary), 12, texto (maxWidth 380, 16, altura 1.55, onPrimary .85): «Planes turísticos de agencias
antioqueñas verificadas. Precio final desde el inicio, cupos reales y pago protegido.»

### 2.3 Agencies (`lib/ui/features/agencies/`)

#### `AgenciasView` (pestaña «Agencias», `views/agencias_view.dart`) + `AgenciasViewModel`

Core: `CatalogRepository.agencias()`, `AgenciaResumen`, `OrdenAgencias` (enum con `.label`), `ordenarAgencias(lista, orden)`.

- **Estado:** `agencias` (ordenadas, inmodificables), `hayAgencias`, `cargando` (inicia `true`), `error`,
  `errorDetalle`, `orden` (por defecto `OrdenAgencias.puntaje`).
- **Comandos:** `cargar()` (error: «No pudimos cargar las agencias. Revisa tu conexión e intenta de nuevo.»),
  `cambiarOrden(nuevo)` (no-op si es el mismo; reordena en memoria, sin red).
- **UI:** `AppBar(title: TituloPagina('Agencias'))`; `RefreshIndicator` + `CustomScrollView`
  (`AlwaysScrollableScrollPhysics`, permite tirar para recargar aunque esté vacía).
  - Selector de orden (`SegmentedButton`, sin ícono de seleccionado, un segmento por `OrdenAgencias.values` con su `label`) visible si hay agencias o está cargando; padding `20,4,20,12`.
  - Cargando sin datos → 3 `Skeleton(height 210, radius 20)` separados 14.
  - Error sin datos → `EmptyState(cloud_off_rounded, «Sin conexión», error, detalle, FilledButton.tonalIcon(refresh_rounded, «Reintentar»))`.
  - Vacío → `EmptyState(storefront_outlined, «Aún no hay agencias», «Cuando una agencia verificada publique planes, la verás aquí.»)`.
  - Lista (<640): `AgenciaCard` con separación 14; grid (>640): maxCrossAxisExtent 430, spacing 14/14, `childAspectRatio 1.7`.
- Keep-alive de pestaña. Sin paginación.

#### `AgenciaView` (`/agencia/:id`, `views/agencia_view.dart`) + `AgenciaViewModel`

Core: `CatalogRepository.agenciaConPlanes(agencyId)` → `{agencia, planes}` o `null`.

- **Estado:** `agencia` (null mientras carga/si falla/si no existe), `planes`, `cargando` (inicia true),
  `noEncontrada` (r == null; no distingue «no existe» de «no habilitada» a propósito), `error`, `errorDetalle`.
- **Error:** «No pudimos cargar la agencia. Revisa tu conexión e intenta de nuevo.»
- **UI por estado** (envueltos en `AvisoAgencia` = `AppBar` con botón volver + contenido):
  - Cargando sin datos → esqueleto: `Skeleton(160, r20)`, 16, `Skeleton(220×22)`, 10, `Skeleton(140×14)`, 24, `Skeleton(210, r20)` con padding 20.
  - Error → `EmptyState(cloud_off_rounded, «No pudimos cargar la agencia», error, detalle, «Reintentar»)`.
  - No encontrada → `EmptyState(storefront_outlined, «Agencia no disponible», «Esta agencia no existe o ya no tiene planes publicados.»)`.
  - Cargada → `ContenidoAgencia` (`widgets/contenido_agencia.dart`): `RefreshIndicator` + `CustomScrollView` con
    `CabeceraColapsable(titulo: nombre, alturaExpandida: 220, fondo: PortadaAgencia)`; bloque padding
    `22,20,22,8`: `AgencyAvatar(size 64)` + nombre (estilo `TituloPagina` con fontSize 24) + `DatosAgencia`;
    14; `VerifiedBadge()`; descripción (si no vacía tras `trim`, 14.5, altura 1.5, onSurfaceVariant); 28;
    `SectionLabel('Planes publicados (N)')`. Planes vacíos → texto «Esta agencia no tiene planes disponibles por ahora.»
    (padding 22,8,22,32); si no, `PlanCard` **sin botón de comparar** (lista o grid 430/14/14/aspect .82).
- **Volver** (`volverDeAgencia`): `canPop ? pop : go('/agencias')`.

**Widgets** (`widgets/agencia_card.dart`):
- `AgenciaCard`: `Card(color surfaceContainerLow, clip antiAlias)` + `InkWell` → `push('/agencia/:id')`.
  Portada 128 de alto (`PortadaAgencia`) con `VerifiedBadge(blanco, compacto)` en top/left 10; abajo
  padding `14,12,14,14`: `AgencyAvatar(46)` + 12 + nombre (15.5 w700 ls -.3, 1 línea) + 5 + `DatosAgencia`.
- `DatosAgencia`: `Wrap(spacing 10, runSpacing 3)`: si `esNueva` → `InsigniaNueva(texto: puntajeTexto)`;
  si no → ★ (17, dorado) + `puntajeTexto` (13 w700) + `(reviewsTotal)` (12.5 onSurfaceVariant); ciudad
  con `location_on_outlined` 14 (si no vacía); `planesTexto` («N planes», de core).
- `PortadaAgencia`: `portadaUrl` (foto del plan mejor puntuado, de core) con `BoxFit.cover`; sin foto
  o con error → fondo `colorDeAgencia(id)` al 16 % con `storefront_rounded` 40 al 55 %.

### 2.4 Bookings (`lib/ui/features/bookings/`)

Base común: `ReservaAccionesViewModel` (`view_models/reserva_acciones_view_model.dart`, abstracta) con
reloj inyectable `DateTime Function() reloj` (por defecto `DateTime.now`).
Core: `BookingRepository.{misReservas, reserva(id), vistaPreviaCancelacion(id), cancelar(id)}`,
`Booking` (`vigente(ahora)`, `puedeResenar(ahora)`, `esFutura`, `salida`, `salidaAt`, `planDate`,
`plan`, `pax`, `montoTotal`, `codigo`, `estado`, `pago`, `reembolso`, `etiquetaReembolso`,
`tieneResena`, `conResena()`), `BookingStatus {pendientePago, confirmada, cancelada, completada}`,
`VistaPreviaCancelacion {aplica, porcentaje, monto, motivo}`, `ResultadoCancelacion {estado, monto, porcentaje}`,
`EstadoReembolso` (`.etiqueta`, `noAplica`, `rechazado`), `formatCOP`, `formatFechaLarga`, `PaymentGateway`.

**`ReservaAccionesViewModel`:**
- `mensaje` (aviso pendiente → snackbar; la vista lo muestra y llama `limpiarMensaje()`, que NO notifica).
- `esVigente(b) = b.vigente(reloj())`; `puedeCancelar(b) = esVigente(b)`; `puedeResenar(b) = b.puedeResenar(reloj())`.
- `avisar(texto)`: fija `mensaje` y notifica.
- `vistaPrevia(b)`: `repo.vistaPreviaCancelacion(b.id)`; error → `avisar(mensajeDeError(e))` y devuelve null.
- `cancelar(b)`: `repo.cancelar(b.id)` → `mensaje = mensajeCancelacion(resultado)`, luego `await cargar()`
  y `true`; error → `avisar(mensajeDeError(e))`, `false` (no recarga).
- `cargar()` abstracto.

**Funciones compartidas** (`acciones_reserva.dart`):
- `mostrarAviso(context, vm)`: si hay `mensaje`, `SnackBar(Text(mensaje))` y `limpiarMensaje()`.
  Las vistas se suscriben con `addListener(_escucharAviso)`.
- `cancelarConConfirmacion(context, vm, b)`: 1) `vistaPrevia` (si null o desmontado → false);
  2) `showDialog<bool>(CancelacionDialog(codigo, vista))`; 3) si confirma → `vm.cancelar(b)`; devuelve si confirmó.
- `completarPago(context, vm, pasarela, b)`: `iniciarPago(context, pasarela, bookingId: b.id)` (ver
  Checkout §2.6); si devuelve `PagoAbierto.cerrado` → aviso **«Cerraste el pago antes de terminar. Si ya
  pagaste, toca «Ya pagué, verificar».»**; `DiversoException` → aviso con `mensajeUsuario`.

**Formato** (`reserva_formato.dart`, usa `intl`):
- `textoSalida(b)`: `b.salida?.toLocal()`; `DateFormat('EEE d MMM', 'es')` → «lun 27 oct»; si `salidaAt != null`
  añade ` · HH:mm` («lun 27 oct · 06:00»); null si no hay salida.
- `cuentaRegresiva(b, [ahora])`: null si cancelada o no futura; días por **calendario** (diferencia de
  fechas UTC Y/M/D, no bloques de 24 h): 0 → «Hoy», 1 → «Mañana», n → «en n días».
- `textoPersonas(pax)`: «1 persona» / «N personas».
- `mensajeCancelacion(r)`: «Reserva cancelada y cupos liberados. {reembolso}.» donde reembolso = `estado.etiqueta`
  si `noAplica`, o `'{etiqueta}: {formatCOP(monto)} ({porcentaje} %)'`. Ej.: «Reserva cancelada y cupos
  liberados. Reembolso de prueba aprobado: $ 190.000 (100 %).»

#### `BookingsView` (pestaña «Reservas», `views/bookings_view.dart`) + `BookingsViewModel`

- **Estado:** `reservas` (todas), `cargando` (inicia true), `error` («No pudimos cargar tus reservas.»),
  `activas` = vigentes ordenadas por `salida` ascendente; `historial` = el resto ordenado por `salida`
  **descendente**, las que no tienen salida al final.
- **Comandos:** `cargar()` → `misReservas()`; heredados (cancelar, vistaPrevia, avisar).
- **UI:** `DefaultTabController(2)`; `AppBar(title: TituloPagina('Mis reservas'), bottom: TabBar(...))`
  con pestañas **«Próximas (N)»** y **«Historial (N)»** (indicador tamaño label, grosor 2.5, label `primary`,
  no seleccionada `onSurfaceVariant`, sin divisor).
  - Cargando → `ReservasSkeleton` (3 × `Skeleton(108, r20)` separados 12, padding 20).
  - Error → `EmptyState(cloud_off_rounded, «Sin conexión», error, FilledButton.tonal «Reintentar»)`.
  - Sin reservas → `EmptyState(luggage_rounded, «Aún no tienes reservas», «Cuando reserves un plan, aquí verás tu código, la fecha y el itinerario.»)`.
  - Lista vacía de una pestaña → texto centrado a 120 px: «Sin viajes próximos — ¡hora de explorar!» / «Todavía no hay historial.»
  - Lista → `RefreshIndicator` + `ListView` padding `20,12,20,24` de `TarjetaReserva` (historial con `historial: true`).
- **Acciones por tarjeta:**
  - `onAbrir` → `push<bool>('/reservas/:id', extra: booking)`; **solo recarga si devuelve `true`** (no pierde scroll).
  - `onResenar` (si `puedeResenar`) → `push('/resena/:id', extra: booking)` y luego **siempre** `cargar()`.
  - `onPagar` (si `estado == pendientePago`) → `completarPago`.
  - `onVerificar` (si `pendientePago`) → `go('/pago/resultado?reserva=:id')`.
  - `onCancelar` (si `puedeCancelar`) → `cancelarConConfirmacion`.
- Keep-alive de pestaña. Sin paginación.

#### `ReservaDetalleView` (`/reservas/:bookingId`, `views/reserva_detalle_view.dart`) + `ReservaDetalleViewModel`

- **Constructor:** `bookingId`, `inicial` (el `extra`). Si no hay `inicial`, la vista llama `cargar()`.
- **Estado:** `reserva`, `cargando` (= `_cargando || (reserva == null && error == null)`), `error`, `cambio`
  (si hubo cancelación/pago/reseña → «Mis reservas» debe recargar).
- **Comandos:**
  - `cargar()` → `repo.reserva(id)`; conserva `tieneResena` si la que había ya estaba reseñada
    (`nueva.conResena()`, porque `reserva(id)` no sabe si hay reseña). Error con reserva visible →
    aviso «No pudimos actualizar la reserva.»; sin reserva → `error = mensajeDeError(e)`.
  - `cancelar(b)` → marca `cambio = true` **siempre** (aunque el servidor la rechace) y delega.
  - `pagoIntentado()` → `cambio = true` + `cargar()`.
  - `resenaPublicada()` → `cambio = true`, `reserva = reserva.conResena()`.
- **Navegación:** `_volver()` = `canPop ? pop(cambio) : go('/reservas')`. `PopScope(canPop: false)`
  intercepta el gesto/botón atrás del sistema para devolver `cambio`.
  `_pagar` → `completarPago` y luego `pagoIntentado()`. `_resenar` → `push<bool>('/resena/:id', extra: b)`;
  si `true` → `resenaPublicada()`. Verificar → `go('/pago/resultado?reserva=:id')`.
- **UI:** con reserva → `DetalleReserva`; error → marco (AppBar con volver) + `EmptyState(cloud_off_rounded,
  «No pudimos cargar la reserva», error, FilledButton.tonal «Reintentar»)`; cargando → marco + esqueleto
  (`Skeleton(190,r20)`, 16, `Skeleton(28×220)`, 12, `Skeleton(120,r20)`, padding 20).
- **`DetalleReserva`** (`widgets/detalle_reserva.dart`): `CustomScrollView` con `CabeceraColapsable(titulo:
  plan?.titulo ?? 'Plan', alturaExpandida 240, fondo: FotoReserva)`; contenido padding `22,20,22, 28+safeBottom`:
  título (24 w800 altura 1.15 ls -.7), agencia (`storefront_outlined` 16 + 14 w600 onSurfaceVariant),
  14, `Wrap[EstadoReservaPill, ChipCodigo]`, 18, `ResumenReserva`, itinerario (`SectionLabel('Itinerario')`
  + `PasoItinerario` por paso) si hay, `TarjetaCancelacion(plan.politicaCancelacion)` si hay, 24,
  `AccionesDetalleReserva`.
- **`AccionesDetalleReserva`**: si pendiente → `FilledButton` «Completar pago» + `TextButton` «Ya pagué,
  verificar»; si `puedeResenar` → `FilledButton.tonalIcon(star_outline_rounded 18, «Reseñar»)`; si no y
  `tieneResena` → fila `rate_review_rounded` 15 + «Ya dejaste tu reseña» (13, primary); fila final:
  `OutlinedButton` «Ver plan» (si hay `plan.id ?? planDate.planId`) → `push('/plan/:id')` y
  `OutlinedButton` rojo «Cancelar» (fg `error`, borde `error` al 50 %) si `puedeCancelar`.
- **`ResumenReserva`**: contenedor `surfaceContainerLow` radio 20 padding 16 con `FilaDato`s:
  `event_rounded` salida + acento cuenta regresiva; `place_outlined` punto de encuentro; `group_outlined`
  «N personas · $ total»; `credit_card_rounded` `pago.textoReferencia` (core); `currency_exchange_rounded`
  `etiquetaReembolso` en rojo si `reembolso.estado == rechazado`, si no `primary` (`color_reembolso.dart`).

#### `ReviewLoader` (`/resena/:bookingId`, `views/review_loader.dart`) + `ReviewView` + `ReviewViewModel`

Core: `BookingRepository.reserva(id)`, `ReviewRepository.crear(bookingId, calificacion, comentario)`.

- **VM:** `adelantada` (el `extra`) solo se usa si `adelantada.id == bookingId`. `calificacionInicial = 5`,
  `maxEstrellas = 5`. Estado: `reserva`, `cargando`, `error`, `puedeResenar` (= `reserva.puedeResenar(reloj())`),
  `calificacion`, `enviando`, `publicada`, `errorEnvio`.
- **Comandos:** `cargar()` (no-op si ya hay reserva); `calificar(n)` (ignora <1, >5 o igual);
  `enviar(comentario)` → `false` si ya envía o ya publicada; éxito → `publicada = true` (el botón no
  vuelve a activarse); error → `errorEnvio = mensajeDeError(e)` (se puede reintentar).
- **Loader UI:** `Scaffold(AppBar('Tu reseña'))` +: cargando → spinner; error → `EmptyState(cloud_off_rounded,
  «No pudimos cargar la reserva», error, [FilledButton.tonal «Reintentar», TextButton «Ver mis reservas» → go('/reservas')])`;
  no se puede reseñar → `EmptyState(rate_review_outlined, «Esta reserva no se puede reseñar», «Solo se reseñan
  los viajes ya realizados que aún no tienen reseña.», FilledButton.tonal «Ver mis reservas»)`; si no → `ReviewView`.
- **`ReviewView`** (`views/review_view.dart`): centrado, maxWidth 460, padding 24. Título del plan
  (21 w800 ls -.5 altura 1.2, centrado) + fecha `formatFechaLarga(planDate.fecha)` (13 onSurfaceVariant);
  30; «¿Cómo estuvo tu experiencia?» (16 w700); 18; 5 `IconButton` estrella (iconSize 42, padding h6,
  tooltip «N de 5 estrellas», llena `star_rounded` dorado / vacía `star_outline_rounded` `outline`);
  etiqueta con `AnimatedSwitcher(150 ms)`: 1 «Muy mala», 2 «Mala», 3 «Regular», 4 «Buena», 5 «¡Excelente!»
  (15 w700 primary); 28; `TextField` multilínea (5 líneas, **maxLength 500** con contador) label «Cuenta
  cómo te fue (opcional)»; 18; `FilledButton.icon(send_rounded 17, «Publicar reseña»)` (spinner 17×17
  mientras `enviando || publicada`, todo bloqueado); 14; pie `verified_rounded` 13 `tertiary` + «Reseña
  verificada: solo quien viajó puede opinar» (12 onSurfaceVariant).
  Tras publicar: SnackBar **«¡Gracias! Tu reseña ayudará a otros viajeros.»** y `canPop ? pop(true) : go('/reservas')`.
  Si falla: SnackBar con `errorEnvio`. El comentario puede ir vacío.

**Widgets de reservas:**
- `TarjetaReserva` (`widgets/tarjeta_reserva.dart`): `Card(surfaceContainerLow)` con margen inferior 14,
  `Semantics(button, label: 'Ver detalle de la reserva {codigo}')`, `InkWell(onAbrir)`.
  Cabecera `EncabezadoReserva` (132 de alto) → cuerpo padding 16/14: título (2 líneas, 16 w700 altura 1.25;
  en historial color `onSurface` al 72 %), agencia (`storefront_outlined` 14 + 12.5 w600), 12, filas
  compactas (salida+cuenta regresiva, punto de encuentro, reembolso), 12, `Divider`, 12, `Wrap(spaceBetween)`
  [`group_outlined` 16 + «N personas» (13), total `formatCOP` (17 w800 ls -.3)]. Botones: `TextButton`
  «Ya pagué, verificar» + `FilledButton.tonal` «Completar pago» (alto 38) alineados a la derecha;
  `FilledButton.tonalIcon(star_outline_rounded 16, «Reseñar»)` (alto 38, padding h14) + `TextButton` rojo
  «Cancelar» (alto 38); si no hay reseñar/cancelar y `tieneResena` → `rate_review_rounded` 13 + «Ya dejaste tu reseña» (12 primary).
- `EncabezadoReserva` (`widgets/encabezado_reserva.dart`, key `encabezado-reserva`): `FotoReserva` +
  degradado negro 38 %→transparente (stops 0/.55); insignia de fecha arriba-izquierda (12,12)
  (`planDate.fecha ?? salidaAt.toLocal()`), `EstadoReservaPill` arriba-derecha, `ChipCodigo(sobreFoto)`
  abajo-izquierda (12, bottom 10).
  `_InsigniaFecha` (key `insignia-fecha`): ancho 52, padding v6, fondo `surface`, radio 14, sombra
  `sombraInsignia` blur 6 offset (0,2); día (22 w800 altura 1 ls -.5 primary), 3, mes en mayúsculas de
  la lista fija `ENE FEB MAR ABR MAY JUN JUL AGO SEP OCT NOV DIC` (11 w700 ls .8 onSurfaceVariant).
- `EstadoReservaPill`: color sólido + texto blanco 11.5 w700, padding h11/v5, píldora, sombra
  `sombraInsignia` blur 6 (0,2). confirmada & salida pasada → «Realizada» (`estadoCerrada`); confirmada
  → «Confirmada» (`estadoConfirmada`); pendientePago → «Pendiente» (`estadoPendiente`); cancelada →
  «Cancelada» (`estadoCancelada`); completada → «Completada» (`estadoCerrada`). «Realizada» es solo etiqueta.
- `ChipCodigo`: padding h9/v4, radio 8, texto 11.5 w700 ls .4; normal: fondo `surfaceContainerHigh`,
  texto `onSurfaceVariant`; `sobreFoto`: fondo `controlSobreFoto`, texto blanco.
- `FotoReserva`: `plan.fotoPrincipal` (key `foto-reserva`) o respaldo (key `sin-foto-reserva`) fondo
  `primaryContainer` con emoji de categoría (40) o `luggage_rounded` 40 si no hay plan. `apagado` (historial)
  aplica `ColorFilter.matrix([.55,.35,.10,0,0, .20,.70,.10,0,0, .20,.35,.45,0,0, 0,0,0,1,0])`.
- `FilaDato`: ícono (19, o 16 compacto; color `onSurfaceVariant` o `color`) + 10/8 + texto (14.5 o 13,
  altura 1.3); `acento` se añade como « · acento» en w700 `primary`.
- `CancelacionDialog` (`widgets/cancel_dialog.dart`): `AlertDialog` título «¿Cancelar reserva?»; contenido
  «La reserva {codigo} se cancelará y los cupos volverán a estar disponibles.» + 12 + `textoPoliticaCancelacion(vista)`
  (w600, `primary` si `aplica`, `error` si no). Acciones: `TextButton` «Mantener» (→ false), `FilledButton.tonal`
  fg `error` «Sí, cancelar» (→ true).
  `textoPoliticaCancelacion`: si `!aplica || porcentaje <= 0` → «Si cancelas ahora no recibirás reembolso. {motivo}»;
  si no → «Si cancelas ahora te devolvemos el {p} % ({$monto}){' según la política del plan' si p<100}. Es un reembolso de prueba: no se mueve dinero real.»

### 2.5 Catalog (`lib/ui/features/catalog/`)

#### `CatalogView` (pestaña «Explorar», `/`, `views/catalog_view.dart`) + `CatalogViewModel`

Core: `CatalogRepository.search(FiltrosCatalogo{texto, categoria, destino, precioMax, fecha, orden})`,
`CatalogRepository.destinos()`, `Plan`, `ExperienceCategory` (`values`, `.label`, `.emoji`), `OrdenCatalogo`
(por defecto `rating`), `formatCOP`, `formatFechaCorta`.

- **Estado:** `planes`, `destinos`, `cargando` (inicia true), `error`, `errorDetalle`, filtros `texto`,
  `categoria`, `destino`, `precioMax`, `fecha`, `orden`; `seleccion` (planes cuyos ids están seleccionados,
  en el orden de `planes`), `comparando(p)`, `filtrosActivos` = nº de {destino, precioMax, fecha} no null
  (categoría y texto NO cuentan). `maxComparar = 3`.
- **Comandos:**
  - `cargar()`: `search(filtros)` y luego `destinos()` (secuencial); purga de la selección ids que ya no
    están en los resultados. Error: «No pudimos cargar los planes. Revisa tu conexión e intenta de nuevo.»
  - `setTexto(v)`: solo guarda (no busca). `buscar()` = `cargar()` (al enviar el teclado). **No hay búsqueda en vivo ni debounce.**
  - `toggleCategoria(c)`: misma categoría → la quita; recarga.
  - `setDestino`, `setPrecioMax`, `setFecha`, `cambiarOrden` → recargan.
  - `aplicarFiltros({destino, precioMax, fecha})`: los tres a la vez + una sola consulta; `limpiarFiltros()` = todos null.
  - `toggleComparar(p)`: quita si está; agrega si hay < 3 (si ya hay 3, ignora en silencio). `limpiarComparar()`.
  - `cambiarOrden` existe en el VM pero **la UI actual no expone selector de orden del catálogo** (el botón dice «Filtros y orden» pero la hoja solo tiene fecha/precio/destino).
- **UI:** `AppBar(title: TituloPagina('Descubre Antioquia'))`. Cabecera (padding 20,4,20,0):
  - `TextField` buscador: hint «Guatapé, café, parapente…», `search_rounded`, acción de teclado `search`,
    botón ✕ (`close_rounded` 19, tooltip «Borrar búsqueda») cuando hay texto: limpia y busca.
  - `BotonFiltros` (10 a la derecha).
  - Chips de filtros activos (`InputChip` con borrar): destino (`location_on_outlined` 15), fecha
    (`event_outlined`, `formatFechaCorta`), precio (`payments_outlined`, «Hasta $ X»). Borrar → `setX(null)`.
  - Fila horizontal de `ChipCategoria` (alto 40, separación 8) con todas las `ExperienceCategory`.
  - Resultados: cargando → `ResultadosSkeleton`; error → `EmptyState(cloud_off_rounded, «Sin conexión», error,
    detalle, «Reintentar»)`; vacío → `EmptyState(search_off_rounded, «Sin resultados», «Prueba con otro destino
    o quita algunos filtros.»)`; lista/grid de `PlanCard` con comparar (padding `20,8,20,24`).
  - `bottomNavigationBar` del Scaffold (encima de la barra del shell): `BandejaComparar` con
    `AnimatedSwitcher(220 ms, in easeOutCubic, out easeInCubic, SizeTransition(topCenter)+FadeTransition)`;
    «Comparar» → `push('/comparar?ids=…', extra: seleccion)`.
- Keep-alive. **Sin paginación**: `search` devuelve todo.

**`BotonFiltros`** (`widgets/boton_filtros.dart`): `Badge` con el nº de `filtrosActivos` (oculto si 0);
`IconButton.filledTonal(tune_rounded)` 52×52, radio 14, fondo **`Colors.black` al 5 % fijo (también en oscuro)**,
fg `onSurface`, tooltip «Filtros y orden». Abre `showModalBottomSheet(isScrollControlled, showDragHandle)` con `FiltrosSheet`.

**`FiltrosSheet`** (`widgets/filtros_sheet.dart`): estado local inicializado con los filtros del VM.
Padding `24,0,24, 24+teclado`. Título «Filtros» (22 w800 ls -.5); 22;
- «FECHA DEL PLAN» → opción (`calendar_month_rounded`, «Cualquier fecha» o `formatFechaCorta`) que abre
  `showDatePicker(initial: fecha ?? mañana, first: hoy, last: hoy+365 días)`; botón `IconButton.outlined`
  ✕ «Quitar fecha».
- «PRECIO MÁXIMO POR PERSONA» → `Slider(min 50000, max 600000, divisions 11, label formatCOP)`; el valor
  máximo (600 000) significa **sin límite** (`precio = null`) y se muestra «Sin límite»; ancho 110 para el valor.
- «DESTINO» → `TextField` «Buscar destino…» (isDense) + lista propia (maxHeight 192) con «Todos los destinos»
  (`travel_explore_outlined`) + destinos que contienen el texto (case-insensitive); seleccionado con
  `check_circle_rounded` y texto w700 primary. (Comentario: el `DropdownButton` dentro de la hoja no recibía gestos.)
- Botones: `OutlinedButton` «Limpiar» (solo limpia el estado local) y `FilledButton.icon(check_rounded,
  «Aplicar filtros»)` (flex 2) → cierra la hoja y `aplicarFiltros`.

**`ChipCategoria`** (`widgets/chip_categoria.dart`): `AnimatedContainer(180 ms, easeOut)`, píldora;
seleccionada: fondo/borde `primary`, ícono/texto `onPrimary`; no: transparente con borde `outlineVariant`,
ícono/texto `onSurfaceVariant`. Padding h14/v9, ícono 16, texto 13 w600. Íconos: aventura `hiking_rounded`,
naturaleza `forest_rounded`, cultura `account_balance_rounded`, gastronomia `restaurant_rounded`, relax
`spa_rounded`, urbano `location_city_rounded`.

**`PlanCard`** (`widgets/plan_card.dart`): `Card(surfaceContainerLow, clip)` + `InkWell` → `push('/plan/:id')`.
Portada 168 alto: foto (`BoxFit.cover`, `filterQuality low`, `gaplessPlayback`) o respaldo `primaryContainer`
+ emoji (40); degradado negro 22 % → transparente → 45 % (stops 0/.45/1); `VerifiedBadge(blanco, compacto)`
top-left 10 si `plan.agency?.verificada == true`; botón comparar top-right 6 (si `onToggleComparar != null`):
`IconButton` compacto, seleccionado fondo `primary`/ícono `check_rounded` `onPrimary`, si no fondo negro 28 %
/`compare_arrows_rounded` blanco (19), tooltip «Quitar del comparador» / «Agregar al comparador»; abajo-izq
(12,10): `location_on_rounded` 14 blanco + `destino` (13 w700 blanco) + píldora blanca 22 % con
`duracionTexto` (11 w600 blanco); abajo-der: píldora blanca con `event_available_rounded` 12 primary +
«{fechasDisponibles.first.cupoDisponible} cupos» (11 w700 primary) si hay fechas. Contenido padding
`14,12,14,14`: título (2 líneas, 15.5 w700 altura 1.25 ls -.3), 8, `Row[PuntajePlan, Spacer, PriceText(precioCop)]`.
Grid: `planCardGridDelegate` (maxCrossAxisExtent 430, spacing 14/14, aspect .82).

**`ResultadosSkeleton`/`TarjetaSkeleton`**: grid → 4 tarjetas (mismo delegate); lista → 3. Tarjeta:
`Skeleton(168, r0)` + padding 14: `200×16`, 10, `120×12`, 14, `150×20`.

**`BandejaComparar`** (`widgets/bandeja_comparar.dart`): `Material(surfaceContainerLowest, elevation 8,
shadow negro 35 %, sin tint, borde superior radio 20 + borde `outlineVariant` 60 %)` con `SafeArea(top:false)`,
padding `16,10,16,14`. Fila: «{n} de {max} planes» (15 w800) + pista («Elige al menos 2 planes» si n<2;
«Máximo 3 planes» si n≥3; 12.5 onSurfaceVariant) + `TextButton` «Limpiar». Fila: 3 casillas (separadas 8):
`_Miniatura` (foto 52 alto radio 12 o respaldo con emoji 20; ✕ 24×24 `IconButton.filled` fondo
`controlSobreFoto`, ícono 14, tooltip «Quitar {titulo} de la comparación»; título 11.5 w600 1 línea) o `_Hueco`
(52 alto, fondo `surfaceContainerHigh` 40 %, borde `outlineVariant`, radio 12, `add_rounded` 20 `outline`;
key `hueco-bandeja`; excluido de semántica); 12; `FilledButton` «Comparar ({n})» habilitado si n ≥ 2. `minimo = 2`.

#### `ComparatorLoader` (`/comparar`, `views/comparator_loader.dart`) + `ComparatorViewModel` + `ComparatorView`

- **VM:** `planesIniciales` (extra) solo se usan si sus ids == `ids` **en el mismo orden** (`listEquals`);
  `ids` vacío → `planes = []` directo. `cargar()`: no-op si ya hay planes; `Future.wait(ids.map(catalogo.planDetalle))`;
  si ya se desechó, abandona. Error: «No pudimos cargar los planes. Revisa tu conexión e intenta de nuevo.»
  `cargando = planes == null && error == null`.
- **Loader UI:** `AppBar('Comparar planes')`: spinner; error → `EmptyState(cloud_off_rounded, «No pudimos cargar
  la comparación», error, [«Reintentar», TextButton «Ir al catálogo» → go('/')])`.
- **`ComparatorView`**: estado local `pax = 2` (min 1, max 20). Con < 2 planes → `EmptyState(compare_arrows_rounded,
  «Nada para comparar», «Selecciona dos o tres planes en el catálogo con el ícono de comparar.»)`. Si no:
  `ListView` padding `20,8,20,32`: «Elige con toda la información» (24 w800 ls -.8), «Precio final por persona,
  sin cargos ocultos.» (13.5), 16, `SelectorViajeros` («¿Cuántos viajan?» + `IconButton.outlined` −/+ con
  tooltips «Menos viajeros»/«Más viajeros», número 17 w800 en caja de 40), 20, `TablaComparacion(planes,
  filas: buildComparisonRows(planes, pax))` (`buildComparisonRows` y `ComparisonRow{titulo, icono, valores}` son de core).
- **`TablaComparacion`**: columna de etiquetas 92 px, columnas ≥132 px; si no cabe → aviso
  `swipe_left_rounded` «Desliza la tabla para ver todos los planes» + scroll horizontal. Columna del plan más
  barato (`precioCop` mínimo; empates → todas) con fondo `primary` al 7 % y esquinas 16 arriba/abajo.
  Cabecera `CabeceraPlan` (foto aspect 1.5 radio 12 o emoji 26 sobre `primaryContainer`; título 3 líneas
  13.5 w700; píldora «Mejor precio» 10.5 w700 `onPrimaryContainer` sobre `primaryContainer`). Filas con borde
  superior `outlineVariant` 50 %; etiqueta 12 w600. `ValorComparado`: si `icono` es `'precio'` o `'total'`
  → intenta `double.tryParse` y formatea COP en una línea (`FittedBox.scaleDown`), destacado (más barato)
  16 w800 `primary`, si no 14.5 w600; otros valores: `'✓ Incluido'` → w700 primary, `'—'` → color `outline`,
  resto 13 w500. Fila final: `FilledButton.tonal` «Ver plan» (alto 40) por columna → `push('/plan/:id')`.

### 2.6 Checkout y pago (`lib/ui/features/checkout/`)

Core: `CatalogRepository.planDetalle(id)`, `Plan` (`dates`, `yaSalio(fecha)`, `precioCop`, `fotoPrincipal`,
`categoria.emoji`, `titulo`, `destino`, `puntoEncuentro`, `itinerario`), `PlanDate` (`id`, `fecha`,
`cupoDisponible`), `BookingRepository.{reservaPendiente(planDateId), crearReserva(planDateId, pax) → {bookingId}, cancelar(id), reserva(id)}`,
`Booking.venceAt`, `PaymentGateway.{iniciar(bookingId, redirectUrl) → {checkoutUrl}, verificar(transactionId?, bookingId?) → PagoVerificado}`,
`PagoVerificado {estado: EstadoPago, bookingId, bookingEstado: BookingStatus, mensajeUsuario}`,
`EstadoPago {aprobado, pendiente, …(rechazado/anulado/error)}`, `DiversoException(codigo, [msg])`
(`codigo`, `mensajeUsuario`, `aprobadoTarde`), `DiversoConfig.{pagoResultadoPath, pagoRetornoMovil}`,
`formatCOP`, `formatFechaLarga`.

**Flujo completo:** Ficha del plan → elegir fecha → «Reservar» → `/checkout/:planId/:fechaId` →
`CheckoutLoader` carga el plan → `CheckoutView` → «Pagar con Wompi» → (si no hay pendiente) `crearReserva`
(cupos retenidos 30 min) → `iniciarPago` → Wompi (web: misma ventana / móvil: WebView) → retorno a
`/pago/resultado?id=<tx>` → `PagoResultadoView` verifica en servidor (con reintentos) → si aprobado
`go('/reserva/:bookingId')` → `ReservaView` → `BookingSuccessView`.

#### `CheckoutLoader` (`views/checkout_loader.dart`) + `CheckoutPlanViewModel`

- **Estado:** `plan`, `cargando` (inicia true), `error` («Revisa tu conexión e intenta de nuevo.»),
  `fecha` = la `PlanDate` con `id == fechaId` y `!plan.yaSalio(d)` (getter calculado en cada lectura porque depende del reloj).
- **UI** (`Scaffold(AppBar('Confirmar y pagar'))`): cargando → spinner; error o plan null →
  `EmptyState(cloud_off_rounded, «No pudimos cargar el plan», «Revisa tu conexión e intenta de nuevo.», FilledButton.tonal «Reintentar»)`;
  fecha null → `EmptyState(event_busy_rounded, «Fecha no disponible», «Esa fecha ya no está disponible. Elige otra salida de este plan.»,
  FilledButton.tonal «Ver fechas del plan» → go('/plan/:id'))`; si no → `CheckoutView(plan, fecha)`.

#### `CheckoutView` (`views/checkout_view.dart`) + `CheckoutViewModel` (`view_models/checkout_view_model.dart`)

- **Constantes:** `maxPersonas = 20`.
- **Estado:** `procesando`, `_redirigido` (web: ya navega a Wompi), `error`, `pax` (inicia 1), `bookingId`
  (reserva de este checkout, creada o retomada), `pendiente` (reserva pendiente de pago previa para esta fecha).
- **Derivados:** `_personasFijas = bookingId != null || pendiente != null`; `puedeQuitarPersona = !fijas && pax > 1`;
  `puedeAgregarPersona(cupos) = !fijas && pax < cupos && pax < 20`; `puedePagar = !procesando && !redirigido && pendiente == null`;
  `total(plan) = plan.precioCop * pax`.
- **Comandos:**
  - `setPax(v)`: ignorado si fijas; clamp 1..20.
  - `cargarPendiente(fecha)` (al abrir): `reservaPendiente(fecha.id)`; error → `pendiente = null` (silencioso). Solo informativo.
  - `pagar(fecha, abrirPago)`: ignora si `procesando || redirigido`. Dentro de `_ejecutar`: si no hay `bookingId`:
    vuelve a consultar `reservaPendiente` (si existe → `pendiente = existente` y **no** crea otra); si no,
    `crearReserva(planDateId, pax)`; si lanza `DiversoException` con `codigo == 'RESERVA_PENDIENTE_EXISTENTE'`
    (carrera entre pestañas/dispositivos) → vuelve a consultar la pendiente y muestra el aviso (si no la
    encuentra, relanza). Luego `_abrir(abrirPago)`. Si ya hay `bookingId` (reintento), reutiliza la misma reserva.
  - `completarPendiente(abrirPago)`: usa `pendiente.id` y `pendiente.pax`, limpia `pendiente`, abre pago.
  - `cancelarPendiente()`: `cancelar(pendiente.id)` (sin pago no hay reembolso; libera cupos) y limpia `pendiente`.
  - `_abrir`: `redirigido` → bloquea pagar (evita doble intento en web); `cerrado` → error **«Cerraste el pago
    antes de terminar. Si ya pagaste, toca «Ya pagué, verificar»; si no, vuelve a intentarlo (tus cupos siguen retenidos unos minutos).»**
  - `_ejecutar`: `procesando = true`, limpia error, **`HapticFeedback.mediumImpact()`** (vibración), ejecuta;
    `DiversoException` → `error = mensajeUsuario`; otro → «No pudimos iniciar el pago. Intenta de nuevo.»
- **UI:** `Scaffold(AppBar('Confirmar y pagar'))` + `Stack[ListView(padding 20,8,20,200), BarraPagar abajo]`:
  1. Si `pendiente` → `ReservaPendienteAviso` (fondo `secondaryContainer`, radio 20, padding 16; `hourglass_top_rounded` 20;
     texto `textoReservaPendiente`: «Ya tienes una reserva pendiente de pago para esta fecha ({N persona(s)}, {$ total}). Vence a las HH:mm.»
     (hora local con ceros); botones `FilledButton.tonal` «Completar pago», `TextButton` «Ya pagué, verificar»,
     `TextButton` rojo «Cancelar y empezar de nuevo»; todos deshabilitados si `procesando`).
  2. `ResumenPlan`: tarjeta `surfaceContainerLow` r20 p16: miniatura 64×64 radio 14 (foto o emoji 24 en `primaryContainer`),
     título (2 líneas, 15 w700), «{formatFechaLarga(fecha)} · {destino}» (12.5), punto de encuentro (12, 1 línea).
  3. `SelectorPersonas`: `SectionLabel('Personas')`, caja `surfaceContainerLow` r20 padding h16/v8: «¿Cuántos viajan?» (w600),
     botones `IconButton.outlined` 38×38 (borde/ícono `primary` si habilitado, si no `outlineVariant`/`outline`;
     tooltips «Quitar una persona»/«Agregar una persona», ícono 18), número (19 w800, caja 52); debajo «{cupos} cupos disponibles para esta fecha» (12).
  4. `SectionLabel('Pago')` + `PagoWompiCard` (ver abajo).
  5. `ResumenPago`: `SectionLabel('Resumen')`, caja r20 p16: «Precio por persona» / `formatCOP`, «Personas» / N, `Divider`,
     «Total a pagar» (15 w700) / total (19 w800 ls -.4 `primary`), `lock_outline_rounded` 12 + «Precio final, sin cargos ocultos» (11.5 `outline`).
  6. Si `error` → `AvisoErrorPago` (fondo `errorContainer` r20 p14, `error_outline_rounded` + texto 13.5 `onErrorContainer`).
  7. Si `bookingId` → `OutlinedButton.icon(refresh_rounded 18, «Ya pagué, verificar»)` → `go('/pago/resultado?reserva=:id')`.
  - `BarraPagar`: fondo = color de la página, borde superior `outlineVariant` 50 %, padding `20,12,20,14+teclado`;
    total (21 w800 ls -.5) + «total por N persona(s)» (11); botón ancho 220 `FilledButton.icon` (`lock_rounded` 17 / spinner 17)
    «Pagar con Wompi» / «Procesando…»; `onPagar = puedePagar ? pagar : null`.
- **`PagoWompiCard`** (`widgets/pago_wompi_card.dart`): caja `primaryContainer` r20 p16 borde `primary` 1.5:
  `lock_rounded` 20 + «Pagar con Wompi» (15.5 w700); «Eliges el medio en la página segura de Wompi; nosotros nunca vemos los datos de tu tarjeta o cuenta. Medios aceptados:» (12.5, altura 1.35);
  chips (compactos, sin borde, ícono 16 primary, texto 12): Tarjeta `credit_card_rounded`, PSE `account_balance_rounded`,
  Nequi `smartphone_rounded`, Daviplata `phone_iphone_rounded`, Bancolombia `account_balance_wallet_rounded`.
  Debajo `ExpansionTile` (fondo `tertiaryContainer` 55 %, r20, sin divisores) `science_outlined` «Modo de prueba — no se cobra dinero real»
  / «Toca para ver los datos de prueba», con viñetas literales (`datosPruebaWompi`):
  - «Tarjeta: 4242 4242 4242 4242 → aprobada · 4111 1111 1111 1111 → rechazada (fecha futura y CVC de 3 dígitos cualquiera)»
  - «Nequi: 3991111111 → aprobado · 3992222222 → rechazado»
  - «PSE: banco 1 → aprobado · banco 2 → rechazado»
  - «Daviplata: código (OTP) 574829 → aprobado · 932015 → rechazado»
  - «Bancolombia: el estado final se elige en la pantalla de prueba de Wompi»
  Pie: `shield_outlined` 14 `tertiary` + «Retenemos tus cupos 30 minutos mientras pagas. Reembolso según la política de cancelación.» (12).

#### Apertura del pago (`pago_wompi.dart`, `pago_abierto.dart`)

- `enum PagoAbierto { completado, cerrado, redirigido }`.
- `urlRetornoPago()`: web → `'${Uri.base.origin}/pago/resultado'` (el origen debe estar en la lista de permitidos
  del backend, p. ej. `http://localhost:8080`); móvil → `DiversoConfig.pagoRetornoMovil` (= `https://diverso.app/pago/resultado`).
- `iniciarPago(context, pasarela, bookingId)`: `pasarela.iniciar(bookingId, redirectUrl: urlRetornoPago())` →
  - web: `abrirEnLaMismaVentana(checkoutUrl)` → `launchUrl(url, webOnlyWindowName: '_self')`; si devuelve false →
    `throw DiversoException('ERROR_NAVEGADOR', 'No se pudo abrir Wompi')`; devuelve `redirigido`.
  - móvil: `Navigator.push<String>(PagoWompiPage(checkoutUrl))` (ruta Material imperativa, **no** go_router);
    resultado null → `cerrado`; id → `context.go('/pago/resultado?id=<id>')` y `completado`.
  - Lanza `DiversoException` si el servidor rechaza el inicio.
- `esRedireccionDePago(url)`: mismo `scheme`, `host` y `path` que `pagoRetornoMovil` (ignora query).
  `idDeRedireccion(url)`: query `id` no vacío o null.
- `PagoWompiPage`: `WebViewController` con JS sin restricciones; `onProgress` → barra `LinearProgressIndicator`
  de 2 px bajo el AppBar mientras < 100; `onNavigationRequest`: si es la redirección de retorno → (una sola vez,
  flag `_terminado`) `pop(idDeRedireccion(url))` y **`prevent`** (esa URL nunca se carga); si el esquema es
  `http`/`https`/`about` → `navigate`; cualquier otro esquema (intent://, nequi://, etc.) → `prevent`.
  AppBar «Pago de prueba con Wompi», leading ✕ (`close_rounded`, tooltip «Cerrar») → `pop()` (null = cerrado).

#### `PagoResultadoView` (`/pago/resultado`, `views/pago_resultado_view.dart`) + `PagoResultadoViewModel`

- **Params:** `transactionId` (query `id`), `bookingId` (query `reserva`). `sinDatos` = ambos null → tras el
  primer frame `go('/reservas')`.
- **VM:** `maxIntentos = 5`, `pausa = 3 s` (inyectables). Estado: `cargando` (inicia true), `resultado`,
  `falla: DiversoException?`, `intentos`, `reintentandoPago`, `errorReintento`.
  - `verificar()`: reinicia; bucle mientras no desechado: `intentos++`, `pasarela.verificar(transactionId, bookingId)`;
    `DiversoException` → `falla` y corta; otro error → `falla = DiversoException('ERROR_INESPERADO')` y corta;
    corta si `estado != pendiente` o `intentos >= maxIntentos`; si no, espera `pausa`. **Nunca confía en la redirección del navegador.**
  - `intentarDeNuevo(bookingId, abrirPago)`: reabre el pago de la MISMA reserva; `cerrado` → «Cerraste el pago
    antes de terminar. Si ya pagaste, toca «Verificar de nuevo».»; `DiversoException` → `mensajeUsuario`; otro → «No pudimos iniciar el pago. Intenta de nuevo.»
- **Listener:** cuando `!cargando && resultado.estado == aprobado` → `go('/reserva/:bookingId')`.
- **UI** (`AppBar('Resultado del pago')`):
  - Cargando / sin datos / aprobado → spinner + «Confirmando tu pago de prueba con Wompi…» (o, si `intentos > 1`,
    «Esperando a que Wompi confirme tu pago de prueba… (intento N)»).
  - `falla`: `definitivo = falla.aprobadoTarde || codigo == 'MONTO_NO_COINCIDE'`. Ícono `history_toggle_off_rounded`
    (aprobado tarde) o `error_outline_rounded`; título «Tu reserva había vencido» / «No pudimos verificar el pago»;
    mensaje `falla.mensajeUsuario`; botones: si no definitivo `FilledButton` «Reintentar» (re-verifica) + «Ver mis
    reservas» (Filled si definitivo, si no TextButton).
  - Resultado no aprobado: `puedeReintentar = estado != pendiente && bookingEstado == pendientePago`.
    Pendiente → ícono `hourglass_top_rounded`, «Pago pendiente», «Todavía no recibimos la confirmación de Wompi.
    Te avisaremos en Mis reservas cuando llegue.», botón «Verificar de nuevo». Rechazado → `credit_card_off_rounded`,
    «El pago no se completó», mensaje = `r.mensajeUsuario` (si la reserva sigue pendiente) o
    «{mensajeUsuario} Tu reserva ya no está vigente; vuelve a reservar.»; botón «Intentar de nuevo» (si `puedeReintentar`,
    deshabilitado mientras reintenta). `detalle` = `errorReintento`. Siempre «Ver mis reservas» (Filled si no hay otra acción principal).
    Botones apilados con 8 de separación.

#### `ReservaView` (`/reserva/:bookingId`, `views/reserva_view.dart`) + `ReservaViewModel`

- `cargar()` → `BookingRepository.reserva(id)`; error → `mensajeDeError(e)`.
- **UI** (`Scaffold(AppBar())` vacío en estados): cargando → spinner; error → `EmptyState(cloud_off_rounded,
  «No pudimos cargar la reserva», error, FilledButton.tonal «Ver mis reservas»)`; según estado:
  confirmada/completada → `BookingSuccessView`; pendientePago → spinner + tras el frame `go('/pago/resultado?reserva=:id')`;
  cancelada → `EmptyState(event_busy_rounded, «Reserva cancelada», «La reserva {codigo} está cancelada.[ {etiquetaReembolso}.]», «Ver mis reservas»)`.

#### `BookingSuccessView` (`views/booking_success_view.dart`)

Columna centrada maxWidth 460, padding 24, `SafeArea`:
1. Círculo 84×84 `primaryContainer` con `check_rounded` 46 `primary`, animado con escala 0→1 en **380 ms `Curves.elasticOut`**.
2. `Aparecer(paso 0)`: «¡Listo, nos vemos ahí!» (26 w800 ls -.8) + «Tu reserva está confirmada y el cupo es tuyo.» (14).
3. `Aparecer(paso 1)`: `CodigoReserva` (caja `primaryContainer` r20 padding v18: «CÓDIGO DE RESERVA» 10.5 w700 ls 1.6
   al 75 %, código `SelectableText` **30 w900 ls 3** `onPrimaryContainer` — se puede copiar).
4. `Aparecer(paso 2)`: `DetalleViaje` (caja `surfaceContainerLow` r20 p18: título (15.5 w700) o «Tu plan»; filas
   (ícono 16 + texto 13.5, padding v4): `event_rounded` fecha larga, `group_rounded` «N persona(s)», `flag_rounded` punto de
   encuentro, `Divider(22)`, `payments_rounded` total, `receipt_rounded` `pago.textoReferencia`; pie `verified_user_rounded` 14
   `tertiary` «Compra protegida: reembolso según la política de cancelación.» (12)).
5. `Aparecer(paso 3)` (si hay itinerario): `ItinerarioConfirmado` (caja r20 p18, «ITINERARIO» 10.5 w700 ls 1.6; primeros
   **5** pasos: hora (ancho 52, 12.5 w800 primary) + actividad (13, altura 1.4); si hay más: «+ N pasos más en la app» (12)).
6. `FilledButton` «Ver mis reservas» → `go('/reservas')`; `TextButton` «Seguir explorando» → `go('/')`.

`Aparecer(paso, child)` (`widgets/aparecer.dart`): una sola animación de **640 ms**; cada paso arranca en
`inicio = clamp(paso × 0.14, 0, 0.72)` y dura `Interval(inicio, clamp(inicio+0.42, 0, 1), curve: easeOutCubic)`;
opacidad 0→1 y traslación Y de 14 px → 0.

### 2.7 Legal (`lib/ui/features/legal/`)

Core: `AuthRepository.{currentUserId, onAuthStateChanged (Stream<String?>), consentimientosPendientes() → List<String>, registrarConsentimiento(tipo), signOut()}`,
`DocumentoLegal.porId(docId)` (`titulo`, `resumen`, `secciones[{titulo, parrafos}]`), `kVersionLegal`.

#### `ConsentViewModel` (`view_models/consent_view_model.dart`) — **global** (provider raíz) y estado de enrutamiento

- `enum EstadoConsentimiento { verificando, pendiente, aceptado, error }` (definido aquí, lo usa el router).
- `tiempoLimite = 15 s`: una consulta que no responde cuenta como `error`.
- **Constructor:** lee `currentUserId`, se suscribe a `onAuthStateChanged`; si hay usuario, `_revisar()`.
- `_alCambiarSesion(usuario)`: si es el mismo usuario (refresco de token) no hace nada; si cambia →
  `revision++`, `pendientes = []`, `estado = verificando`, notifica y, si hay usuario, `_revisar()`.
- `_revisar()`: `revision = ++_revision` (una respuesta vieja no pisa una nueva); pasa a `verificando`;
  `consentimientosPendientes().timeout(15 s)` → `pendientes` y `aceptado` si vacío / `pendiente` si no;
  error/timeout → `error`. Ignora la respuesta si se desechó o cambió la revisión.
- `reintentar()`: solo si `estado == error` y hay usuario (lo llaman el botón «Reintentar» y `DiversoApp` al volver a primer plano).
- `aceptar()`: solo si `pendiente`; `registrarConsentimiento(tipo)` por cada pendiente (p. ej. `tratamiento_datos`,
  `terminos_viajero`); error → `false` (estado no cambia); éxito → `_revisar()` y `true`. El router saca al usuario.
- `cerrarSesion()` → `signOut()`.

#### `ConsentView` (`/consentimiento`, `views/consent_view.dart`)

- `PopScope(canPop: false)` (no se puede cerrar sin aceptar; la alternativa es cerrar sesión). Estado local:
  `_datos`, `_terminos`, `_intentado`, `_guardando`, `_error`. Escucha el VM con `context.watch`.
- **UI** (centrado, maxWidth 460, padding 24, `ListView(shrinkWrap)`): ícono `privacy_tip_rounded` 28 en caja
  `primaryContainer` radio 18 padding 14; 18; «Antes de continuar» (24 w800 ls -.6); 8; «Actualizamos nuestros
  documentos legales. Necesitamos tu autorización expresa para seguir gestionando tu cuenta y tus reservas.» (14, altura 1.5); 20;
  - estado `error` → caja `errorContainer` radio 14 padding 14: «No pudimos verificar tu autorización. Revisa tu
    conexión e intenta de nuevo.» + `FilledButton` «Reintentar» (`reintentar`);
  - `verificando` y no guardando → spinner;
  - si no → `ConsentCheckboxes` + error local («No pudimos guardar tu autorización. Intenta de nuevo.») + 24 +
    `FilledButton` «Aceptar y continuar» (spinner 19×19 mientras guarda). Sin las dos casillas: solo marca `_intentado` (resalta).
  - Siempre `TextButton` «Cerrar sesión» (deshabilitado mientras guarda).

#### `LegalView` (`/legal/:doc`, `views/legal_view.dart`) — sin VM

- `AppBar('Documentos legales')` (botón atrás automático solo si hay historial).
- Doc inexistente → «Documento no encontrado.» centrado.
- `SelectionArea` (texto seleccionable) + `ListView` padding `22,8,22,48`: «VERSIÓN {kVersionLegal en mayúsculas}»
  (11 w700 ls 1.2 `outline`); 8; título (25, altura 1.2, w800, ls -.6); 8; resumen (15, altura 1.5, onSurfaceVariant); 18;
  aviso en caja `tertiaryContainer` 55 % radio 14 p14: «Borrador para el piloto académico: debe revisarlo un abogado y
  completarse con los datos del responsable antes del lanzamiento comercial.» (12.5, altura 1.5); por sección: 26 +
  título (16 w700, `Semantics(header: true)`) + párrafos (10 de separación, 14.5, altura 1.65).
- docIds usados en la app: `privacidad`, `terminos-viajeros`.

#### `ConsentCheckboxes` (`widgets/consent_checkboxes.dart`) — compartido por registro y consentimiento

- Props: `aceptaDatos`, `aceptaTerminos`, `onDatos`, `onTerminos`, `mostrarError` (false).
- Nunca vienen marcadas. Fila 1: «Autorizo de manera previa, expresa e informada el tratamiento de mis datos personales según la
  **política de tratamiento de datos** (Ley 1581 de 2012).» (enlace → `push('/legal/privacidad')`). Fila 2: «Acepto los
  **términos y condiciones**.» (→ `push('/legal/terminos-viajeros')`). Enlaces: `primary`, w700, subrayado `primary` 50 %.
- Cada fila: `MergeSemantics(Row[Checkbox(isError: mostrarError && !valor), texto tocable que alterna (padding top 12, 13, altura 1.45, onSurfaceVariant)])`.
- Si `mostrarError` y falta alguna: «Debes aceptar ambos documentos para crear tu cuenta.» (12.5, `error`, padding left 12 top 4).

### 2.8 Plan (`lib/ui/features/plan/`)

#### `PlanDetailView` (`/plan/:id`, `views/plan_detail_view.dart`) + `PlanDetailViewModel`

Core: `CatalogRepository.planDetalle(id)`, `ReviewRepository.porPlan(planId, limit)`, `Plan` (`fotos`, `fechasDisponibles`,
`incluye`, `incluyeTransporte/Comida/Hospedaje`, `descripcion`, `duracionTexto`, `reviewsCount`, `agency`), `Review`
(`viajeroNombre`, `calificacion`, `comentario`), `Agency` (`id`, `nombre`, `ciudad`, `logoUrl`, `numeroRnt`,
`rntVigenteHasta`, `verificada`), `AgenciaResumen`, `formatFechaCorta`, `formatFechaTexto`, `formatCOP`.

- **VM:** `maxResenas = 4`. Estado: `plan`, `resenas`, `cargando` (inicia true), `error` («Revisa tu conexión e intenta de nuevo.»),
  `fechas` (= `plan.fechasDisponibles`, recalculado en cada lectura porque depende del reloj), `fechaSeleccionada`
  (la elegida si sigue disponible; si no, la primera/más cercana; null si no hay fechas).
  - `cargar()`: limpia `fechaId`; `planDetalle(id)` y luego `porPlan(id, limit: 4)` (secuencial; si las reseñas fallan, falla todo).
  - `seleccionarFecha(f)`: ignora fechas que no estén en `fechas`.
- **UI:** cargando → `DetalleSkeleton` (aspect 1.4 sin radio + padding 22: `260×24`, 14, `∞×14`, 10, `180×14`, 26, `90 r20`);
  error → `EmptyState(cloud_off_rounded, «No pudimos cargar el plan», error, FilledButton.tonal «Reintentar»)` (**sin AppBar ni botón volver**);
  cargado → `Column[Expanded(scroll), BarraReserva]` (la barra va debajo del scroll, no superpuesta).
- **Contenido** (`CustomScrollView`):
  - `CabeceraColapsable(titulo, alturaExpandida 300, onVolver: context.pop())` con fondo: sin fotos → `primaryContainer`;
    con fotos → `PageView` deslizable de `Image.network` (cover, filterQuality low, error → `primaryContainer`) con
    animación de entrada **escala 1.06 → 1 en 900 ms `easeOutCubic`**. No hay indicador de página.
  - Padding `22,20,22,24`: título (26 w800 altura 1.15 ls -.8); 8; `Row[PuntajePlan(detallado), Spacer, píldora duración
    (`secondaryContainer`, `schedule_rounded` 14, 12 w700)]`; 18; `TarjetaAgencia` si hay agencia; 24;
  - «LA EXPERIENCIA» + descripción (14.5, altura 1.55, onSurface 85 %) si no vacía;
  - «QUÉ INCLUYE · PRECIO FINAL» + `Wrap(8,8)` de `IncluyePill`: Transporte `directions_bus_rounded`, Comida `restaurant_rounded`,
    Hospedaje `hotel_rounded` (según flags) + cada ítem libre con `check_circle_rounded` (`textoLargo`, elipsis);
  - «ITINERARIO» + `PasoItinerario`s; «PUNTO DE ENCUENTRO» + `flag_rounded` 17 primary + texto 14.5;
  - `TarjetaCancelacion` si hay política;
  - Reseñas: si hay → «RESEÑAS VERIFICADAS (reviewsCount)» + hasta 4 `ResenaItem`; si no hay pero `reviewsCount > 0` →
    mismo título + «Carga al volver a abrir…» (13). **No hay «ver todas»/paginación de reseñas en el viajero.**
- **`BarraReserva`** (`widgets/barra_reserva.dart`): fondo color de página + borde superior `outlineVariant` 50 %.
  - Sin fechas: `event_busy_rounded` + «Sin fechas disponibles por ahora» (w600) + `TextButton` «Ver otros planes» → `context.pop()`.
  - Con fechas (SafeArea minimum `20,10,20,12`): lista horizontal (alto 62, separación 8) de chips de fecha
    (`AnimatedContainer` 160 ms easeOut, padding h14, radio 14; seleccionado `primary`/`onPrimary`, si no `surfaceContainerHigh`):
    `formatFechaCorta` (13 w700) + cupos (11 w600): si `cupoDisponible <= 4` → «¡Últimos N!» en `pocosCupos` (naranja), si no «N cupos»
    (seleccionado: `onPrimary` 80 %). Debajo: precio (22 w800 ls -.5) + «por persona · precio final» (10.5) + `Spacer` +
    `FilledButton.icon(lock_outline_rounded 17, «Reservar»)` (mín. 150×52) → `push('/checkout/:planId/:fechaId')`.
- **`TarjetaAgencia`**: `Material(surfaceContainerLow, r20)` + `InkWell` → `push('/agencia/:id')`; padding 14:
  `AgencyAvatar(44)` (construye un `AgenciaResumen` con id/nombre/ciudad/logoUrl), nombre (15 w700), «Agencia local · RNT {numeroRnt}» (12.5),
  «RNT vigente hasta el {formatFechaTexto(rntVigenteHasta)}» (12) si existe, `VerifiedBadge()` en `FittedBox.scaleDown` **debajo** del texto si
  `verificada`; `chevron_right_rounded` al final.
- **`ResenaItem`**: caja `surfaceContainerLow` r20 p14 margen inferior 10: `CircleAvatar(radius 15)` con la inicial (o «V»; usa
  `characters.first` para no partir emojis), nombre (13.5 w700; «Viajero» si vacío/en blanco), `EstrellasCalificacion(size 14)`,
  `verified_rounded` 14 `tertiary` con tooltip «Reseña verificada: solo quien compró puede opinar»; comentario (13.5, altura 1.45) si no vacío.

### 2.9 Profile (`lib/ui/features/profile/`)

#### `ProfileView` (pestaña «Perfil», `/perfil`) + `ProfileViewModel`

Core: `AuthRepository.{currentProfile() → Profile{nombre}, currentUserEmail, signOut()}`, `kVersionLegal`.

- **VM:** `nombrePorDefecto = 'Viajero'`. Estado: `perfil`, `cargando`, `error` («No pudimos cargar tu perfil.»), `email`
  (de la sesión, se ve aunque el perfil falle), `nombre`, `inicial` (primer rune en mayúscula, «V» si vacío).
  `cerrarSesion()` → `signOut()`; `false` si falla (el router lleva al login al cambiar la sesión).
- **UI:** `AppBar(TituloPagina('Perfil'))`, `ListView` padding `20,12,20,24`:
  1. Identidad: `CircleAvatar(radius 38, primaryContainer)` con inicial (26 w800); 12; nombre (21 w800 ls -.5); email (13);
     si error → texto rojo + `TextButton` «Reintentar».
  2. 28 · «APARIENCIA» + `SelectorApariencia`.
  3. 24 · «CONFIANZA» + `TarjetaInfo(verified_user_rounded, «Compra protegida», «Solo mostramos agencias con RNT vigente y matrícula
     mercantil verificadas por el equipo Diverso. Si una agencia cambia sus datos o se le vence el RNT, sus planes se ocultan hasta revalidarla.»)`
     + 12 + `TarjetaInfo(privacy_tip_rounded, «Tus datos», «Tratamos tus datos conforme a la Ley 1581 de 2012 (Habeas Data), únicamente
     para gestionar tu cuenta y tus reservas. Puedes consultar, actualizar o pedir la supresión de tus datos en cualquier momento.»)`.
  4. 24 · «DOCUMENTOS LEGALES» + `Material(surfaceContainerLow, r20)` con 2 `ListTile`: `shield_outlined` «Política de tratamiento de datos»
     / «Versión {kVersionLegal}» → `push('/legal/privacidad')`; divisor (indent 56); `description_outlined` «Términos y condiciones» → `push('/legal/terminos-viajeros')`.
  5. 28 · `OutlinedButton.icon(logout_rounded 18, «Cerrar sesión»)` fg `error`. Si falla: SnackBar «No pudimos cerrar la sesión. Intenta de nuevo.»
- **No** usa keep-alive (a diferencia de Explorar/Agencias/Reservas); recarga al reconstruirse.
- **`SelectorApariencia`**: caja `surfaceContainerLow` r20 padding 6 con `SegmentedButton<int>`: 0 «Sistema» `brightness_auto_rounded`,
  1 «Claro» `light_mode_rounded`, 2 «Oscuro» `dark_mode_rounded` (íconos 18) ↔ `ThemeModeViewModel.setMode(system/light/dark)`.
- **`TarjetaInfo`**: caja `surfaceContainerLow` r20 p16; círculo `primaryContainer` padding 9 con ícono 17 `onPrimaryContainer`; 13; título (14 w700), 4, cuerpo (13, altura 1.5).

### 2.10 Resumen de pantallas y ViewModels

| # | Pantalla (ruta) | ViewModel | Repos de core |
|---|---|---|---|
| 1 | LoginView (`/login`) | LoginViewModel | AuthRepository |
| 2 | ConsentView (`/consentimiento`) | ConsentViewModel (global) | AuthRepository |
| 3 | LegalView (`/legal/:doc`) | — | DocumentoLegal, kVersionLegal |
| 4 | CatalogView (`/`) | CatalogViewModel | CatalogRepository |
| 5 | ComparatorLoader/ComparatorView (`/comparar`) | ComparatorViewModel | CatalogRepository |
| 6 | AgenciasView (`/agencias`) | AgenciasViewModel | CatalogRepository |
| 7 | AgenciaView (`/agencia/:id`) | AgenciaViewModel | CatalogRepository |
| 8 | PlanDetailView (`/plan/:id`) | PlanDetailViewModel | CatalogRepository, ReviewRepository |
| 9 | CheckoutLoader/CheckoutView (`/checkout/:planId/:fechaId`) | CheckoutPlanViewModel + CheckoutViewModel | CatalogRepository, BookingRepository, PaymentGateway |
| 10 | PagoWompiPage (modal imperativo, solo móvil) | — (estado local) | — (WebView) |
| 11 | PagoResultadoView (`/pago/resultado`) | PagoResultadoViewModel | PaymentGateway |
| 12 | ReservaView → BookingSuccessView (`/reserva/:bookingId`) | ReservaViewModel | BookingRepository |
| 13 | BookingsView (`/reservas`) | BookingsViewModel (extiende ReservaAccionesViewModel) | BookingRepository, PaymentGateway |
| 14 | ReservaDetalleView (`/reservas/:bookingId`) | ReservaDetalleViewModel (extiende ReservaAccionesViewModel) | BookingRepository, PaymentGateway |
| 15 | ReviewLoader/ReviewView (`/resena/:bookingId`) | ReviewViewModel | BookingRepository, ReviewRepository |
| 16 | ProfileView (`/perfil`) | ProfileViewModel (+ ThemeModeViewModel global) | AuthRepository |
| 17 | PaginaNoEncontradaView (404) | — | — |
| — | AppShell (contenedor de pestañas) | — | — |

Diálogos/hojas: `CancelacionDialog`, `FiltrosSheet` (bottom sheet), `showDatePicker`.
ViewModels: 17 clases (`LoginViewModel`, `ConsentViewModel`, `ThemeModeViewModel`, `CatalogViewModel`, `ComparatorViewModel`,
`AgenciasViewModel`, `AgenciaViewModel`, `PlanDetailViewModel`, `CheckoutPlanViewModel`, `CheckoutViewModel`, `PagoResultadoViewModel`,
`ReservaViewModel`, `ReservaAccionesViewModel` (abstracta), `BookingsViewModel`, `ReservaDetalleViewModel`, `ReviewViewModel`, `ProfileViewModel`).

---

## 3. Sistema de diseño EXACTO (`lib/ui/core/theme/`)

Principios (comentario de `app_theme.dart`): «minimalista y tipográfico — superficies tonales sin bordes,
esquinas generosas, una sola tinta de acento, jerarquía por tamaño/peso y mucho aire. Nada de sombras duras
ni decoración gratuita.»

### 3.1 Marca y construcción del tema (`app_theme.dart`)

| Token | Valor |
|---|---|
| `seedViajero` | `#0E6E4F` («verde selva») — semilla de la app viajero |
| `seedPanel` | `#2D4A73` («azul pizarra») — semilla del panel (no se usa en viajero) |
| `bpCompact` | `640` px (único breakpoint: >640 → grid/columnas) |
| Construcción | `ThemeData(useMaterial3: true, colorScheme: ColorScheme.fromSeed(seedColor: seed, brightness))` (variante por defecto **tonalSpot**, contraste 0) |
| `scaffoldBackgroundColor` (fondo de página) | claro `#FAFAF8` · oscuro `#101312` (NO es `surface`) |
| `splashFactory` | `InkSparkle.splashFactory` (ripple «sparkle» de M3) |
| `visualDensity` | `standard` |

### 3.2 ColorScheme resuelto (valores literales)

Calculados ejecutando `ColorScheme.fromSeed(seedColor: Color(0xFF0E6E4F), brightness: …)` con el Flutter
instalado (material_color_utilities 0.13.0). Son los que realmente pinta la app:

| Rol | Claro | Oscuro |
|---|---|---|
| `primary` | `#1F6A4F` | `#8CD5B3` |
| `onPrimary` | `#FFFFFF` | `#003826` |
| `primaryContainer` | `#A8F2CE` | `#005139` |
| `onPrimaryContainer` | `#005139` | `#A8F2CE` |
| `secondary` | `#4D6358` | `#B3CCBE` |
| `onSecondary` | `#FFFFFF` | `#1F352B` |
| `secondaryContainer` | `#CFE9D9` | `#354B40` |
| `onSecondaryContainer` | `#354B40` | `#CFE9D9` |
| `tertiary` | `#3E6374` | `#A5CCDF` |
| `onTertiary` | `#FFFFFF` | `#083544` |
| `tertiaryContainer` | `#C1E8FC` | `#254B5B` |
| `onTertiaryContainer` | `#254B5B` | `#C1E8FC` |
| `error` | `#BA1A1A` | `#FFB4AB` |
| `onError` | `#FFFFFF` | `#690005` |
| `errorContainer` | `#FFDAD6` | `#93000A` |
| `onErrorContainer` | `#93000A` | `#FFDAD6` |
| `surface` | `#F5FBF5` | `#0F1512` |
| `onSurface` | `#171D1A` | `#DEE4DE` |
| `onSurfaceVariant` | `#404943` | `#BFC9C2` |
| `surfaceContainerLowest` | `#FFFFFF` | `#0A0F0C` |
| `surfaceContainerLow` | `#EFF5EF` | `#171D1A` |
| `surfaceContainer` | `#EAEFEA` | `#1B211E` |
| `surfaceContainerHigh` | `#E4EAE4` | `#252B28` |
| `surfaceContainerHighest` | `#DEE4DE` | `#303632` |
| `surfaceDim` | `#D6DBD6` | `#0F1512` |
| `surfaceBright` | `#F5FBF5` | `#353B37` |
| `outline` | `#707973` | `#8A938C` |
| `outlineVariant` | `#BFC9C2` | `#404943` |
| `inverseSurface` | `#2C322E` | `#DEE4DE` |
| `onInverseSurface` | `#EDF2EC` | `#2C322E` |
| `inversePrimary` | `#8CD5B3` | `#1F6A4F` |
| `shadow` / `scrim` | `#000000` | `#000000` |
| `surfaceTint` | `#1F6A4F` | `#8CD5B3` |

Colores más usados: tarjetas `surfaceContainerLow`; skeleton/chips `surfaceContainerHigh`; barra inferior
`surfaceContainerLowest`; acento `primary`; textos secundarios `onSurfaceVariant`.

### 3.3 Colores extra `DiversoColors` (`diverso_colors.dart`, `ThemeExtension`)

Iguales en claro y oscuro (`oscuro = claro`). Se leen con `DiversoColors.of(context)`.

| Token | Valor | Uso |
|---|---|---|
| `dorado` | `#E8A33D` | Estrellas |
| `estadoConfirmada` | `#1B7A4B` | Píldora «Confirmada» (texto blanco) |
| `estadoPendiente` | `#B25E09` | «Pendiente» |
| `estadoCancelada` | `#B3261E` | «Cancelada» |
| `estadoCerrada` | `#4A5C6E` | «Realizada» / «Completada» |
| `pocosCupos` | `#EF6C00` | «¡Últimos N!» |
| `selloSobreFoto` | `rgba(0,0,0,0.66)` | Fondo de `VerifiedBadge(blanco)` |
| `controlSobreFoto` | `rgba(0,0,0,0.62)` | Chip de código sobre foto, ✕ de la bandeja |
| `sombraInsignia` | `rgba(0,0,0,0.25)` | Sombra de insignias sobre foto |

`paletaAgencias` (círculo de iniciales; todos con contraste con blanco): `#0E6E4F` verde selva, `#2D4A73` azul
pizarra, `#7A4A21` tierra, `#6B3A5B` ciruela, `#1F6F7A` lago, `#8A4B14` cobre, `#4A6A2A` musgo, `#4F4A8A` añil.
`colorDeAgencia(clave)` (`widgets/agency_avatar.dart`): hash **FNV-1a 32 bits** sobre los *code units* UTF-16 del
id (`h = 0x811c9dc5; por cada unidad: h = ((h ^ u) * 0x01000193) & 0xFFFFFFFF`) → `paleta[h % 8]`. Replicar
exacto (con `Math.imul`/BigInt en JS) para que cada agencia conserve su color.

Otros colores literales en widgets: degradados negros sobre fotos (22 %/45 % en `PlanCard`, 38 % en
`EncabezadoReserva`), botón volver sobre foto negro 45 %, botón comparar no seleccionado negro 28 %, píldora de
duración blanco 22 %, fondo `BotonFiltros` negro 5 %, sombra de la bandeja negro 35 %, input fill negro 4 %
(claro) / blanco 5 % (oscuro).

### 3.4 Tipografía

- **Fuentes:** no hay fuentes propias ni archivos de fuente. Se usa la tipografía por defecto de Material:
  **Roboto** (Android y web — en web Flutter la descarga de Google Fonts), y en iOS la del sistema (SF, vía
  `Typography` de la plataforma). Íconos: fuente **MaterialIcons** (variantes `*_rounded` y `*_outlined`).
  Monospace solo en `EmptyState.detalle` (`fontFamily: 'monospace'`).
- **`textTheme`** = `ThemeData.light().textTheme` / `ThemeData.dark().textTheme` (M3 2021). Valores resueltos con
  el tema real (`Theme.of(context).textTheme`):

| Estilo | Tamaño | Peso | Altura (×) | Letter-spacing |
|---|---|---|---|---|
| displayLarge | 57 | 400 | 1.12 | -0.25 |
| displayMedium | 45 | 400 | 1.16 | 0 |
| displaySmall | 36 | 400 | 1.22 | 0 |
| headlineLarge | 32 | 400 | 1.25 | 0 |
| headlineMedium | 28 | 400 | 1.29 | 0 |
| headlineSmall | 24 | 400 | 1.33 | 0 |
| titleLarge | 22 | 400 | 1.27 | 0 |
| titleMedium | 16 | 500 | 1.50 | 0.15 |
| titleSmall | 14 | 500 | 1.43 | 0.1 |
| bodyLarge | 16 | 400 | 1.50 | 0.5 |
| **bodyMedium** (= `DefaultTextStyle` de todo `Text`) | **14** | **400** | **1.43** | **0.25** |
| bodySmall | 12 | 400 | 1.33 | 0.4 |
| labelLarge (botones) | 14 | 500 | 1.43 | 0.1 |
| labelMedium | 12 | 500 | 1.33 | 0.5 |
| labelSmall | 11 | 500 | 1.45 | 0.5 |

  **Color del texto por defecto:** `#1D1B20` (claro) y `#E6E0E9` (oscuro) — son los neutros del esquema M3 *baseline*
  (morado), NO el `onSurface` verde del esquema de la app, porque el `textTheme` se copia de `ThemeData.light()/dark()`
  con sus colores. Todo `Text` sin color explícito usa esos valores.
  **Importante:** en Flutter `height` y `letterSpacing` se heredan; un `Text(style: TextStyle(fontSize: 13, fontWeight: w700))`
  sale con altura 1.43 × 13 y letter-spacing 0.25 salvo que el estilo los fije. En RN hay que aplicar por defecto
  `lineHeight = fontSize × 1.43` y `letterSpacing: 0.25` (o el valor que fije cada estilo).
- **Escala de tamaños `AppText`** (`app_text.dart`; solo `fontSize`, el resto lo decide cada sitio):

| Token | px | Token | px |
|---|---|---|---|
| `micro` | 10.5 | `subtitulo` | 16 |
| `nota` | 11 | `subtituloGrande` | 17 |
| `etiqueta` | 11.5 | `encabezadoXs` | 19 |
| `leyenda` | 12 | `encabezadoS` | 20 |
| `leyendaGrande` | 12.5 | `encabezadoM` | 21 |
| `detalle` | 13 | `encabezadoL` | 22 |
| `cuerpoChico` | 13.5 | `encabezadoXl` | 24 |
| `cuerpo` | 14 | `encabezado2xl` | 25 |
| `cuerpoGrande` | 14.5 | `encabezado3xl` | 26 |
| `enfasis` | 15 | `tituloPagina` | 28 |
| `enfasisGrande` | 15.5 | `cifra` | 30 |
| | | `emojiFoto` | 40 |
| | | `marca` | 42 |

- Estilos recurrentes: título de pestaña `TituloPagina` = 28, w800, ls -1, altura 1.1, `onSurface`, 1 línea con elipsis;
  `SectionLabel` = MAYÚSCULAS 11.5 w700 ls 1.2 `onSurfaceVariant`, padding inferior 10, con `accion` opcional a la derecha;
  título de AppBar del tema = 15 w700 ls -.2 `onSurface`; precios = w800 con ls negativo (-.3 a -.5).

### 3.5 Espaciados (`app_insets.dart`)

| Token | Valor (LTRB) | Uso |
|---|---|---|
| `lista` | 20, 4, 20, 24 | Lista de una pestaña |
| `listaConAire` | 20, 8, 20, 24 | Catálogo bajo el buscador |
| `entreTarjetas` | bottom 14 | Separación entre tarjetas |
| `tarjeta` | 14 todos | Avisos y tarjetas pequeñas |
| `tarjetaAmplia` | 16 todos | Tarjetas de contenido |
| `tarjetaGrande` | 18 todos | Detalle del viaje, itinerario |
| `contenido` | 20 todos | Contenido de pantalla de detalle |
| `pantalla` | 24 todos | Pantallas de formulario/mensaje |

Otros recurrentes: padding horizontal de fichas 22; grids `maxCrossAxisExtent 430`, spacing 14.

### 3.6 Radios (`app_radii.dart`, clase `AppRadios`)

`field 14` (campos, listas, avisos pequeños) · `control 12` (controles pequeños, miniaturas) · `card 20` · `sheet 28`
(diálogos) · `pill 999`. Sueltos: chip de código 8, contenedor del logo 20, ícono de consentimiento 18, tabla 16.

### 3.7 Componentes del tema (valores literales)

| Componente | Configuración |
|---|---|
| AppBar | `centerTitle: false`, `elevation 0`, `scrolledUnderElevation 0.5`, `titleSpacing 20`, fondo = fondo de página (sólido), `surfaceTintColor` transparente, fg `onSurface`, título 15 w700 ls -.2 |
| FilledButton | alto mínimo **52**, forma píldora, texto 15 w700 ls -.2 (colores M3: fondo `primary`, texto `onPrimary`; tonal: `secondaryContainer`/`onSecondaryContainer`) |
| OutlinedButton | alto mínimo **48**, píldora, borde `outlineVariant`, texto 14.5 w600 |
| TextButton | píldora, texto 14 w600 |
| Input | `filled`, fill negro 4 % (claro) / blanco 5 % (oscuro); borde radio 14 sin línea; foco: borde `primary` 1.6; error: `error` 1.2; foco+error: `error` 1.6; padding h16 v14 |
| Card | elevación 0, margen 0, radio 20 (color por instancia: `surfaceContainerLow`) |
| Chip | `StadiumBorder`, sin borde, label 13 w600 **color `onSurface`** (fix «bug U»: sin color el texto salía blanco), ícono borrar `onSurfaceVariant` |
| NavigationBar | elevación 0, **alto 72**, fondo `surfaceContainerLowest` (claro `#FFFFFF`, oscuro `#0A0F0C`), sin tint, indicador `primaryContainer`; íconos **28** (`primary` seleccionado / `onSurfaceVariant`); label 12, w700 seleccionado / w600, mismos colores. Encima un `Divider` de 1 px |
| NavigationRail | (definido, no usado) fondo transparente, indicador `primaryContainer`, label 13.5 w700/w500 |
| SegmentedButton | píldora, texto 13.5 w600 |
| SnackBar | `floating`, radio 14 |
| Dialog | radio 28 |
| ListTile | radio 14 |
| Divider | color `outlineVariant` al 50 %, `space 1` |

### 3.8 Sombras / elevaciones

Casi todo plano (elevación 0). Excepciones: `scrolledUnderElevation 0.5` del AppBar; `BandejaComparar` elevación 8
con sombra negra 35 % + borde `outlineVariant` 60 %; insignias sobre foto (`EstadoReservaPill`, `_InsigniaFecha`) con
`BoxShadow(color: rgba(0,0,0,.25), blurRadius: 6, offset: (0,2))`.

### 3.9 Animaciones (duraciones y curvas)

| Dónde | Duración | Curva / detalle |
|---|---|---|
| `Skeleton` (pulso) | 1100 ms, repeat reverse | opacidad .45 → 1.0, `easeInOut` |
| `ChipCategoria` | 180 ms | `easeOut` (color/borde) |
| Chips de fecha (`BarraReserva`) | 160 ms | `easeOut` |
| Bandeja de comparar (entra/sale) | 220 ms | in `easeOutCubic`, out `easeInCubic`; Size (desde arriba) + Fade |
| Etiqueta de estrellas (reseña) | 150 ms | `AnimatedSwitcher` (fade) |
| Galería de la ficha | 900 ms | escala 1.06 → 1, `easeOutCubic` |
| Check de confirmación | 380 ms | escala 0 → 1, `elasticOut` |
| `Aparecer` (confirmación) | 640 ms | escalonado 0.14 por paso, ventana 0.42, `easeOutCubic`, opacidad + translateY 14→0 |
| `CabeceraColapsable` | ligado al scroll | la capa sólida aparece con opacidad `clamp((colapso - .6)/.4, 0, 1)` |
| Transiciones de página | (core) | `DiversoPageTransitions.fadeThrough / sharedAxisX / zoomIn` |
| Ripple | — | `InkSparkle` |
| Háptica | — | `HapticFeedback.mediumImpact()` al pagar/completar/cancelar en checkout |

### 3.10 Cambio de tema (`theme_mode_view_model.dart`, `profile/widgets/selector_apariencia.dart`)

- `ThemeModeViewModel` (provider raíz): `mode` inicia en `ThemeMode.system`; `setMode(mode)` notifica.
- **No hay persistencia**: al reiniciar la app vuelve a «Sistema» (no hay shared_preferences ni nada similar).
- `MaterialApp.router(theme: viajeroLight, darkTheme: viajeroDark, themeMode: mode)`; cambiar el tema NO recrea el
  router (probado en `test/app_test.dart`).
- UI: Perfil → «Apariencia» → `SegmentedButton` Sistema / Claro / Oscuro.

---

## 4. Widgets compartidos (`lib/ui/core/widgets/`)

| Widget (archivo) | Props | Variantes / comportamiento |
|---|---|---|
| `EmptyState` (`feedback/empty_state.dart`) | `icono`, `titulo`, `mensaje`, `detalle?`, `accion?` | Centrado, padding 36. Círculo `surfaceContainerHigh` padding 18 con ícono 30 `onSurfaceVariant`; 16; título 17 w700 ls -.3; 5; mensaje (maxWidth 300, centrado, 13.5, altura 1.45, `onSurfaceVariant`); `detalle` (maxWidth 340, 11 **monospace**, altura 1.35, `onSurfaceVariant` 75 %) — causa técnica para soporte; `accion` con 18 de aire. Usado para error, vacío y 404. |
| `Skeleton` (`feedback/skeleton.dart`) | `width?`, `height = 16`, `radius = 10` | Caja `surfaceContainerHigh` con pulso de opacidad (ver §3.9). |
| `CabeceraColapsable` (`page/cabecera_colapsable.dart`) | `titulo`, `fondo` (widget), `onVolver`, `alturaExpandida = 260` | `SliverAppBar(pinned)` con fondo de página. Botón volver `IconButton.filled` (negro 45 %, blanco, `arrow_back_rounded` 20, tooltip «Volver», padding 8) sobre la foto. Al colapsar >60 % aparece una capa sólida del color de página con el `titulo` (19 w800 ls -.4, izquierda 64, derecha 20, 1 línea) y un divisor `outlineVariant` abajo. Usado en ficha (300), agencia (220) y detalle de reserva (240). |
| `TituloPagina` (`page/titulo_pagina.dart`) | `texto` | 28 w800 ls -1 altura 1.1; `TituloPagina.estilo(cs)` reutilizable. |
| `SectionLabel` (`section_label.dart`) | `texto`, `accion?` | Mayúsculas 11.5 w700 ls 1.2 `onSurfaceVariant`, padding inferior 10. |
| `AgencyAvatar` (`agency_avatar.dart`) | `agencia: AgenciaResumen`, `size = 46` | Círculo con `logoUrl` (`Image.network`, cover) o iniciales (`agencia.iniciales`, blanco w800, `size*.38`, ls .5) sobre `colorDeAgencia(id)`; si la imagen falla → iniciales. |
| `PriceText` (`plan/price_text.dart`) | `monto`, `alineado = start` | `formatCOP(monto)` 21 w800 ls -.5 `onSurface` + «por persona · precio final» 10.5 `onSurfaceVariant`. |
| `TarjetaCancelacion` (`plan/tarjeta_cancelacion.dart`) | `texto` | Caja `tertiaryContainer` 45 % r20 p14: `shield_outlined` 19 `onTertiaryContainer` + «Política de cancelación» (13.5 w700) + texto (13, altura 1.45, `onSurface` 80 %). |
| `PasoItinerario` (`plan/paso_itinerario.dart`) | `paso: ItinerarioPaso{hora, actividad}` | Hora a la derecha en columna de 62 (13 w800 `primary`, altura 1.35); 14; punto 8×8 `primary` + línea vertical 1.6 `outlineVariant`; 14; actividad (14, altura 1.45) con 16 de aire abajo. |
| `VerifiedBadge` (`plan/verified_badge.dart`) | `compacto = false`, `blanco = false` | Píldora «Verificada RNT» con `verified_rounded` (13/15). Normal: fondo `primary` 10 %, texto/ícono `primary`. `blanco` (sobre foto): fondo `selloSobreFoto`, blanco. Compacto: padding h7/v2.5, texto 10.5; normal h10/v5, texto 11; w700. |
| `RatingStars` (`rating/rating_stars.dart`) | `calificacion`, `size = 15`, `mostrarNumero = false` | Una estrella `star_rounded` (size+2, dorado) + número con 1 decimal (`size-1`, w700, `onSurface`). |
| `EstrellasCalificacion` (`rating/estrellas_calificacion.dart`) | `calificacion` (1–5), `size = 15` | 5 estrellas: llenas `star_rounded` dorado / vacías `star_outline_rounded` `outlineVariant`. Semántica única «N de 5 estrellas». |
| `InsigniaNueva` (`rating/insignia_nueva.dart`) | `texto = 'Nueva'` | Píldora `primary` 10 %, texto 11.5 w700 `primary`, padding h8/v2. |
| `PuntajePlan` (`rating/puntaje_plan.dart`) | `plan`, `detallado = false` | Si `plan.esNuevo` → `InsigniaNueva` (nunca «0.0»). Si no → `RatingStars(mostrarNumero)` + «(n)» (12) o, detallado, « · n reseñas verificadas» (13). |

Shell: ver §1.3 y §2.1.

---

## 5. Integraciones de plataforma

| Integración | Dónde | Para qué / detalle |
|---|---|---|
| `supabase_flutter` | `lib/main.dart` | `Supabase.initialize(url, publishableKey)` con `DiversoConfig` de core; el cliente se pasa a los repos de core. La sesión la persiste el propio SDK (almacenamiento local por defecto). `auth.onAuthStateChanged` refresca el router. |
| `webview_flutter` | `lib/ui/features/checkout/pago_wompi.dart` (`PagoWompiPage`) | **Solo Android/iOS.** Carga `checkoutUrl` de Wompi (obtenida de la Edge Function vía `PaymentGateway.iniciar`, «pagos-iniciar») con JS sin restricciones. Detecta el final interceptando la navegación a `DiversoConfig.pagoRetornoMovil` (`https://diverso.app/pago/resultado`, comparando scheme+host+path) → cierra con el `id` de la query (o null) y bloquea la carga. Bloquea esquemas que no sean http/https/about. Cerrar con ✕ = pago «cerrado». El éxito/fallo **real** NO se deduce aquí: se verifica en el servidor en `/pago/resultado` (`PaymentGateway.verificar`, «pagos-verificar»). |
| `url_launcher` | `pago_wompi.dart` (`_lanzarEnLaMismaVentana`) | **Solo web:** `launchUrl(checkoutUrl, webOnlyWindowName: '_self')` → navega la misma pestaña a Wompi; la `redirectUrl` es `${Uri.base.origin}/pago/resultado` y Wompi vuelve con `?id=<tx>`. Si `launchUrl` devuelve false → `DiversoException('ERROR_NAVEGADOR')`. No hay otros usos (no se abren mapas, teléfono, mail). |
| `intl` | `main.dart` (`initializeDateFormatting('es')`), `bookings/reserva_formato.dart` | `DateFormat('EEE d MMM', 'es')` → «lun 27 oct»; `DateFormat('HH:mm')` (24 h). Los demás formatos (`formatCOP`, `formatFechaCorta`, `formatFechaLarga`, `formatFechaTexto`) viven en core. Formato COP de ejemplo en comentarios/tests: «$ 190.000», «$ 330.000» (símbolo + espacio, punto de miles, sin decimales). Fechas/horas en hora **local** del dispositivo (`toLocal()`). Meses de la insignia: lista fija en mayúsculas sin punto. |
| `flutter_web_plugins` | `main.dart` | `usePathUrlStrategy()` (URLs sin `#`). |
| `flutter/services` | `checkout_view_model.dart` | `HapticFeedback.mediumImpact()`. |
| `provider` | `composition_root.dart`, vistas | DI (`context.read`) y `Consumer`/`context.watch` para tema y consentimiento. |
| Persistencia local propia | — | **Ninguna** (ni tema, ni filtros, ni selección de comparar, ni borradores). Solo la sesión de Supabase. |
| Imágenes | `Image.network` / `NetworkImage` | Fotos de planes (`fotoPrincipal`, `fotos`), logos (`logoUrl`) y portadas de agencias (`portadaUrl`) por URL; siempre con respaldo (color + emoji de categoría o ícono) si es null o falla. `gaplessPlayback` + `filterQuality.low` en listas. Sin caché explícita. |
| Assets locales | — | Ninguno en la app. Logo = `DiversoLogo` (widget de core, se dibuja por código). Íconos de web: `web/favicon.png`, `web/icons/Icon-192.png`, `Icon-512.png`, `Icon-maskable-192.png`, `Icon-maskable-512.png`. |
| Web (`web/`) | `index.html`, `manifest.json` | `index.html` es el de plantilla (título «viajero», `<base href="$FLUTTER_BASE_HREF">`, `flutter_bootstrap.js`). `manifest.json`: name «Diverso App — Viajero», short_name «Diverso», `display: standalone`, `background_color #ffffff`, **`theme_color #2E7D5B`** (distinto del seed), `orientation: portrait-primary`, descripción «Reserva planes turísticos de agencias antioqueñas verificadas: fichas claras, cupos en tiempo real y pagos seguros.» |
| Android | `android/app/src/main/AndroidManifest.xml` | Permiso `INTERNET`, label «viajero», sin intent-filters de deep links (solo LAUNCHER). |

---

## 6. Tests (`apps/viajero/test/`)

55 archivos de prueba + 5 de soporte. ≈268 `test(...)` y ≈188 `testWidgets(...)` declarados (algunos parametrizados en
bucles, así que corren más casos). Los dobles de `test/support/` deben reescribirse como fakes de los repos de core:

- `support/auth_falso.dart` — `AuthFalso implements AuthRepository` (sesión, consentimientos pendientes, signIn/signUp, perfil).
- `support/catalogo_falso.dart` — `CatalogoFalso` (CatalogRepository), `ResenasFalsas` (ReviewRepository), helpers `planDePrueba(...)`, `fechaDePrueba(id, dias, cupos)`.
- `support/pasarela_falsa.dart` — `PasarelaFalsa` (PaymentGateway): `verificar` responde en orden una lista de resultados/errores y repite el último.
- `support/reservas_falsas.dart` — `ReservasFalsas` (BookingRepository), `PublicadorDeResenasFalso` (ReviewRepository), helper de reserva confirmada (salida +3 días por defecto).
- `support/router_de_prueba.dart` — router real con usuario con sesión y consentimiento al día.

| Archivo | Qué cubre |
|---|---|
| `app_arranque_test.dart` | Sin sesión arranca en `/login`; con sesión+consentimiento en el catálogo; cada pestaña se construye sin `ProviderNotFoundException`. |
| `app_test.dart` | Cambiar el tema no recrea el router ni reinicia la navegación. |
| `integration/anti_sobreventa_test.dart` | (Supabase local + `SUPABASE_SERVICE_ROLE_KEY`, se omite sin ella) carrera por el último cupo sin sobreventa; un viajero no abre 2ª pendiente de la misma fecha (`RESERVA_PENDIENTE_EXISTENTE`); `reservaPendiente` solo de esa fecha; `confirm_payment`/`cancel_booking` ya no existen (404); funciones de pagos/reembolsos solo servidor; escribir directo en payments/bookings no marca pagada. **Es del backend: no portar a RN como unit test, mantener como test de integración.** |
| `router/app_routes_test.dart` | Helpers de rutas sin/con ids, retorno de pago por transacción o reserva, `compararPlanes` con comas, patrones coinciden con ubicaciones. |
| `router/sesion_redirect_test.dart` | Tabla completa de `sesionRedirect` (sin sesión, aceptado, verificando/pendiente/error, query codificada en `desde`, vuelta a `desde`, destinos inseguros) y `destinoSeguro`. |
| `router/consentimiento_test.dart` | Entrar con consentimiento al día; pedir autorización si falta; «Reintentar» tras fallo (sigue pendiente / entra); reintento automático al volver a primer plano y no re-consulta si ya se sabe; aceptar registra y entra; error al guardar; sin sesión no consulta; al iniciar sesión consulta; «Cerrar sesión» en consentimiento → login. |
| `router/consentimiento_guard_test.dart` | Mientras se verifica, un enlace protegido no se abre ni carga datos y se conserva el destino; timeout de 15 s → «Reintentar»; cambio de usuario re-verifica y respuesta tardía de A no cuenta para B; con error/pendiente ninguna URL protegida abre (ni con `go` ni `push`); `/comparar` sin ids no consulta; ids inexistentes → error; `/resena/<reserva ajena>` no muestra formulario. |
| `router/rutas_con_ids_test.dart` | `/comparar?ids` tras recarga, orden/duplicados/máx. 3, sin ids, error+reintentar, `extra` evita consulta; `/resena/:id` tras recarga, publicar abierto directo vuelve a reservas, no viajada no se reseña, inexistente muestra error, `extra` evita consulta, `/resena` vieja → reservas; 404 «No encontramos esta página». |
| `router/rutas_pago_test.dart` | `/checkout/:planId/:fechaId` carga por id; fecha inexistente avisa; `/reserva/:id` muestra confirmación / error; `/pago/resultado?id` verifica y si aprobado abre `/reserva/:id`; `?reserva` verifica por reserva; rechazado → «Intentar de nuevo»; pendiente reintenta y remite a reservas; sin datos → reservas; rutas viejas `/exito` y `/checkout` redirigen. |
| `router/verificacion_final_probe_test.dart` | URL de retorno móvil e intercepción; rutas de pago; web `launchUrl` rechazado → `ERROR_NAVEGADOR` / aceptado → `redirigido`; mapa de códigos de error (FECHA_YA_SALIO, RESERVA_YA_SALIO, 409 aprobado_tarde, sin conexión; core); enums de BD; vuelta de Wompi en frío pasa por consentimiento y vuelve; botón pagar bloqueado tras redirigir. |
| `ui/core/notifica_si_vive_test.dart` | El mixin notifica mientras vive, no tras dispose, y prueba que sin él `notifyListeners` falla. |
| `ui/core/theme/chip_filtro_contraste_test.dart` | Chips de filtro activo con contraste AA (texto e ícono) en claro y oscuro (bug U). |
| `ui/core/theme/modo_oscuro_test.dart` | En oscuro la unidad del precio usa `onSurfaceVariant`. |
| `ui/core/widgets/page/cabeceras_test.dart` | AppBar del tema opaco del color de la página sin tinte (claro/oscuro); en pestañas el título está en el AppBar y no en el scroll, usa `TituloPagina`; cabecera colapsable de ficha y agencia: sin título con la foto visible, sólida con título y volver al colapsar. |
| `ui/core/widgets/rating/estrellas_resena_test.dart` | N estrellas llenas/vacías (5,4,2,1); el resumen sigue siendo una estrella + número. |
| `ui/core/widgets/rating/puntaje_nueva_test.dart` | `Plan.esNuevo`; tarjeta y ficha dicen «Nueva» sin 0.0; con reseñas ★ 4.5 (n) / «n reseñas verificadas». |
| `ui/core/widgets/widget_test.dart` | `RatingStars` con valor; `VerifiedBadge` texto, versión sobre foto (fondo oscuro, texto blanco) y color de marca normal. |
| `ui/features/agencies/agency_vigencia_test.dart` | (core) sello verificada según vigencia RNT (vence hoy = vigente, vencido/sin vigencia/pendiente no); documentos legales con versión y contenido. |
| `ui/features/agencies/view_models/agencia_view_model_test.dart` | Carga, sin planes, no encontrada sin error, error+detalle, reintento, recarga fallida conserva datos, lista inmodificable, dispose. |
| `ui/features/agencies/view_models/agencias_view_model_test.dart` | Carga/vacío/error/reintento/conserva; orden por puntaje («Nueva» al final), por planes, por nombre (sin tildes ni mayúsculas); cambiar orden sin re-consultar; mismo orden no notifica; orden se conserva al recargar; dispose. |
| `ui/features/agencies/views/agencias_test.dart` | Logo de red vs iniciales; tarjeta con iniciales/puntaje/«Nueva»/ciudad/planes/sello; color estable por agencia; orden por defecto y control; esqueletos; vacío; error+reintentar; pull-to-refresh; tocar abre `/agencia/:id`; página de agencia carga por id, abre planes, «Nueva» sin planes, id inexistente, error, volver sin historial → `/agencias`, con historial → lista. |
| `ui/features/auth/view_models/login_view_model_test.dart` | Estado inicial, alternar modo; entrar con trim, formulario inválido, anti doble envío, error, limpia error; registro sin casillas no envía, con casillas registra con autorización, error de correo ya registrado; cuenta demo según flag/kDebugMode; dispose. |
| `ui/features/auth/views/login_view_test.dart` | Botón demo según flag y desaparece en registro; entrar válido/ inválido (avisos); error y botón reactivado; registro sin casillas las resalta; con casillas registra. |
| `ui/features/bookings/view_models/bookings_view_model_test.dart` | Partición próximas/historial (L22, límite ±1 min, canceladas/completadas/pendientes vencidas a historial), orden; estados de carga, error «No pudimos cargar tus reservas.», vacío, inmutabilidad, dispose; aviso/limpiar, vista previa ok/falla, cancelar con reembolso / «Sin reembolso» / rechazado / error inesperado; reglas `puedeCancelar`/`puedeResenar`. |
| `ui/features/bookings/view_models/reserva_detalle_view_model_test.dart` | Carga con/sin `inicial`, error y reintento, error no-Diverso, fallo al actualizar avisa, conserva «ya reseñada», dispose; cancelar marca cambio, rechazo, pago intentado recarga, reseña publicada, reglas por reloj. |
| `ui/features/bookings/view_models/review_view_model_test.dart` | Carga con/sin adelantada (otro id se ignora), errores, reservas no reseñables (parametrizado), dispose; calificación 1–5, enviar, no duplicar, `enviando`, rechazo con `errorEnvio`, error inesperado, dispose. |
| `ui/features/bookings/views/bookings_view_test.dart` | Confirmada pasada en Historial con «Reseñar» y sin «Cancelar»; viaje de mañana no reseñable; lista bajo título y pestañas; tarjeta con foto/sin foto/sin plan; historial apagado; «Realizada» vs «Confirmada»; Cancelada/Pendiente/Completada no cambian; estado vacío. |
| `ui/features/bookings/views/cancelar_reserva_test.dart` | Cancelar desde lista avisa y recarga; «Mantener» no cancela; error al consultar política; desde detalle recarga solo esa reserva; al volver recarga la lista solo si hubo cambio. |
| `ui/features/bookings/views/reserva_detalle_test.dart` | Tarjeta abre detalle; «Cancelar» de tarjeta abre diálogo sin navegar; semántica de botón; jerarquía de datos; singular «1 persona»; cuenta regresiva «en 3 días/Mañana/Hoy»; historial sin cuenta regresiva ni cancelar; sin desbordes a 320 px con letra grande; detalle muestra todo, carga en frío por id, `extra` evita consulta, inexistente → reintentar, «Ver plan», «Cancelar» con política, pasada no cancelable sí reseñable, pendiente ofrece pagar/verificar. |
| `ui/features/bookings/views/review_view_test.dart` | Cargador + formulario con 5 estrellas; cambiar estrellas cambia etiqueta y lo publicado; rechazo explica y permite reintentar; publicada agradece. |
| `ui/features/bookings/widgets/cancel_dialog_test.dart` | Textos 100 % / 50 % / 0 % (motivo del servidor); «Sí, cancelar» vs «Mantener». |
| `ui/features/catalog/view_models/catalog_view_model_test.dart` | Carga/vacío/error (conserva lo anterior)/reintento; buscar envía texto y escribir no consulta; toggle de categoría; `aplicarFiltros` con UNA consulta (también vacío) y una notificación; setters consultan una vez; cambiar orden; comparar máx. 3 y purga al recargar; dispose. |
| `ui/features/catalog/view_models/comparator_view_model_test.dart` | Carga por ids en orden; sin ids; planes previos con mismos ids evitan consulta; distintos → consulta URL; error y recuperación. |
| `ui/features/catalog/views/buscador_test.dart` | Carga inicial sin texto; enviar busca; texto tal cual (tildes/comas); escribir sin enviar no busca; botón borrar; otro filtro conserva el texto. |
| `ui/features/catalog/views/comparador_layout_test.dart` | 320 px con 3 planes: precio en una línea, columnas legibles y tabla deslizable; ancho: reparte columnas; más barato marcado y «Ver plan» por plan. |
| `ui/features/catalog/views/comparison_test.dart` | (core) `buildComparisonRows` alinea por columna; total con 2 personas por defecto, recalculado, singular; vacío; `fechasDisponibles` filtra pasadas y sin cupo; widget: control de viajeros recalcula total. |
| `ui/features/catalog/views/filtros_test.dart` | Aplicar destino+precio en una consulta; aplicar sin cambios una consulta; Limpiar+Aplicar quita; con destino activo: cambiar precio conserva destino/chip, limpiar lo quita, otro destino reemplaza. |
| `ui/features/catalog/widgets/bandeja_comparar_test.dart` | Sin selección no hay bandeja; 1 plan: contador, pista, botón deshabilitado; 2: activo y navega; ✕ quita; Limpiar; máx. 3; bandeja sobre la barra sin tapar la lista; huecos del tamaño de miniatura; etiquetas accesibles. |
| `ui/features/checkout/checkout_pendiente_test.dart` | VM: detecta pendiente al abrir; sin pendiente; búsqueda fallida no bloquea; pagar con pendiente no crea otra; `RESERVA_PENDIENTE_EXISTENTE` → aviso (o error claro si no se recupera); otros errores; reutiliza reserva al reintentar; ignora doble toque; completar pendiente (mismo id/pax), cerrar sin terminar; cancelar pendiente y error; retención 30 min; texto del aviso; pantalla: aviso bloquea «Pagar», «Completar pago» usa esa reserva, «Cancelar y empezar de nuevo», sin pendiente «Pagar» habilitado. |
| `ui/features/checkout/pago_abierto_test.dart` | Web: `redirigido` sin esperar; navegador no abre → `ERROR_NAVEGADOR`; enum distingue los 3 casos. |
| `ui/features/checkout/pago_wompi_test.dart` | Reconoce `https://diverso.app/pago/resultado` y lee `id`; sin id; no intercepta otras URLs (Wompi, bancos, dominios parecidos); la URL de retorno móvil es la interceptada. |
| `ui/features/checkout/view_models/checkout_plan_view_model_test.dart` | Estado inicial, carga y elige fecha, fecha ajena/ya salida no disponible, error, reintento, dispose. |
| `ui/features/checkout/view_models/checkout_view_model_test.dart` | Estado inicial; pax 1–20 y total; dos notificaciones al pagar; cerrar sin terminar conserva reserva; web redirigido bloquea pagar (también tras completar pendiente); cerrar en móvil permite reintentar; errores del servidor/inesperados; limpia error; dispose. |
| `ui/features/checkout/view_models/pago_resultado_view_model_test.dart` | Aprobado; verificar por reserva; sin datos; pendiente reintenta hasta el máximo / se aprueba en reintento; rechazado no reintenta; error servidor/inesperado; «Reintentar» desde cero; arranca cargando; `intentarDeNuevo` (misma reserva, web redirigido, cerrado, errores, limpia, ignora doble, dispose); cerrar corta el sondeo. |
| `ui/features/checkout/view_models/reserva_view_model_test.dart` | Carga por id, inexistente, error inesperado, limpia error, dispose. |
| `ui/features/checkout/views/pago_resultado_view_test.dart` | «Intentar de nuevo» pide checkout de la misma reserva y muestra error; error inesperado no rompe. |
| `ui/features/legal/view_models/consent_view_model_test.dart` | Sin sesión no consulta; aceptado/pendiente; error y reintentar; notificaciones; no re-consulta si se sabe; sesión: login, refresco de token, cambio de usuario, logout, respuesta tardía; aceptar registra cada doc / falla / nada pendiente; cerrar sesión; timeout 15 s; dispose. |
| `ui/features/plan/view_models/plan_detail_view_model_test.dart` | Carga plan+reseñas (una consulta cada una), vacío, error de plan, error de reseñas hace fallar todo, reintento; fecha por defecto la más cercana, seleccionar, leer no muta, fecha ajena ignorada, recargar vuelve a la primera; dispose. |
| `ui/features/plan/views/detalle_agencia_test.dart` | Iniciales «RA» sin logo; logo con URL; a 320 px el sello va debajo del nombre; muestra RNT y abre la agencia. |
| `ui/features/plan/views/detalle_fechas_test.dart` | Sin elegir, «Reservar» usa la más cercana; otra fecha cambia el checkout y avisa «¡Últimos N!»; la selección sobrevive a reconstrucción; sin fechas no hay «Reservar»; error + reintentar. |
| `ui/features/plan/views/detalle_resena_test.dart` | Nombre vacío/en blanco → «V» y «Viajero»; inicial en mayúscula. |
| `ui/features/plan/views/detalle_scroll_test.dart` | Con barra de gestos de 48 px el final del contenido queda sobre la barra de reserva. |
| `ui/features/profile/view_models/profile_view_model_test.dart` | Estado inicial «Viajero»/V/correo; carga; nombre vacío; inicial emoji sin partir; sin correo; error y reintento; cerrar sesión ok/falla; dispose. |
| `ui/features/profile/views/profile_view_test.dart` | Muestra nombre/inicial/correo; error con «Reintentar»; «Cerrar sesión»; fallo al cerrar → aviso. |
| `ui/shell/app_shell_test.dart` | 4 destinos; cambia al tocar; pegada al borde y a todo el ancho; sólida con línea superior; íconos grandes y activo verde con píldora; el contenido termina donde empieza la barra. |

---

## 7. Gotchas (lo que un reimplementador puede romper)

1. **Color y métrica del texto por defecto** (ver §3.4): `#1D1B20`/`#E6E0E9`, Roboto 14, `lineHeight` ×1.43 y
   `letterSpacing` 0.25 heredados por TODOS los textos. En RN el default es 0 de letter-spacing y lineHeight automático:
   sin un `<Text>` base propio el diseño se verá distinto.
2. **Colores M3 derivados**: usar la tabla de §3.2 (no inventar tonos desde el seed). Fondo de página ≠ `surface`
   (`#FAFAF8`/`#101312`).
3. **Toda la app exige sesión**, incluso el catálogo; solo `/login` y `/legal/*` son públicos. Con sesión, el
   consentimiento debe estar `aceptado`; `verificando`/`pendiente`/`error` redirigen a `/consentimiento?desde=…` y la
   pantalla protegida **no debe montarse ni cargar datos** antes de saberlo. Timeout de 15 s. `destinoSeguro` evita
   open redirects y bucles.
4. **Router único**: no recrearlo al cambiar el tema (con Expo Router esto es natural, pero ojo con providers que remonten la navegación).
5. **Ids en URL + `extra` opcional**: cada pantalla debe funcionar abierta en frío (recarga web/deep link). `extra`
   solo se usa si coincide con el id pedido (reseña) o con los ids exactos y en orden (comparar).
6. **«Volver» sin historial**: varias pantallas hacen `canPop ? pop : go(raíz)`. **Excepción con bug latente:**
   `PlanDetailView` (`onVolver: () => context.pop()`) y `BarraReserva` («Ver otros planes» → `context.pop()`) hacen
   `pop` sin comprobar; abierto en frío (`/plan/:id` tras recarga) no hay a dónde volver. En RN conviene usar el mismo
   patrón seguro (`router.canGoBack() ? back() : replace('/')`). Además la pantalla de error de la ficha no tiene AppBar/volver.
7. **Resultado de pantallas** (`pop(true)`): el detalle de reserva devuelve si hubo cambios (cancelación, pago, reseña,
   incluso cancelación rechazada) y la lista solo recarga en ese caso; la reseña devuelve `true` al publicar. Expo
   Router no tiene `pop` con resultado: hay que modelarlo (store compartido, evento o params). También
   `PopScope(canPop:false)` en detalle de reserva (gesto atrás de Android/iOS) y en consentimiento (no se puede salir).
8. **Pago web vs móvil**: web navega la MISMA pestaña (`_self`) y bloquea el botón (`redirigido`) para no abrir dos
   pagos; móvil usa WebView modal imperativo y devuelve `cerrado` si el usuario lo cierra. La URL de retorno móvil
   **no se carga nunca** (se intercepta y `prevent`). En web la `redirectUrl` usa el origen actual, que debe estar en
   la allowlist del backend. Nunca dar por pagado por la redirección: siempre `verificar` en servidor, con 5 intentos
   cada 3 s mientras esté `pendiente`, cortando si la pantalla se desmonta.
9. **Anti-duplicados del checkout**: antes de crear, se consulta `reservaPendiente(fecha)`; si `crearReserva` lanza
   `RESERVA_PENDIENTE_EXISTENTE` se muestra el aviso (no un error). Una vez hay `bookingId` o pendiente, `pax` queda
   fijo y los reintentos reutilizan la misma reserva. Los cupos se retienen 30 min (`venceAt`).
10. **Estados derivados del reloj** recalculados en cada lectura (no cachear): `fechasDisponibles`, `fechaSeleccionada`,
    `fecha` del checkout (`yaSalio`), `vigente`/`puedeResenar`/«Realizada». La cuenta regresiva cuenta días de
    **calendario** local, no bloques de 24 h. Los VM aceptan un `reloj` inyectable para tests.
11. **`textoPersonas`/singulares**: «1 persona» vs «N personas» en varios sitios; tests lo verifican.
12. **Catálogo**: escribir NO busca (solo al enviar o al borrar); `aplicarFiltros` hace UNA consulta; `filtrosActivos`
    no cuenta categoría ni texto; slider 50 000–600 000 en 11 divisiones donde 600 000 = «Sin límite» (null); la
    selección de comparar se purga si el plan ya no está en los resultados; máx. 3 (el 4º se ignora en silencio).
    `search` + `destinos` se piden en serie; si falla `destinos` falla toda la carga.
13. **Ficha**: si fallan las reseñas falla toda la ficha (comportamiento preservado por test). Solo 4 reseñas; si hay
    `reviewsCount > 0` pero llegaron 0 se muestra «Carga al volver a abrir…».
14. **Bandeja de comparar y barras inferiores** van como `bottomNavigationBar`/debajo del scroll para que el contenido
    termine donde empiezan (tests de layout). La barra de reserva respeta la barra de gestos (SafeArea).
15. **`colorDeAgencia`**: FNV-1a sobre UTF-16 con `& 0xFFFFFFFF` (en JS usar `Math.imul` y `>>> 0`) — si cambia el hash, cambian los colores de todas las agencias.
16. **Inicial del perfil/reseña**: primer *rune*/grafema completo (no partir emojis); vacío → «V»/«Viajero».
17. **Accesibilidad que los tests verifican**: tooltips de botones de ícono («Volver», «Borrar búsqueda», «Filtros y orden»,
    «Agregar/Quitar del comparador», «Quitar {titulo} de la comparación», «N de 5 estrellas», «Quitar/Agregar una persona»,
    «Menos/Más viajeros», «Cerrar»), tarjeta de reserva con label «Ver detalle de la reserva {codigo}», encabezados
    semánticos en legal, `MergeSemantics` en casillas. Sin desbordes a 320 px con letra grande.
18. **Cuenta demo** (`viajero@demo.com` / `demo1234`) solo en debug; en release no debe existir el botón.
19. **Tema no persistido** y `BotonFiltros` con fondo negro 5 % también en oscuro (casi invisible): decidir si se preserva tal cual.
20. **`manifest.json` `theme_color #2E7D5B`** no coincide con el seed `#0E6E4F` ni con `primary #1F6A4F`.
21. **Teclado**: `BarraPagar` y `FiltrosSheet` suman `viewInsets.bottom` al padding; en RN usar `KeyboardAvoidingView`/insets.
22. **Errores**: los VM nunca dejan escapar excepciones; mensajes de usuario literales (ver §2) y `mensajeDeError` de core
    para `DiversoException`/PostgREST. `EmptyState.detalle` muestra `e.toString()` en monospace (útil para soporte, ojo con producción).
23. **Transiciones**: zoom solo para `/reserva/:bookingId`; fade-through para pestañas y estados; shared-axis X para flujos.

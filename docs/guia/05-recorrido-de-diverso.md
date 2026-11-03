# 5. Recorrido de Diverso

Este capítulo sigue **cuatro flujos reales** de la app, paso por paso y con el archivo y el
método de cada paso: arrancar y entrar, ver el catálogo, reservar y pagar, y cancelar. Es la
parte 2 de la guía: usa lo aprendido en los capítulos 1 a 4 para leer el código sin perderte.

> Volver al [plan de aprendizaje](README.md). Este capítulo cubre las sesiones 9 y 10.
> Las rutas parten de la raíz del repo; `core` es `packages/diverso_core/lib/` y `viajero` es
> `apps/viajero/lib/`. Los números de línea no se citan a propósito (cambian): busca el símbolo
> con `grep -rn "NombreDelSimbolo" apps packages supabase`.

## Contenido

1. [La arquitectura de Diverso en una pantalla](#1-la-arquitectura-de-diverso-en-una-pantalla)
2. [Flujo 1: arrancar y entrar](#2-flujo-1-arrancar-y-entrar)
3. [Flujo 2: catálogo y detalle del plan](#3-flujo-2-catálogo-y-detalle-del-plan)
4. [Flujo 3: reservar y pagar](#4-flujo-3-reservar-y-pagar)
5. [Flujo 4: cancelar](#5-flujo-4-cancelar)
6. [Mapa de errores](#6-mapa-de-errores)

---

## 1. La arquitectura de Diverso en una pantalla

```
 main.dart ── crea el cliente de Supabase y los repositorios reales
     │
     ▼
 composition_root.dart ── buildViajeroApp(...): MultiProvider + DiversoApp
     │   (la prueba test/app_arranque_test.dart usa esta misma función con repositorios falsos)
     ▼
 Provider ─────── reparte AuthRepository, CatalogRepository, BookingRepository,
     │            ReviewRepository, PaymentGateway, ConsentViewModel, ThemeModeViewModel
     ▼
 Router (go_router) ── app_router.dart + sesion_redirect.dart: sesión + consentimiento -> pantalla
     │
     ▼
 Views ─────────── ui/features/<f>/views: pintan y reenvían toques (context.read<Repo>() en initState)
     │
     ▼
 ViewModels ────── ui/features/<f>/view_models: estado privado + comandos, notifyListeners()
     │
     ▼
 Repositories ──── core/data/repositories: filas -> modelos, reglas de datos, DiversoException
     │
     ▼
 Services (Api) ── core/data/services: BookingApi, CatalogApi, EdgeFunctionsApi (SupabaseClient)
     │
     ▼
 Supabase ──┬── Postgres (tablas + RLS + funciones SQL: create_booking, vista_previa_cancelacion…)
            └── Edge Functions (Deno): pagos-iniciar, pagos-verificar, pagos-webhook,
                reservas-cancelar ──► Wompi (sandbox)
```

Cómo leerlo: **cada flecha hacia abajo es "llama a"**; nada llama hacia arriba (un repositorio
no sabe que existe una vista). Los datos suben como modelos (`Plan`, `Booking`) y los errores
suben como `DiversoException` con un código estable.

Dos reglas para el resto del capítulo:

- **La app pide, el servidor decide.** Cupos, una sola reserva pendiente, que el viaje no haya
  salido y que el pago sea verdadero se deciden en Postgres y en las Edge Functions; la app solo
  muestra el resultado. Si la app es manipulada, el servidor sigue rechazando.
- **Los secretos nunca están en la app.** Las llaves de Wompi viven en las Edge Functions; la
  app recibe una URL de pago ya firmada.

---

## 2. Flujo 1: arrancar y entrar

**Qué pasa:** la app abre, decide si hay sesión y si el usuario ya aceptó los documentos legales
vigentes (Ley 1581 de 2012), y lo lleva a `/login`, a `/consentimiento` o al catálogo.

### Recorrido

1. `viajero/main.dart` → `main()`: prepara Flutter (`WidgetsFlutterBinding.ensureInitialized`),
   URLs sin `#` (`usePathUrlStrategy`), fechas en español (`initializeDateFormatting('es')`) y
   `Supabase.initialize(...)`, que restaura la sesión guardada en el dispositivo.
2. `main()` crea **una sola vez** el `SupabaseClient`, los `*Api` y los repositorios y se los
   pasa a `buildViajeroApp(...)` (`viajero/composition_root.dart`), que arma el `MultiProvider`
   y devuelve `DiversoApp`.
3. `viajero/app.dart` → `_DiversoAppState.initState`: lee del `Provider` el `AuthRepository` y el
   `ConsentViewModel` y llama `buildViajeroRouter(...)` **una sola vez** (si se creara en `build`,
   cambiar el tema reiniciaría la navegación).
4. `viajero/router/app_router.dart` → `buildViajeroRouter`: el router empieza en `/` y cada vez
   que cambia la sesión (`GoRouterRefreshStream(auth.onAuthStateChanged)`) o el consentimiento
   (`consentimiento`, un `ChangeNotifier`) vuelve a ejecutar su `redirect`.
5. `viajero/router/sesion_redirect.dart` → `sesionRedirect(haySesion, consentimiento, ubicacion)`
   (función pura):
   - sin sesión, todo menos `/login` y `/legal/*` → `/login`;
   - con sesión y consentimiento **no** `aceptado` (verificando, pendiente o error), todo menos
     `/legal/*` → `/consentimiento?desde=<ubicación>`;
   - con sesión y `aceptado`, `/login` → `/`, y `/consentimiento` → vuelve a `desde` si es una
     ubicación interna segura (`destinoSeguro`).
6. **Sin sesión** → `viajero/ui/features/auth/views/login_view.dart` (`LoginView`). Su
   `initState` crea `LoginViewModel(auth: context.read<AuthRepository>())`.
7. El usuario pulsa «Entrar» → `LoginViewModel.enviar(...)` valida las casillas legales (si es
   registro) y llama a `AuthRepository.signIn` o `signUpViajero`
   (`core/data/repositories/auth_repository.dart`), que usan `client.auth.signInWithPassword` /
   `signUp`. Un fallo deja un mensaje en `LoginViewModel.error`; **no navega**.
8. Si entra, Supabase emite un evento de sesión → `AuthRepository.onAuthStateChanged` →
   dos oyentes lo reciben: `GoRouterRefreshStream` (re-evalúa el `redirect`) y
   `ConsentViewModel` (`viajero/ui/features/legal/view_models/consent_view_model.dart`).
9. `ConsentViewModel._alCambiarSesion` pone el estado en `verificando` y llama `_revisar()` →
   `AuthRepository.consentimientosPendientes()` (RPC `consentimientos_pendientes`, con
   `tiempoLimite` de 15 s). Según la respuesta el estado es `aceptado`, `pendiente` o `error`.
10. Mientras no sea `aceptado`, `sesionRedirect` manda a `ConsentView`
    (`ui/features/legal/views/consent_view.dart`): `pendiente` pide aceptar
    (`ConsentViewModel.aceptar` → `registrarConsentimiento`, RPC `registrar_consentimiento`);
    `error` muestra «Reintentar» (`ConsentViewModel.reintentar`) y **nunca deja pasar**.
11. Al quedar `aceptado`, el redirect lleva al catálogo (`/`, `CatalogView` dentro de `AppShell`).

### Qué se decide dónde

| Decisión | Dónde vive | Por qué ahí |
|---|---|---|
| ¿Hay sesión? | `AuthRepository.currentUserId` (Supabase Auth) | Es la fuente de verdad; el router solo lo lee |
| ¿A dónde va el usuario? | `sesionRedirect` (función pura) | Se prueba con una tabla de casos, sin Flutter |
| ¿Aceptó los documentos? | `ConsentViewModel` + RPC `consentimientos_pendientes` | Una falla de red no debe dejar entrar |
| Contraseñas y tokens | Supabase Auth | La app nunca los guarda |

### Pruébalo

- **Emulador:** `flutter run -d emulator-5554 --dart-define=SUPABASE_URL=http://10.0.2.2:54331`
  (con `supabase start`). Entra con `viajero@demo.com` / `demo1234` («Usar cuenta demo» solo
  aparece en builds de debug). Cierra sesión en Perfil y mira cómo la URL pasa a `/login` sola.
- **Pruebas** (sin red):

  ```bash
  cd apps/viajero
  flutter test test/app_arranque_test.dart       # arranca en /login sin sesión y en el catálogo con sesión
  flutter test test/router/sesion_redirect_test.dart test/router/consentimiento_guard_test.dart
  flutter test test/ui/features/auth/view_models/login_view_model_test.dart
  flutter test test/ui/features/legal/view_models/consent_view_model_test.dart
  ```

### Dónde mirar si falla

| Síntoma | Mira |
|---|---|
| Queda en `/login` aunque entraste | `AuthRepository.onAuthStateChanged` y `GoRouterRefreshStream`; el log de `LoginViewModel.enviar` |
| Pantalla roja `ProviderNotFoundException` al abrir una pestaña | `composition_root.dart`: falta registrar ese tipo; `test/app_arranque_test.dart` lo detecta |
| Atrapado en `/consentimiento` con «No pudimos verificar» | `ConsentViewModel._revisar`; sin red es el comportamiento correcto, toca «Reintentar» |
| Vuelve al inicio al cambiar de tema | El router debe crearse en `initState` de `DiversoApp`, no en `build` |

---

## 3. Flujo 2: catálogo y detalle del plan

**Qué pasa:** se listan los planes publicados con filtros y, al tocar uno, se abre su ficha con
fechas, cupos y reseñas.

### Recorrido: el catálogo

1. `viajero/ui/features/catalog/views/catalog_view.dart` → `_CatalogViewState.initState` crea
   `CatalogViewModel(catalogo: context.read<CatalogRepository>())..cargar()`.
2. `viajero/ui/features/catalog/view_models/catalog_view_model.dart` → `cargar()`: marca
   `cargando`, avisa (`_notificar`) y pide `FiltrosCatalogo(texto, categoria, destino,
   precioMax, fecha, orden)` al repositorio.
3. `core/data/repositories/catalog_repository.dart` → `CatalogRepository.search(filtros)`:
   normaliza el texto (sin tildes, `normalizarBusqueda`), calcula «hoy» en Bogotá (`hoyBogota()`)
   y llama a `CatalogApi.planesPublicados(...)`.
4. `core/data/services/catalog_api.dart` → `CatalogApi.planesPublicados`: arma la consulta
   PostgREST sobre `plans` (`*, agencies(*), plan_dates(*)`) con los filtros que no son nulos,
   solo planes `publicado`, fechas desde hoy, orden y `limit(60)`. Si hay un día elegido la unión
   con las fechas es interna (`plan_dates!inner(*)`): el servidor descarta los planes sin ese día
   **antes** del límite de 60, no después.
5. De vuelta, `search` convierte cada fila con `Plan.fromMap` (`core/models/plan.dart`) y, si hay
   una fecha elegida, deja solo los planes con una salida **aún no partida** ese día
   (`Plan.tieneSalidaEl`).
6. `CatalogViewModel.cargar` guarda `_planes` (lista de solo lectura), pide `destinos()` y llama
   `_notificar()`; `ListenableBuilder` en `CatalogView` repinta con las tarjetas
   (`catalog/widgets/plan_card.dart`).
7. **Filtros.** Una categoría llama `toggleCategoria`; el botón de filtros abre `FiltrosSheet`
   (`catalog/widgets/filtros_sheet.dart`), cuyo «Aplicar filtros» ejecuta
   `CatalogViewModel.aplicarFiltros(destino, precioMax, fecha)`: cambia los tres filtros y hace
   **una sola** consulta (volver a `cargar()` por separado haría tres).

### Recorrido: la ficha del plan

8. `PlanCard.onTap` → `context.push(AppRoutes.plan(plan.id))` (`viajero/router/app_routes.dart`);
   la ruta `AppRoutes.planPatron` (`/plan/:id`) construye `PlanDetailView(planId: …)`.
9. `ui/features/plan/views/plan_detail_view.dart` → `initState` crea `PlanDetailViewModel` con
   `CatalogRepository` y `ReviewRepository` y llama `cargar()`.
10. `plan/view_models/plan_detail_view_model.dart` → `cargar()`: `CatalogRepository.planDetalle`
    (→ `CatalogApi.plan`) y `ReviewRepository.porPlan` (`core/data/repositories/review_repository.dart`).
11. El view model calcula `fechas` (las que tienen cupos y no han salido: `Plan.fechasDisponibles`)
    y `fechaSeleccionada` (la elegida o la más cercana). Nada se guarda duplicado: se **deriva**
    en cada lectura.
12. `plan/widgets/barra_reserva.dart` → «Reservar»: `context.push(AppRoutes.checkout(plan.id,
    fecha.id))`. Aquí empieza el flujo 3.

### Qué se decide dónde

| Decisión | Dónde vive |
|---|---|
| Qué planes se ven (publicados, fechas futuras) | `CatalogApi` + RLS en Postgres |
| «Esta salida ya partió» en pantalla | `Plan.yaSalio` / `fechasDisponibles` (la hora de salida se interpreta en Bogotá) |
| La misma regla, de verdad | `create_booking` en el servidor (flujo 3): la pantalla solo evita ofrecer lo imposible |

### Pruébalo

- **Emulador:** en Explorar toca una categoría (spinner y luego tarjetas), abre los filtros,
  elige destino y precio y pulsa «Aplicar filtros»; toca un plan y cambia de fecha.
- **Pruebas:**

  ```bash
  cd apps/viajero
  flutter test test/ui/features/catalog/view_models/catalog_view_model_test.dart
  flutter test test/ui/features/plan/view_models/plan_detail_view_model_test.dart
  cd ../../packages/diverso_core
  flutter test test/data/repositories/catalog_repository_test.dart
  ```

### Dónde mirar si falla

| Síntoma | Mira |
|---|---|
| «No pudimos cargar los planes» | `CatalogViewModel.errorDetalle` (el error técnico) y la consulta en `CatalogApi.planesPublicados` |
| Un plan no aparece | ¿Estado `publicado`? ¿Tiene alguna fecha futura con cupos? ¿La agencia está habilitada? |
| El filtro de fecha devuelve de más o de menos | `CatalogRepository.search` (`tieneSalidaEl`) y su prueba en `catalog_repository_test.dart` |
| La ficha muestra una fecha que ya salió | `Plan.fechasDisponibles` y el reloj del dispositivo |

---

## 4. Flujo 3: reservar y pagar

**Qué pasa:** el viajero elige personas, la app **crea la reserva** (retiene cupos 30 minutos),
pide al servidor una URL de pago de Wompi, el viajero paga en la página de Wompi y la app
**pregunta al servidor** cómo quedó el pago antes de mostrar «Reserva confirmada».

### Recorrido

1. `AppRoutes.checkoutPatron` (`/checkout/:planId/:fechaId`) construye `CheckoutLoader`
   (`ui/features/checkout/views/checkout_loader.dart`), que con `CheckoutPlanViewModel` carga el
   plan y la fecha **por id** (así la pantalla sobrevive a una recarga en web) y muestra
   `CheckoutView`.
2. `checkout/views/checkout_view.dart` → `initState`: crea `CheckoutViewModel` y llama
   `cargarPendiente(fecha)` (`BookingRepository.reservaPendiente`) para avisar si ya hay una
   reserva sin pagar de esa fecha.
3. El viajero elige personas (`CheckoutViewModel.setPax`) y toca «Pagar con Wompi»
   (`checkout/widgets/barra_pagar.dart`) → `CheckoutViewModel.pagar(fecha, abrirPago)`.
4. `pagar` busca otra vez una pendiente y, si no hay, llama
   `BookingRepository.crearReserva(planDateId, pax)`
   (`core/data/repositories/booking_repository.dart`) → `BookingApi.crearReserva`
   (`core/data/services/booking_api.dart`) → **RPC `create_booking`** en Postgres.
5. **En el servidor**, `create_booking` (última versión en
   `supabase/migrations/0012_reservar_antes_de_salir.sql`) en una sola transacción:
   exige sesión y `1 ≤ pax ≤ 20`; toma un bloqueo por viajero y fecha y rechaza una segunda
   reserva pendiente (`RESERVA_PENDIENTE_EXISTENTE`); descuenta los cupos con un `UPDATE`
   condicional (solo si hay cupo, el plan está publicado, la agencia habilitada y la salida aún no
   ocurrió) y, si no actualizó nada, lanza el motivo exacto (`SIN_CUPO`, `FECHA_YA_SALIO`…); por
   último inserta la reserva `pendiente_pago`.
6. Si falla, `DiversoException.fromPostgrest` (`core/errors/diverso_exception.dart`) convierte el
   error en un código y `mensajeUsuario` (`core/errors/mensaje_usuario.dart`) en el texto. El caso
   `RESERVA_PENDIENTE_EXISTENTE` lo atrapa el propio `pagar` y muestra el aviso «completar o
   cancelar» en vez de un error.
7. Con la reserva creada, `pagar` llama a `abrirPago(bookingId)`, que es
   `iniciarPago(...)` (`ui/features/checkout/pago_wompi.dart`). Esta función pide la URL a la
   pasarela: `PaymentGateway.iniciar` → `WompiPaymentGateway.iniciar`
   (`core/data/repositories/payment_gateway.dart`) → Edge Function **`pagos-iniciar`**
   (`supabase/functions/pagos-iniciar/index.ts`).
8. **En el servidor**, `pagos-iniciar`: valida el JWT del viajero, que `redirect_url` esté en la
   lista de permitidos (`REDIRECT_NO_PERMITIDO`) y llama la función SQL `crear_intento_pago`
   (`0013_checkout_vence_en_la_salida.sql`): comprueba que la reserva es suya, está pendiente, no
   venció (30 min, `RESERVA_VENCIDA`) y su viaje no ha salido (`RESERVA_YA_SALIO`), y fija la
   expiración en `least(created_at + 30 min, salida_at)`. Después **firma** referencia, monto,
   moneda y expiración con el secreto de integridad (`firmaIntegridad`,
   `supabase/functions/_shared/wompi.ts`) y devuelve la `checkout_url` ya firmada.
9. De vuelta en la app, `iniciarPago` abre el pago según la plataforma:
   - **Android/iOS:** `PagoWompiPage` (un `WebView` dentro de la app).
   - **Web:** navega la misma ventana a Wompi (`abrirEnLaMismaVentana` → `PagoAbierto.redirigido`).
10. El viajero paga en la página de Wompi (ningún dato de tarjeta pasa por la app).
11. Wompi redirige a `https://diverso.app/pago/resultado?id=<transacción>` (en web, al origen de
    la app + `/pago/resultado`). En móvil el `WebView` **intercepta** esa URL antes de cargarla:
    `PagoWompiPage` → `NavigationDelegate.onNavigationRequest` → `esRedireccionDePago(url)` →
    cierra con `idDeRedireccion(url)`.
12. `iniciarPago` recibe el id y navega con `context.go(AppRoutes.pagoDeTransaccion(id))` →
    `PagoResultadoView` (`ui/features/checkout/views/pago_resultado_view.dart`).
13. `PagoResultadoView.initState` llama `PagoResultadoViewModel.verificar()`
    (`checkout/view_models/pago_resultado_view_model.dart`), que pregunta a
    `PaymentGateway.verificar` hasta `maxIntentos` (5) veces con `pausa` de 3 s mientras el
    estado sea `pendiente`.
14. `WompiPaymentGateway.verificar` → Edge Function **`pagos-verificar`**
    (`supabase/functions/pagos-verificar/index.ts`): **nunca confía en la redirección**.
    Consulta la transacción a Wompi con la llave privada, comprueba que la reserva es del
    viajero que llama y entrega el resultado a `aplicarTransaccion`
    (`supabase/functions/_shared/pagos.ts`).
15. `aplicarTransaccion` llama la función SQL **`aplicar_resultado_pago`**
    (`0005_endurecimiento_pagos.sql`), la única puerta que cambia reservas y pagos (la usa también
    el webhook). Es idempotente y decide: `APPROVED` con el monto y la moneda del intento y la
    reserva aún pendiente → crea el `payment`, pone la reserva `confirmada` y expira los demás
    intentos; `DECLINED/VOIDED/ERROR` → intento `rechazado`; monto distinto → no confirma y crea
    un reembolso del 100 %; aprobado cuando la reserva ya venció o se canceló → `aprobado_tarde`
    con reembolso del 100 %.
16. `pagos-verificar` responde `estado_pago` (`aprobado`, `pendiente`, `rechazado`, `error`) o
    un 409 (`MONTO_NO_COINCIDE`, `RESERVA_VENCIDA`). La app lo lee como `PagoVerificado`
    (`core/models/pago.dart`).
17. Si es `aprobado`, `PagoResultadoView._alCambiar` hace `context.go(AppRoutes.reserva(id))` →
    `ReservaView` → `ReservaViewModel.cargar` → `BookingSuccessView` («¡Listo, nos vemos
    ahí!»). Si es `rechazado`, la vista ofrece «Intentar de nuevo»
    (`PagoResultadoViewModel.intentarDeNuevo`: misma reserva, otro intento).
18. **Respaldo:** si el viajero cierra el pago o la redirección no llega, queda «Ya pagué,
    verificar» (`AppRoutes.pagoDeReserva`): `verificar` por reserva, sin transacción conocida.
    Y `pagos-webhook` (Wompi → servidor) puede confirmar el pago aunque la app esté cerrada.

### Qué reglas viven en el servidor, y por qué

| Regla | Dónde | Por qué no en la app |
|---|---|---|
| **Cupos**: no se vende más de lo que hay | `UPDATE … where cupo_disponible >= p_pax` en `create_booking` | Dos teléfonos reservando a la vez: solo el servidor puede serializarlos |
| **Una reserva pendiente** por viajero y fecha | Bloqueo consultivo + consulta en `create_booking` (y la comprobación previa de la app, solo para avisar) | Otra pestaña u otro dispositivo se saltaría la comprobación de la app |
| **Un viaje que salió no se reserva ni se paga** | `create_booking` (`FECHA_YA_SALIO`), `crear_intento_pago` (`RESERVA_YA_SALIO`) y la expiración `least(…, salida_at)` | Se paga algo que luego no se puede cancelar; el reloj del teléfono no es de fiar |
| **La reserva vence a los 30 min** | `crear_intento_pago` y `expire_stale_bookings` (`pg_cron` cada 5 min) | Libera cupos aunque el viajero cierre la app |
| **Checksum firmado** | Firma de integridad en `pagos-iniciar` (monto y expiración no se pueden alterar en la URL); checksum del evento en `pagos-webhook` (`eventoAutentico`, comparación en tiempo constante) | Los secretos de Wompi no pueden estar en un cliente que cualquiera descompila |
| **El resultado del pago** | `pagos-verificar` + `aplicar_resultado_pago` | La redirección del navegador la puede escribir cualquiera; solo cuenta lo que Wompi confirma al servidor |
| **Solo modo prueba** | `cargarConfig` (`SOLO_MODO_PRUEBA` si una llave o URL no es de sandbox) | Evita cobrar dinero real por accidente |

### Pruébalo

- **Pruebas** (sin red ni Wompi):

  ```bash
  cd apps/viajero
  flutter test test/ui/features/checkout           # view models, URL de retorno, WebView, pendientes
  flutter test test/router/rutas_pago_test.dart
  ```

- **Servidor:** `supabase/tests/0012_reservar_antes_de_salir.sql` y `0013_checkout_vence_en_la_salida.sql`
  (siempre dentro de `begin … rollback`, ver
  [Pruebas SQL](../../README.md#pruebas-sql-siempre-dentro-de-begin--rollback)) y
  `python -I -B supabase/functions/_tests/test_pagos.py` (Wompi falso).
- **Emulador con Wompi de prueba:** necesita las llaves de sandbox y `supabase functions serve`
  ([Configurar Wompi en modo prueba](../../README.md#configurar-wompi-en-modo-prueba)). Reserva un
  plan, paga con el Nequi de prueba aprobado de esa sección y toca «Volver al comercio»: verás la
  confirmación. Sin llaves, «Pagar» responde `SOLO_MODO_PRUEBA` (es lo esperado).

### Dónde mirar si falla

| Síntoma | Mira |
|---|---|
| «Ya tienes una reserva pendiente…» | `CheckoutViewModel.pagar` y la reserva `pendiente_pago` del viajero (30 min); se completa o se cancela |
| «La pasarela de prueba no está configurada» | Variables `WOMPI_*` de las Edge Functions (`_shared/config.ts`) |
| Wompi abre pero la app no vuelve | `esRedireccionDePago` (¿la URL de retorno es `https://diverso.app/pago/resultado`?) y `redirect_url` permitida en el servidor |
| «Procesando…» no termina en web | `abrirEnLaMismaVentana` devuelve `PagoAbierto.redirigido`; mira la consola del navegador |
| Pagó pero sigue «pendiente» | `PagoResultadoViewModel.verificar` (5 intentos) y «Ya pagué, verificar»; en `payment_attempts`, `estado` y `wompi_status` |
| Pagó y salió «Tu reserva venció» | `aplicar_resultado_pago` (`aprobado_tarde`): el reembolso se crea solo |

---

## 5. Flujo 4: cancelar

**Qué pasa:** desde «Mis reservas» o el detalle, el viajero ve **cuánto le devolverían** antes
de confirmar; al confirmar, el servidor cancela, libera los cupos y pide el reembolso a Wompi.

### Recorrido

1. `ui/features/bookings/views/bookings_view.dart` (o `reserva_detalle_view.dart`) → «Cancelar»
   llama `cancelarConConfirmacion(context, viewModel, reserva)`
   (`ui/features/bookings/acciones_reserva.dart`). El botón solo aparece si
   `ReservaAccionesViewModel.puedeCancelar` (reserva viva y con salida futura).
2. `cancelarConConfirmacion` pide primero `ReservaAccionesViewModel.vistaPrevia(reserva)`
   (`bookings/view_models/reserva_acciones_view_model.dart`) →
   `BookingRepository.vistaPreviaCancelacion` → `BookingApi.vistaPreviaCancelacion` →
   **RPC `vista_previa_cancelacion`** (`0008_cancelar_antes_de_salir.sql`): solo lectura; comprueba
   que la reserva es del viajero y que el viaje no ha salido (`RESERVA_YA_SALIO`) y calcula el
   reembolso con la política del plan congelada en la reserva (`reembolso_por_politica`).
3. `CancelacionDialog` (`bookings/widgets/cancel_dialog.dart`) muestra «te devolvemos el X %
   (\$ monto)». Si el viajero lo descarta, no pasa nada.
4. Si confirma, `ReservaAccionesViewModel.cancelar(reserva)` llama
   `BookingRepository.cancelar` (`core/data/repositories/booking_repository.dart`) → Edge Function
   **`reservas-cancelar`** (`supabase/functions/reservas-cancelar/index.ts`).
5. **En el servidor**, `reservas-cancelar` valida el JWT y llama la función SQL
   `cancelar_reserva` (`0008`): bloquea la reserva, exige que sea del viajero y que siga viva y
   antes de la salida; decide el reembolso **antes** de cambiar el estado; marca la reserva
   `cancelada`, **devuelve los cupos** (con tope en `cupo_total`), expira los intentos de pago
   abiertos y, si la política da reembolso, inserta la fila en `refunds` (`pendiente` si el pago
   fue real de Wompi).
6. De vuelta en la Edge Function, si el reembolso quedó `pendiente`, `procesarReembolso`
   (`supabase/functions/_shared/pagos.ts`) se lo pide a Wompi (sandbox) y registra el resultado
   (`registrar_resultado_reembolso`). Si Wompi no responde, queda `pendiente` y volver a llamar
   la función lo reanuda: la cancelación es **idempotente**.
7. El view model arma el aviso con `mensajeCancelacion` (`bookings/reserva_formato.dart`: «Reserva
   cancelada y cupos liberados. …»), llama `cargar()` y la vista lo muestra en un snackbar
   (`mostrarAviso`).

### Qué se decide dónde

| Decisión | Dónde vive |
|---|---|
| Cuánto se devuelve | Política del plan, calculada por `reembolso_por_politica` en Postgres; la app solo lo muestra |
| Si aún se puede cancelar | `cancelar_reserva` (el viaje no ha salido); la app oculta el botón por comodidad |
| Devolver el dinero | `reservas-cancelar` + Wompi; la app nunca habla con Wompi |

### Pruébalo

- **Emulador:** en «Mis reservas» cancela una reserva de prueba: el diálogo muestra el
  porcentaje y el aviso confirma el reembolso. (Con Wompi de prueba el reembolso real queda
  `pendiente` hasta que Wompi lo procese.)
- **Pruebas:**

  ```bash
  cd apps/viajero
  flutter test test/ui/features/bookings/views/cancelar_reserva_test.dart
  flutter test test/ui/features/bookings/view_models/bookings_view_model_test.dart
  ```

  Servidor: `supabase/tests/0008_cancelar_antes_de_salir.sql` (dentro de `begin … rollback`).

### Dónde mirar si falla

| Síntoma | Mira |
|---|---|
| «Este viaje ya salió, así que la reserva ya no se puede pagar ni cancelar» | `vista_previa_cancelacion` / `cancelar_reserva`; es la regla, no un fallo |
| El diálogo no abre | `ReservaAccionesViewModel.vistaPrevia` (el motivo queda en `mensaje`) |
| Canceló pero el reembolso dice «pendiente» | Tabla `refunds` y `procesarReembolso`; volver a cancelar lo reanuda |
| Los cupos no volvieron | `cancelar_reserva` (`update public.plan_dates`); ojo: **borrar** una reserva a mano no devuelve cupos |

---

## 6. Mapa de errores

El servidor devuelve un **código estable**; la app lo convierte en un `DiversoException` y
`mensajeUsuario` (`core/errors/mensaje_usuario.dart`) elige el texto en español. Las llamadas
RPC pasan por `DiversoException.fromPostgrest` y las Edge Functions por
`DiversoException.fromFunction` (ambas en `core/errors/diverso_exception.dart`).

| Código | Dónde se lanza | Mensaje que ve el viajero |
|---|---|---|
| `SIN_CUPO` | `create_booking` (SQL) | «Se acabaron los cupos para esa fecha. Prueba otra fecha u otro plan.» |
| `FECHA_YA_SALIO` | `create_booking` (0012) | «Esta salida ya partió. Elige otra fecha.» |
| `RESERVA_YA_SALIO` | `crear_intento_pago` vía `pagos-iniciar` (0012); `cancelar_reserva` y `vista_previa_cancelacion` (0008) | «Este viaje ya salió, así que la reserva ya no se puede pagar ni cancelar.» |
| `RESERVA_PENDIENTE_EXISTENTE` | `create_booking` (0005); `CheckoutViewModel.pagar` la atrapa y muestra el aviso de la reserva pendiente | «Ya tienes una reserva pendiente de pago para esta fecha. Complétala o cancélala para empezar de nuevo.» |
| `RESERVA_VENCIDA` | `crear_intento_pago` (30 min) y `pagos-verificar` (409 si el pago llegó tarde) | «Tu reserva venció (los cupos se retienen 30 minutos). Vuelve a reservar.»; si el pago llegó tarde: «Tu pago llegó cuando la reserva ya había vencido… Te lo devolvemos automáticamente» |
| `MONTO_NO_COINCIDE` | `pagos-verificar` (409) tras `aplicar_resultado_pago` | «El monto de la transacción no coincide con el de tu reserva, así que no la confirmamos. Contacta a soporte con tu referencia.» |
| `REDIRECT_NO_PERMITIDO` | `pagos-iniciar` (400) | «Esta dirección de la app no está autorizada para pagos de prueba.» |
| `SOLO_MODO_PRUEBA` | `cargarConfig` (`_shared/config.ts`), al inicio de **todas** las Edge Functions de pagos (503) | «La pasarela de prueba no está configurada.» |
| `NOTAS_CON_POLITICA` | Disparador `plans_sincronizar_politica` (0007) al guardar un plan; **no** es del flujo del viajero | Lo muestra el panel de agencias (`apps/panel_svelte/src/lib/api.ts`): «Las notas no pueden contener reglas de reembolso; usa los campos de horas y porcentaje.» |

Dos reglas para códigos que no están en la tabla:

- Un código que la app no conoce se muestra como «Algo salió mal (CÓDIGO). Intenta de nuevo.».
- Un error de Postgres sin código conocido llega como `ERROR_BD` («Error de conexión. Revisa tu
  internet e intenta de nuevo.»); un fallo que no es ni de Postgres ni de una función llega como
  `ERROR_INESPERADO`.

**Para añadir un código nuevo:** lánzalo en el SQL o en la Edge Function, añádelo a la lista
`conocidos` de `DiversoException.fromPostgrest` (si viene de una RPC), escribe su texto en
`mensajeUsuario` y pruébalo en `packages/diverso_core/test/`.

---

**Anterior:** [4. Herramientas y pruebas](04-herramientas-y-pruebas.md) ·
**Volver al** [plan de aprendizaje](README.md)

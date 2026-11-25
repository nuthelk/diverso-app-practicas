# Código de la app del viajero en inglés

Renombrar a inglés los identificadores de `apps/viajero` (funciones, variables, estados, props, tipos, clases, parámetros, archivos y carpetas). Comentarios y textos de la interfaz quedan en español.
Rama `feat/viajero-diseno`.

## Specs

- S1 Pedido: «me estas programando en español. los comentarios si pero porque funciones, estados y variables en español» → «Sí, a inglés».
- S2 Qué NO cambia (son textos o API pública, no identificadores):
  - Textos que ve el usuario, comentarios y descripciones de los tests.
  - Rutas de Expo Router: los archivos de `src/app/` mantienen su nombre porque son las URLs (`/agencias`, `/reservas`, `/perfil`, `/legal/[doc]`, `/consentimiento`, `/pago/resultado`, `/reserva/[bookingId]`…). `/pago/resultado` está en la allowlist de redirects de Wompi. El parámetro de query `desde` tampoco cambia.
  - Columnas de Supabase, nombres de RPC y edge functions, y los VALORES de los enums (`'pendiente_pago'`). Se renombra la propiedad del modelo y la CLAVE del enum; el mapeo fila ↔ modelo queda en `fromMap`/`toMap`.
  - `testID`s (son strings).
- S3 Convenciones de archivos (las de hoy): componentes y vistas `PascalCase.tsx`, hooks `useXxx.ts`, el resto `kebab-case.ts`. Tests: mismo nombre que el archivo que prueban.
- S4 Herramienta: `renombrar.mjs` (servicio de lenguaje de TypeScript, como «Rename Symbol» de VS Code; mover reescribe imports, `require`, `jest.mock` y `jest.requireActual`). Nada de buscar y reemplazar a ciegas.

## Glosario

| Español | Inglés |
|---|---|
| reserva | booking |
| plan, fecha del plan | plan, planDate |
| agencia | agency |
| viajero | traveler |
| reseña, calificación | review, rating |
| consentimiento, autorización | consent |
| documento legal | legal document |
| pago, pasarela | payment, gateway |
| reembolso | refund |
| cancelación, vista previa | cancellation, preview |
| catálogo, búsqueda, filtros | catalog, search, filters |
| destino | destination |
| comparar, comparador | compare, comparator |
| cupo(s) | spots (`availableSpots`) |
| personas | travelers (`pax` se mantiene donde ya existe) |
| precio, monto, total | price, amount, total |
| itinerario, paso | itinerary, step |
| punto de encuentro | meeting point |
| sesión, perfil, cuenta | session, profile, account |
| inicio de sesión, registro | sign in, sign up |
| aviso (flotante) | snackbar / notice |
| bandeja | tray |
| barra (inferior/superior) | bar (bottom/top) |
| tarjeta | card |
| cabecera (colapsable) | header (collapsible) |
| portada, foto | cover, photo |
| insignia, sello, píldora | badge, seal, pill |
| deslizador, selector | slider, picker |
| estado vacío | empty state |
| esqueleto | skeleton |
| cargar, cargando, recargar, refrescar | load, loading, reload, refresh |
| enviar, publicar | submit, publish |
| volver, ir a | goBack, goTo |
| abrir, cerrar, mostrar, ocultar | open, close, show, hide |
| agregar, quitar, limpiar | add, remove, clear |
| estado (de una reserva/pago) | status |
| mensaje, texto, etiqueta, título | message, text, label, title |
| tema, modo, claro, oscuro | theme, mode, light, dark |
| fondo, borde, sombra | background, border, shadow |
| alto, ancho, tamaño | height, width, size |
| ruta, ubicación, destino seguro | route, location, safeDestination |
| guard de sesión | sessionRedirect |
| raíz de composición, dependencias | composition root, dependencies |
| compartido | shared |
| reloj (inyectable) | clock |
| hoy, salida, ya salió | today, departure, hasDeparted |
| vigente | active / valid |

## Tasks

- T1 [x] Herramienta `renombrar.mjs` validada: símbolo + mover sobre el proyecto real, tsc limpio y 1095 tests verdes; revertida — inline — commit: —
- T2 [x] `src/core` + `tests/core` + fakes de `tests/support` que solo usa core — worker — commit: 22409aa, 182857a, e1f899f, 2e0d568, 84bc203, 504f48e
- T3 [ ] `src/ui` + `tests/ui` — worker — commit: —
- T4 [ ] `src/features/{auth,legal,profile,shell,compartido→shared}` + sus tests — worker — commit: —
- T5 [ ] `src/features/{catalog,plan,agencies}` + sus tests — worker — commit: —
- T6 [ ] `src/features/{checkout,bookings}` + sus tests — worker — commit: —
- T7 [ ] `src/router`, `src/composition`, identificadores internos de `src/app`, `tests/support`, `tests/app` + barrido final de identificadores en español — worker — commit: —
- T8 [ ] Verificación: tsc, jest completo, app en el emulador — inline — commit: —

## Log

- L1 (evidencia): el código Flutter ya mezclaba idiomas (`Booking`, `AgencyAvatar` junto a `BandejaComparar`, `crearReserva`); el port se hizo 1:1 por trazabilidad.
- L2 (herramienta): `getEditsForFileRename` de TypeScript tardaba ~3 min por archivo movido; se reemplazó por una reescritura propia de especificadores resueltos con `ts.resolveModuleName` (2,6 s). Renombrar símbolos: ~0,1 s por operación, todas calculadas sobre la misma versión del programa.
- L3 (herramienta, T2): `renombrar.mjs` corregido: (a) el regex de candidatas tenía `\w` dentro de un template (= `w`), así que encontraba el nombre dentro de otros identificadores; (b) propiedades abreviadas con la semántica de VS Code (`{ x }` → `{ prop: local }`; si se renombran ambos lados en la misma tanda se combinan): renombrar una variable ya no cambia la clave de un objeto mandado a Supabase (`{ nombre }` en `signUp`, `calificacion` en `insert`); (c) con `"todos"` no arranca desde claves de objetos literales sin tipo (filas de BD en tests); (d) nunca escribe dentro de un string (TS ligaba `'plan_dates.fecha'` de postgrest-js a `PlanQueryParams.fecha`). Extras: `RENOMBRAR_DIFF=1` en `--dry` imprime las líneas cambiadas.
- L4 (nombres T2 fuera del glosario): `Fila`→`Row` (`texto/entero/decimal…`→`asString/asInt/asDouble…`, `listaDe`→`listOf`), `Publico`→`Public`, `AgenciaResumen`→`AgencySummary`, `OrdenCatalogo`/`OrdenAgencias`→`CatalogSort`/`AgencySort`, `CheckoutIniciado`→`StartedCheckout`, `PagoVerificado`/`EstadoPago`→`VerifiedPayment`/`VerifiedPaymentStatus`, `EstadoReembolso`→`RefundStatus` (`noAplica`→`notApplicable`; el valor sigue `'noAplica'`), `ETIQUETA_REEMBOLSO`→`LABEL_REFUND_STATUS`, `ErrorFuncion`→`FunctionError`, `DiversoError.mensaje`→`rawMessage` (`message` ya es de `Error`), `detalle`→`details`, `mensajeDeError`→`userMessageFor`, `mensajeUsuario`→`userMessage`, `horaSalidaMinutos`→`departureMinutes`, `salidaAt`→`departureAt`, `retencionMs`→`holdMs`, `venceAt`/`expiraAt`→`expiresAt`, `esFutura`→`isUpcoming`, `vigente()`→`isActive()`, `puedeResenar`→`canReview`, `tieneResena`/`conResena()`→`hasReview`/`withReview()`, `matriculaCamaraComercio`→`commercialRegistration`, `rntVigenteHasta`→`rntValidUntil`, `incluyeComida`/`incluyeHospedaje`→`includesFood`/`includesLodging`, `codigo`→`code`, `usuarioId`→`currentUserId`, `reservasDe/resenasDe/pendientesDe`→`bookingsOf/reviewsOf/pendingOf`, `planesPublicados`→`publishedPlans`, `ParametrosPlanes`→`PlanQueryParams` (`desde`→`from`), `iniciar/verificar`→`start/verify`, `porPlan`→`byPlan`, `hoyBogota`→`todayInBogota`, `sinCortes`→`noLineBreaks`, `formatFecha{Corta,Larga,Texto}`→`format{ShortDate,LongDate,DateInText}`; dobles: `crearSupabaseFalso`→`createFakeSupabase` (`PedidoHttp`→`HttpRequest`, `ruta/cuerpo`→`path/body`), `EdgeFunctionsFalsas`→`FakeEdgeFunctions` (`llamadas`→`calls`), `errores.ts`→`errors.ts`.
- L5 (T2, fuera del alcance pero acoplado por estructura): `AgenciaAvatarDatos.initials` y `PasoItinerarioDatos.time/activity` (ui), claves string de `Pick<Public<…>, '…'>` y de `jest.spyOn` en features, tipos de parámetros de los dobles `auth-falso`/`catalogo-falso`/`reservas-falsas`, `toEqual`/`toMatchObject` sin tipo, la ruta del test del panel (`apps/panel/tests/unit/features/legal/model/legal.test.ts` lee `legal-document.ts` y busca `LEGAL_VERSION`) y el README. Variables de features que quedaron como `{ title: titulo }`: las renombran T3–T7.

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
- T3 [x] `src/ui` + `tests/ui` (incluido `tests/ui/support`) — worker — commit: 281c529, 1decf9b, e8d26bb, 8d4c081, 1ea3f99
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
- L6 (nombres T3 fuera del glosario): archivos `theme/{colores,medidas,tipografia,sombras,movimiento,fuentes,tema}.ts`→`{colors,metrics,typography,shadows,motion,fonts,theme}.ts`, `Icono`→`Icon`, `material/{Botones,Superficies}`→`{Buttons,Surfaces}`, `CabeceraColapsable`→`CollapsibleHeader`, `TituloPagina`→`PageTitle`, `PuntajePlan`→`PlanScore`, `tests/ui/support/conTema.tsx`→`render-with-theme.tsx` (`renderConTema`→`renderWithTheme`, `insetSuperiorDePrueba`→`testTopInset`, `icono(s)`→`icon(s)`), tests `componentes/tipografia/transiciones/compartidos/precio_puntaje`→`components/typography/transitions/shared/price-score`. Tema: `Tema`→`Theme` (`brillo`→`brightness`, `fondoPagina`→`pageBackground`, `colorTexto`→`textColor`, `componentes`→`components`, `opacidadPresionado`→`pressedOpacity`, `radio`→`radius`, `bordeFoco/bordeError/bordeFocoError`→`focusBorder/errorBorder/focusErrorBorder`, `cursorError`→`errorCursor`, `colorSeleccionado/NoSeleccionado`→`selectedColor/unselectedColor`, `pesoSeleccionado/peso`→`selectedWeight/weight`, `iconoSeleccionado`→`selectedIconColor`), `temaClaro/Oscuro/Para`→`lightTheme/darkTheme/themeFor`, `ModoTema`→`ThemeMode` (`modoInicial`→`initialMode`), `Brillo`→`Brightness`, `AppRadios`→`AppRadii`, `seedViajero`→`seedTraveler`, `conAlfa`→`withAlpha`, `claro/oscuro` (claves)→`light/dark`, `DiversoColors`: `dorado`→`gold`, `estado{Confirmada,Pendiente,Cancelada,Cerrada}`→`status{Confirmed,Pending,Cancelled,Closed}`, `pocosCupos`→`fewSpots`, `selloSobreFoto/controlSobreFoto`→`sealOverPhoto/controlOverPhoto`, `sombraInsignia`→`badgeShadow`, `paletaAgencias`→`agencyPalette`. `AppText`: `nota/etiqueta/leyenda/detalle/cuerpo/enfasis/subtitulo/encabezadoX/tituloPagina/cifra/emojiFoto/marca`→`note/label/caption/detail/body/emphasis/subtitle/headingX/pageTitle/figure/photoEmoji/brand`, con «Grande»/«Chico» como prefijo `large…`/`small…` (`cuerpoChico`→`smallBody`, `leyendaGrande`→`largeCaption`; NO `bodySmall`, que es otra cosa en `textTheme`). `AppInsets`: `lista/listaConAire/entreTarjetas/tarjeta/tarjetaAmplia/tarjetaGrande/contenido/pantalla`→`list/roomyList/betweenCards/card/wideCard/largeCard/content/screen`. Tipografía: `altura` (multiplicador de `TextStyle.height`) → `height` en `TypographyStyle`, `BaseTextStyle` y la prop de `Text` (`<Text height={1.45}>`, como Flutter; `textTheme` no se esparce en estilos de RN, verificado), `variante`→`variant`, `PesoFuente`→`FontWeight`, `EstiloBaseTexto`→`BaseTextStyle`, `Plataforma`→`PlatformName` (evita chocar con `Platform` de RN), `resolverEstiloTexto`→`resolveTextStyle`, `familiaRoboto/Monospace`→`robotoFamily/monospaceFamily` (`otras`→`others`), `pesoNumerico`→`numericWeight`; `DefaultTextStyle estilo`→`style`. Movimiento: `Curvas/Duraciones/TransicionesDePagina/opcionesDePantalla/intervalo`→`Curves/Durations/PageTransitions/screenOptions/interval`, `puntos`→`points`, `duracion/duracionVuelta/entrada/salida`→`duration/reverseDuration/enter/exit`, `translateXFraccion`→`translateXFraction`, claves de `Durations` (`chipCategoria`→`categoryChip`, `bandejaComparar`→`compareTray`, `aparecer`→`appear`, `campoTexto`→`textField`…). `Sombras`→`Shadows` (`insignia/bandeja/appBarDesplazada`→`badge/tray/scrolledAppBar`), `fuentesDeLaApp/useFuentesDiverso`→`appFonts/useDiversoFonts`. Componentes: `IconoNombre`→`IconName`, `glifoDe`→`glyphOf`, `colorDeAgencia`→`agencyColor`, `AgenciaAvatarDatos`→`AgencyAvatarData`, `BotonProps`→`ButtonProps`, `Segmento`→`Segment` (`valor/etiqueta`→`value/label`), props de chip `onBorrar/etiquetaBorrar/estiloEtiqueta/denso`→`onDelete/deleteLabel/labelStyle/dense`, `SegmentedButton` `segmentos/seleccionado/onCambio/mostrarIconoSeleccionado`→`segments/selected/onChange/showSelectedIcon`, `TextField` `lineas/deshabilitado`→`lines/disabled`, `medidasCampo`→`fieldMetrics` (`arriba/abajo/altoCaja/topReposo/topFlotando`→`top/bottom/boxHeight/restingTop/floatingTop`), `medidasCabecera`→`headerMetrics` (`colapso/solido/alturaVisible/opacidadFoto/desplazamientoFoto`→`collapse/solid/visibleHeight/photoOpacity/photoOffset`), `CollapsibleHeader` `fondo/alturaExpandida`→`background/expandedHeight`, `estiloTituloPagina`→`pageTitleStyle`, `PasoItinerario`→`ItineraryStepRow` (choca con el modelo `ItineraryStep`; `paso/ultimo`→`step/isLast`, `PasoItinerarioDatos`→`ItineraryStepData`), `TarjetaCancelacion`→`CancellationCard`, `VerifiedBadge` `compacto/blanco`→`compact/onPhoto` (dice para qué es, no el color), `EstrellasCalificacion`→`ReviewStars` (`RatingStars` ya existía), `InsigniaNueva`→`NewBadge`, `calificacion/mostrarNumero`→`rating/showNumber`, `PriceText` `monto/alineado`→`amount/align`, `PlanScore` `detallado`→`detailed`; locales `estilos`→`styles`, helper de tests `estilo`→`styleOf`.
- L7 (lecciones T3): (a) `"todos": true` salta claves de objetos sin tipo, y eso incluye las de `StyleSheet.create` (el tipo es el genérico inferido): van con op por línea. (b) En una propiedad abreviada (`return { arriba }`, `const { solido } = f()`) el servicio de lenguaje siempre renombra la VARIABLE; para renombrar la propiedad hay que arrancar desde un acceso `obj.prop` (p. ej. `m.colapso` en el test) y, en la misma tanda, la variable con `"todos"`: se combinan en `{ collapse }`. Si no hay acceso (`fieldMetrics`), se juntó a mano. (c) Arreglado a mano lo que la herramienta no sigue: el `useMemo(() => ({ modo, setModo, brillo }))` sin tipo de `ThemeProvider`, `SEGMENTOS` de `AgenciasView` (`{ valor, etiqueta }` sin tipo), las claves de `toEqual/toMatchObject` de los tests de tema y la prop `estilo` del doble de `StatusBar`. (d) Quedan en español a propósito: testIDs (`icono-<nombre>`, `cabecera-titulo`, `sufijo`, `etiqueta-flotante`, `tarjeta-cancelacion`, `insignia-nueva`…), textos visibles (`'Eliminar'`, `'Volver'`, `'Nueva'`) y nombres de Flutter citados en comentarios (`TituloPagina.estilo(cs)`, `colorDeAgencia` de Dart). Los comentarios de `motion.ts`/`shadows.ts` citan componentes de features (`ChipCategoria`, `BarraReserva`, `Aparecer`, `EstadoReservaPill`) que renombran T4–T6. Variables de features que quedaron como `{ mode: modo }`, `onBack={onVolver}`… las renombran T4–T7.

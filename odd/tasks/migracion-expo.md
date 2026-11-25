# Migración de la app del viajero: Flutter → React Native + Expo

Reescribir `apps/viajero` (Flutter) y `packages/diverso_core` (Dart) en React Native + Expo + TypeScript, sin perder funcionalidad ni diseño.
Rama `feat/migracion-expo` (sale de `main` @ a4d1cca). Mientras dura la migración, la app nueva vive en `apps/viajero_expo` y la de Flutter queda como referencia; al alcanzar paridad se borra Flutter y la nueva pasa a `apps/viajero`.
`apps/panel_svelte` queda fuera: no es Flutter.

Especificación funcional y de diseño (fuente de verdad para portar):
- `docs/migracion-expo/inventario-viajero.md`: rutas, pantallas, ViewModels, tokens de diseño resueltos y gotchas.
- `docs/migracion-expo/inventario-core.md`: modelos, repositorios, consultas Supabase, edge functions y gotchas.

## Specs

- S1 Pedido: «Necesito que pasemos toda la app que esta en flutter a react native con expo, si o si lo necesito pues necesito sustentar mi proyecto y no conozco flutter asi que no quiero opciones solo cambiarlo a expo y necesito que lo hagas sin perder funcionalidad ni diseño, tambien necesito que escojamos una arquitectura y patron»
- S2 Arquitectura (decidida, sin menú de opciones por pedido de S1): **por funcionalidad (Screaming Architecture) en capas**, la misma idea que ya usa `apps/panel_svelte`. Las carpetas gritan el negocio (catálogo, reservas, checkout…), no el framework.

  ```
  apps/viajero_expo/
  ├── src/
  │   ├── app/                  ← Expo Router: SOLO rutas, layouts y guards (cada archivo re-exporta una pantalla)
  │   │   ├── _layout.tsx       ← providers raíz: dependencias, tema, sesión, consentimiento
  │   │   ├── login.tsx, consentimiento.tsx, legal/[doc].tsx
  │   │   ├── (tabs)/_layout.tsx, index.tsx, agencias.tsx, reservas.tsx, perfil.tsx
  │   │   └── plan/[id].tsx, checkout/…, pago/resultado.tsx, reserva/[bookingId].tsx, …
  │   ├── core/                 ← port de diverso_core: TypeScript puro, SIN React
  │   │   ├── config/  models/  errors/  utils/  legal/  comparison/
  │   │   └── data/services/ (supabase, edge functions)  data/repositories/
  │   ├── ui/                   ← sistema de diseño compartido
  │   │   ├── theme/            ← tokens resueltos claro/oscuro, tipografía, espacios, radios, movimiento
  │   │   └── components/       ← feedback, page, plan, rating, Text base, logo
  │   ├── features/<funcionalidad>/
  │   │   ├── views/            ← pantallas (presentación pura)
  │   │   ├── view-models/      ← hooks useXxxViewModel (estado + comandos)
  │   │   └── components/       ← piezas propias de la funcionalidad
  │   └── composition/          ← raíz de composición: crea los repos una vez y los provee por Context
  └── tests/                    ← espejo de src (igual que el panel)
  ```
- S3 Patrón (decidido): **MVVM + Repository + inyección de dependencias por Context**. Mapeo 1:1 con lo que ya hace Flutter, para que el comportamiento sea el mismo y se pueda explicar en la sustentación:

  | Flutter (antes) | React Native (ahora) | Responsabilidad |
  |---|---|---|
  | `StatelessWidget` / `XxxView` | componente `XxxView.tsx` | Pinta estado, no decide nada |
  | `ChangeNotifier` ViewModel | hook `useXxxViewModel()` | Estado de la pantalla + comandos (cargar, reservar, cancelar…) |
  | `Repository` de diverso_core | clase `XxxRepository` en `core/data/repositories` | Única puerta a los datos; mapea filas → modelos y errores → `DiversoError` |
  | `Service` / `Api` | `core/data/services` | Habla con supabase-js y edge functions |
  | `provider` (`MultiProvider`, `context.read`) | `DependenciesProvider` + `useDependencies()` | Inyección: en tests se pasan repos falsos |
  | ViewModels globales (`ThemeMode`, `Consent`) | Context providers globales | Estado que comparten varias pantallas |
  | `go_router` + `sesion_redirect` | Expo Router + guard puro `sesionRedirect()` | Navegación por archivos + reglas de acceso testeables |

  Por qué así y no otra cosa: (1) las dependencias apuntan hacia adentro (vista → VM → repo → servicio) y el `core` no conoce React, así que se testea sin renderizar; (2) cada VM se prueba con `renderHook` y repos falsos, igual que los tests Flutter usaban fakes; (3) no suma una librería de estado: lo que la app necesita es estado por pantalla y tres estados globales, y Context alcanza.
- S4 Stack: Expo (SDK estable más reciente) + Expo Router + TypeScript `strict`; `@supabase/supabase-js` con sesión en AsyncStorage; `react-native-webview` (pago Wompi en móvil); `expo-linking`; `expo-haptics`; `@expo/vector-icons` (MaterialIcons, mismos íconos); Roboto vía `expo-font` (Android y web; iOS usa la fuente del sistema, como Flutter). Tests: `jest-expo` + `@testing-library/react-native`. Config por `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_KEY`.
- S5 Paridad: comportamiento y textos idénticos a Flutter, salvo el bug de lectura de la agencia en reservas (`agency:agencies(*)` vs `map['agencies']`), que se corrige porque nunca fue comportamiento deseado. El nombre del autor de reseñas ajenas (bloqueado por RLS de `profiles`) se mantiene como está: arreglarlo cambia permisos de la base y va aparte.

## Tasks

- T1 [x] Scaffold `apps/viajero_expo`: Expo + Router + TS strict, dependencias de S4, jest, alias `@/`, árbol de S2 vacío, `.env.example` — S2, S4 — worker — commit: 991fb28
- T2 [x] Portar `core` (modelos, errores, utils de fecha/moneda en hora de Bogotá, legal, comparison, servicios, repos) con sus tests — S3, S5 — worker — commit: fc42f56, 5b38845, 0b68ebf (134 tests Dart portados + extras; 264 en tests/core)
- T3 [x] Sistema de diseño: tokens resueltos claro/oscuro, `Text` base (1.43 / 0.25), componentes compartidos, logo — S2 — worker — commit: f65d1e5, 9faf6c0 (119 tests en tests/ui)
- T4 [x] Raíz de composición, tema, sesión, consentimiento, guard `sesionRedirect` + `destinoSeguro`, shell de pestañas, login, consentimiento, legal, 404 — S3 — worker — commit: e13ac0d, 3f14435, d4ff14a, 7292ce4
- T5 [x] Catálogo, comparador, agencias, ficha del plan — S3 — worker — commit: 638d415, 62de931, 8b056b7, d7bb48a, 578e4da
- T6 [x] Checkout, pago Wompi (WebView móvil / misma pestaña en web), resultado, confirmación — S3 — worker — commit: 91d3366, 15945f6, ca3f5c8
- T7 [x] Reservas, detalle, cancelación, reseña, perfil — S3, S5 — worker — commit: 5f686f3, 4e0f75c, ee0566a, 5cd4c7f, c5d02d8, fcd2456
- T8 [~] Verificación de paridad: tests, `tsc --noEmit`, app corriendo en web contra Supabase local, recorrido pantalla por pantalla — S1 — inline — commit: — (1016/1016 tests, tsc limpio con los tipos de rutas generados — 38cf0ca; web: login claro/oscuro/ancho/angosto, registro, legal y guard sin sesión OK. Falta el recorrido con sesión, que necesita el Supabase de Diverso levantado)
- T9 [ ] Limpieza: borrar Flutter, `viajero_expo` → `viajero`, redirigir los tests del panel que leen `diverso_core` (logo y legal) y `tools/iconos` — S1 — worker — commit: — (requiere OK del usuario)

## Log

- L1 (usuario): pedido S1.
- L2 (evidencia): `apps/viajero` = 147 archivos Dart (~12 000 líneas) entre app y core; 55 archivos de test en la app y 16 en core. El panel Svelte no importa `diverso_core`, pero `legal.test.ts`, `Logo.test.ts` y `tools/iconos/generar_iconos.py` leen archivos del paquete (por eso T9 los redirige antes de borrar).
- L3 (evidencia): bugs heredados de Flutter encontrados en el inventario: agencia nunca visible en reservas (se corrige, S5) y autor de reseñas ajenas en null por RLS (se mantiene, S5).
- L4 (contexto): apareció `apps/panel/` sin trackear en la carpeta (no lo creó esta migración); no se toca ni se commitea desde aquí.
- L5 (verificación orquestador tras T2+T3): `npm test` 38 suites / 384 tests verdes; `tsc --noEmit` limpio.
- L6 (decisiones T2): enums `as const` con el valor de la BD; `Plan.horaSalidaMinutos`; `react-native-url-polyfill/auto` (postgrest-js modifica `searchParams` con valores no ASCII); S5 corregido con `plan:plans(*, agencies(*))`. En nativo falta `startAutoRefresh/stopAutoRefresh` según `AppState` (va en T4).
- L7 (decisiones T3): sonda con `flutter test` para §3.7: botones y chips NO heredan la altura 1.43; InputChip transparente; `DiversoLogo` es `logo_diverso.png` teñido. @expo/vector-icons no trae variantes Rounded/Outlined de Material: `*_rounded` → glifo filled, `*_outlined` → MaterialCommunityIcons; `payments_outlined` y `travel_explore_outlined` quedan filled.
- L8 (T5–T7 en paralelo, superficies disjuntas): sin dependencias cruzadas entre features en Flutter salvo `agencies` → `catalog/plan_card` (ambas en T5). Reemplazos de go_router: `extra` → stores en memoria que solo se usan si coinciden los ids (`planes-para-comparar.ts`, `paso-entre-pantallas.ts`); `pop(true)` → `devolverResultado`/`useAlVolver` consumido en `useFocusEffect`; SnackBar → `features/compartido/aviso-flotante.tsx`. Bugs latentes de Flutter corregidos: `context.pop()` sin comprobar en la ficha (→ `volverSeguro`), «(intento N)» del resultado del pago que nunca se pintaba. `react-native-webview` se carga con `require` al abrir el pago (importarlo arriba rompe Jest).
- L9 (verificación orquestador): `npx jest` 89 suites, 1015/1016; `tsc --noEmit` limpio; árbol limpio. Rojo: «V1: aceptado, el enlace original se conserva» en `tests/app/consentimiento.test.tsx`, que todavía espera el placeholder de ReservaDetalleView (T7 lo detectó; su edición fue bloqueada por permisos y queda a decisión del usuario). `PantallaPendiente.tsx` solo lo usa ese test: se borra junto con ese ajuste.
- L10 (evidencia web): `expo start --web --port 8080` sin errores de consola. El Supabase local que corre es de otro proyecto (`english-exams`), así que no se probó con sesión. Para el pago en web local: puerto 8080 (está en la allowlist por defecto de `pagos-iniciar`) o sumar `http://localhost:8081/` a `PAGOS_REDIRECT_ALLOWLIST`.
- L11 (usuario: «Sí, arreglalo»): el test V1 «aceptado» y las demás aserciones `mockMontadas` contaban montajes de `PantallaPendiente`; sin placeholders quedaban siempre en `[]` (pasaban sin probar nada). Se reemplazan por un registrador de repositorios: «no carga datos» = `cargas` vacío, y «aceptado» exige exactamente `BookingRepository.reserva("b-1")`. `PantallaPendiente.tsx` borrado (38cf0ca).
- L12 (evidencia): `expo start` genera `.expo/types/router.d.ts` (typedRoutes) y desde ahí `router.push(string)` no tipa: aparecieron 2 errores de `tsc` en tests que antes no se veían. Se sigue la convención de `src` (`AppRoutes.x(...) as Href`). Pendiente de diseño, no bloqueante: que `AppRoutes` devuelva `Href` y desaparezcan los `as Href` repartidos.

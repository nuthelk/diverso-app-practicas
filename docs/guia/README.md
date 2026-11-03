# Guía: entender Diverso App y aprender Flutter

Una guía para entender cómo funciona la app del viajero de Diverso y aprender Flutter y Dart
usando **su propio código**. Está escrita para quien ya sabe React Native y TypeScript, y cada
concepto se explica a partir de lo que ya conoces.

**Camino corto:** corre la app ([abajo](#antes-de-empezar-correr-la-app-y-las-pruebas)) y sigue
las 8 sesiones del [plan de aprendizaje](#plan-de-aprendizaje) en orden. Cada una te dice qué leer,
qué hacer y cómo saber que ya la entendiste.

## Para quién es

- Llevas tiempo con **React Native y TypeScript** y **no conoces Flutter ni Dart**.
- Prefieres aprender con una app real, con rutas reales, que con ejemplos de juguete.
- No necesitas conocer el backend: la guía solo toca Supabase donde la app lo llama.

Qué **no** cubre: el panel Flutter legado (`apps/panel_agencias`), las migraciones SQL ni las Edge
Functions. Para eso está el [README principal](../../README.md).

**¿Vienes por el panel de agencias en Svelte (`apps/panel_svelte`)?** Tiene su propia guía, escrita
igual (desde React y TypeScript, con el código real del panel): la
[guía de Svelte 5 y del panel](svelte/README.md), con 6 sesiones, SvelteKit estático (rutas por
carpetas), la arquitectura por funcionalidad y cómo probarlo.

## La app en 5 líneas

1. **Diverso App** es un marketplace de dos lados: viajeros del Valle de Aburrá y agencias
   turísticas antioqueñas **verificadas** (RNT + Cámara de Comercio).
2. **`apps/viajero`** es la app Flutter (Android, iOS y web): catálogo con buscador y filtros,
   comparador, ficha del plan, reserva, pago, "Mis reservas" con cancelación y reseñas verificadas.
3. **`packages/diverso_core`** es el paquete compartido: modelos, servicios y repositorios que
   hablan con el backend, utilidades y el logo.
4. El backend es **Supabase** (Postgres, Auth, funciones SQL y Edge Functions); reglas críticas
   como no vender más cupos de los que hay viven en la base de datos, no en la app.
5. **Todo el dinero es de prueba**: los pagos van por Wompi en modo sandbox.

## Cómo está organizada la guía

| Parte | Contenido | Estado |
|---|---|---|
| **Parte 1: aprender Flutter y Dart** (esta) | Los 4 capítulos de abajo y el plan de aprendizaje | Disponible |
| **Parte 2: Recorrido de Diverso** | Login, catálogo, reserva y pago, cancelación: el camino completo de cada flujo con las rutas finales | Próximamente, en la fase final del trabajo de arquitectura |

Capítulos de la parte 1:

| Capítulo | De dónde partes | A dónde llegas |
|---|---|---|
| [1. Dart para quien sabe TypeScript](01-dart-para-quien-sabe-typescript.md) | TypeScript | Leer cualquier archivo `.dart` del repo |
| [2. Flutter para quien sabe React Native](02-flutter-para-quien-sabe-react-native.md) | Componentes, hooks, flexbox | Leer y escribir widgets |
| [3. Estado, arquitectura y navegación](03-estado-arquitectura-y-navegacion.md) | Hooks, Context, expo-router | Saber dónde vive cada cosa y cómo viaja un dato |
| [4. Herramientas y pruebas](04-herramientas-y-pruebas.md) | npm, ESLint, Prettier, Jest | Analizar, formatear y probar sin miedo |

> **La arquitectura se está reordenando.** Esta guía describe el repo en su estado actual. Las
> fases siguientes introducen *repositories*, mueven reglas y renombran archivos; el capítulo 3 lo
> marca con "Hoy" donde algo va a cambiar, y la guía se actualiza al terminar. Si una ruta ya no
> existe, busca la clase por nombre: `grep -rn "class NombreDeLaClase" apps packages`.

## Antes de empezar: correr la app y las pruebas

Los requisitos (Docker, Flutter, Supabase CLI) y los detalles están en el README principal, en
[Cómo correr (desarrollo local)](../../README.md#cómo-correr-desarrollo-local) y
[Pruebas](../../README.md#pruebas). No se repiten aquí; este es el resumen.

```bash
# Desde la raíz del repo, con Docker corriendo
supabase start

cd apps/viajero
flutter pub get
flutter run -d web-server --web-port=3000     # web: abre http://localhost:3000
```

**Emulador de Android** (el host del PC es `10.0.2.2`, no `127.0.0.1`):

```bash
flutter run -d emulator-5554 --dart-define=SUPABASE_URL=http://10.0.2.2:54331
```

- **¿Por qué el puerto 3000 en web?** El servidor solo acepta devolver al viajero, tras pagar, a
  una lista de URLs permitidas (README principal, "¿Por qué el puerto 3000?").
- **Cuenta para entrar:** `viajero@demo.com`, contraseña `demo1234` (otras cuentas en
  [Cuentas demo](../../README.md#cuentas-demo-contraseña-demo1234)).
- **Pagar** necesita llaves de Wompi de prueba; sin ellas la app arranca pero pagar responde
  `SOLO_MODO_PRUEBA` (README principal, "Configurar Wompi en modo prueba"). Para aprender no las
  necesitas.

**Pruebas.** Desde `apps/viajero`, sin Docker ni red:

```bash
flutter test test/ui test/router
```

`flutter test` a secas también ejecuta las de `test/integration/`, que necesitan el Supabase local
(README principal, [Pruebas de la app del viajero](../../README.md#pruebas-de-la-app-del-viajero)).

## Plan de aprendizaje

Ocho sesiones, pensadas para 45–60 minutos cada una, en este orden. Ningún ejercicio cambia el
comportamiento de la app.

| # | Sesión | Lees | Haces |
|---|---|---|---|
| 1 | [Correr la app y ubicarte](#sesión-1-correr-la-app-y-ubicarte) | Cap. 3 §1–2 | Recorrer las 4 pestañas y mapearlas a archivos |
| 2 | [Dart I: tipos, null safety y clases](#sesión-2-dart-i-tipos-null-safety-y-clases) | Cap. 1 §1–7 | Leer `Plan` y correr sus pruebas |
| 3 | [Dart II: colecciones, async y streams](#sesión-3-dart-ii-colecciones-async-y-streams) | Cap. 1 §8–14 | Trazar el stream de sesión |
| 4 | [Widgets: del componente al `Widget`](#sesión-4-widgets-del-componente-al-widget) | Cap. 2 §1–7 | Leer el árbol de `PlanCard` |
| 5 | [Layout, tema y assets](#sesión-5-layout-tema-y-assets) | Cap. 2 §8–12 | Seguir el modo oscuro |
| 6 | [Estado: de un toque al view model](#sesión-6-estado-de-un-toque-al-view-model) | Cap. 3 §3–7 | Seguir un toque en el catálogo |
| 7 | [Navegación y sesión](#sesión-7-navegación-y-sesión) | Cap. 3 §8 | Seguir el `redirect` de sesión |
| 8 | [Herramientas y pruebas](#sesión-8-herramientas-y-pruebas) | Cap. 4 | Escribir tu primera prueba de widget |

Las rutas parten de la raíz del repo; `core` es `packages/diverso_core/lib/` y `viajero` es
`apps/viajero/lib/`.

---

### Sesión 1: correr la app y ubicarte

**Objetivo.** Tener la app andando y saber qué carpeta contiene qué.

**Lee.**
- Capítulo 3, secciones 1 y 2 (mapa de carpetas y capas).
- `apps/viajero/lib/main.dart` y `apps/viajero/lib/app.dart` (arranque).
- `apps/viajero/lib/router/app_router.dart` (solo mira la lista de rutas; las constantes están en `app_routes.dart`).
- `apps/viajero/lib/ui/features/catalog/views/catalog_view.dart` (solo hasta el primer `build`).

**Ejercicio.**
1. Levanta Supabase y la app en web (sección anterior) y entra con `viajero@demo.com`.
2. Recorre las cuatro pestañas (Explorar, Agencias, Reservas, Perfil). En la barra de direcciones
   verás la ruta de cada una.
3. Para cada pestaña apunta: la ruta, el `GoRoute` que la declara en `app_router.dart` y la vista
   que dibuja (`ui/features/<funcionalidad>/views/`).

**Ya lo entendí si…**
- [ ] Sin mirar, dices qué archivo dibuja el título "Descubre Antioquia".
- [ ] Dices qué hace `main.dart` antes de `runApp` y por qué `Supabase.initialize` va ahí.
- [ ] Distingues `apps/viajero` de `packages/diverso_core` y por qué hay dos paquetes.

---

### Sesión 2: Dart I: tipos, null safety y clases

**Objetivo.** Leer un modelo de datos de Dart sin tropezar con la sintaxis.

**Lee.**
- Capítulo 1, secciones 1 a 7.
- `core/models/plan.dart` (clases `ItinerarioPaso`, `PlanDate` y `Plan`).
- `core/models/enums.dart` (enums y extensiones).
- `core/utils/hora_bogota.dart` (una función con parámetro opcional).

**Ejercicio.**
1. En `plan.dart` identifica qué campos de `Plan` aceptan `null` (hay pocos) y explica por qué el
   resto usa `?? valor` dentro de `Plan.fromMap`.
2. Lee `Plan.salidaDe` y `Plan.yaSalio`. Antes de ejecutar nada, predice qué hace la prueba
   "salida exactamente ahora (15:30 Bogotá) → oculta".
3. Ejecuta y comprueba tu predicción:

   ```bash
   cd packages/diverso_core
   flutter test test/models/salida_plan_test.dart
   ```

**Ya lo entendí si…**
- [ ] Explicas la diferencia entre `final` y `const` con un ejemplo de `plan.dart`.
- [ ] Sabes qué hace `(map['resumen'] as String?) ?? ''` y por qué `as` puede fallar en ejecución.
- [ ] Explicas por qué `plan.fotoPrincipal!` necesita `!` en `plan_card.dart` (pista: es un
      getter, no una variable local).

---

### Sesión 3: Dart II: colecciones, async y streams

**Objetivo.** Leer código asíncrono y reactivo, y entender cómo la sesión del usuario llega al
router.

**Lee.**
- Capítulo 1, secciones 8 a 14.
- `core/data/repositories/catalog_repository.dart` (`search`, `agenciaConPlanes`).
- `core/data/repositories/auth_repository.dart` (`onAuthStateChanged`).
- `viajero/router/go_router_refresh_stream.dart` (la clase completa).
- `core/data/repositories/llamar_edge_function.dart` (`on … catch`) y
  `core/data/repositories/agency_repository.dart` (`typedef`).

**Ejercicio.**
1. Dibuja en papel la ruta: *Supabase emite un evento de sesión* -> `GoRouterRefreshStream` ->
   `notifyListeners()` -> *el router reevalúa el `redirect`*. Contrástalo con el capítulo 3,
   sección 8.
2. Ejecuta las pruebas de utilidades y modelos del núcleo y lee los nombres de las pruebas como
   si fueran documentación:

   ```bash
   cd packages/diverso_core
   flutter test test/utils test/models
   ```

**Ya lo entendí si…**
- [ ] Explicas la diferencia entre un `Future` y un `Stream` con un ejemplo del repo.
- [ ] Dices por qué `GoRouterRefreshStream.dispose` cancela la suscripción.
- [ ] Lees sin ayuda `final (filas, planes) = await (a, b).wait;`.

---

### Sesión 4: Widgets: del componente al `Widget`

**Objetivo.** Leer un widget de Flutter como lees un componente de React.

**Lee.**
- Capítulo 2, secciones 1 a 7.
- `viajero/ui/core/widgets/plan/price_text.dart` (el widget más simple).
- `viajero/ui/core/widgets/plan/verified_badge.dart`.
- `viajero/ui/core/widgets/feedback/skeleton.dart` (el único con estado).
- `viajero/ui/features/catalog/widgets/plan_card.dart` (la tarjeta del catálogo).

**Ejercicio.**
1. Traduce `PriceText` a JSX en papel: sus props, sus estilos y su jerarquía de vistas.
2. En `plan_card.dart` escribe el árbol de widgets de `PlanCard.build` con sangría, hasta tres
   niveles (`Card` > `InkWell` > `Column` > …).
3. Ejecuta la prueba de la tarjeta y localiza qué `expect` corresponde a qué widget:

   ```bash
   cd apps/viajero
   flutter test test/ui/core/widgets/rating/puntaje_nueva_test.dart
   ```

**Ya lo entendí si…**
- [ ] Explicas por qué `Skeleton` es un `StatefulWidget` y `PriceText` no.
- [ ] Dices qué consigue `const` cuando Flutter reconstruye el árbol.
- [ ] Explicas por qué el `Future` de `CheckoutLoader` se crea en `initState` y no en `build`.

---

### Sesión 5: Layout, tema y assets

**Objetivo.** Maquetar con `Row`, `Column`, `Stack` y leer colores del tema.

**Lee.**
- Capítulo 2, secciones 8 a 12.
- `viajero/ui/core/widgets/feedback/empty_state.dart`.
- `viajero/ui/core/widgets/section_label.dart`.
- `viajero/ui/core/theme/app_theme.dart` (solo `viajeroLight`, `viajeroDark` y `_build`).
- `viajero/app.dart`.

**Ejercicio.**
1. En la app, ve a Perfil y cambia entre "Sistema", "Claro" y "Oscuro". Mira cómo cambian los
   colores sin recargar.
2. Encuentra en `modo_oscuro_test.dart` el color que se comprueba y en `app_theme.dart` de dónde
   sale. Ejecútala:

   ```bash
   cd apps/viajero
   flutter test test/ui/core/theme/modo_oscuro_test.dart
   ```

3. En el navegador, ensancha y estrecha la ventana en Explorar: el catálogo pasa de lista a
   cuadrícula al superar `AppTheme.bpCompact` (decidido en `catalog_view.dart` con
   `MediaQuery.sizeOf(context).width`).

**Ya lo entendí si…**
- [ ] En `PlanCard`, dices qué widget cumple el papel de `position: 'absolute'` y cuál el de
      `justifyContent: 'space-between'`.
- [ ] Sabes de dónde sale `cs.primary` y qué significa el prefijo `on` de `cs.onSurface`.
- [ ] Sabes por qué un asset de `diverso_core` se pide con `package: 'diverso_core'`.

---

### Sesión 6: Estado: de un toque al view model

**Objetivo.** Seguir un toque desde la vista hasta Supabase y de vuelta a la pantalla.

**Lee.**
- Capítulo 3, secciones 3 a 7.
- `viajero/ui/features/catalog/view_models/catalog_view_model.dart`.
- `viajero/ui/features/catalog/views/catalog_view.dart` (`initState`, `dispose`,
  `ListenableBuilder` y `_ChipCategoria`).
- `viajero/ui/core/theme/theme_mode_view_model.dart` (el view model más pequeño).
- `viajero/main.dart` (los providers).

**Ejercicio.**
1. Con el código abierto, completa una tabla con cada flecha del recorrido B del capítulo 3
   (sección 7): *archivo y función* por paso. Empieza en `_ChipCategoria.onTap` y termina en
   `PlanCard`.
2. En la app, toca una categoría en Explorar y comprueba que ves primero los esqueletos de carga
   y luego las tarjetas filtradas.
3. Repite con el recorrido A (modo oscuro): ¿qué notifica, y qué widgets escuchan?

**Ya lo entendí si…**
- [ ] Dices qué pasaría si `cargar()` no llamara a `notifyListeners()` al terminar.
- [ ] Explicas por qué la vista llama a `dispose()` del view model.
- [ ] Distingues `context.read`, `Consumer` y `ListenableBuilder` y cuándo usar cada uno.

---

### Sesión 7: Navegación y sesión

**Objetivo.** Entender las rutas, las pestañas y la guardia de sesión.

**Lee.**
- Capítulo 3, sección 8.
- `viajero/router/app_router.dart` completo, y `app_routes.dart` y `sesion_redirect.dart`.
- `viajero/ui/shell/app_shell.dart` (la barra de pestañas).
- `apps/viajero/test/router/rutas_pago_test.dart` (cómo se prueba el router).

**Ejercicio.**
1. Ejecuta las pruebas del router y lee los nombres como una lista de comportamientos:

   ```bash
   cd apps/viajero
   flutter test test/router/rutas_pago_test.dart
   ```

2. En la app, ve a Perfil y pulsa "Cerrar sesión". La URL cambia a `/login` sin que navegues:
   es el `redirect` reaccionando al stream de la sesión. Vuelve a entrar y comprueba que `/login`
   te devuelve a `/`.
3. Elige una ruta con parámetro (por ejemplo `/checkout/:planId/:fechaId`) y rastrea qué vista
   la construye y qué hace esa vista con el id.

**Ya lo entendí si…**
- [ ] Dices qué impide que alguien sin sesión vea `/reservas`.
- [ ] Explicas la diferencia entre `context.push` y `context.go`.
- [ ] Explicas por qué una ruta que dependiera de `state.extra` se rompería al recargar la página
      en web y `/reserva/:bookingId` o `/comparar?ids=…` no.
- [ ] Dices qué pasa si falla la consulta del consentimiento (`ConsentViewModel`) y cómo se
      reintenta.

---

### Sesión 8: Herramientas y pruebas

**Objetivo.** Usar el ciclo diario (analizar, formatear, probar) y escribir una prueba propia.

**Lee.**
- Capítulo 4 completo.
- `apps/viajero/analysis_options.yaml`.
- `apps/viajero/test/ui/core/widgets/widget_test.dart`.
- `apps/viajero/test/ui/features/bookings/widgets/cancel_dialog_test.dart`.
- `apps/viajero/test/ui/features/bookings/view_models/bookings_view_model_test.dart`.

**Ejercicio.**
1. Desde `apps/viajero`, ejecuta `flutter analyze` y
   `dart format --output=none --set-exit-if-changed .`. Ambos deben terminar sin cambios.
2. Crea el archivo `apps/viajero/test/ui/core/widgets/mi_primera_prueba_test.dart` con tu primera
   prueba de widget:

   ```dart
   import 'package:flutter/material.dart';
   import 'package:flutter_test/flutter_test.dart';
   import 'package:viajero/ui/core/widgets/rating/rating_stars.dart';

   void main() {
     testWidgets('RatingStars muestra 3.5', (tester) async {
       await tester.pumpWidget(
         const MaterialApp(home: Scaffold(body: RatingStars(calificacion: 3.5, mostrarNumero: true))),
       );
       expect(find.text('3.5'), findsOneWidget);
     });
   }
   ```

3. Córrela con `flutter test test/ui/core/widgets/mi_primera_prueba_test.dart`. Cambia `3.5` por
   `4.0` en el `expect` y mira cómo falla. **Al terminar, borra el archivo**: es un ejercicio, no
   parte del repo.

**Ya lo entendí si…**
- [ ] Sabes qué tres comandos ejecutarías antes de dar un cambio por terminado.
- [ ] Dices la diferencia entre `pump` y `pumpAndSettle`.
- [ ] Explicas por qué los dobles de prueba del repo usan `implements` y `noSuchMethod`.

---

## Parte 2: Recorrido de Diverso (próximamente)

Llegará en la fase final del trabajo de arquitectura, cuando las carpetas y los nombres sean los
definitivos. Seguirá, con el código real y las rutas finales, cuatro flujos:

1. **Login** y registro con consentimiento legal.
2. **Catálogo**: búsqueda, filtros, comparador y ficha del plan.
3. **Reserva y pago**: del botón "Reservar" a la confirmación verificada por el servidor.
4. **Cancelación** y reembolso de prueba.

Cuando esté, la parte 1 se revisa para dejar sus rutas y nombres al día.

## Glosario

Los términos de Flutter están contados con el equivalente de React Native cuando existe.

### Flutter y Dart

| Término | Qué es |
|---|---|
| **Widget** | La unidad de interfaz de Flutter: una descripción inmutable de un trozo de pantalla. Como un componente (o un elemento JSX) |
| **StatelessWidget** | Widget sin estado propio. Como un componente de función sin hooks |
| **StatefulWidget** | Widget con estado: se escribe como dos clases, el widget y su `State`. Como un componente con `useState` |
| **`setState`** | Avisa al `State` de que cambió algo y vuelve a ejecutar `build`. Como el setter de `useState` |
| **`build`** | Método que devuelve el árbol de widgets de una pantalla. Como el `render` |
| **BuildContext** | La posición de un widget en el árbol; sirve para buscar hacia arriba el tema, un `Provider` o el router. Como `useContext` |
| **Key** | Identidad de un widget cuando el árbol cambia. Como `key` |
| **`const` (widget)** | Widget construido en compilación; Flutter lo salta al reconstruir. Se parece a `React.memo` |
| **Theme / ColorScheme** | El tema y su paleta de colores; se leen con `Theme.of(context)`. Como un `ThemeProvider` |
| **Future** | Un valor que llegará más tarde. Como una `Promise` |
| **Stream** | Una secuencia de valores en el tiempo (p. ej. el estado de sesión). Como un `Observable` |
| **Null safety** | Los tipos no aceptan `null` salvo que lleven `?` |
| **Extension** | Métodos añadidos a un tipo existente sin modificarlo |
| **Record** | Tupla con tipos, p. ej. `(Color, String)` |
| **pubspec.yaml** | Dependencias, versión de SDK y assets del paquete. Como `package.json` |
| **`--dart-define`** | Valor que se fija al compilar y se lee con `String.fromEnvironment` |
| **Hot reload / hot restart** | Recargar el código conservando (o reiniciando) el estado. Como Fast Refresh |
| **Golden** | Prueba que compara el widget pintado con una imagen de referencia. Como un snapshot, pero de imagen |
| **DevTools** | Panel de depuración (inspector de widgets, rendimiento, red) |

### Arquitectura de este repo

| Término | Qué es |
|---|---|
| **View** | Widget de pantalla: pinta y reenvía eventos. Vive en `views/` y `widgets/` |
| **ViewModel** | Clase `ChangeNotifier` con el estado y las acciones de una pantalla. Como un custom hook o un store |
| **ChangeNotifier** | Objeto que avisa con `notifyListeners()` cuando cambia |
| **ListenableBuilder** | Widget que se reconstruye cuando un `ChangeNotifier` avisa |
| **Provider** | Paquete que reparte objetos por el árbol. Como Context; se lee con `context.read<T>()` |
| **Service** (`*_api.dart`) | Clase que habla con el backend (Supabase, Edge Functions) y devuelve filas sin interpretar. Recibe el `SupabaseClient` por constructor. Vive en `diverso_core/lib/data/services` |
| **Repository** (`*_repository.dart`) | Capa entre el view model y el service: convierte las filas en modelos, concentra reglas de datos y traduce los fallos a `DiversoException`. Vive en `diverso_core/lib/data/repositories` |
| **Model** | Clase de datos del dominio (`Plan`, `Booking`…) con sus reglas simples |
| **Shell** | La estructura con barra de pestañas (`AppShell`) dentro de la que se muestran las pantallas principales |
| **PaymentGateway** | La única interfaz del repo: oculta cómo se paga (hoy, Wompi en sandbox) |

### Del dominio

| Término | Qué es |
|---|---|
| **RNT** | Registro Nacional de Turismo; una agencia verificada lo tiene vigente |
| **Cupo** | Plaza disponible en una fecha de un plan; no se puede reservar más de lo que hay |
| **Wompi** | Pasarela de pagos; aquí solo en modo prueba (sandbox) |
| **Edge Function** | Función del servidor de Supabase; las de pagos guardan los secretos que la app nunca ve |
| **RPC** | Función SQL que la app llama por nombre (p. ej. `create_booking`) |

---

**Empieza por** la [sesión 1](#sesión-1-correr-la-app-y-ubicarte).

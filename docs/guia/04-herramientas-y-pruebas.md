# 4. Herramientas y pruebas

Aquí está el día a día: instalar dependencias, ejecutar, revisar el código, darle formato y
probarlo. Todo se hace con dos comandos, `flutter` y `dart`, que ya trae el SDK.

> Volver al [plan de aprendizaje](README.md). Este capítulo cubre la sesión 8.
> Para correr la app y sus requisitos (Docker, Supabase) mira el
> [README principal](../../README.md#cómo-correr-desarrollo-local): aquí no se repite.

## Contenido

1. [Tabla de equivalencias](#1-tabla-de-equivalencias)
2. [`pubspec.yaml` y paquetes](#2-pubspecyaml-y-paquetes)
3. [Ejecutar y hot reload](#3-ejecutar-y-hot-reload)
4. [`flutter analyze` y los lints](#4-flutter-analyze-y-los-lints)
5. [`dart format`](#5-dart-format)
6. [`flutter test`: pruebas unitarias](#6-flutter-test-pruebas-unitarias)
7. [Pruebas de widgets](#7-pruebas-de-widgets)
8. [Pruebas de un view model](#8-pruebas-de-un-view-model)
9. [Goldens](#9-goldens)
10. [Pruebas de integración](#10-pruebas-de-integración)
11. [DevTools](#11-devtools)
12. [Antes de dar algo por terminado](#12-antes-de-dar-algo-por-terminado)

---

## 1. Tabla de equivalencias

| Node / React Native | Flutter / Dart | Comando |
|---|---|---|
| `package.json` | `pubspec.yaml` | |
| `package-lock.json` | `pubspec.lock` | |
| `npm install` | `flutter pub get` | |
| `npm install paquete` | `flutter pub add paquete` | |
| `npx expo start` | `flutter run` | |
| Fast Refresh | hot reload / hot restart | `r` / `R` en la terminal |
| `tsc --noEmit` + ESLint | `flutter analyze` | |
| `.eslintrc` | `analysis_options.yaml` | |
| `eslint --fix` | `dart fix --apply` | |
| Prettier | `dart format` | |
| Jest | `flutter test` | |
| React Native Testing Library | `flutter_test` (`WidgetTester`, `find`) | |
| `toMatchSnapshot` | golden (`matchesGoldenFile`) | |
| React DevTools / Flipper | Flutter DevTools | |
| `console.log` | `debugPrint` | |

## 2. `pubspec.yaml` y paquetes

`apps/viajero/pubspec.yaml` (recortado):

```yaml
environment:
  sdk: ^3.8.1

dependencies:
  flutter:
    sdk: flutter
  supabase_flutter: ^2.9.0
  diverso_core:
    path: ../../packages/diverso_core
  provider: ^6.1.5+1

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^6.0.0
```

- `^2.9.0` es el mismo rango compatible que en npm.
- `diverso_core: path: …` enlaza un paquete **local**: es el equivalente a un workspace. Los
  cambios en `packages/diverso_core` se ven en la app sin publicar nada.
- `dev_dependencies` solo existen para desarrollo y pruebas.
- Hay **un `pubspec.yaml` por paquete** (`apps/viajero`, `packages/diverso_core`,
  `apps/panel_agencias`): `flutter pub get` y `flutter test` se ejecutan dentro del directorio de
  cada uno.
- La sección `flutter:` de `pubspec.yaml` declara assets y fuentes (capítulo 2, sección 10).

## 3. Ejecutar y hot reload

Desde `apps/viajero`:

```bash
flutter pub get
flutter run -d web-server --web-port=3000                                  # web
flutter run -d emulator-5554 --dart-define=SUPABASE_URL=http://10.0.2.2:54331   # emulador Android
flutter devices                                                           # dispositivos disponibles
```

Son los mismos comandos del [README principal](../../README.md#cómo-correr-desarrollo-local);
allí también están los requisitos (Docker, `supabase start`) y por qué el puerto es el 3000.

Con la app corriendo, la terminal acepta teclas:

| Tecla | Efecto | Equivale a |
|---|---|---|
| `r` | **Hot reload**: inyecta el código nuevo y conserva el estado de las pantallas | Fast Refresh |
| `R` | **Hot restart**: reinicia la app y pierde el estado | recargar la app |
| `q` | Salir | |

Hot reload vuelve a ejecutar `build` pero **no** `main()` ni `initState`: si cambias algo que se
inicializa ahí (como la creación de un view model), necesitas hot restart. En web, si `r` no
refleja el cambio, usa `R`.

`debugPrint('…')` imprime en esa terminal; `CatalogViewModel.cargar` lo usa para registrar un
error de carga.

## 4. `flutter analyze` y los lints

`flutter analyze` hace el trabajo de `tsc` (tipos y null safety) y de ESLint (estilo y errores
comunes) en un solo paso. Se configura en `analysis_options.yaml`.
`apps/viajero/analysis_options.yaml` (recortado):

```yaml
include: package:flutter_lints/flutter.yaml

linter:
  rules:
    - directives_ordering
    - prefer_const_constructors
    - prefer_final_locals
    - prefer_single_quotes
    - unawaited_futures
    # … 13 reglas en total

formatter:
  page_width: 100
```

- `include: …` es el `extends` de ESLint: parte de las reglas recomendadas por Flutter.
- `linter: rules:` agrega reglas más estrictas. `packages/diverso_core/analysis_options.yaml`
  tiene las mismas; el comentario de cada archivo lo recuerda.
- `dart fix --apply` corrige automáticamente lo que se pueda (por ejemplo, agregar `const`).
- Un comentario `// ignore: nombre_de_la_regla` apaga una regla en la línea siguiente. Úsalo con
  una razón escrita al lado.

El criterio del repo: `flutter analyze` debe terminar **sin avisos** en `diverso_core`,
`apps/viajero` y `apps/panel_agencias`.

## 5. `dart format`

`dart format` es el Prettier de Dart: no se negocia el estilo, se aplica.

```bash
dart format .                                      # reescribe los archivos
dart format --output=none --set-exit-if-changed .  # solo comprueba (útil antes de un commit)
```

El ancho de línea del repo es **100 columnas** (`formatter: page_width: 100` en
`analysis_options.yaml`), no las 80 por defecto. Una pista práctica: cuando una lista de
argumentos no cabe en una línea, el formateador la parte en un argumento por línea y agrega la
coma final; por eso verás ese estilo vertical en los widgets. No hace falta que lo escribas a mano.

## 6. `flutter test`: pruebas unitarias

Se parece a Jest: `test`, `group`, `expect` y *matchers*.

| Jest | `flutter_test` |
|---|---|
| `describe('x', () => …)` | `group('x', () => …)` |
| `it` / `test` | `test('x', () => …)` |
| `expect(a).toBe(b)` | `expect(a, equals(b))` |
| `toBeTruthy()` / `toBeFalsy()` | `isTrue` / `isFalse` |
| `toHaveLength(2)` | `hasLength(2)` |
| `toEqual([])` (vacía) | `isEmpty` |
| `toThrow()` | `throwsA(…)` (o `throwsArgumentError`) |
| `beforeEach` / `afterEach` | `setUp` / `tearDown`; `addTearDown(fn)` dentro de una prueba |
| `it.skip` | `skip: 'motivo'` |

Comandos:

```bash
flutter test                                 # todo el paquete
flutter test test/ui/core/widgets/widget_test.dart   # un archivo
flutter test --name 'esNuevo'                 # las pruebas cuyo nombre contenga el texto
flutter test test/ui test/router             # carpetas concretas (sin la integración)
```

Las pruebas **reflejan la estructura de `lib/`** (`apps/viajero/test/ui/features/catalog/…` para
`lib/ui/features/catalog/…`), y los archivos terminan en `_test.dart`.

Una prueba unitaria pura del repo, `packages/diverso_core/test/models/salida_plan_test.dart`.
El reloj se **inyecta** (`fechasDisponiblesA(ahora)`), así nada depende de la hora real:

```dart
final _ahora = DateTime.utc(2026, 11, 2, 20, 30);
final _hoy = DateTime(2026, 11, 2);
// …
test('salida hace 1 minuto (15:29 Bogotá) → oculta', () {
  final plan = _plan(const Duration(hours: 15, minutes: 29), [_fecha(_hoy)]);
  expect(plan.fechasDisponiblesA(_ahora), isEmpty);
});
```

## 7. Pruebas de widgets

Una prueba de widget monta un widget en un entorno de prueba (sin emulador, sin pantalla real) y
lo manipula con un `WidgetTester`. Es el papel de React Native Testing Library.

| React Native Testing Library | `flutter_test` |
|---|---|
| `render(<X />)` | `await tester.pumpWidget(MaterialApp(home: Scaffold(body: X())))` |
| `screen.getByText('hola')` | `find.text('hola')` |
| `getByText(/hola/)` (parcial) | `find.textContaining('hola')` |
| `getByTestId('x')` | `find.byKey(const ValueKey('x'))` |
| `getByRole(…)` | `find.byType(X)`, `find.byIcon(Icons.star_rounded)` |
| `expect(…).toBeTruthy()` | `expect(finder, findsOneWidget)` |
| `queryByText` + `toBeNull()` | `expect(finder, findsNothing)` |
| `fireEvent.press(el)` | `await tester.tap(finder)` |
| `await waitFor(…)` / `findBy` | `await tester.pump()` o `await tester.pumpAndSettle()` |
| `toHaveStyle(…)` | `tester.widget<Text>(finder).style?.color` |
| `jest.fn()` / `jest.mock` | una clase falsa que `implements` el repositorio |
| `render` con un *wrapper* de providers | envolver en `MultiProvider` dentro de `pumpWidget` |

`pump()` avanza **un fotograma**; `pumpAndSettle()` avanza hasta que no queden animaciones. Si el
widget tiene una animación que se repite (como `Skeleton`), `pumpAndSettle` nunca termina: usa
`pump()`.

El ejemplo más simple, `apps/viajero/test/ui/core/theme/modo_oscuro_test.dart`: monta un widget
con el tema oscuro y comprueba un color.

```dart
testWidgets('modo oscuro: la unidad del precio usa el color secundario del tema', (tester) async {
  final tema = AppTheme.viajeroDark();
  await tester.pumpWidget(
    MaterialApp(
      theme: tema,
      home: const Scaffold(body: PriceText(monto: 178000)),
    ),
  );

  final unidad = tester.widget<Text>(find.text('por persona · precio final'));
  expect(unidad.style?.color, tema.colorScheme.onSurfaceVariant);
});
```

Los widgets de Material necesitan un `MaterialApp` por encima; sin él, cosas como
`Theme.of(context)` no encuentran el tema.

**Interacción.** `apps/viajero/test/ui/features/bookings/widgets/cancel_dialog_test.dart` abre un
diálogo tocando un botón y revisa los textos (un `Builder` da un `context` por debajo de
`MaterialApp` para poder llamar a `showDialog`). Son dos fragmentos del mismo archivo, uno del
ayudante `_abrir` y otro de la primera prueba:

```dart
await tester.tap(find.text('abrir'));
await tester.pumpAndSettle();
// …
expect(find.text('¿Cancelar reserva?'), findsOneWidget);
expect(find.textContaining('DIV-ABC123'), findsOneWidget);
```

**Tamaño de pantalla.** Varias pruebas fijan la ventana para que el layout sea determinista
(`apps/viajero/test/ui/core/widgets/rating/puntaje_nueva_test.dart`):

```dart
tester.view.physicalSize = const Size(600, 1000);
tester.view.devicePixelRatio = 1.0;
addTearDown(tester.view.reset);
```

### Dobles de prueba (fakes)

El repo no usa una librería de *mocks*. Escribe una clase que `implements` el repositorio y
sobrescribe solo los métodos que la prueba ejecuta. `puntaje_nueva_test.dart`:

```dart
class _Catalogo implements CatalogRepository {
  _Catalogo(this.plan);

  final Plan plan;

  @override
  Future<Plan> planDetalle(String planId) async => plan;

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}
```

`implements` obliga a declarar **todos** los métodos de la clase. `noSuchMethod` es el comodín
que cubre los demás: si la prueba llama a uno que no definiste, falla con un error claro. El
doble se entrega con `Provider<CatalogRepository>.value(value: _Catalogo(plan))` (capítulo 3,
sección 5). Es el `jest.mock` de este proyecto.

La misma idea una capa más abajo: los repositorios de `diverso_core` se prueban con una **Api
falsa** (`class _CatalogApiFalsa implements CatalogApi`) que devuelve las filas que le indiques y
anota con qué filtros le pidieron los datos; así se comprueban el mapeo, el filtro de fecha, la
ventana de 30 minutos o la traducción de errores sin red (`packages/diverso_core/test/data/repositories/`).

## 8. Pruebas de un view model

Como un view model no dibuja nada, se prueba como una clase normal: sin `WidgetTester`.
`apps/viajero/test/ui/features/bookings/view_models/bookings_view_model_test.dart`:

```dart
Future<BookingsViewModel> _cargado(List<Booking> reservas) async {
  final c = BookingsViewModel(reservas: _Reservas(reservas), reloj: () => _ahora);
  addTearDown(c.dispose);
  await c.cargar();
  return c;
}
```

Tres ideas que repiten las pruebas bien hechas del repo: el repositorio es un doble, el reloj se
inyecta (`reloj: () => _ahora`) y `addTearDown(c.dispose)` libera el `ChangeNotifier`.

## 9. Goldens

Un **golden** es una imagen de referencia: la prueba pinta el widget, lo compara píxel a píxel
con el archivo y falla si difiere. Es el `toMatchSnapshot`, pero de imagen y no de texto.
`packages/diverso_core/test/ui/logo_golden_test.dart`:

```dart
await _cargarLogo(tester);
await expectLater(find.byType(RepaintBoundary), matchesGoldenFile('goldens/logo_marca.png'));
```

Las imágenes están en `packages/diverso_core/test/ui/goldens/`. Si cambias el diseño a propósito:

```bash
flutter test --update-goldens test/ui/logo_golden_test.dart
```

Revisa el PNG resultante antes de subirlo. Las imágenes dependen de la plataforma (fuentes,
antialias); generarlas y comprobarlas en el mismo sistema evita falsos fallos.

## 10. Pruebas de integración

En este repo "integración" significa **hablar con el Supabase local de verdad**, no el paquete
`integration_test` de Flutter. Están en `apps/viajero/test/integration/`.

- `anti_sobreventa_test.dart` reserva cupos de verdad y comprueba que dos reservas simultáneas por
  el último cupo nunca generan sobreventa (ver «Anti-sobreventa» en el
  [README principal](../../README.md#arquitectura)).
- Requieren `supabase start` y, para limpiar lo que crean, la variable
  `SUPABASE_SERVICE_ROLE_KEY`; sin ella esas pruebas se omiten con el motivo a la vista. Los
  pasos exactos están en el README, sección
  [Pruebas de la app del viajero](../../README.md#pruebas-de-la-app-del-viajero).
- Usan un *binding* propio porque el normal responde 400 a toda petición HTTP:

```dart
class IntegrationTestBinding extends AutomatedTestWidgetsFlutterBinding {
  @override
  bool get overrideHttpClient => false;
}
```

> **Cuidado.** Escriben en la base local. Ejecútalas solo contra el stack de desarrollo y nunca
> contra otro entorno. Para trabajar sin Docker, corre las carpetas que no la necesitan:
> `flutter test test/ui test/router`.

## 11. DevTools

**Flutter DevTools** es el panel de depuración (el React DevTools + Flipper de Flutter). Lo más
útil al empezar:

| Pestaña | Para qué |
|---|---|
| Widget Inspector | ver el árbol de widgets y seleccionar uno en la pantalla para encontrar su código |
| Performance | fotogramas lentos |
| Network | peticiones HTTP |
| Logging | lo que imprime `debugPrint` |

Se abren desde tu editor (VS Code o Android Studio con el plugin de Flutter) o con el enlace que
`flutter run` imprime al arrancar en modo debug.

## 12. Antes de dar algo por terminado

Desde el paquete que tocaste (`apps/viajero`, `packages/diverso_core` o `apps/panel_agencias`):

```bash
dart format .
flutter analyze
flutter test
```

Si tocaste `packages/diverso_core`, corre también las pruebas de `apps/viajero` y
`apps/panel_agencias`, que dependen de él. Los conteos esperados están en la tabla de
[Pruebas](../../README.md#pruebas) del README principal.

## Pruebas del repo, de la más simple a la más completa

| Archivo | Qué enseña |
|---|---|
| `apps/viajero/test/ui/core/widgets/widget_test.dart` | Las pruebas de widget más simples: `RatingStars` y `VerifiedBadge` |
| `apps/viajero/test/ui/core/theme/modo_oscuro_test.dart` | Probar un color del tema |
| `apps/viajero/test/ui/core/widgets/rating/puntaje_nueva_test.dart` | Tarjeta del catálogo y ficha del plan con repositorios falsos y `Provider` |
| `apps/viajero/test/ui/features/bookings/widgets/cancel_dialog_test.dart` | Tocar un botón y revisar un diálogo |
| `apps/viajero/test/ui/features/catalog/views/buscador_test.dart` | Que lo escrito en el buscador llegue a `CatalogRepository.search` |
| `apps/viajero/test/ui/features/bookings/view_models/bookings_view_model_test.dart` | Un view model con reloj inyectado |
| `apps/viajero/test/ui/shell/app_shell_test.dart` | La barra inferior de pestañas |
| `apps/viajero/test/router/rutas_pago_test.dart` | El router completo con sesión simulada |
| `apps/viajero/test/router/sesion_redirect_test.dart` | Una función pura (sesión + consentimiento + ubicación) sin Flutter |
| `packages/diverso_core/test/models/salida_plan_test.dart` | Reglas de un modelo con el reloj fijo |
| `packages/diverso_core/test/data/repositories/catalog_repository_test.dart` | Un repositorio con una Api falsa (filtro de fecha, búsqueda) |
| `packages/diverso_core/test/models/enums_bd_test.dart` | Que cada enum reconozca todos los valores de la BD |
| `packages/diverso_core/test/ui/logo_golden_test.dart` | Goldens |
| `apps/viajero/test/integration/anti_sobreventa_test.dart` | Contra el Supabase local |

---

**Anterior:** [3. Estado, arquitectura y navegación](03-estado-arquitectura-y-navegacion.md) ·
**Volver al** [plan de aprendizaje](README.md)

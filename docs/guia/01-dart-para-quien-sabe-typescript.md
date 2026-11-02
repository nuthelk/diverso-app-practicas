# 1. Dart para quien sabe TypeScript

Si llevas dos años con TypeScript, ya sabes casi todo lo que Dart te pide. Cambia la sintaxis, y
hay tres diferencias de fondo que conviene tener claras desde el principio:

1. **La seguridad de tipos y de `null` es real en ejecución**, no solo en compilación (en TS los
   tipos se borran; en Dart no).
2. **Todo es una clase** y no hay objetos sueltos tipo `{ a: 1 }`: para eso existen `Map`, clases
   o *records*.
3. **Cada archivo es un módulo** y lo privado se marca con `_`, no con una palabra clave.

> Volver al [plan de aprendizaje](README.md). Este capítulo cubre las sesiones 2 y 3.

## Cómo leer este capítulo

Cada concepto sigue el mismo orden: **TypeScript**, **Dart**, **ejemplo real de este repo**.
Las rutas del ejemplo salen de la raíz del repo. Los fragmentos reales están recortados a pocas
líneas; el recorte se marca con `// …`.

| Abreviatura | Significa |
|---|---|
| `core` | `packages/diverso_core/lib/` (modelos, servicios y repositorios compartidos) |
| `viajero` | `apps/viajero/lib/` (la app del viajero) |

## Contenido

1. [Tipos e inferencia](#1-tipos-e-inferencia)
2. [Null safety](#2-null-safety)
3. [`final`, `const` y `var`](#3-final-const-y-var)
4. [Clases, getters y privacidad](#4-clases-getters-y-privacidad)
5. [Parámetros y constructores](#5-parámetros-y-constructores)
6. [Funciones y callbacks](#6-funciones-y-callbacks)
7. [Enums y extensiones](#7-enums-y-extensiones)
8. [Colecciones, spread y `if`/`for` dentro de listas](#8-colecciones-spread-y-iffor-dentro-de-listas)
9. [`Future`, `async` y `await`](#9-future-async-y-await)
10. [`Stream`](#10-stream)
11. [Records, patrones y `switch` como expresión](#11-records-patrones-y-switch-como-expresión)
12. [Errores y `try`/`catch`](#12-errores-y-trycatch)
13. [Imports, paquetes y barriles](#13-imports-paquetes-y-barriles)
14. [Tabla de bolsillo](#14-tabla-de-bolsillo)

---

## 1. Tipos e inferencia

**TypeScript**

```ts
const nombre = 'Guatapé';            // inferido: string
const cupos: number = 8;
const precios: number[] = [100, 200];
const fila: Record<string, unknown> = { id: 'a' };
```

**Dart**

```dart
final nombre = 'Guatapé';            // inferido: String
final int cupos = 8;
final List<double> precios = [100, 200];
final Map<String, dynamic> fila = {'id': 'a'};
```

| TypeScript | Dart | Nota |
|---|---|---|
| `number` | `int`, `double`, `num` | `num` es el padre de los dos |
| `string` | `String` | |
| `boolean` | `bool` | |
| `any` | `dynamic` | evítalo igual que `any` |
| `unknown` | `Object?` | |
| `T[]` | `List<T>` | |
| `Record<string, V>` | `Map<String, V>` | |
| `void` | `void` | |

Dos diferencias que muerden al principio:

- `as` en Dart **comprueba el tipo al ejecutar y lanza un error** si no coincide. En TS `as` solo
  calla al compilador.
- Los números de un JSON pueden llegar como `int` o como `double`; por eso se convierte pasando
  por `num`.

**En este repo** — `packages/diverso_core/lib/models/plan.dart`, `PlanDate.fromMap`:

```dart
factory PlanDate.fromMap(Map<String, dynamic> map) => PlanDate(
  id: map['id'] as String,
  planId: map['plan_id'] as String,
  fecha: DateTime.parse(map['fecha'] as String),
  cupoTotal: (map['cupo_total'] as num).toInt(),
  cupoDisponible: (map['cupo_disponible'] as num).toInt(),
);
```

Aquí `Map<String, dynamic>` es la fila cruda que devuelve Supabase y cada `as` es una
afirmación que Dart verifica. Si la columna cambiara de tipo, falla aquí, con un error claro,
y no más adelante.

Las cadenas usan interpolación con `$` (`'Plan número $i'`) o `${…}` para expresiones
(`'/plan/${plan.id}'`, en `viajero/ui/features/catalog/widgets/plan_card.dart`). El repo usa
comillas simples (regla `prefer_single_quotes`).

## 2. Null safety

Es el equivalente a `"strict": true` con `strictNullChecks`, pero **no se puede apagar**.

**TypeScript**

```ts
let resumen: string | undefined;
const largo = resumen?.length ?? 0;      // ?. y ??
const seguro = resumen!;                 // "confía en mí" (se borra al compilar)
```

**Dart**

```dart
String? resumen;
final largo = resumen?.length ?? 0;      // ?. y ??
final seguro = resumen!;                 // lanza un error si es null
resumen ??= 'sin resumen';               // asigna solo si es null
```

| Dart | Qué hace | Equivalente en TS |
|---|---|---|
| `String?` | puede ser `null` | `string \| null` |
| `a ?? b` | `a`, o `b` si `a` es `null` | `a ?? b` |
| `a?.x` | `null` si `a` es `null` | `a?.x` |
| `a!` | afirma que no es `null`; **si lo es, lanza error** | `a!` (que en TS no hace nada al ejecutar) |
| `a ??= b` | asigna si es `null` | `a ??= b` |
| `late` | "lo inicializo antes de usarlo" | `x!: T` (aserción de asignación definitiva) |

En Dart solo existe `null`; no hay `undefined`.

**Promoción de tipos.** Igual que el *narrowing* de TS, pero solo funciona con variables
locales, no con getters ni con propiedades de otro objeto. Por eso aparece un `!`.

**En este repo** — `viajero/ui/features/catalog/widgets/plan_card.dart`, `_PortadaPlan.build`:

```dart
if (plan.fotoPrincipal == null) {
  return Container(
    color: cs.primaryContainer,
    child: Center(child: Text(plan.categoria.emoji, style: const TextStyle(fontSize: 40))),
  );
}
return Image.network(
  plan.fotoPrincipal!,
  fit: BoxFit.cover,
```

`fotoPrincipal` es un getter (`String? get fotoPrincipal` en `plan.dart`), así que tras
comprobar `== null` el compilador no lo da por no-nulo y hace falta `!`.

Más ejemplos:

- `(map['resumen'] as String?) ?? ''` — `plan.dart`, valor por defecto cuando la columna es `null`.
- `plan.agency?.verificada == true` — `plan_card.dart`, cadena opcional.
- `state.pathParameters['doc']!` — `viajero/router/app_router.dart`: la ruta `/legal/:doc` garantiza
  que el parámetro existe.
- `late final CatalogViewModel _viewModel;` — `viajero/ui/features/catalog/views/catalog_view.dart`:
  se asigna en `initState`, no en el constructor (capítulo 2).

> **Ojo:** `!` y `late` mal usados fallan en ejecución, no al compilar. Úsalos cuando el código
> ya garantiza el valor, como en los ejemplos de arriba.

## 3. `final`, `const` y `var`

| TypeScript | Dart | Significado |
|---|---|---|
| `let x = 1` | `var x = 1` | variable que se puede reasignar, tipo inferido |
| `const x = 1` | `final x = 1` | se asigna **una vez**, en ejecución |
| (no existe) | `const x = 1` | constante **de compilación**, profundamente inmutable |

`const` en Dart es más fuerte que en TS: el valor debe conocerse al compilar, y dos `const`
iguales son el mismo objeto en memoria. Esa propiedad es la base de las optimizaciones de
Flutter (capítulo 2, sección 5).

**En este repo:**

- `packages/diverso_core/lib/models/booking.dart`:
  `static const retencion = Duration(minutes: 30);` — una constante de la clase.
- `packages/diverso_core/lib/models/plan.dart`: `this.incluye = const []` — lista vacía
  inmutable como valor por defecto.
- `packages/diverso_core/lib/config/diverso_config.dart`: `String.fromEnvironment('SUPABASE_URL', …)`
  lee un valor que se fija al compilar con `--dart-define` (parecido a una variable de entorno
  de build en Expo, pero resuelta en compilación).

La regla del repo: `final` para todo lo local (`prefer_final_locals`) y `const` siempre que se
pueda (`prefer_const_constructors`, `prefer_const_declarations`). Ambas están en
`apps/viajero/analysis_options.yaml`.

## 4. Clases, getters y privacidad

**TypeScript**

```ts
class Plan {
  private cache?: string;
  constructor(readonly titulo: string, readonly reviewsCount: number) {}
  get esNuevo(): boolean { return this.reviewsCount === 0; }
}
```

**Dart**

```dart
class Plan {
  Plan({required this.titulo, required this.reviewsCount});
  final String titulo;
  final int reviewsCount;
  bool get esNuevo => reviewsCount == 0;
}
```

Lo que cambia:

- **No hay `public`/`private`/`protected`.** Un nombre que empieza por `_` es privado **al
  archivo**, no a la clase. Por eso `_SkeletonState` vive junto a `Skeleton`.
- `get` define una propiedad calculada; se usa sin paréntesis (`plan.esNuevo`).
- `=>` es "devuelve esta expresión" y sirve para funciones y métodos de una sola línea.
- No hace falta `this.` salvo que haya ambigüedad.
- `abstract final class AppTheme` (en `viajero/ui/core/theme/app_theme.dart`) es una clase que
  solo agrupa constantes y métodos estáticos y no se puede instanciar ni heredar: lo más parecido
  a un `namespace`.

**En este repo** — `packages/diverso_core/lib/models/plan.dart`:

```dart
/// Sin reseñas todavía: se muestra «Nueva» en vez de un 0.0 engañoso.
bool get esNuevo => reviewsCount == 0;
```

Es la regla "Nueva" que usan la tarjeta del catálogo y la ficha del plan. Está en el modelo y
no en el widget a propósito: así se prueba sin pintar nada (`test/ui/core/widgets/rating/puntaje_nueva_test.dart`).

Herencia: `extends` hereda e `implements` cumple el contrato de otra clase **sin heredar su
código** (toda clase de Dart define también una interfaz). Los dobles de prueba de este repo
usan `implements` (capítulo 4, sección 5).

## 5. Parámetros y constructores

Es la parte donde más se nota la diferencia, y la que más verás en Flutter.

**TypeScript**

```ts
class ItinerarioPaso {
  constructor(public hora: string, public actividad: string) {}
  static fromMap(m: Record<string, unknown>): ItinerarioPaso {
    return new ItinerarioPaso((m.hora as string) ?? '', (m.actividad as string) ?? '');
  }
}
new ItinerarioPaso('06:00', 'Salida');
```

**Dart**

```dart
class ItinerarioPaso {
  ItinerarioPaso({required this.hora, required this.actividad});
  final String hora;
  final String actividad;

  factory ItinerarioPaso.fromMap(Map<String, dynamic> map) => ItinerarioPaso(
    hora: (map['hora'] as String?) ?? '',
    actividad: (map['actividad'] as String?) ?? '',
  );
}
ItinerarioPaso(hora: '06:00', actividad: 'Salida');
```

(Es el código real de `packages/diverso_core/lib/models/plan.dart`, sin los comentarios.)

### Posicionales, nombrados y opcionales

| Sintaxis | Cómo se llama | Equivalente en TS |
|---|---|---|
| `Foo(this.x)` | posicional obligatorio | `constructor(public x)` |
| `Foo([this.x])` | posicional opcional | `constructor(x?)` |
| `Foo({this.x})` | nombrado opcional | `constructor({ x }: { x?: T })` |
| `Foo({required this.x})` | nombrado obligatorio | `constructor({ x }: { x: T })` |
| `Foo({this.x = 3})` | nombrado con valor por defecto | `{ x = 3 }` |

`this.x` en la lista de parámetros es un atajo: declara el parámetro **y** lo asigna al campo
(como `public x` en el constructor de TS). `super.key` hace lo mismo pasando el parámetro al
constructor del padre; lo verás en todos los widgets.

**En este repo** — `plan_card.dart` mezcla los tres usos:

```dart
const PlanCard({super.key, required this.plan, this.comparada = false, this.onToggleComparar});
```

`SectionLabel` (`viajero/ui/core/widgets/section_label.dart`) usa un posicional y un nombrado:
`const SectionLabel(this.texto, {super.key, this.accion})`.

### Lista de inicialización

Lo que va después de `:` se ejecuta **antes** del cuerpo y sirve para inicializar campos
`final` con una expresión. `viajero/ui/features/catalog/view_models/catalog_view_model.dart`:

```dart
CatalogViewModel({required CatalogRepository catalogo}) : _catalogo = catalogo;
```

Copia el parámetro al campo `final`. El repositorio llega de fuera (la vista lo lee con
`context.read<CatalogRepository>()`), así que el view model no sabe de dónde sale y en las
pruebas se le pasa un doble. Es inyección de dependencias por constructor: nada se crea por
dentro con un valor por defecto.

### `factory` y constructores con nombre

`Plan.fromMap` es un **constructor con nombre** declarado con `factory`: el equivalente a un
método estático `Plan.fromMap(...)` de TS que devuelve una instancia. (`factory` además permite
devolver una instancia existente o un subtipo; aquí no hace falta.)
`packages/diverso_core/lib/models/plan.dart`:

```dart
factory Plan.fromMap(Map<String, dynamic> map) {
  final agencyMap = map['agencies'];
  final datesMap = map['plan_dates'];
  return Plan(
    id: map['id'] as String,
    agencyId: map['agency_id'] as String,
    titulo: map['titulo'] as String,
    categoria:
        enumFromDb(ExperienceCategory.values, map['categoria'] as String?) ??
        ExperienceCategory.aventura,
    resumen: (map['resumen'] as String?) ?? '',
    // …
```

Así se convierte la fila JSON de Supabase en un objeto tipado, y es el único lugar donde se
traducen nombres de columna (`agency_id`) a nombres de campo (`agencyId`).

### `const` en constructores

Un constructor `const` exige que todos sus campos sean `final`; permite escribir
`const PlanCard(...)`. Mira el capítulo 2 para saber por qué te interesa.

## 6. Funciones y callbacks

**TypeScript**

```ts
type Toggle = ((plan: Plan) => void) | undefined;
const doble = (n: number) => n * 2;
```

**Dart**

```dart
typedef Toggle = void Function(Plan);
int doble(int n) => n * 2;
```

Los tipos de función se escriben `TipoRetorno Function(Parámetros)`. Flutter trae alias
cortos: `VoidCallback` (`void Function()`) y `ValueChanged<T>` (`void Function(T)`).

**En este repo** — `plan_card.dart`:

```dart
/// Null oculta el botón de comparar (p. ej. en la página de una agencia).
final ValueChanged<Plan>? onToggleComparar;
// …
if (onToggleComparar != null)
  Positioned(
    // …
        onPressed: () => onToggleComparar!(plan),
```

Un callback opcional es un `ValueChanged<Plan>?`; se comprueba contra `null` y se invoca con `!`
(es una propiedad, así que no hay promoción). `onToggleComparar!(plan)` se lee "afirma que
existe y llámala".

Los parámetros posicionales opcionales también se usan en funciones sueltas.
`packages/diverso_core/lib/utils/hora_bogota.dart`: `DateTime hoyBogota([DateTime? ahora])` —
"si no me pasas el reloj, uso el real". Es la técnica del repo para probar código que depende de
la hora sin tocar el reloj del sistema.

## 7. Enums y extensiones

**TypeScript**

```ts
enum Estado { Pendiente = 'pendiente', Confirmada = 'confirmada' }
const etiqueta: Record<Estado, string> = {
  [Estado.Pendiente]: 'Pendiente',
  [Estado.Confirmada]: 'Confirmada',
};
```

**Dart** — enum con miembros (forma "mejorada" de Dart 2.17+; es una ilustración, el repo usa la
variante de abajo):

```dart
enum Estado {
  pendiente('Pendiente'),
  confirmada('Confirmada');

  const Estado(this.label);
  final String label;
}
```

Todo enum tiene `.values` (la lista) y `.name` (el nombre como `String`).

**En este repo** los enums son simples y las etiquetas viven en una **extensión**.
`packages/diverso_core/lib/models/enums.dart`:

```dart
enum BookingStatus { pendientePago, confirmada, cancelada, completada }

extension BookingStatusX on BookingStatus {
  String get label {
    switch (this) {
      case BookingStatus.pendientePago:
        return 'Pendiente de pago';
      case BookingStatus.confirmada:
        return 'Confirmada';
      // … cancelada, completada
    }
  }
}
```

Una **extensión** agrega miembros a un tipo existente sin tocarlo (en TS lo más parecido es una
función auxiliar o ampliar un prototipo). Se usa como si el miembro fuera propio:
`booking.estado.label`. La convención del repo es el sufijo `X` (`BookingStatusX`,
`OrdenAgenciasX`).

**`switch` exhaustivo.** Sobre un enum, el compilador exige cubrir todos los casos: si agregas
un valor a `BookingStatus` y olvidas la etiqueta, no compila (como un chequeo de exhaustividad
con `never` en TS, pero obligatorio).

**Del texto al enum.** La base de datos guarda el estado como texto y no siempre se escribe como
el nombre de Dart: `pendiente_pago` en SQL, `pendientePago` en Dart. Por eso cada enum que se
lee de la BD lleva su valor explícito (`enums.dart`): es un *enum mejorado*, con campos y un
constructor `const`, que implementa `DbEnum`.

```dart
enum BookingStatus implements DbEnum {
  pendientePago('pendiente_pago'),
  confirmada('confirmada'),
  // …
  ;
  const BookingStatus(this.db);

  @override
  final String db;
}
```

`enumFromDb<T extends DbEnum>(Iterable<T> values, String? valor)` busca el valor cuyo `db`
coincide y devuelve `null` si no existe; los modelos le ponen el valor por defecto con `??`
(`plan.dart`: `?? ExperienceCategory.aventura`). Comparar con `.name` fue el bug M: nunca
coincidía con `pendiente_pago` y solo funcionaba porque el valor por defecto era justo ese.

## 8. Colecciones, spread y `if`/`for` dentro de listas

**TypeScript**

```ts
const chips = [
  ...(hayFiltros ? [<Aviso />] : []),
  ...categorias.map((c) => <Chip key={c} />),
];
```

**Dart** (ilustrativo)

```dart
final chips = [
  if (hayFiltros) const Aviso(),
  for (final c in categorias) Chip(label: Text(c)),
];
```

Dentro de un literal de lista, `if` y `for` se escriben tal cual, sin `map` ni operador
ternario. `...` es el *spread*, igual que en JS.

| TypeScript | Dart | Nota |
|---|---|---|
| `arr.map(f)` | `lista.map(f).toList()` | `map` y `where` devuelven un `Iterable` perezoso; sin `.toList()` no tienes una lista |
| `arr.filter(f)` | `lista.where(f).toList()` | |
| `arr.some(f)` | `lista.any(f)` | |
| `arr.find(f)` | `lista.firstWhere(f)` | lanza error si no hay; `firstWhereOrNull` es de un paquete aparte |
| `arr.length === 0` | `lista.isEmpty` / `isNotEmpty` | |
| `arr[0]` | `lista.first` / `lista[0]` | |
| `new Set()` | `<String>{}` | |

**Cascada `..`.** `a..m()` llama a `m` y devuelve `a`, no el resultado de `m`. Sirve porque
`sort` devuelve `void`. `packages/diverso_core/lib/models/plan.dart`:

```dart
List<PlanDate> fechasDisponiblesA(DateTime ahora) =>
    dates.where((d) => d.tieneCupos && !yaSalio(d, ahora)).toList()
      ..sort((a, b) => a.fecha.compareTo(b.fecha));
```

Filtra, convierte a lista, **ordena esa misma lista** y la devuelve.

**`if` y spread en un árbol de widgets.** `viajero/ui/core/widgets/feedback/empty_state.dart`:

```dart
if (detalle != null) ...[
  const SizedBox(height: 8),
  ConstrainedBox(/* … */),
],
if (accion != null) ...[const SizedBox(height: 18), accion!],
```

Dos elementos de golpe solo si existe el detalle. La versión corta, para un solo elemento
nullable, es `?accion` (elemento "null-aware", Dart 3.8): se incluye únicamente si no es `null`.
Está en `viajero/ui/core/widgets/section_label.dart`.

**`for` dentro de una lista.** Las pruebas lo usan para armar datos:
`[for (var i = 1; i <= 8; i++) _plan(i)]`
(`apps/viajero/test/ui/core/widgets/page/cabeceras_test.dart`).

## 9. `Future`, `async` y `await`

Aquí la traducción es casi uno a uno.

| TypeScript | Dart |
|---|---|
| `Promise<T>` | `Future<T>` |
| `async function f(): Promise<void>` | `Future<void> f() async` |
| `await p` | `await f` |
| `Promise.all([a, b])` | `Future.wait([a, b])` o `(a, b).wait` |
| `try { } catch { } finally { }` | igual |
| `p.then(...)` | `f.then(...)` |

**TypeScript**

```ts
async function cargar() {
  setCargando(true);
  try {
    setPlanes(await api.search(filtros));
  } catch (e) {
    setError('No pudimos cargar los planes.');
  } finally {
    setCargando(false);
  }
}
```

**En este repo** — `viajero/ui/features/catalog/view_models/catalog_view_model.dart`, `cargar()`
(recortado):

```dart
Future<void> cargar() async {
  _cargando = true;
  _error = null;
  _notificar();
  try {
    final resultados = await _catalogo.search(FiltrosCatalogo(/* … */));
    _planes = resultados;
  } on Object catch (e) {
    _error = 'No pudimos cargar los planes. Revisa tu conexión e intenta de nuevo.';
  } finally {
    _cargando = false;
    _notificar();
  }
}
```

Es la misma forma que el `cargar` de TS de arriba; `_notificar()` llama a `notifyListeners()`, el
`setState` del view model, salvo que la pantalla ya se haya cerrado (capítulo 3).

**Esperar varias cosas a la vez.** `packages/diverso_core/lib/data/repositories/catalog_repository.dart`,
`agenciaConPlanes`:

```dart
final (filas, planes) = await (
  _api.agenciasPublicas(agencyId: agencyId),
  search(FiltrosCatalogo(agencyId: agencyId)),
).wait;
```

Una tupla de `Future` con `.wait` es `Promise.all` que además conserva el tipo de cada resultado.

**Un `Future` en la UI.** `FutureBuilder<Plan>` es el equivalente a un `useQuery` mínimo: recibe
un `Future` y reconstruye según esté cargando, con error o con datos
(`viajero/ui/features/checkout/views/checkout_loader.dart`). Detalle importante: el `Future`
se crea en `initState`, **no** dentro de `build`, o se repetiría la consulta en cada
reconstrucción (capítulo 2, sección 4).

**Reglas que verás en el código:**

- Una función que devuelve `Future` y que no esperas **debe** marcarse: o `await`, o
  `unawaited(...)`. Lo exige la regla `unawaited_futures`.
- Después de un `await` dentro de un widget, comprueba `mounted` antes de llamar a `setState`
  (el widget pudo desaparecer): `if (mounted) setState(() => _cargando = false);` en
  `viajero/ui/features/auth/views/login_view.dart`.

## 10. `Stream`

Un `Future` entrega **un** valor; un `Stream` entrega **varios** a lo largo del tiempo
(`Observable` de RxJS, un `EventEmitter`, un `AsyncIterable`).

**TypeScript**

```ts
const { data } = supabase.auth.onAuthStateChange((event, session) => refrescar());
// limpieza:
data.subscription.unsubscribe();
```

**Dart**

```dart
final sub = auth.onAuthStateChange.listen((estado) => refrescar());
// limpieza:
sub.cancel();
```

| Concepto | RxJS / JS | Dart |
|---|---|---|
| Fuente de eventos | `Observable<T>` | `Stream<T>` |
| Suscribirse | `.subscribe(fn)` | `.listen(fn)` |
| Cancelar | `subscription.unsubscribe()` | `StreamSubscription.cancel()` |
| Transformar | `.pipe(map(f))` | `.map(f)` |
| Varios oyentes | `Subject` | stream *broadcast* (`asBroadcastStream()`) |

**En este repo** el estado de sesión de Supabase es un `Stream`:

- `packages/diverso_core/lib/data/repositories/auth_repository.dart`:
  `Stream<String?> get onAuthStateChanged => _client.auth.onAuthStateChange.map((s) => s.session?.user.id);`
- `viajero/router/go_router_refresh_stream.dart` (la clase completa) convierte ese stream en algo
  que el router sabe escuchar:

```dart
class GoRouterRefreshStream extends ChangeNotifier {
  GoRouterRefreshStream(Stream<dynamic> stream) {
    _sub = stream.asBroadcastStream().listen((_) => notifyListeners());
  }

  late final StreamSubscription<dynamic> _sub;

  @override
  void dispose() {
    _sub.cancel();
    super.dispose();
  }
}
```

Cada evento de autenticación (login, logout) dispara `notifyListeners()`, y el router
reevalúa si debe redirigir a `/login` (capítulo 3, sección 8). `dispose` cancela la suscripción
para no filtrar memoria, el mismo papel que la función de limpieza de un `useEffect`.
`late final` aquí significa: "se asigna en el constructor, una sola vez, un instante después de
declararse".

## 11. Records, patrones y `switch` como expresión

El repo usa estas tres funciones de Dart 3; reconocerlas evita confusión.

**Record** = tupla con tipos (opcionalmente con nombres).

```ts
// TypeScript
function agencia(): [string, number] { return ['Ecoandes', 5]; }
const [nombre, planes] = agencia();
```

```dart
// Dart
(String, int) agencia() => ('Ecoandes', 5);
final (nombre, planes) = agencia();
```

**Con nombres** — `packages/diverso_core/lib/data/repositories/catalog_repository.dart`:

```dart
Future<({AgenciaResumen agencia, List<Plan> planes})?> agenciaConPlanes(String agencyId) async {
```

Es el tipo de retorno "objeto con `agencia` y `planes`, o `null`" sin declarar una clase para
usarlo una vez. Se lee `resultado.agencia`, `resultado.planes`.

**`switch` como expresión con patrones.** `viajero/ui/features/bookings/widgets/reserva_widgets.dart`,
`EstadoReservaPill`:

```dart
final (color, texto) = switch (booking.estado) {
  BookingStatus.confirmada when realizada => (const Color(0xFF4A5C6E), 'Realizada'),
  BookingStatus.confirmada => (const Color(0xFF1B7A4B), 'Confirmada'),
  BookingStatus.pendientePago => (const Color(0xFFB25E09), 'Pendiente'),
  BookingStatus.cancelada => (const Color(0xFFB3261E), 'Cancelada'),
  BookingStatus.completada => (const Color(0xFF4A5C6E), 'Completada'),
};
```

Tres cosas a la vez: el `switch` **devuelve un valor**, cada rama es una tupla `(color, texto)`
y la primera lleva una guarda `when`. Como el valor es un enum, el compilador comprueba que no
falte ninguna rama. Otra forma, con comodín `_`: `viajero/ui/features/bookings/reserva_formato.dart`
(`0 => 'Hoy'`, `1 => 'Mañana'`, `_ => 'en $dias días'`).

**`typedef`** es el `type` de TS para dar otro nombre a un tipo
(`packages/diverso_core/lib/data/repositories/agency_repository.dart`: `typedef AgencyRef = Agency;`);
también sirve para tipos de función, como el `Toggle` de arriba.

## 12. Errores y `try`/`catch`

Se lanza cualquier objeto con `throw`; lo normal es lanzar una clase que `implements Exception`.
A diferencia de TS, `catch` puede **filtrar por tipo**.

**TypeScript**

```ts
try { await invocar(); }
catch (e) { if (e instanceof FunctionException) throw new DiversoException(e); throw e; }
```

**Dart** — `packages/diverso_core/lib/data/repositories/llamar_edge_function.dart`:

```dart
try {
  return await edgeFunctions.invocar(funcion, cuerpo);
} on FunctionException catch (e) {
  throw DiversoException.fromFunction(e);
}
```

`on Tipo catch (e)` atrapa solo ese tipo; cualquier otro error sigue subiendo. `DiversoException`
(`packages/diverso_core/lib/errors/diverso_exception.dart`) es el error de dominio de la app: lleva
un `codigo` estable (`SIN_CUPO`, `RESERVA_YA_SALIO`…) que la UI traduce a un mensaje
(`errors/mensaje_usuario.dart`). En `diverso_core` la regla `avoid_catches_without_on_clauses`
prohíbe el `catch (e)` pelado: siempre se escribe `on Tipo catch`.

## 13. Imports, paquetes y barriles

**TypeScript**

```ts
import { Plan } from './models/plan';
import { Plan } from '@diverso/core';
export * from './plan';
```

**Dart**

```dart
import 'models/plan.dart';                         // relativo
import 'package:diverso_core/diverso_core.dart';   // de un paquete
export 'models/plan.dart';                         // re-exportar
```

| Tema | TypeScript | Dart |
|---|---|---|
| Importar todo lo público | `import * as x` | `import '…' as x;` |
| Importar solo algunos | `import { a }` | `import '…' show a;` |
| Excluir | (no existe) | `import '…' hide a;` |
| Qué es público | lo que lleva `export` | todo lo que **no** empiece por `_` |
| Barril | `index.ts` | `diverso_core.dart` con `export` |
| Dependencia local | workspace / `file:` | `path:` en `pubspec.yaml` |

**En este repo:**

- `packages/diverso_core/lib/diverso_core.dart` es el barril: re-exporta modelos, errores,
  servicios (`data/services`), repositorios (`data/repositories`) y utilidades. Por eso `apps/viajero` solo escribe `import 'package:diverso_core/diverso_core.dart';`.
- `apps/viajero/pubspec.yaml` declara `diverso_core: path: ../../packages/diverso_core`.
- Convención de imports: dentro de `lib/` se usan imports **relativos** (`'../../../core/theme/app_radii.dart'`);
  las pruebas usan `package:viajero/…` porque viven fuera de `lib/`.
- `show` en uso real: `packages/diverso_core/test/data/repositories/payment_gateway_test.dart` hace
  `import 'package:supabase_flutter/supabase_flutter.dart' show FunctionException, FunctionsFetchException;`.
- El orden de los imports lo valida la regla `directives_ordering` (dart:, package:, relativos);
  `dart fix --apply` y el formateador te lo corrigen.

## 14. Tabla de bolsillo

| Quiero… | TypeScript | Dart |
|---|---|---|
| Constante en ejecución | `const` | `final` |
| Constante de compilación | (no existe) | `const` |
| Puede ser nulo | `T \| undefined` | `T?` |
| Valor por defecto si nulo | `a ?? b` | `a ?? b` |
| Propiedad calculada | `get x()` | `get x =>` |
| Privado | `private` | prefijo `_` (al archivo) |
| Objeto con parámetros con nombre | `{ a, b }` | `Foo({required this.a, this.b})` |
| Método estático que construye | `static from()` | `factory Foo.from()` |
| Tupla | `[A, B]` | `(A, B)` |
| Promesa | `Promise<T>` | `Future<T>` |
| Varios eventos | `Observable<T>` | `Stream<T>` |
| Lista condicional | `[...(c ? [x] : [])]` | `[if (c) x]` |
| Alias de tipo | `type` | `typedef` |
| Re-exportar | `export *` | `export '…'` |

---

**Siguiente:** [2. Flutter para quien sabe React Native](02-flutter-para-quien-sabe-react-native.md)

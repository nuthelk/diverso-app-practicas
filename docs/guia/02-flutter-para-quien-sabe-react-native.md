# 2. Flutter para quien sabe React Native

Flutter y React Native resuelven lo mismo con la misma idea de fondo: **la interfaz es una
función del estado**. Cambias el estado, el framework vuelve a describir la pantalla y aplica la
diferencia. Lo que cambia es el vocabulario, y una diferencia grande: Flutter **no usa
componentes nativos**; dibuja cada píxel con su propio motor. Por eso una pantalla se ve igual en
Android, iOS y web.

> Volver al [plan de aprendizaje](README.md). Este capítulo cubre las sesiones 4 y 5.
> Necesitas la sintaxis del [capítulo 1](01-dart-para-quien-sabe-typescript.md); si algo del
> código te parece raro, empieza ahí.

## Contenido

1. [La idea central: todo es un widget](#1-la-idea-central-todo-es-un-widget)
2. [`StatelessWidget`: el componente de función](#2-statelesswidget-el-componente-de-función)
3. [`StatefulWidget` y `setState`](#3-statefulwidget-y-setstate)
4. [`build` y por qué se ejecuta tanto](#4-build-y-por-qué-se-ejecuta-tanto)
5. [Widgets `const`](#5-widgets-const)
6. [`BuildContext`](#6-buildcontext)
7. [Keys](#7-keys)
8. [Layout: flexbox, pero con widgets](#8-layout-flexbox-pero-con-widgets)
9. [Tema y `ColorScheme`](#9-tema-y-colorscheme)
10. [Assets e íconos](#10-assets-e-íconos)
11. [Tabla comparativa](#11-tabla-comparativa)
12. [Los widgets reales de este repo](#12-los-widgets-reales-de-este-repo)

---

## 1. La idea central: todo es un widget

En React Native tienes componentes y estilos separados:

```tsx
<View style={{ flexDirection: 'row', padding: 12 }}>
  <Text>Hola</Text>
</View>
```

En Flutter **no hay JSX ni objetos de estilo**: el layout, el padding, el color y el texto son
widgets, y se anidan con llamadas a constructores. El mismo árbol:

```dart
Padding(
  padding: const EdgeInsets.all(12),
  child: Row(children: [Text('Hola')]),
)
```

Dos formas de anidar: `child:` (un hijo) y `children:` (una lista). Las comas finales las agrega
`dart format` cuando parte una lista de argumentos en varias líneas (capítulo 4); no las
escribes a mano.

Un widget es una **descripción inmutable y barata** de un trozo de pantalla (igual que un
elemento de React). Flutter mantiene por debajo el árbol real y, en cada reconstrucción, compara
descripciones nuevas con las anteriores (por tipo y por *key*) y solo actualiza lo que cambió.

## 2. `StatelessWidget`: el componente de función

Un widget sin estado propio recibe datos por el constructor y los pinta. Es tu componente de
función sin hooks.

**React Native**

```tsx
type Props = { monto: number };
export function PriceText({ monto }: Props) {
  const theme = useTheme();
  return (
    <View>
      <Text style={{ fontSize: 21, color: theme.onSurface }}>{formatCOP(monto)}</Text>
    </View>
  );
}
```

**Flutter** — `apps/viajero/lib/ui/core/widgets/plan/price_text.dart` (recortado):

```dart
class PriceText extends StatelessWidget {
  const PriceText({super.key, required this.monto, this.alineado = CrossAxisAlignment.start});

  final double monto;
  final CrossAxisAlignment alineado;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Column(
      crossAxisAlignment: alineado,
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(formatCOP(monto), style: TextStyle(/* … */ color: cs.onSurface)),
        // … segundo Text: «por persona · precio final»
```

Cómo se lee:

| Pieza | Equivale a |
|---|---|
| `class PriceText extends StatelessWidget` | `function PriceText(props)` |
| `const PriceText({required this.monto, …})` | desestructurar las props, con valores por defecto |
| `final double monto;` | el tipo de la prop (`monto: number`) |
| `build(BuildContext context)` | el cuerpo de la función, que devuelve el JSX |
| `super.key` | la prop `key` |

Las props son siempre `final`: un widget no se modifica, se reemplaza por otro.

## 3. `StatefulWidget` y `setState`

Cuando el widget necesita recordar algo (un campo de formulario, una animación, un
controlador), se separa en **dos clases**: el widget (inmutable, como las props) y su `State`
(que sobrevive a las reconstrucciones, como lo que guarda `useState`).

**React Native**

```tsx
function Resena() {
  const [estrellas, setEstrellas] = useState(5);
  useEffect(() => { /* al montar */ return () => { /* al desmontar */ }; }, []);
  return <Boton onPress={() => setEstrellas(3)} />;
}
```

**Flutter** — `apps/viajero/lib/ui/core/widgets/feedback/skeleton.dart` (recortado en dos partes):

```dart
class Skeleton extends StatefulWidget {
  const Skeleton({super.key, this.width, this.height = 16, this.radius = 10});
  // … campos final
  @override
  State<Skeleton> createState() => _SkeletonState();
}
```

```dart
class _SkeletonState extends State<Skeleton> with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 1100),
  )..repeat(reverse: true);

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }
```

| React | Flutter | Dónde verlo en el repo |
|---|---|---|
| `useState` | campos del `State` + `setState(() { … })` | `viajero/ui/features/legal/views/consent_view.dart` |
| `useEffect(fn, [])` (montar) | `initState()` | `catalog_view.dart` crea su view model ahí |
| cleanup del efecto | `dispose()` | el `_ctrl.dispose()` de arriba |
| props dentro del componente | `widget.planId` | `viajero/ui/features/checkout/views/checkout_loader.dart` |
| guardia "sigue montado" | `if (!mounted) return;` | `viajero/ui/features/legal/views/consent_view.dart`, tras un `await` |
| `useRef` de un input | `TextEditingController` | `_searchCtrl` en `catalog_view.dart` |

Diferencias con los hooks:

- **Sin lista de dependencias** ni reglas de hooks: `setState` solo dice "algo cambió, vuelve a
  ejecutar `build`". Modificas los campos dentro del callback.
- `dispose` es **tu responsabilidad** para controladores, animaciones y suscripciones; si lo
  olvidas hay fugas. Por eso `catalog_view.dart` libera `_searchCtrl` y su view model.
- `with SingleTickerProviderStateMixin` es un *mixin*: reutiliza código sin herencia. Aquí le da
  al `State` el reloj que necesita la animación; lo verás siempre que haya un
  `AnimationController`.

`setState` real, de `viajero/ui/features/legal/views/consent_view.dart` (`_aceptar`):

```dart
setState(() {
  _guardando = true;
  _error = null;
});
final guardado = await consentimiento.aceptar();
if (!mounted) return;
setState(() {
  _guardando = false;
  if (!guardado) _error = 'No pudimos guardar tu autorización. Intenta de nuevo.';
});
```

**Cuándo usar cada uno en este repo.** Estado de UI local (un check marcado, un slider, un
formulario) vive en un `State`. El estado de una pantalla con datos remotos vive en un **view
model** (capítulo 3). Hay que elegir bien: no metas en un `State` lo que otras pantallas deben
ver.

## 4. `build` y por qué se ejecuta tanto

`build` es tu `render`. Flutter lo llama cuando:

- el widget se inserta por primera vez;
- llamas a `setState` en su `State`;
- su padre se reconstruye y le pasa un widget nuevo;
- cambia algo de lo que depende (el tema, el tamaño de pantalla con `MediaQuery`, un
  `ListenableBuilder` al que avisan).

Esto es normal y barato (las descripciones son livianas y Flutter solo actualiza las
diferencias), pero impone reglas:

1. **`build` debe ser puro y rápido.** Nada de consultas de red, ni crear controladores, ni
   efectos.
2. **Los objetos con vida propia se crean en `initState`**, no en `build`. Si el view model (o el
   `Future` de un `FutureBuilder`) se creara dentro de `build`, se repetiría la consulta en cada
   reconstrucción. En `checkout_loader.dart` el `CheckoutPlanViewModel` se crea en `initState` y
   ahí mismo se le pide `cargar()` (también lo llama el botón "Reintentar").
3. **Calcula una vez lo que no cambia con el scroll.** Un comentario del repo lo dice:
   en `catalog_view.dart`, `build` decide `esGrid` con `MediaQuery.sizeOf(context).width` "una
   vez por rebuild real" y no dentro del scroll.

## 5. Widgets `const`

```dart
const SizedBox(width: 3),
const Icon(Icons.location_on_rounded, size: 14, color: Colors.white),
```

Un widget creado con `const` es una **constante de compilación**: todas las apariciones
idénticas son la misma instancia. Cuando Flutter reconstruye y encuentra la misma instancia,
**salta ese subárbol**. Es el análogo de `React.memo` o de sacar un elemento fuera del
componente, pero gratis y comprobado por el compilador.

Cómo ayudarle:

- Declara los constructores `const` (todos los campos `final`): `const PlanCard({super.key, …})`.
- Escribe `const` al usarlos: `child: const CatalogView()` en `viajero/router/app_router.dart`.
- Deja que el linter te avise: `prefer_const_constructors` y
  `prefer_const_literals_to_create_immutables` están activos en `analysis_options.yaml`, y
  `dart fix --apply` los corrige solo.

Un widget no puede ser `const` si algún valor depende de algo que cambia en ejecución (`cs.primary`
sale del tema, así que `Icon(…, color: cs.primary)` no puede serlo, pero el `SizedBox` de al lado
sí). Es lo que verás en `plan_card.dart`.

## 6. `BuildContext`

El `context` que recibe `build` es **la posición de ese widget en el árbol**. Casi todo lo que
"busca algo hacia arriba" lo hace con él:

| Llamada | Qué busca | Equivale a |
|---|---|---|
| `Theme.of(context)` | el tema más cercano | `useTheme()` |
| `MediaQuery.sizeOf(context)` | tamaño de la pantalla | `useWindowDimensions()` |
| `context.read<CatalogRepository>()` | un objeto registrado con `Provider` | `useContext(Ctx)` |
| `context.push('/plan/…')` | el router | `router.push(…)` de expo-router |

Ejemplos reales: `Theme.of(context).colorScheme` en `price_text.dart`, y
`onTap: () => context.push('/plan/${plan.id}')` en `plan_card.dart`.

Dos trampas habituales:

- Un `context` de un widget **por encima** de un `Provider`, `Theme` o `Scaffold` no lo "ve".
  Se arregla con un `Builder` que crea un `context` más abajo; `test/ui/features/bookings/widgets/cancel_dialog_test.dart`
  lo usa para abrir un diálogo.
- No uses un `context` después de un `await` sin comprobar `mounted`: el widget pudo
  desaparecer.

## 7. Keys

Igual que en React, una *key* le dice al framework cuándo dos widgets son "el mismo". Las
necesitas en pocos casos: listas que se reordenan y **transiciones entre hijos del mismo tipo**.

Ejemplos del repo:

- `viajero/ui/features/catalog/views/catalog_view.dart`: la bandeja de comparar está dentro de un
  `AnimatedSwitcher` y alterna entre `SizedBox.shrink(key: ValueKey('sin-bandeja'))` y
  `BandejaComparar(key: const ValueKey('bandeja'), …)`. La key permite que el
  `AnimatedSwitcher` detecte que cambió el hijo y anime.
- `viajero/ui/features/bookings/views/review_view.dart`: `key: ValueKey(vm.calificacion)` en el
  texto "Muy mala… ¡Excelente!" para que cada calificación nueva dispare la transición.
- `super.key` en el constructor de cada widget es lo que permite que quien lo use le pase una
  key. Algunas keys también sirven para **encontrar widgets en las pruebas** (`find.byKey`, por
  ejemplo en `test/ui/shell/app_shell_test.dart`).

## 8. Layout: flexbox, pero con widgets

La regla de oro de Flutter: **las restricciones bajan, los tamaños suben y el padre decide la
posición**. El padre le dice a cada hijo "mide entre X e Y"; el hijo elige un tamaño dentro de
ese rango.

| CSS / React Native | Flutter | Nota |
|---|---|---|
| `flexDirection: 'row'` | `Row` | horizontal |
| `flexDirection: 'column'` | `Column` | vertical |
| `justifyContent` | `mainAxisAlignment` | eje principal |
| `alignItems` | `crossAxisAlignment` | eje cruzado |
| `flex: 1` | `Expanded` | ocupa el espacio sobrante |
| un `View` vacío con `flex: 1` | `Spacer()` | empuja a los lados |
| `width` / `height` | `SizedBox(width:, height:)` | también sirve de separador |
| `padding` | `Padding` o `padding:` de `Container` | `EdgeInsets.all`, `.symmetric`, `.fromLTRB` |
| `position: 'absolute'` | `Stack` + `Positioned` | |
| `flexWrap: 'wrap'` | `Wrap` | |
| `maxWidth` | `ConstrainedBox(constraints: BoxConstraints(maxWidth: …))` | |
| `useWindowDimensions` | `MediaQuery.sizeOf(context)` | |
| `onLayout` | `LayoutBuilder` | te da el tamaño disponible |
| `FlatList` | `ListView.builder` / `SliverList.builder` | |
| `ScrollView` | `SingleChildScrollView` / `CustomScrollView` | |
| `SafeAreaView` | `SafeArea` | |
| `View` con fondo y borde | `Container` / `DecoratedBox` | `BoxDecoration` |

Diferencias frente a CSS: no hay herencia de estilos de texto (cada `Text` toma su estilo del
tema o del `style:` que le pases) y `Row`/`Column` no se encogen solos: usa
`mainAxisSize: MainAxisSize.min` cuando quieras que ocupen solo lo necesario.

**En este repo** — `apps/viajero/lib/ui/features/catalog/widgets/plan_card.dart`. Una pila con
una foto, una capa degradada y un sello colocado en una esquina (recortado):

```dart
SizedBox(
  height: 168,
  child: Stack(
    fit: StackFit.expand,
    children: [
      _PortadaPlan(plan: plan),
      Positioned.fill(child: DecoratedBox(/* degradado oscuro */)),
      Positioned(
        top: 10,
        left: 10,
        child: plan.agency?.verificada == true
            ? const VerifiedBadge(blanco: true, compacto: true)
            : const SizedBox.shrink(),
      ),
```

En React Native sería un `View` con `position: 'absolute'` por cada capa. Dos detalles: el
`child:` del `Positioned` usa un ternario para "no pintar nada", y `const SizedBox.shrink()` es
el equivalente de devolver `null`.

Y una fila con un `Spacer`, en la misma tarjeta:

```dart
Row(
  children: [
    PuntajePlan(plan: plan),
    const Spacer(),
    PriceText(monto: plan.precioCop),
  ],
),
```

Puntaje a la izquierda, precio a la derecha: `justifyContent: 'space-between'` hecho a mano.

> **Cuando falla.** Los errores de layout más frecuentes son `A RenderFlex overflowed by N pixels`
> (el contenido de un `Row`/`Column` no cabe: envuélvelo en `Expanded` o `Flexible`, o haz que
> haga scroll) y `Vertical viewport was given unbounded height` (una lista dentro de una
> `Column` sin límite: envuélvela en `Expanded`). Los verás en la consola de `flutter run`,
> con el widget responsable.

## 9. Tema y `ColorScheme`

Flutter trae un sistema de diseño (Material 3). Se configura **una vez** arriba del árbol y cada
widget lee del tema; es el `ThemeProvider` + `useTheme()` de tu proyecto RN.

**Se define** — `apps/viajero/lib/ui/core/theme/app_theme.dart`:

```dart
static ThemeData viajeroLight() => _build(seedViajero, Brightness.light);
static ThemeData viajeroDark() => _build(seedViajero, Brightness.dark);

static ThemeData _build(Color seed, Brightness brightness) {
  final scheme = ColorScheme.fromSeed(seedColor: seed, brightness: brightness);
```

`ColorScheme.fromSeed` genera toda la paleta (claro u oscuro) a partir de un color de marca (el
verde `0xFF0E6E4F`). Ese es el único color de acento de la app.

**Se instala** — `apps/viajero/lib/app.dart` (recortado):

```dart
MaterialApp.router(
  title: 'Diverso App',
  theme: AppTheme.viajeroLight(),
  darkTheme: AppTheme.viajeroDark(),
  themeMode: modo.mode,
  routerConfig: buildViajeroRouter(),
),
```

`themeMode` (sistema, claro, oscuro) viene de `ThemeModeViewModel`, que el usuario cambia desde
Perfil (capítulo 3).

**Se lee** — `final cs = Theme.of(context).colorScheme;` y luego `cs.onSurface`,
`cs.primary`, `cs.surfaceContainerLow`…. La convención: `onX` es el color del contenido que va
**sobre** `X` (`onPrimary` es el texto sobre un fondo `primary`). Así el modo oscuro funciona
sin tocar el widget: `test/ui/core/theme/modo_oscuro_test.dart` lo comprueba.

Para valores propios que no son del tema (radios, breakpoints) el repo usa constantes:
`AppRadios.pill` en `viajero/ui/core/theme/app_radii.dart` y `AppTheme.bpCompact`.

## 10. Assets e íconos

| React Native | Flutter |
|---|---|
| `require('./logo.png')` | declarar en `pubspec.yaml` y `Image.asset('ruta')` |
| `<Image source={{ uri }}>` | `Image.network(url)` |
| `@expo/vector-icons` | `Icon(Icons.verified_rounded)` (fuente incluida con `uses-material-design: true`) |

Un asset **debe estar declarado en el `pubspec.yaml`** del paquete que lo tiene
(`packages/diverso_core/pubspec.yaml` lista `assets/logo_diverso.png`); si no, falla en
ejecución. Como el logo vive en el paquete compartido, se pide con `package:`.
`packages/diverso_core/lib/ui/diverso_logo.dart` (recortado; el comentario de la segunda línea
es de esta guía):

```dart
Image.asset(
  asset,                      // 'assets/logo_diverso.png'
  package: 'diverso_core',
  width: size,
  height: size,
  color: color,
  colorBlendMode: BlendMode.srcIn,
```

La imagen es una máscara negra con alfa que se tiñe del color pedido (`color` + `srcIn`): una
sola imagen para todos los fondos. Las fotos de los planes vienen de internet con `Image.network`
(`_PortadaPlan` en `plan_card.dart`, con un `errorBuilder` de respaldo).

## 11. Tabla comparativa

| React Native | Flutter | Nota |
|---|---|---|
| Componente de función | `StatelessWidget` | sin estado |
| Componente con hooks | `StatefulWidget` + `State` | dos clases |
| Props | campos `final` + constructor | inmutables |
| `useState` / setter | campos + `setState` | |
| `useEffect(() => …, [])` | `initState` | |
| cleanup de `useEffect` | `dispose` | |
| `render` / JSX | `build` | devuelve un `Widget` |
| `React.memo` | widget `const` | |
| `key` | `Key` / `ValueKey` | |
| `children` | `child` / `children` | |
| `{cond && <X />}` | `if (cond) X()` (en una lista) o ternario | `const SizedBox.shrink()` = `null` |
| Context (`useContext`) | `Provider` + `context.read` | capítulo 3 |
| `ThemeProvider` | `Theme` / `MaterialApp(theme:)` | |
| `View` | `Container`, `Padding`, `SizedBox`, `Column`… | |
| `Text` | `Text` | el estilo va en `style: TextStyle(…)` |
| `Image` | `Image.network` / `Image.asset` | |
| `TextInput` | `TextField` | |
| `Pressable` / `TouchableOpacity` | `InkWell`, `GestureDetector`, `IconButton`, `FilledButton` | |
| `ActivityIndicator` | `CircularProgressIndicator` | |
| `RefreshControl` | `RefreshIndicator` | |
| `Alert` / `Modal` | `showDialog` | |
| `Animated` | `AnimatedSwitcher`, `FadeTransition`, `AnimationController` | |
| React Query (carga simple) | un view model con `cargar()` + `ListenableBuilder` (o `FutureBuilder`) | `checkout_plan_view_model.dart`; el repo no usa `FutureBuilder` |
| expo-router / React Navigation | `go_router` | capítulo 3 |
| Fast Refresh | hot reload | capítulo 4 |

## 12. Los widgets reales de este repo

Los widgets compartidos viven en `apps/viajero/lib/ui/core/widgets/`. Son pequeños y casi todos
`StatelessWidget`: por eso son buenos para empezar a leer.

| Archivo (bajo `ui/core/widgets/`) | Widget | Qué hace |
|---|---|---|
| `plan/price_text.dart` | `PriceText` | Monto grande + "por persona · precio final" |
| `plan/verified_badge.dart` | `VerifiedBadge` | Sello "Verificada RNT" (claro y versión sobre foto) |
| `plan/paso_itinerario.dart` | `PasoItinerario` | Un paso del itinerario: hora y actividad |
| `plan/tarjeta_cancelacion.dart` | `TarjetaCancelacion` | Política de cancelación en una tarjeta |
| `rating/rating_stars.dart` | `RatingStars` | Estrella + valor opcional |
| `rating/puntaje_plan.dart` | `PuntajePlan` | ★ con valor y cantidad, o "Nueva" |
| `rating/estrellas_calificacion.dart` | `EstrellasCalificacion` | Cinco estrellas de una reseña |
| `rating/insignia_nueva.dart` | `InsigniaNueva` | Píldora "Nueva" |
| `feedback/empty_state.dart` | `EmptyState` | Estado vacío o de error con acción |
| `feedback/skeleton.dart` | `Skeleton` | Placeholder animado (el único `StatefulWidget` de la lista) |
| `page/titulo_pagina.dart` | `TituloPagina` | Título grande de página |
| `page/cabecera_colapsable.dart` | `CabeceraColapsable` | Cabecera con foto que se pliega al hacer scroll |
| `section_label.dart` | `SectionLabel` | Etiqueta de sección en mayúsculas |
| `agency_avatar.dart` | `AgencyAvatar` | Logo de la agencia o sus iniciales |

Y un widget de funcionalidad, más grande, para leer despacio:
`apps/viajero/lib/ui/features/catalog/widgets/plan_card.dart` (`PlanCard`): una tarjeta con foto
(`Stack`), sellos, precio y puntaje, que usa casi todo lo de este capítulo (`const`, `Theme.of`,
`Positioned`, `Spacer`, callbacks opcionales, `context.push`). Su prueba,
`apps/viajero/test/ui/core/widgets/rating/puntaje_nueva_test.dart`, la pinta sin red (capítulo 4).

> **Estado de la estructura.** Estos widgets se irán moviendo y afinando en las fases siguientes
> (ver la nota "En construcción" del capítulo 3). Si una ruta ya no existe, busca la clase por
> nombre: `grep -rn "class PriceText" apps/viajero/lib`.

---

**Anterior:** [1. Dart para quien sabe TypeScript](01-dart-para-quien-sabe-typescript.md) ·
**Siguiente:** [3. Estado, arquitectura y navegación](03-estado-arquitectura-y-navegacion.md)

import 'package:diverso_core/diverso_core.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:viajero/ui/core/theme/app_theme.dart';
import 'package:viajero/ui/features/catalog/views/catalog_view.dart';
import 'package:viajero/ui/features/catalog/widgets/bandeja_comparar.dart';

/// Bandeja de comparación del catálogo: oculta sin selección, con pista y botón deshabilitado con
/// un solo plan, «Comparar (n)» activo desde dos, miniaturas que se quitan con ×, «Limpiar», tope
/// de planes y lista que nunca queda tapada. Sin red ni Supabase: el catálogo es un doble.

Plan _plan(int i, {List<String> fotos = const ['https://fotos.test/p.jpg']}) => Plan(
  id: 'plan-$i',
  agencyId: 'ag',
  titulo: 'Plan $i',
  destino: 'Guatapé',
  categoria: ExperienceCategory.cultura,
  precioCop: 100000.0 + i,
  estado: PlanStatus.publicado,
  fotos: fotos,
  ratingPromedio: 4.0,
  reviewsCount: 3,
);

class _Catalogo implements CatalogRepository {
  _Catalogo(this.planes);

  final List<Plan> planes;

  @override
  Future<List<Plan>> search(FiltrosCatalogo filtros) async => planes;

  @override
  Future<List<String>> destinos() async => const [];

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

List<Plan>? _enviados;

Future<void> _abrir(WidgetTester tester, {int planes = 4}) async {
  _enviados = null;
  // 600 de ancho: lista de una columna y espacio para tres miniaturas junto al botón.
  tester.view.physicalSize = const Size(600, 1000);
  tester.view.devicePixelRatio = 1.0;
  addTearDown(tester.view.reset);
  final router = GoRouter(
    routes: [
      GoRoute(path: '/', builder: (_, _) => const CatalogView()),
      GoRoute(
        path: '/comparar',
        builder: (_, state) {
          _enviados = state.extra as List<Plan>;
          return const Scaffold(body: Text('pantalla comparar'));
        },
      ),
      GoRoute(path: '/plan/:id', builder: (_, _) => const Scaffold()),
    ],
  );
  await tester.pumpWidget(
    Provider<CatalogRepository>.value(
      value: _Catalogo([for (var i = 1; i <= planes; i++) _plan(i)]),
      child: MaterialApp.router(theme: AppTheme.viajeroLight(), routerConfig: router),
    ),
  );
  await tester.pumpAndSettle();
}

Future<void> _agregar(WidgetTester tester) async {
  final boton = find.byTooltip('Agregar al comparador').first;
  await tester.ensureVisible(boton);
  await tester.pumpAndSettle();
  await tester.tap(boton);
  await tester.pumpAndSettle();
}

final _bandeja = find.byType(BandejaComparar);
Finder _enBandeja(Finder f) => find.descendant(of: _bandeja, matching: f);
Finder get _botonComparar => find.descendant(of: _bandeja, matching: find.byType(FilledButton));

void main() {
  testWidgets('sin planes elegidos no hay bandeja', (tester) async {
    await _abrir(tester);

    expect(_bandeja, findsNothing);
    expect(find.text('Limpiar'), findsNothing);
  });

  testWidgets('con 1 plan: contador, pista y «Comparar (1)» deshabilitado', (tester) async {
    await _abrir(tester);
    await _agregar(tester);

    expect(_bandeja, findsOneWidget);
    expect(_enBandeja(find.text('1 de 3 planes')), findsOneWidget);
    expect(_enBandeja(find.text('Elige al menos 2 planes')), findsOneWidget);
    expect(_enBandeja(find.text('Plan 1')), findsOneWidget); // miniatura con su título
    expect(_enBandeja(find.text('Limpiar')), findsOneWidget);
    expect(tester.widget<FilledButton>(_botonComparar).onPressed, isNull);
    expect(_enBandeja(find.text('Comparar (1)')), findsOneWidget);

    // Tocar el botón deshabilitado no navega.
    await tester.tap(_botonComparar, warnIfMissed: false);
    await tester.pumpAndSettle();
    expect(find.text('pantalla comparar'), findsNothing);
  });

  testWidgets('con 2 planes: «Comparar (2)» activo, sin pista, y abre el comparador con ellos', (
    tester,
  ) async {
    await _abrir(tester);
    await _agregar(tester);
    await _agregar(tester);

    expect(_enBandeja(find.text('2 de 3 planes')), findsOneWidget);
    expect(_enBandeja(find.text('Elige al menos 2 planes')), findsNothing);
    expect(_enBandeja(find.text('Comparar (2)')), findsOneWidget);
    expect(tester.widget<FilledButton>(_botonComparar).onPressed, isNotNull);

    await tester.tap(_botonComparar);
    await tester.pumpAndSettle();
    expect(find.text('pantalla comparar'), findsOneWidget);
    expect(_enviados!.map((p) => p.id), ['plan-1', 'plan-2']);
  });

  testWidgets('la × de una miniatura quita ese plan y vuelve la pista', (tester) async {
    await _abrir(tester);
    await _agregar(tester);
    await _agregar(tester);

    await tester.tap(find.byTooltip('Quitar Plan 1 de la comparación'));
    await tester.pumpAndSettle();

    expect(_enBandeja(find.text('1 de 3 planes')), findsOneWidget);
    expect(_enBandeja(find.text('Plan 1')), findsNothing);
    expect(_enBandeja(find.text('Plan 2')), findsOneWidget);
    expect(_enBandeja(find.text('Elige al menos 2 planes')), findsOneWidget);
    expect(tester.widget<FilledButton>(_botonComparar).onPressed, isNull);
    // La tarjeta del plan quitado vuelve a poder agregarse.
    expect(find.byTooltip('Agregar al comparador'), findsWidgets);
  });

  testWidgets('«Limpiar» vacía la selección y la bandeja desaparece', (tester) async {
    await _abrir(tester);
    await _agregar(tester);
    await _agregar(tester);

    await tester.tap(_enBandeja(find.text('Limpiar')));
    await tester.pumpAndSettle();

    expect(_bandeja, findsNothing);
    expect(find.byTooltip('Quitar del comparador'), findsNothing);
  });

  testWidgets('respeta el máximo de 3: el cuarto plan no entra', (tester) async {
    await _abrir(tester);
    for (var i = 0; i < 3; i++) {
      await _agregar(tester);
    }
    expect(_enBandeja(find.text('3 de 3 planes')), findsOneWidget);
    expect(_enBandeja(find.text('Máximo 3 planes')), findsOneWidget);

    await _agregar(tester); // intento del cuarto

    expect(_enBandeja(find.text('3 de 3 planes')), findsOneWidget);
    expect(_enBandeja(find.text('Plan 4')), findsNothing);
    expect(_enBandeja(find.text('Comparar (3)')), findsOneWidget);
  });

  testWidgets('la bandeja queda sobre la barra inferior y no tapa el final de la lista', (
    tester,
  ) async {
    await _abrir(tester, planes: 6);
    await _agregar(tester);

    await tester.drag(find.byType(CustomScrollView), const Offset(0, -5000));
    await tester.pumpAndSettle();

    final bandeja = tester.getRect(_bandeja);
    final ultimoPrecio = tester.getRect(find.text(formatCOP(100006)));
    expect(ultimoPrecio.bottom, lessThanOrEqualTo(bandeja.top));
    // Y la bandeja no se sale de la pantalla.
    expect(bandeja.bottom, lessThanOrEqualTo(1000));
  });

  testWidgets('los lugares libres miden lo mismo que una miniatura, con su «+» decorativo', (
    tester,
  ) async {
    await _abrir(tester);
    await _agregar(tester);

    final foto = tester.getSize(find.byKey(const ValueKey('foto-miniatura')));
    final huecos = find.byKey(const ValueKey('hueco-bandeja'));
    expect(huecos, findsNWidgets(2)); // 3 lugares, 1 ocupado
    for (final h in huecos.evaluate().map((e) => e.widget).toList().asMap().keys) {
      expect(tester.getSize(huecos.at(h)), foto);
    }
    expect(foto.width, greaterThan(40)); // no son cápsulas angostas
    expect(
      find.descendant(of: huecos.first, matching: find.byIcon(Icons.add_rounded)),
      findsOneWidget,
    );
    // Decorativo: sin semántica ni foco.
    expect(find.descendant(of: _bandeja, matching: find.byType(ExcludeSemantics)), findsWidgets);
    expect(find.descendant(of: huecos.first, matching: find.byType(InkWell)), findsNothing);
  });

  testWidgets('accesible: cada × y cada botón tienen etiqueta', (tester) async {
    await _abrir(tester);
    await _agregar(tester);
    final handle = tester.ensureSemantics();

    final quitar = tester.getSemantics(find.byTooltip('Quitar Plan 1 de la comparación'));
    expect(quitar.tooltip, 'Quitar Plan 1 de la comparación');
    expect(quitar.flagsCollection.isButton, isTrue);
    expect(find.bySemanticsLabel('Limpiar'), findsWidgets);
    handle.dispose();
  });
}

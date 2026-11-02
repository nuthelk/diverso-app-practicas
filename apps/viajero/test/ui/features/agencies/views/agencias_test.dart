import 'dart:async';

import 'package:diverso_core/diverso_core.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:provider/provider.dart';
import 'package:viajero/router/app_router.dart';
import 'package:viajero/ui/core/theme/app_theme.dart';
import 'package:viajero/ui/core/theme/theme_mode_view_model.dart';
import 'package:viajero/ui/core/widgets/agency_avatar.dart';
import 'package:viajero/ui/core/widgets/feedback/skeleton.dart';

/// Pestaña «Agencias» y página `/agencia/:id`: lista con puntaje («Nueva» sin reseñas), logo o
/// iniciales, orden elegible, estados de carga/vacío/error, y la página de una agencia con sus
/// planes. Sin red ni Supabase: el catálogo es un doble.

const _rutas = AgenciaResumen(
  id: 'ag-rutas',
  nombre: 'Rutas de Antioquia Cultural',
  ciudad: 'Medellín',
  descripcion: 'Cultura, memoria y patrimonio de Antioquia.',
  planesCount: 2,
  rating: 4.5,
  reviewsTotal: 2,
);
const _eco = AgenciaResumen(
  id: 'ag-eco',
  nombre: 'EcoAndes Viajes',
  ciudad: 'Envigado',
  planesCount: 5,
);
const _cafe = AgenciaResumen(
  id: 'ag-cafe',
  nombre: 'Café y Montaña Tours',
  ciudad: 'Jardín',
  planesCount: 3,
  rating: 5.0,
  reviewsTotal: 3,
);

Plan _plan(String id, String titulo, {String agencia = 'ag-rutas'}) => Plan(
  id: id,
  agencyId: agencia,
  titulo: titulo,
  destino: 'Guatapé',
  categoria: ExperienceCategory.cultura,
  precioCop: 120000,
  estado: PlanStatus.publicado,
  ratingPromedio: 3.0,
  reviewsCount: 1,
);

class _Catalogo implements CatalogRepository {
  _Catalogo({this.lista = const [_rutas, _eco, _cafe]});

  List<AgenciaResumen> lista;
  Object? falla;
  Completer<List<AgenciaResumen>>? pendiente;
  int cargas = 0;
  final planesPorAgencia = <String, List<Plan>>{
    'ag-rutas': [_plan('plan-1', 'Comuna 13 y memoria'), _plan('plan-2', 'Santa Fe de Antioquia')],
  };

  @override
  Future<List<AgenciaResumen>> agencias() async {
    cargas++;
    if (pendiente != null) return pendiente!.future;
    if (falla != null) throw falla!;
    return lista;
  }

  @override
  Future<({AgenciaResumen agencia, List<Plan> planes})?> agenciaConPlanes(String agencyId) async {
    if (falla != null) throw falla!;
    for (final a in lista) {
      if (a.id == agencyId) return (agencia: a, planes: planesPorAgencia[agencyId] ?? const []);
    }
    return null;
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

class _Resenas implements ReviewRepository {
  @override
  Future<List<Review>> porPlan(String planId, {int limit = 20}) async => const [];

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

Future<GoRouter> _abrir(
  WidgetTester tester,
  _Catalogo catalogo, {
  String url = '/agencias',
  bool settle = true,
}) async {
  // 600 de ancho: lista de una columna; la tipografía de prueba (Ahem) es más ancha que la real y desbordaría el precio de PlanCard en 400.
  tester.view.physicalSize = const Size(600, 1400);
  tester.view.devicePixelRatio = 1.0;
  addTearDown(tester.view.reset);
  final router = buildViajeroRouter(haySesion: () => true, initialLocation: url);
  await tester.pumpWidget(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => ThemeModeViewModel()),
        Provider<CatalogRepository>.value(value: catalogo),
        Provider<ReviewRepository>.value(value: _Resenas()),
      ],
      child: MaterialApp.router(theme: AppTheme.viajeroLight(), routerConfig: router),
    ),
  );
  if (settle) {
    await tester.pumpAndSettle();
  } else {
    await tester.pump();
  }
  return router;
}

String _ruta(GoRouter r) => r.routerDelegate.currentConfiguration.last.matchedLocation;

/// Nombres de las agencias de la lista, de arriba abajo.
List<String> _ordenEnPantalla(WidgetTester tester) {
  final visibles = [
    for (final a in [_rutas, _eco, _cafe])
      if (find.text(a.nombre).evaluate().isNotEmpty) a.nombre,
  ];
  visibles.sort(
    (a, b) => tester.getTopLeft(find.text(a)).dy.compareTo(tester.getTopLeft(find.text(b)).dy),
  );
  return visibles;
}

void main() {
  setUpAll(() => initializeDateFormatting('es'));

  group('logo', () {
    Future<void> montar(WidgetTester tester, AgenciaResumen a) => tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.viajeroLight(),
        home: Scaffold(
          body: Center(child: AgencyAvatar(agencia: a)),
        ),
      ),
    );

    testWidgets('con logo_url muestra la imagen de red', (tester) async {
      await montar(
        tester,
        const AgenciaResumen(
          id: 'a',
          nombre: 'Rutas de Antioquia',
          ciudad: 'X',
          logoUrl: 'https://logos.test/a.png',
        ),
      );
      expect(find.byType(Image), findsOneWidget);
    });

    testWidgets('sin logo_url (o vacío) muestra solo las iniciales, sin pedir imagen', (
      tester,
    ) async {
      await montar(
        tester,
        const AgenciaResumen(id: 'a', nombre: 'Rutas de Antioquia', ciudad: 'X'),
      );
      expect(find.byType(Image), findsNothing);
      expect(find.text('RA'), findsOneWidget);
      await montar(
        tester,
        const AgenciaResumen(id: 'a', nombre: 'Rutas de Antioquia', ciudad: 'X', logoUrl: ''),
      );
      expect(find.byType(Image), findsNothing);
      expect(find.text('RA'), findsOneWidget);
    });
  });

  group('lista de agencias', () {
    testWidgets(
      'cada agencia muestra iniciales (sin logo), puntaje o «Nueva», ciudad, planes y sello',
      (tester) async {
        await _abrir(tester, _Catalogo());

        expect(find.text('Agencias'), findsWidgets); // título de la página y destino de la barra
        expect(find.text('Rutas de Antioquia Cultural'), findsOneWidget);
        // Sin logo_url: iniciales en un círculo de color.
        expect(find.text('RA'), findsOneWidget);
        expect(find.text('EV'), findsOneWidget);
        expect(find.text('CM'), findsOneWidget);
        // Con reseñas: ★ puntaje y cantidad. Sin reseñas: «Nueva», nunca 0.
        expect(find.text('4.5'), findsOneWidget);
        expect(find.text('(2)'), findsOneWidget);
        expect(find.text('Nueva'), findsOneWidget);
        expect(find.text('0.0'), findsNothing);
        expect(find.text('Medellín'), findsOneWidget);
        expect(find.text('2 planes'), findsOneWidget);
        expect(find.text('5 planes'), findsOneWidget);
        expect(find.text('Verificada RNT'), findsNWidgets(3));
      },
    );

    test('el color de las iniciales es estable por agencia y varía entre agencias', () {
      expect(colorDeAgencia('ag-rutas'), colorDeAgencia('ag-rutas'));
      final colores = {
        for (final a in ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j']) colorDeAgencia(a),
      };
      expect(colores.length, greaterThan(1));
    });

    testWidgets('por defecto va por puntaje y el control cambia el orden', (tester) async {
      await _abrir(tester, _Catalogo());
      // Puntaje: 5.0, 4.5 y al final la «Nueva».
      expect(_ordenEnPantalla(tester), [
        'Café y Montaña Tours',
        'Rutas de Antioquia Cultural',
        'EcoAndes Viajes',
      ]);
      for (final etiqueta in ['Puntaje', 'Más planes', 'Nombre']) {
        expect(find.text(etiqueta), findsOneWidget);
      }

      await tester.tap(find.text('Más planes'));
      await tester.pumpAndSettle();
      expect(_ordenEnPantalla(tester), [
        'EcoAndes Viajes',
        'Café y Montaña Tours',
        'Rutas de Antioquia Cultural',
      ]);

      await tester.tap(find.text('Nombre'));
      await tester.pumpAndSettle();
      expect(_ordenEnPantalla(tester), [
        'Café y Montaña Tours',
        'EcoAndes Viajes',
        'Rutas de Antioquia Cultural',
      ]);
    });

    testWidgets('muestra esqueletos mientras carga', (tester) async {
      final catalogo = _Catalogo()..pendiente = Completer();
      await _abrir(tester, catalogo, settle: false);
      expect(find.byType(Skeleton), findsWidgets);
      expect(find.text('Rutas de Antioquia Cultural'), findsNothing);

      catalogo.pendiente!.complete(const [_rutas]);
      await tester.pumpAndSettle();
      expect(find.byType(Skeleton), findsNothing);
      expect(find.text('Rutas de Antioquia Cultural'), findsOneWidget);
    });

    testWidgets('sin agencias muestra el estado vacío', (tester) async {
      await _abrir(tester, _Catalogo(lista: const []));
      expect(find.text('Aún no hay agencias'), findsOneWidget);
    });

    testWidgets('si falla muestra el error y «Reintentar» vuelve a cargar', (tester) async {
      final catalogo = _Catalogo()..falla = Exception('sin red');
      await _abrir(tester, catalogo);
      expect(find.text('Sin conexión'), findsOneWidget);
      expect(find.textContaining('No pudimos cargar las agencias'), findsOneWidget);

      catalogo.falla = null;
      await tester.tap(find.text('Reintentar'));
      await tester.pumpAndSettle();
      expect(find.text('Sin conexión'), findsNothing);
      expect(find.text('Rutas de Antioquia Cultural'), findsOneWidget);
    });

    testWidgets('deslizar hacia abajo recarga la lista', (tester) async {
      final catalogo = _Catalogo();
      await _abrir(tester, catalogo);
      expect(catalogo.cargas, 1);
      await tester.fling(find.text('Rutas de Antioquia Cultural'), const Offset(0, 400), 1000);
      await tester.pumpAndSettle();
      expect(catalogo.cargas, 2);
    });

    testWidgets('tocar una agencia abre su página', (tester) async {
      final router = await _abrir(tester, _Catalogo());
      await tester.tap(find.text('Rutas de Antioquia Cultural'));
      await tester.pumpAndSettle();
      expect(_ruta(router), '/agencia/ag-rutas');
      expect(find.text('PLANES PUBLICADOS (2)'), findsOneWidget);
    });
  });

  group('página de agencia', () {
    testWidgets('/agencia/:id carga por id y muestra sus datos y sus planes', (tester) async {
      await _abrir(tester, _Catalogo(), url: '/agencia/ag-rutas');
      expect(find.text('Rutas de Antioquia Cultural'), findsOneWidget);
      expect(find.text('RA'), findsOneWidget);
      expect(find.text('4.5'), findsOneWidget);
      expect(find.text('Medellín'), findsOneWidget);
      expect(find.text('Cultura, memoria y patrimonio de Antioquia.'), findsOneWidget);
      expect(find.text('Verificada RNT'), findsOneWidget);
      expect(find.text('PLANES PUBLICADOS (2)'), findsOneWidget);
      expect(find.text('Comuna 13 y memoria'), findsOneWidget);
      expect(find.text('Santa Fe de Antioquia'), findsOneWidget);
      // Aquí no se compara: el botón del comparador no aparece en las tarjetas.
      expect(find.byTooltip('Agregar al comparador'), findsNothing);
    });

    testWidgets('tocar un plan abre /plan/:id como en el catálogo', (tester) async {
      final router = await _abrir(tester, _Catalogo(), url: '/agencia/ag-rutas');
      await tester.tap(find.text('Comuna 13 y memoria'));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 600));
      expect(_ruta(router), '/plan/plan-1');
    });

    testWidgets('una agencia «Nueva» sin planes muestra «Nueva» y no se rompe', (tester) async {
      await _abrir(tester, _Catalogo(), url: '/agencia/ag-eco');
      expect(find.text('Nueva'), findsOneWidget);
      expect(find.text('Esta agencia no tiene planes disponibles por ahora.'), findsOneWidget);
    });

    testWidgets('un id que no existe avisa en vez de quedar en blanco', (tester) async {
      await _abrir(tester, _Catalogo(), url: '/agencia/nope');
      expect(find.text('Agencia no disponible'), findsOneWidget);
    });

    testWidgets('si falla la carga ofrece reintentar', (tester) async {
      final catalogo = _Catalogo()..falla = Exception('sin red');
      await _abrir(tester, catalogo, url: '/agencia/ag-rutas');
      expect(find.text('No pudimos cargar la agencia'), findsOneWidget);
      catalogo.falla = null;
      await tester.tap(find.text('Reintentar'));
      await tester.pumpAndSettle();
      expect(find.text('Comuna 13 y memoria'), findsOneWidget);
    });

    testWidgets('tras recargar (sin historial) «Volver» lleva a la lista de agencias', (
      tester,
    ) async {
      final router = await _abrir(tester, _Catalogo(), url: '/agencia/ag-rutas');
      await tester.tap(find.byTooltip('Volver'));
      await tester.pumpAndSettle();
      expect(_ruta(router), '/agencias');
      expect(find.text('Café y Montaña Tours'), findsOneWidget);
    });

    testWidgets('desde la lista, «Volver» regresa a la lista', (tester) async {
      final router = await _abrir(tester, _Catalogo());
      await tester.tap(find.text('Rutas de Antioquia Cultural'));
      await tester.pumpAndSettle();
      await tester.tap(find.byTooltip('Volver'));
      await tester.pumpAndSettle();
      expect(_ruta(router), '/agencias');
    });
  });
}

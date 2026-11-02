import 'dart:async';

import 'package:diverso_core/diverso_core.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:provider/provider.dart';
import 'package:viajero/router/app_routes.dart';
import 'package:viajero/ui/core/theme/app_theme.dart';
import 'package:viajero/ui/core/theme/theme_mode_view_model.dart';

import '../support/router_de_prueba.dart';

/// Rutas que antes dependían de `state.extra` (se pierde al recargar en web): ahora llevan los ids
/// en la URL y cargan sus datos del backend. También, la pantalla de «página no encontrada».
/// Sin red ni Supabase.

Plan _plan(String id, {double precio = 150000}) => Plan(
  id: id,
  agencyId: 'ag-1',
  titulo: 'Plan $id',
  destino: 'Guatapé',
  categoria: ExperienceCategory.aventura,
  precioCop: precio,
  estado: PlanStatus.publicado,
  dates: const [],
);

Booking _reserva({required bool yaSalio}) {
  final plan = _plan('p1');
  final fecha = PlanDate(
    id: 'fecha-1',
    planId: 'p1',
    fecha: DateTime.now().add(Duration(days: yaSalio ? -5 : 20)),
    cupoTotal: 10,
    cupoDisponible: 8,
  );
  return Booking(
    id: 'res-1',
    codigo: 'DIV-ABC123',
    planDateId: fecha.id,
    viajeroId: 'v-1',
    pax: 2,
    montoTotal: 300000,
    estado: BookingStatus.confirmada,
    createdAt: DateTime.now(),
    plan: plan,
    planDate: fecha,
  );
}

class _Catalogo implements CatalogRepository {
  /// Si no es null, `planDetalle` falla con esto mientras `falla` sea true.
  bool falla = false;
  final consultas = <String>[];

  @override
  Future<Plan> planDetalle(String planId) async {
    consultas.add(planId);
    if (falla) throw Exception('sin red');
    return _plan(planId);
  }

  @override
  Future<List<Plan>> search(FiltrosCatalogo filtros) async => const [];

  @override
  Future<List<String>> destinos() async => const [];

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

class _Reservas implements BookingRepository {
  _Reservas({this.yaSalio = true});

  final bool yaSalio;
  final consultas = <String>[];

  @override
  Future<Booking> reserva(String bookingId) async {
    consultas.add(bookingId);
    if (bookingId != 'res-1') throw DiversoException('RESERVA_NO_EXISTE');
    return _reserva(yaSalio: yaSalio);
  }

  @override
  Future<List<Booking>> misReservas() async => const [];

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

class _Pasarela implements PaymentGateway {
  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

class _Resenas implements ReviewRepository {
  final creadas = <({String bookingId, int calificacion})>[];

  @override
  Future<void> crear({
    required String bookingId,
    required int calificacion,
    String? comentario,
  }) async => creadas.add((bookingId: bookingId, calificacion: calificacion));

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

Future<GoRouter> _abrir(
  WidgetTester tester,
  String url, {
  _Catalogo? catalogo,
  _Reservas? reservas,
  _Resenas? resenas,
}) async {
  tester.view.physicalSize = const Size(900, 2400);
  tester.view.devicePixelRatio = 1.0;
  addTearDown(tester.view.reset);
  final router = routerDePrueba(url);
  await tester.pumpWidget(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => ThemeModeViewModel()),
        Provider<CatalogRepository>.value(value: catalogo ?? _Catalogo()),
        Provider<BookingRepository>.value(value: reservas ?? _Reservas()),
        Provider<ReviewRepository>.value(value: resenas ?? _Resenas()),
        Provider<PaymentGateway>.value(value: _Pasarela()),
      ],
      child: MaterialApp.router(theme: AppTheme.viajeroLight(), routerConfig: router),
    ),
  );
  await tester.pumpAndSettle();
  return router;
}

// Ruta visible, incluida la que entró con push (que no actualiza routeInformationProvider).
String _ruta(GoRouter r) => r.routerDelegate.currentConfiguration.last.matchedLocation;

void main() {
  setUpAll(() => initializeDateFormatting('es'));

  group('/comparar?ids=…', () {
    testWidgets('tras una recarga (solo la URL, sin extra) muestra los planes', (tester) async {
      final catalogo = _Catalogo();
      await _abrir(tester, '/comparar?ids=p1,p2', catalogo: catalogo);

      expect(catalogo.consultas, ['p1', 'p2']);
      expect(find.text('Elige con toda la información'), findsOneWidget);
      expect(find.text('Plan p1'), findsOneWidget);
      expect(find.text('Plan p2'), findsOneWidget);
      expect(find.text('Nada para comparar'), findsNothing);
    });

    testWidgets('respeta el orden de los ids, ignora repetidos y compara como mucho tres', (
      tester,
    ) async {
      final catalogo = _Catalogo();
      await _abrir(tester, '/comparar?ids=p2,p1,p2,p3,p4', catalogo: catalogo);
      expect(catalogo.consultas, ['p2', 'p1', 'p3']);
    });

    testWidgets('sin ids no hay nada que comparar (y no consulta nada)', (tester) async {
      final catalogo = _Catalogo();
      await _abrir(tester, '/comparar', catalogo: catalogo);
      expect(find.text('Nada para comparar'), findsOneWidget);
      expect(catalogo.consultas, isEmpty);
    });

    testWidgets('si la carga falla avisa y «Reintentar» vuelve a cargar', (tester) async {
      final catalogo = _Catalogo()..falla = true;
      await _abrir(tester, '/comparar?ids=p1,p2', catalogo: catalogo);
      expect(find.text('No pudimos cargar la comparación'), findsOneWidget);
      expect(find.text('Elige con toda la información'), findsNothing);

      catalogo.falla = false;
      await tester.tap(find.text('Reintentar'));
      await tester.pumpAndSettle();

      expect(find.text('Plan p1'), findsOneWidget);
      expect(find.text('Plan p2'), findsOneWidget);
    });

    testWidgets('desde el catálogo, `extra` evita volver a pedir los planes', (tester) async {
      final catalogo = _Catalogo();
      final router = await _abrir(tester, '/legal/privacidad', catalogo: catalogo);

      unawaited(
        router.push(AppRoutes.compararPlanes(['p1', 'p2']), extra: [_plan('p1'), _plan('p2')]),
      );
      await tester.pumpAndSettle();

      expect(find.text('Elige con toda la información'), findsOneWidget);
      expect(catalogo.consultas, isEmpty);
      expect(_ruta(router), '/comparar');
    });
  });

  group('/resena/:bookingId', () {
    testWidgets(
      'tras una recarga (solo la URL, sin extra) carga la reserva y muestra el formulario',
      (tester) async {
        final reservas = _Reservas();
        await _abrir(tester, '/resena/res-1', reservas: reservas);

        expect(reservas.consultas, ['res-1']);
        expect(find.text('Tu reseña'), findsOneWidget);
        expect(find.text('Plan p1'), findsOneWidget);
        expect(find.text('Publicar reseña'), findsOneWidget);
      },
    );

    testWidgets('publicar la reseña desde una URL abierta directo vuelve a «Mis reservas»', (
      tester,
    ) async {
      final resenas = _Resenas();
      final router = await _abrir(tester, '/resena/res-1', resenas: resenas);

      await tester.tap(find.text('Publicar reseña'));
      await tester.pumpAndSettle();

      expect(resenas.creadas, [(bookingId: 'res-1', calificacion: 5)]);
      expect(_ruta(router), '/reservas');
    });

    testWidgets('una reserva que aún no viajó no se puede reseñar', (tester) async {
      await _abrir(tester, '/resena/res-1', reservas: _Reservas(yaSalio: false));
      expect(find.text('Esta reserva no se puede reseñar'), findsOneWidget);
      expect(find.text('Publicar reseña'), findsNothing);
    });

    testWidgets('una reserva inexistente muestra el error, no una pantalla vacía', (tester) async {
      await _abrir(tester, '/resena/nope');
      expect(find.text('No pudimos cargar la reserva'), findsOneWidget);
      expect(find.text('Publicar reseña'), findsNothing);
    });

    testWidgets('desde «Mis reservas», `extra` evita volver a pedir la reserva', (tester) async {
      final reservas = _Reservas();
      final router = await _abrir(tester, '/legal/privacidad', reservas: reservas);

      unawaited(router.push(AppRoutes.resena('res-1'), extra: _reserva(yaSalio: true)));
      await tester.pumpAndSettle();

      expect(find.text('Publicar reseña'), findsOneWidget);
      expect(reservas.consultas, isEmpty);
    });

    testWidgets('la ruta vieja /resena (sin id) lleva a «Mis reservas»', (tester) async {
      final router = await _abrir(tester, '/resena');
      expect(_ruta(router), '/reservas');
    });
  });

  group('página no encontrada', () {
    testWidgets('una URL que no existe muestra «No encontramos esta página» con salida al inicio', (
      tester,
    ) async {
      final router = await _abrir(tester, '/esta/ruta/no/existe');

      expect(find.text('No encontramos esta página'), findsOneWidget);
      expect(find.text('/esta/ruta/no/existe'), findsOneWidget);

      await tester.tap(find.text('Ir al inicio'));
      await tester.pumpAndSettle();

      expect(find.text('No encontramos esta página'), findsNothing);
      expect(_ruta(router), '/');
    });
  });
}

import 'package:diverso_core/diverso_core.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:provider/provider.dart';
import 'package:viajero/ui/core/theme/app_theme.dart';
import 'package:viajero/ui/features/plan/views/plan_detail_view.dart';

import '../../../../support/catalogo_falso.dart';

/// Barra de reserva de la ficha: la fecha elegida decide a qué checkout lleva «Reservar»,
/// sobrevive a que la ficha se reconstruya y el estado de error permite reintentar.

Future<CatalogoFalso> _abrir(WidgetTester tester, {required CatalogoFalso catalogo}) async {
  tester.view.physicalSize = const Size(600, 1000);
  tester.view.devicePixelRatio = 1.0;
  addTearDown(tester.view.reset);
  final router = GoRouter(
    routes: [
      GoRoute(
        path: '/',
        builder: (_, _) => const PlanDetailView(planId: 'plan-1'),
      ),
      GoRoute(
        path: '/checkout/:planId/:fechaId',
        builder: (_, state) => Scaffold(body: Text('checkout ${state.pathParameters['fechaId']}')),
      ),
    ],
  );
  await tester.pumpWidget(
    MultiProvider(
      providers: [
        Provider<CatalogRepository>.value(value: catalogo),
        Provider<ReviewRepository>.value(value: ResenasFalsas()),
      ],
      child: MaterialApp.router(theme: AppTheme.viajeroLight(), routerConfig: router),
    ),
  );
  await tester.pumpAndSettle();
  return catalogo;
}

CatalogoFalso _conTresFechas() => CatalogoFalso(
  detalles: {
    'plan-1': planDePrueba(
      dates: [
        fechaDePrueba('f-1', dias: 3),
        fechaDePrueba('f-2', dias: 5, cupos: 2),
        fechaDePrueba('f-3', dias: 9),
      ],
    ),
  },
);

void main() {
  setUpAll(() => initializeDateFormatting('es'));

  testWidgets('sin elegir, «Reservar» lleva a la fecha más cercana', (tester) async {
    await _abrir(tester, catalogo: _conTresFechas());

    await tester.tap(find.text('Reservar'));
    await tester.pumpAndSettle();

    expect(find.text('checkout f-1'), findsOneWidget);
  });

  testWidgets('elegir otra fecha cambia el checkout y avisa «¡Últimos N!»', (tester) async {
    await _abrir(tester, catalogo: _conTresFechas());
    expect(find.text('¡Últimos 2!'), findsOneWidget);

    await tester.tap(find.text('¡Últimos 2!'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Reservar'));
    await tester.pumpAndSettle();

    expect(find.text('checkout f-2'), findsOneWidget);
  });

  testWidgets('la fecha elegida sobrevive a que la ficha se reconstruya (más ancho)', (
    tester,
  ) async {
    await _abrir(tester, catalogo: _conTresFechas());
    await tester.tap(find.text('¡Últimos 2!'));
    await tester.pumpAndSettle();

    tester.view.physicalSize = const Size(700, 1000);
    await tester.pumpAndSettle();
    await tester.tap(find.text('Reservar'));
    await tester.pumpAndSettle();

    expect(find.text('checkout f-2'), findsOneWidget);
  });

  testWidgets('plan sin fechas: avisa y no ofrece «Reservar»', (tester) async {
    await _abrir(tester, catalogo: CatalogoFalso(detalles: {'plan-1': planDePrueba()}));

    expect(find.text('Sin fechas disponibles por ahora'), findsOneWidget);
    expect(find.text('Reservar'), findsNothing);
  });

  testWidgets('error: muestra el aviso y «Reintentar» carga la ficha', (tester) async {
    final catalogo = _conTresFechas()..fallo = Exception('sin red');
    await _abrir(tester, catalogo: catalogo);
    expect(find.text('No pudimos cargar el plan'), findsOneWidget);
    expect(find.text('Revisa tu conexión e intenta de nuevo.'), findsOneWidget);

    catalogo.fallo = null;
    await tester.tap(find.text('Reintentar'));
    await tester.pumpAndSettle();

    expect(find.text('No pudimos cargar el plan'), findsNothing);
    expect(find.text('Reservar'), findsOneWidget);
    expect(catalogo.detallesPedidos, ['plan-1', 'plan-1']);
  });
}

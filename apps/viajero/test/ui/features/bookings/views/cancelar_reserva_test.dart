import 'package:diverso_core/diverso_core.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:provider/provider.dart';
import 'package:viajero/ui/core/theme/app_theme.dart';
import 'package:viajero/ui/core/theme/theme_mode_view_model.dart';

import '../../../../support/reservas_falsas.dart';
import '../../../../support/router_de_prueba.dart';

/// El aviso (snackbar) que sigue a cancelar, desde «Mis reservas» y desde el detalle: lo escribe
/// el view model y la vista solo lo muestra y lo consume. Sin red ni Supabase.

class _Pasarela implements PaymentGateway {
  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

Future<GoRouter> _abrir(WidgetTester tester, String url, ReservasFalsas reservas) async {
  tester.view.physicalSize = const Size(800, 1600);
  tester.view.devicePixelRatio = 1.0;
  addTearDown(tester.view.reset);
  final router = routerDePrueba(url);
  await tester.pumpWidget(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => ThemeModeViewModel()),
        Provider<BookingRepository>.value(value: reservas),
        Provider<PaymentGateway>.value(value: _Pasarela()),
      ],
      child: MaterialApp.router(theme: AppTheme.viajeroLight(), routerConfig: router),
    ),
  );
  await tester.pumpAndSettle();
  return router;
}

String _ruta(GoRouter r) => r.routerDelegate.currentConfiguration.last.matchedLocation;

const _aviso =
    'Reserva cancelada y cupos liberados. Reembolso de prueba aprobado: \$ 190.000 (100 %).';

void main() {
  setUpAll(() => initializeDateFormatting('es'));

  testWidgets('«Mis reservas»: confirmar la cancelación avisa y recarga la lista', (tester) async {
    final reservas = ReservasFalsas([reservaDePrueba()]);
    await _abrir(tester, '/reservas', reservas);

    await tester.tap(find.text('Cancelar'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Sí, cancelar'));
    await tester.pumpAndSettle();

    expect(reservas.canceladas, ['res-1']);
    expect(find.text(_aviso), findsOneWidget);
    expect(reservas.consultasLista, 2);
  });

  testWidgets('«Mis reservas»: «Mantener» no cancela ni avisa', (tester) async {
    final reservas = ReservasFalsas([reservaDePrueba()]);
    await _abrir(tester, '/reservas', reservas);

    await tester.tap(find.text('Cancelar'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Mantener'));
    await tester.pumpAndSettle();

    expect(reservas.canceladas, isEmpty);
    expect(find.textContaining('Reserva cancelada'), findsNothing);
  });

  testWidgets('«Mis reservas»: si no se puede consultar la política explica el motivo', (
    tester,
  ) async {
    final reservas = ReservasFalsas([reservaDePrueba()])
      ..falloAlCancelar = DiversoException('RESERVA_YA_SALIO');
    await _abrir(tester, '/reservas', reservas);

    await tester.tap(find.text('Cancelar'));
    await tester.pumpAndSettle();

    expect(find.text('¿Cancelar reserva?'), findsNothing);
    expect(
      find.text('Este viaje ya salió, así que la reserva ya no se puede pagar ni cancelar.'),
      findsOneWidget,
    );
  });

  testWidgets('detalle: confirmar la cancelación avisa y recarga solo esa reserva', (tester) async {
    final reservas = ReservasFalsas([reservaDePrueba()]);
    await _abrir(tester, '/reservas/res-1', reservas);

    await tester.ensureVisible(find.text('Cancelar'));
    await tester.tap(find.text('Cancelar'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Sí, cancelar'));
    await tester.pumpAndSettle();

    expect(reservas.canceladas, ['res-1']);
    expect(find.text(_aviso), findsOneWidget);
    expect(reservas.consultas, ['res-1', 'res-1'], reason: 'carga en frío + recarga tras cancelar');
    expect(reservas.consultasLista, 0);
  });

  testWidgets('detalle: si hubo un cambio, al volver la lista se recarga', (tester) async {
    final reservas = ReservasFalsas([reservaDePrueba()]);
    final router = await _abrir(tester, '/reservas', reservas);

    await tester.tap(find.text('DIV-AAAA0001'));
    await tester.pumpAndSettle();
    expect(_ruta(router), '/reservas/res-1');
    expect(reservas.consultasLista, 1);

    await tester.ensureVisible(find.text('Cancelar'));
    await tester.tap(find.text('Cancelar'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Sí, cancelar'));
    await tester.pumpAndSettle();

    await tester.binding.handlePopRoute();
    await tester.pumpAndSettle();

    expect(_ruta(router), '/reservas');
    expect(reservas.consultasLista, 2);
  });

  testWidgets('detalle: sin cambios, al volver la lista no se recarga', (tester) async {
    final reservas = ReservasFalsas([reservaDePrueba()]);
    final router = await _abrir(tester, '/reservas', reservas);

    await tester.tap(find.text('DIV-AAAA0001'));
    await tester.pumpAndSettle();
    await tester.binding.handlePopRoute();
    await tester.pumpAndSettle();

    expect(_ruta(router), '/reservas');
    expect(reservas.consultasLista, 1);
  });
}

import 'package:diverso_core/diverso_core.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:viajero/ui/features/checkout/views/pago_resultado_view.dart';

import '../../../../support/pasarela_falsa.dart';

/// «Intentar de nuevo» en `/pago/resultado`: la vista solo pinta y delega en el view model.
/// Sin red ni Wompi.

Future<PasarelaFalsa> _abrir(WidgetTester tester, {Object? falloAlIniciar}) async {
  final pasarela = PasarelaFalsa([pagoDePrueba(EstadoPago.rechazado, BookingStatus.pendientePago)]);
  if (falloAlIniciar != null) pasarela.falloAlIniciar = falloAlIniciar;
  await tester.pumpWidget(
    Provider<PaymentGateway>.value(
      value: pasarela,
      child: const MaterialApp(home: PagoResultadoView(transactionId: 'tx-1')),
    ),
  );
  await tester.pumpAndSettle();
  return pasarela;
}

void main() {
  testWidgets('«Intentar de nuevo» pide el checkout de la misma reserva y muestra el error', (
    tester,
  ) async {
    final pasarela = await _abrir(tester, falloAlIniciar: DiversoException('RESERVA_VENCIDA'));

    await tester.tap(find.text('Intentar de nuevo'));
    await tester.pumpAndSettle();

    expect(pasarela.iniciadas, ['res-1']);
    expect(find.text(DiversoException('RESERVA_VENCIDA').mensajeUsuario), findsOneWidget);
    expect(
      tester.widget<FilledButton>(find.widgetWithText(FilledButton, 'Intentar de nuevo')).onPressed,
      isNotNull,
      reason: 'el botón se libera para volver a intentar',
    );
  });

  testWidgets('un error inesperado al reintentar no rompe la pantalla', (tester) async {
    await _abrir(tester);

    await tester.tap(find.text('Intentar de nuevo'));
    await tester.pumpAndSettle();

    expect(find.text('No pudimos iniciar el pago. Intenta de nuevo.'), findsOneWidget);
  });
}

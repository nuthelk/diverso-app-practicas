import 'package:diverso_core/diverso_core.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:viajero/ui/core/theme/app_theme.dart';
import 'package:viajero/ui/features/bookings/views/review_loader.dart';

import '../../../../support/reservas_falsas.dart';
import '../../../../support/router_de_prueba.dart';

/// Reseña: elegir estrellas, publicar y los avisos cuando el servidor la rechaza. La carga por
/// id, la reserva no reseñable y el regreso a «Mis reservas» están en `test/router`.
/// Sin red ni Supabase.

class _Pasarela implements PaymentGateway {
  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

Future<(ReservasFalsas, PublicadorDeResenasFalso)> _abrir(
  WidgetTester tester, {
  Object? falloAlPublicar,
}) async {
  tester.view.physicalSize = const Size(800, 1600);
  tester.view.devicePixelRatio = 1.0;
  addTearDown(tester.view.reset);
  final reservas = ReservasFalsas([
    reservaDePrueba(salida: DateTime.now().subtract(const Duration(days: 4))),
  ]);
  final resenas = PublicadorDeResenasFalso()..fallo = falloAlPublicar;
  await tester.pumpWidget(
    MultiProvider(
      providers: [
        Provider<BookingRepository>.value(value: reservas),
        Provider<ReviewRepository>.value(value: resenas),
        Provider<PaymentGateway>.value(value: _Pasarela()),
      ],
      child: MaterialApp.router(
        theme: AppTheme.viajeroLight(),
        routerConfig: routerDePrueba('/resena/res-1'),
      ),
    ),
  );
  await tester.pumpAndSettle();
  return (reservas, resenas);
}

void main() {
  testWidgets('usa el cargador de la ruta y muestra el formulario con 5 estrellas', (tester) async {
    await _abrir(tester);

    expect(find.byType(ReviewLoader), findsOneWidget);
    expect(find.text('¡Excelente!'), findsOneWidget);
    expect(find.text('Publicar reseña'), findsOneWidget);
  });

  testWidgets('elegir estrellas cambia la etiqueta y la calificación que se publica', (
    tester,
  ) async {
    final (_, resenas) = await _abrir(tester, falloAlPublicar: DiversoException('ESTADO_INVALIDO'));

    await tester.tap(find.byTooltip('3 de 5 estrellas'));
    await tester.pump(const Duration(milliseconds: 200));
    expect(find.text('Regular'), findsOneWidget);

    await tester.enterText(find.byType(TextField), 'Buen paseo');
    await tester.tap(find.text('Publicar reseña'));
    await tester.pumpAndSettle();

    expect(resenas.creadas, isEmpty, reason: 'el servidor la rechazó');
  });

  testWidgets('si el servidor rechaza la reseña lo explica y deja volver a intentarlo', (
    tester,
  ) async {
    await _abrir(tester, falloAlPublicar: DiversoException('ESTADO_INVALIDO'));

    await tester.tap(find.text('Publicar reseña'));
    await tester.pumpAndSettle();

    expect(find.text('La reserva ya no admite esta operación.'), findsOneWidget);
    final boton = tester.widget<ButtonStyleButton>(
      find.widgetWithText(FilledButton, 'Publicar reseña'),
    );
    expect(boton.onPressed, isNotNull);
    expect(find.text('Tu reseña'), findsOneWidget, reason: 'no sale de la pantalla');
  });

  testWidgets('publicada: agradece y se envía con la calificación elegida', (tester) async {
    final (_, resenas) = await _abrir(tester);

    await tester.tap(find.byTooltip('4 de 5 estrellas'));
    await tester.pump();
    await tester.enterText(find.byType(TextField), 'Muy bueno');
    await tester.tap(find.text('Publicar reseña'));
    await tester.pumpAndSettle();

    expect(resenas.creadas, [(bookingId: 'res-1', calificacion: 4, comentario: 'Muy bueno')]);
    expect(find.text('¡Gracias! Tu reseña ayudará a otros viajeros.'), findsOneWidget);
  });
}

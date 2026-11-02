import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:viajero/ui/core/widgets.dart';

/// Cada reseña muestra cinco estrellas, llenas hasta su calificación, y lo dice a los lectores de
/// pantalla («4 de 5 estrellas»).
void main() {
  Future<void> pintar(WidgetTester tester, int calificacion) => tester.pumpWidget(
    MaterialApp(
      home: Scaffold(body: EstrellasCalificacion(calificacion: calificacion)),
    ),
  );

  for (final (calificacion, llenas) in [(5, 5), (4, 4), (2, 2), (1, 1)]) {
    testWidgets('$calificacion★: $llenas llenas y ${5 - llenas} vacías', (tester) async {
      await pintar(tester, calificacion);

      expect(find.byIcon(Icons.star_rounded), findsNWidgets(llenas));
      expect(find.byIcon(Icons.star_outline_rounded), findsNWidgets(5 - llenas));
      expect(find.bySemanticsLabel('$calificacion de 5 estrellas'), findsOneWidget);
    });
  }

  testWidgets('PRESERVE: el resumen del plan sigue siendo una estrella con el número', (
    tester,
  ) async {
    await tester.pumpWidget(
      const MaterialApp(home: Scaffold(body: RatingStars(calificacion: 4.2, mostrarNumero: true))),
    );

    expect(find.byIcon(Icons.star_rounded), findsOneWidget);
    expect(find.text('4.2'), findsOneWidget);
  });
}

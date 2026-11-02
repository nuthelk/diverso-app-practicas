import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:viajero/ui/core/widgets.dart';

void main() {
  testWidgets('RatingStars muestra la estrella y el valor', (tester) async {
    await tester.pumpWidget(
      const MaterialApp(home: Scaffold(body: RatingStars(calificacion: 4.2, mostrarNumero: true))),
    );
    expect(find.byIcon(Icons.star_rounded), findsOneWidget);
    expect(find.text('4.2'), findsOneWidget);
  });

  testWidgets('VerifiedBadge muestra el sello RNT', (tester) async {
    await tester.pumpWidget(const MaterialApp(home: Scaffold(body: VerifiedBadge())));
    expect(find.text('Verificada RNT'), findsOneWidget);
    expect(find.byIcon(Icons.verified_rounded), findsOneWidget);
  });

  testWidgets(
    'VerifiedBadge sobre foto: fondo oscuro casi opaco y texto blanco, legible sobre fotos claras',
    (tester) async {
      await tester.pumpWidget(
        const MaterialApp(home: Scaffold(body: VerifiedBadge(blanco: true, compacto: true))),
      );
      final fondo =
          tester.widget<Container>(find.byType(Container).first).decoration! as BoxDecoration;
      expect(fondo.color!.a, greaterThanOrEqualTo(.6));
      expect(fondo.color!.computeLuminance(), lessThan(.05));
      final texto = tester.widget<Text>(find.text('Verificada RNT'));
      expect(texto.style!.color, Colors.white);
      expect(texto.style!.fontSize, greaterThanOrEqualTo(10.5));
    },
  );

  testWidgets('VerifiedBadge normal (fuera de fotos) conserva su color de marca', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: ThemeData(colorScheme: const ColorScheme.light(primary: Color(0xFF0E6E4F))),
        home: const Scaffold(body: VerifiedBadge()),
      ),
    );
    final texto = tester.widget<Text>(find.text('Verificada RNT'));
    expect(texto.style!.color, const Color(0xFF0E6E4F));
  });
}

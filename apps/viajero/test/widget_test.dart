import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:viajero/ui/core/widgets.dart';

void main() {
  testWidgets('RatingStars muestra la estrella y el valor', (tester) async {
    await tester.pumpWidget(const MaterialApp(
      home: Scaffold(body: RatingStars(calificacion: 4.2, mostrarNumero: true)),
    ));
    expect(find.byIcon(Icons.star_rounded), findsOneWidget);
    expect(find.text('4.2'), findsOneWidget);
  });

  testWidgets('VerifiedBadge muestra el sello RNT', (tester) async {
    await tester.pumpWidget(const MaterialApp(home: Scaffold(body: VerifiedBadge())));
    expect(find.text('Verificada RNT'), findsOneWidget);
    expect(find.byIcon(Icons.verified_rounded), findsOneWidget);
  });
}

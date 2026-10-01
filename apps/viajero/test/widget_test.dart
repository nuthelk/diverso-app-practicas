import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:viajero/widgets/rating_stars.dart';
import 'package:viajero/widgets/verified_badge.dart';

void main() {
  testWidgets('RatingStars dibuja 5 estrellas', (tester) async {
    await tester.pumpWidget(const MaterialApp(home: Scaffold(body: RatingStars(calificacion: 4.2))));
    // 4 llenas (por redondeo .75) + 1 borde
    expect(find.byIcon(Icons.star), findsNWidgets(4));
    expect(find.byIcon(Icons.star_border), findsOneWidget);
  });

  testWidgets('VerifiedBadge muestra el sello RNT', (tester) async {
    await tester.pumpWidget(const MaterialApp(home: Scaffold(body: VerifiedBadge())));
    expect(find.text('Verificada RNT'), findsOneWidget);
    expect(find.byIcon(Icons.verified), findsOneWidget);
  });
}

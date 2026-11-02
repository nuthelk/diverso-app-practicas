import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:viajero/ui/core/app_theme.dart';
import 'package:viajero/ui/core/widgets.dart';

/// Los textos secundarios toman el color del tema: en modo oscuro no pueden quedar en negro.
void main() {
  testWidgets('modo oscuro: la unidad del precio usa el color secundario del tema', (tester) async {
    final tema = AppTheme.viajeroDark();
    await tester.pumpWidget(
      MaterialApp(
        theme: tema,
        home: const Scaffold(body: PriceText(monto: 178000)),
      ),
    );

    final unidad = tester.widget<Text>(find.text('por persona · precio final'));
    expect(unidad.style?.color, tema.colorScheme.onSurfaceVariant);
  });
}

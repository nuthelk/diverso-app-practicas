import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:diverso_core/diverso_core.dart';

/// Renderiza el ave blanca sobre fondo transparente: insumo para generar
/// los launcher icons de Android y los íconos PWA/favicon de las webs
/// (se compone con PIL/Python fuera del árbol Flutter).
void main() {
  testWidgets('logo: ave blanca transparente para iconos', (tester) async {
    tester.view.physicalSize = const Size(512, 512);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.reset);

    await tester.pumpWidget(
      const RepaintBoundary(
        child: Center(child: DiversoLogo(size: 460)),
      ),
    );
    await expectLater(
      find.byType(RepaintBoundary),
      matchesGoldenFile('goldens/logo_transparente.png'),
    );
  });
}

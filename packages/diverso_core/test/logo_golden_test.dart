import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:diverso_core/diverso_core.dart';

void main() {
  testWidgets('logo: marca sola sobre transparente', (tester) async {
    tester.view.physicalSize = const Size(400, 400);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.reset);

    await tester.pumpWidget(
      const RepaintBoundary(
        child: ColoredBox(
          color: Color(0xFFF6F4EF),
          child: Center(child: DiversoLogo(color: Color(0xFF0E6E4F), size: 300)),
        ),
      ),
    );
    await expectLater(
      find.byType(RepaintBoundary),
      matchesGoldenFile('goldens/logo_marca.png'),
    );
  });

  testWidgets('logo: versión ícono (fondo de marca + ave blanca)', (tester) async {
    tester.view.physicalSize = const Size(400, 400);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.reset);

    await tester.pumpWidget(
      const RepaintBoundary(
        child: Center(
          child: SizedBox.square(
            dimension: 340,
            child: DecoratedBox(
              decoration: BoxDecoration(
                color: Color(0xFF0E6E4F),
                borderRadius: BorderRadius.all(Radius.circular(76)),
              ),
              child: Padding(
                padding: EdgeInsets.all(70),
                child: DiversoLogo(),
              ),
            ),
          ),
        ),
      ),
    );
    await expectLater(
      find.byType(RepaintBoundary),
      matchesGoldenFile('goldens/logo_icono.png'),
    );
  });
}

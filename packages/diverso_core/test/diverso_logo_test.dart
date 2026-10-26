import 'dart:io';

import 'package:diverso_core/diverso_core.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  Image imagenDelLogo(WidgetTester tester) =>
      tester.widget<Image>(find.descendant(of: find.byType(DiversoLogo), matching: find.byType(Image)));

  testWidgets('dibuja el asset del colibrí teñido con el color y el tamaño dados', (tester) async {
    const verde = Color(0xFF0E6E4F);
    await tester.pumpWidget(
      const Directionality(
        textDirection: TextDirection.ltr,
        child: Center(child: DiversoLogo(color: verde, size: 64)),
      ),
    );

    final imagen = imagenDelLogo(tester);
    expect(imagen.image, const AssetImage('assets/logo_diverso.png', package: 'diverso_core'));
    expect(imagen.color, verde);
    expect(imagen.colorBlendMode, BlendMode.srcIn);
    expect(imagen.filterQuality, FilterQuality.high);
    expect(tester.getSize(find.byType(DiversoLogo)), const Size.square(64));
  });

  testWidgets('por omisión es blanco de 48 y el contenedor no es de la marca', (tester) async {
    await tester.pumpWidget(
      const Directionality(textDirection: TextDirection.ltr, child: Center(child: DiversoLogo())),
    );

    final imagen = imagenDelLogo(tester);
    expect(imagen.color, Colors.white);
    expect(tester.getSize(find.byType(DiversoLogo)), const Size.square(48));
    expect(find.descendant(of: find.byType(DiversoLogo), matching: find.byType(DecoratedBox)), findsNothing);
  });

  testWidgets('ya no se pinta con un CustomPainter (la golondrina se fue)', (tester) async {
    await tester.pumpWidget(
      const Directionality(textDirection: TextDirection.ltr, child: Center(child: DiversoLogo())),
    );

    expect(find.descendant(of: find.byType(DiversoLogo), matching: find.byType(CustomPaint)), findsNothing);
    expect(File('lib/ui/diverso_logo.dart').readAsStringSync(), isNot(contains('CustomPainter')));
  });

  test('el asset declarado existe y es la máscara cuadrada de 1024 px', () async {
    TestWidgetsFlutterBinding.ensureInitialized();
    final bytes = (await rootBundle.load('packages/diverso_core/assets/logo_diverso.png')).buffer.asUint8List();
    expect(bytes.sublist(0, 8), [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
    final cabecera = ByteData.sublistView(bytes);
    expect(cabecera.getUint32(16), 1024); // ancho (IHDR)
    expect(cabecera.getUint32(20), 1024); // alto
  });
}

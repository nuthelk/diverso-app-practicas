import 'package:flutter/material.dart';

/// Marca de Diverso: golondrina minimalista en vuelo.
///
/// Monocroma y parametrizable: el llamador decide el color y el tamaño;
/// el contenedor (caja de color, esquinas, sombra) es responsabilidad de
/// cada pantalla para que la marca funcione sobre cualquier fondo.
class DiversoLogo extends StatelessWidget {
  const DiversoLogo({super.key, this.color = Colors.white, this.size = 48});

  final Color color;
  final double size;

  @override
  Widget build(BuildContext context) {
    return SizedBox.square(
      dimension: size,
      child: CustomPaint(painter: _GolondrinaPainter(color: color)),
    );
  }
}

class _GolondrinaPainter extends CustomPainter {
  const _GolondrinaPainter({required this.color});

  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()..color = color;
    final sx = size.width / 100;
    final sy = size.height / 100;

    // Silueta continua (malla 100x100, mirando a la derecha): pico, cabeza,
    // ala en V arriba, lomo que baja a la cola horquillada y vientre.
    final path = Path()..moveTo(94 * sx, 44 * sy); // punta del pico
    void curva(Offset c1, Offset c2, Offset fin) =>
        path.cubicTo(c1.dx * sx, c1.dy * sy, c2.dx * sx, c2.dy * sy,
            fin.dx * sx, fin.dy * sy);

    curva(Offset(82, 36), Offset(74, 24), Offset(64, 25)); // pico arriba + coronilla
    curva(Offset(58, 26), Offset(55, 31), Offset(54, 37)); // nuca
    curva(Offset(45, 25), Offset(33, 12), Offset(25, 7)); // borde superior del ala
    curva(Offset(30, 26), Offset(38, 38), Offset(44, 48)); // borde inferior del ala
    curva(Offset(30, 56), Offset(16, 68), Offset(8, 80)); // lomo a la punta de la cola
    curva(Offset(17, 76), Offset(25, 68), Offset(30, 61)); // muesca de la horquilla
    curva(Offset(22, 71), Offset(15, 81), Offset(11, 90)); // segunda punta de la cola
    curva(Offset(28, 76), Offset(44, 64), Offset(58, 55)); // vientre
    curva(Offset(63, 51), Offset(66, 48), Offset(68, 45)); // barbilla
    curva(Offset(78, 44), Offset(87, 44), Offset(94, 44)); // bajo del pico
    path.close();

    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(covariant _GolondrinaPainter oldDelegate) =>
      oldDelegate.color != color;
}

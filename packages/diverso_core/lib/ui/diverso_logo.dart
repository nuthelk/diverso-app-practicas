import 'package:flutter/material.dart';

/// Marca de Diverso: colibrí en vuelo (el de la primera versión de la app).
///
/// Monocroma y parametrizable: dibuja la máscara `assets/logo_diverso.png`
/// (negro + alfa) teñida con [color]; el llamador decide el color y el
/// tamaño. El contenedor (caja de color, esquinas, sombra) es responsabilidad
/// de cada pantalla para que la marca funcione sobre cualquier fondo.
class DiversoLogo extends StatelessWidget {
  const DiversoLogo({super.key, this.color = Colors.white, this.size = 48});

  /// Ruta del asset dentro de `diverso_core`; también es la fuente de los
  /// íconos (`tools/iconos/generar_iconos.py`).
  static const asset = 'assets/logo_diverso.png';

  final Color color;
  final double size;

  @override
  Widget build(BuildContext context) {
    return Image.asset(
      asset,
      package: 'diverso_core',
      width: size,
      height: size,
      color: color,
      colorBlendMode: BlendMode.srcIn,
      filterQuality: FilterQuality.high,
      excludeFromSemantics: true,
    );
  }
}

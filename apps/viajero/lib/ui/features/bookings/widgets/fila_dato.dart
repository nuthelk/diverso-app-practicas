import 'package:flutter/material.dart';

import '../../../core/theme/app_text.dart';

/// Fila de dato con ícono: «📅 lun 27 oct · 06:00 · en 3 días». [acento] va al final, en el color
/// primario. El texto se parte en varias líneas antes que desbordar.
class FilaDato extends StatelessWidget {
  const FilaDato({
    super.key,
    required this.icono,
    required this.texto,
    this.acento,
    this.color,
    this.compacto = false,
  });

  final IconData icono;
  final String texto;
  final String? acento;

  /// Color del texto (por defecto el de la página).
  final Color? color;
  final bool compacto;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final tamano = compacto ? AppText.detalle : AppText.cuerpoGrande;
    final estilo = TextStyle(fontSize: tamano, height: 1.3, color: color ?? cs.onSurface);
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(top: 1),
          child: Icon(icono, size: compacto ? 16 : 19, color: color ?? cs.onSurfaceVariant),
        ),
        SizedBox(width: compacto ? 8 : 10),
        Expanded(
          child: acento == null
              ? Text(texto, style: estilo)
              : Text.rich(
                  TextSpan(
                    style: estilo,
                    children: [
                      TextSpan(text: texto),
                      TextSpan(
                        text: ' · $acento',
                        style: TextStyle(fontWeight: FontWeight.w700, color: cs.primary),
                      ),
                    ],
                  ),
                ),
        ),
      ],
    );
  }
}

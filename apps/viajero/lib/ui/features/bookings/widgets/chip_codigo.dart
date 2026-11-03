import 'package:flutter/material.dart';

import '../../../core/theme/app_text.dart';
import '../../../core/theme/diverso_colors.dart';

/// Código de la reserva como etiqueta discreta. [sobreFoto] usa un fondo oscuro casi opaco para
/// leerse sobre cualquier imagen.
class ChipCodigo extends StatelessWidget {
  const ChipCodigo({super.key, required this.codigo, this.sobreFoto = false});

  final String codigo;
  final bool sobreFoto;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
      decoration: BoxDecoration(
        color: sobreFoto ? DiversoColors.of(context).controlSobreFoto : cs.surfaceContainerHigh,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        codigo,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: TextStyle(
          fontSize: AppText.etiqueta,
          fontWeight: FontWeight.w700,
          letterSpacing: .4,
          color: sobreFoto ? Colors.white : cs.onSurfaceVariant,
        ),
      ),
    );
  }
}

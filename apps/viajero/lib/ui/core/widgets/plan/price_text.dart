import 'package:diverso_core/diverso_core.dart';
import 'package:flutter/material.dart';

import '../../theme/app_text.dart';

/// Precio protagonista: monto grande + unidad discreta.
class PriceText extends StatelessWidget {
  const PriceText({super.key, required this.monto, this.alineado = CrossAxisAlignment.start});

  final double monto;
  final CrossAxisAlignment alineado;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Column(
      crossAxisAlignment: alineado,
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          formatCOP(monto),
          style: TextStyle(
            fontSize: AppText.encabezadoM,
            fontWeight: FontWeight.w800,
            letterSpacing: -.5,
            color: cs.onSurface,
          ),
        ),
        Text(
          'por persona · precio final',
          style: TextStyle(fontSize: AppText.micro, color: cs.onSurfaceVariant),
        ),
      ],
    );
  }
}

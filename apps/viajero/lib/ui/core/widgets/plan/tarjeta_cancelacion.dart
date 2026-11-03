import 'package:flutter/material.dart';

import '../../theme/app_insets.dart';
import '../../theme/app_radii.dart';
import '../../theme/app_text.dart';

/// Política de cancelación del plan (Anexo 5), en una tarjeta tintada.
class TarjetaCancelacion extends StatelessWidget {
  const TarjetaCancelacion({super.key, required this.texto});

  final String texto;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Container(
      padding: AppInsets.tarjeta,
      decoration: BoxDecoration(
        color: cs.tertiaryContainer.withValues(alpha: .45),
        borderRadius: BorderRadius.circular(AppRadios.card),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(Icons.shield_outlined, size: 19, color: cs.onTertiaryContainer),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Política de cancelación',
                  style: TextStyle(fontWeight: FontWeight.w700, fontSize: AppText.cuerpoChico),
                ),
                const SizedBox(height: 3),
                Text(
                  texto,
                  style: TextStyle(
                    fontSize: AppText.detalle,
                    height: 1.45,
                    color: cs.onSurface.withValues(alpha: .8),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

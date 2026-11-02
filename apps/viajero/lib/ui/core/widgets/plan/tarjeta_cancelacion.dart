import 'package:flutter/material.dart';

import '../../theme/app_radii.dart';

/// Política de cancelación del plan (Anexo 5), en una tarjeta tintada.
class TarjetaCancelacion extends StatelessWidget {
  const TarjetaCancelacion({super.key, required this.texto});

  final String texto;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.all(14),
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
                  style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13.5),
                ),
                const SizedBox(height: 3),
                Text(
                  texto,
                  style: TextStyle(
                    fontSize: 13,
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

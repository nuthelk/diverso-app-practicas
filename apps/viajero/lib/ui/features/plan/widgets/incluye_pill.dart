import 'package:flutter/material.dart';

import '../../../core/theme/app_radii.dart';
import '../../../core/theme/app_text.dart';

/// Píldora de «Qué incluye» (transporte, comida, un ítem del plan…).
class IncluyePill extends StatelessWidget {
  const IncluyePill({super.key, required this.icono, required this.texto, this.textoLargo = false});

  final IconData icono;
  final String texto;

  /// Un texto libre del plan puede ser largo: se recorta con «…» en vez de desbordar.
  final bool textoLargo;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: cs.surfaceContainerLow,
        borderRadius: BorderRadius.circular(AppRadios.pill),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icono, size: 15, color: cs.primary),
          const SizedBox(width: 6),
          Flexible(
            child: Text(
              texto,
              overflow: textoLargo ? TextOverflow.ellipsis : TextOverflow.visible,
              style: const TextStyle(fontSize: AppText.leyendaGrande, fontWeight: FontWeight.w600),
            ),
          ),
        ],
      ),
    );
  }
}

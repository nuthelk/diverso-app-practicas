import 'package:diverso_core/diverso_core.dart';
import 'package:flutter/material.dart';

import '../../theme/app_text.dart';

/// Un paso del itinerario: hora a la izquierda y la actividad en una línea de tiempo.
class PasoItinerario extends StatelessWidget {
  const PasoItinerario({super.key, required this.paso});

  final ItinerarioPaso paso;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          SizedBox(
            width: 62,
            child: Text(
              paso.hora,
              textAlign: TextAlign.right,
              style: TextStyle(
                fontWeight: FontWeight.w800,
                fontSize: AppText.detalle,
                color: cs.primary,
                height: 1.35,
              ),
            ),
          ),
          const SizedBox(width: 14),
          Column(
            children: [
              Container(
                margin: const EdgeInsets.only(top: 4),
                width: 8,
                height: 8,
                decoration: BoxDecoration(color: cs.primary, shape: BoxShape.circle),
              ),
              Expanded(child: Container(width: 1.6, color: cs.outlineVariant)),
            ],
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.only(bottom: 16),
              child: Text(
                paso.actividad,
                style: const TextStyle(height: 1.45, fontSize: AppText.cuerpo),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

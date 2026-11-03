import 'package:diverso_core/diverso_core.dart';
import 'package:flutter/material.dart';

import '../../../core/theme/app_radii.dart';

/// Itinerario inmediato de la confirmación (Anexo 6): los primeros pasos y cuántos más hay.
class ItinerarioConfirmado extends StatelessWidget {
  const ItinerarioConfirmado({super.key, required this.pasos});

  final List<ItinerarioPaso> pasos;

  /// Cuántos pasos se muestran antes de remitir al resto en la app.
  static const int maxPasos = 5;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: cs.surfaceContainerLow,
        borderRadius: BorderRadius.circular(AppRadios.card),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'ITINERARIO',
            style: TextStyle(
              fontSize: 10.5,
              fontWeight: FontWeight.w700,
              letterSpacing: 1.6,
              color: cs.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 12),
          for (final paso in pasos.take(maxPasos))
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  SizedBox(
                    width: 52,
                    child: Text(
                      paso.hora,
                      style: TextStyle(
                        fontWeight: FontWeight.w800,
                        fontSize: 12.5,
                        color: cs.primary,
                      ),
                    ),
                  ),
                  Expanded(
                    child: Text(paso.actividad, style: const TextStyle(fontSize: 13, height: 1.4)),
                  ),
                ],
              ),
            ),
          if (pasos.length > maxPasos)
            Text(
              '+ ${pasos.length - maxPasos} pasos más en la app',
              style: TextStyle(fontSize: 12, color: cs.onSurfaceVariant),
            ),
        ],
      ),
    );
  }
}

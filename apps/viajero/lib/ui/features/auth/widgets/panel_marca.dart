import 'package:diverso_core/diverso_core.dart';
import 'package:flutter/material.dart';

import '../../../core/theme/app_text.dart';

/// Panel de marca de las pantallas anchas: logo, nombre y la promesa de Diverso sobre el color
/// primario.
class PanelMarca extends StatelessWidget {
  const PanelMarca({super.key});

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Container(
      color: cs.primary,
      padding: const EdgeInsets.all(48),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          DiversoLogo(size: 64, color: cs.onPrimary),
          const SizedBox(height: 20),
          Text(
            'Diverso',
            style: TextStyle(
              fontSize: AppText.marca,
              fontWeight: FontWeight.w800,
              letterSpacing: -1.5,
              color: cs.onPrimary,
            ),
          ),
          const SizedBox(height: 12),
          ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 380),
            child: Text(
              'Planes turísticos de agencias antioqueñas verificadas. '
              'Precio final desde el inicio, cupos reales y pago protegido.',
              style: TextStyle(
                fontSize: AppText.subtitulo,
                height: 1.55,
                color: cs.onPrimary.withValues(alpha: .85),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

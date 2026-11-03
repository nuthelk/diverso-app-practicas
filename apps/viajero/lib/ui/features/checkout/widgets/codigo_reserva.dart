import 'package:flutter/material.dart';

import '../../../core/theme/app_radii.dart';

/// Tarjeta con el código de la reserva, seleccionable para copiarlo.
class CodigoReserva extends StatelessWidget {
  const CodigoReserva({super.key, required this.codigo});

  final String codigo;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 18),
      decoration: BoxDecoration(
        color: cs.primaryContainer,
        borderRadius: BorderRadius.circular(AppRadios.card),
      ),
      child: Column(
        children: [
          Text(
            'CÓDIGO DE RESERVA',
            style: TextStyle(
              fontSize: 10.5,
              fontWeight: FontWeight.w700,
              letterSpacing: 1.6,
              color: cs.onPrimaryContainer.withValues(alpha: .75),
            ),
          ),
          const SizedBox(height: 6),
          SelectableText(
            codigo,
            style: TextStyle(
              fontSize: 30,
              fontWeight: FontWeight.w900,
              letterSpacing: 3,
              color: cs.onPrimaryContainer,
            ),
          ),
        ],
      ),
    );
  }
}

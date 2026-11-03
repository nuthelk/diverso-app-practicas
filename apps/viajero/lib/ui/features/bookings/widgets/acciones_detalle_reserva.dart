import 'package:diverso_core/diverso_core.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../../router/app_routes.dart';
import '../../../core/theme/app_text.dart';

/// Acciones al pie del detalle: completar o verificar el pago si sigue pendiente, reseñar (o
/// el aviso de que ya se reseñó), «Ver plan» y «Cancelar». Cada botón solo aparece si aplica.
class AccionesDetalleReserva extends StatelessWidget {
  const AccionesDetalleReserva({
    super.key,
    required this.booking,
    required this.puedeCancelar,
    required this.puedeResenar,
    required this.onCancelar,
    required this.onPagar,
    required this.onVerificar,
    required this.onResenar,
  });

  final Booking booking;
  final bool puedeCancelar;
  final bool puedeResenar;
  final VoidCallback onCancelar;
  final VoidCallback onPagar;
  final VoidCallback onVerificar;
  final VoidCallback onResenar;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final planId = booking.plan?.id ?? booking.planDate?.planId;
    final pendiente = booking.estado == BookingStatus.pendientePago;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (pendiente) ...[
          FilledButton(onPressed: onPagar, child: const Text('Completar pago')),
          const SizedBox(height: 8),
          TextButton(onPressed: onVerificar, child: const Text('Ya pagué, verificar')),
          const SizedBox(height: 8),
        ],
        if (puedeResenar) ...[
          FilledButton.tonalIcon(
            onPressed: onResenar,
            icon: const Icon(Icons.star_outline_rounded, size: 18),
            label: const Text('Reseñar'),
          ),
          const SizedBox(height: 10),
        ] else if (booking.tieneResena) ...[
          Row(
            children: [
              Icon(Icons.rate_review_rounded, size: 15, color: cs.primary),
              const SizedBox(width: 6),
              Text(
                'Ya dejaste tu reseña',
                style: TextStyle(fontSize: AppText.detalle, color: cs.primary),
              ),
            ],
          ),
          const SizedBox(height: 10),
        ],
        Row(
          children: [
            if (planId != null)
              Expanded(
                child: OutlinedButton(
                  onPressed: () => context.push(AppRoutes.plan(planId)),
                  child: const Text('Ver plan'),
                ),
              ),
            if (planId != null && puedeCancelar) const SizedBox(width: 10),
            if (puedeCancelar)
              Expanded(
                child: OutlinedButton(
                  style: OutlinedButton.styleFrom(
                    foregroundColor: cs.error,
                    side: BorderSide(color: cs.error.withValues(alpha: .5)),
                  ),
                  onPressed: onCancelar,
                  child: const Text('Cancelar'),
                ),
              ),
          ],
        ),
      ],
    );
  }
}

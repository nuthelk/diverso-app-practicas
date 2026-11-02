import 'package:diverso_core/diverso_core.dart';
import 'package:flutter/material.dart';

import '../../../core/theme/app_radii.dart';

/// «Ya tienes una reserva pendiente de pago para esta fecha (2 personas, $ 330.000). Vence a las 14:35.»
String textoReservaPendiente(Booking reserva) {
  final vence = reserva.venceAt.toLocal();
  final hora =
      '${vence.hour.toString().padLeft(2, '0')}:${vence.minute.toString().padLeft(2, '0')}';
  final personas = '${reserva.pax} ${reserva.pax == 1 ? 'persona' : 'personas'}';
  return 'Ya tienes una reserva pendiente de pago para esta fecha '
      '($personas, ${formatCOP(reserva.montoTotal)}). Vence a las $hora.';
}

/// Aviso del checkout cuando el viajero ya tiene una reserva pendiente de pago para la fecha:
/// completarla, verificar un pago ya hecho o cancelarla y empezar de nuevo.
class ReservaPendienteAviso extends StatelessWidget {
  const ReservaPendienteAviso({
    super.key,
    required this.reserva,
    required this.ocupado,
    required this.onCompletar,
    required this.onVerificar,
    required this.onCancelar,
  });

  final Booking reserva;
  final bool ocupado;
  final VoidCallback onCompletar;
  final VoidCallback onVerificar;
  final VoidCallback onCancelar;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: cs.secondaryContainer,
        borderRadius: BorderRadius.circular(AppRadios.card),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(Icons.hourglass_top_rounded, size: 20, color: cs.onSecondaryContainer),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  textoReservaPendiente(reserva),
                  style: TextStyle(fontSize: 13.5, height: 1.4, color: cs.onSecondaryContainer),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 4,
            children: [
              FilledButton.tonal(
                onPressed: ocupado ? null : onCompletar,
                child: const Text('Completar pago'),
              ),
              TextButton(
                onPressed: ocupado ? null : onVerificar,
                child: const Text('Ya pagué, verificar'),
              ),
              TextButton(
                style: TextButton.styleFrom(foregroundColor: cs.error),
                onPressed: ocupado ? null : onCancelar,
                child: const Text('Cancelar y empezar de nuevo'),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

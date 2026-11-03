import 'package:diverso_core/diverso_core.dart';
import 'package:flutter/material.dart';

import '../../../core/theme/app_radii.dart';

/// Detalle de la reserva confirmada: plan, fecha, personas, punto de encuentro, monto y referencia
/// del pago.
class DetalleViaje extends StatelessWidget {
  const DetalleViaje({super.key, required this.booking});

  final Booking booking;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final plan = booking.plan;
    final fecha = booking.planDate?.fecha;
    final pago = booking.pago;
    final puntoEncuentro = plan?.puntoEncuentro ?? '';
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
            plan?.titulo ?? 'Tu plan',
            style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15.5, height: 1.25),
          ),
          const SizedBox(height: 12),
          if (fecha != null) _Fila(Icons.event_rounded, formatFechaLarga(fecha)),
          _Fila(Icons.group_rounded, '${booking.pax} ${booking.pax == 1 ? 'persona' : 'personas'}'),
          if (puntoEncuentro.isNotEmpty) _Fila(Icons.flag_rounded, puntoEncuentro),
          const Divider(height: 22),
          _Fila(Icons.payments_rounded, formatCOP(booking.montoTotal)),
          if (pago != null) _Fila(Icons.receipt_rounded, pago.textoReferencia),
          const SizedBox(height: 8),
          Row(
            children: [
              Icon(Icons.verified_user_rounded, size: 14, color: cs.tertiary),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  'Compra protegida: reembolso según la política de cancelación.',
                  style: TextStyle(fontSize: 12, color: cs.onSurfaceVariant),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _Fila extends StatelessWidget {
  const _Fila(this.icono, this.texto);

  final IconData icono;
  final String texto;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Icon(icono, size: 16, color: Theme.of(context).colorScheme.onSurfaceVariant),
          const SizedBox(width: 10),
          Expanded(child: Text(texto, style: const TextStyle(fontSize: 13.5))),
        ],
      ),
    );
  }
}

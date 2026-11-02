import 'package:diverso_core/diverso_core.dart';
import 'package:flutter/material.dart';

import '../../../core/theme/app_radii.dart';
import '../reserva_formato.dart';
import 'reserva_widgets.dart';

/// Tarjeta con los datos de la reserva en el detalle: salida con su cuenta regresiva, punto de
/// encuentro, personas y total, pago y reembolso (las filas que no aplican no se dibujan).
class ResumenReserva extends StatelessWidget {
  const ResumenReserva({super.key, required this.booking});

  final Booking booking;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final salida = textoSalida(booking);
    final puntoEncuentro = booking.plan?.puntoEncuentro ?? '';
    final pago = booking.pago;
    final etiquetaReembolso = booking.etiquetaReembolso;

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: cs.surfaceContainerLow,
        borderRadius: BorderRadius.circular(AppRadios.card),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (salida != null) ...[
            FilaDato(icono: Icons.event_rounded, texto: salida, acento: cuentaRegresiva(booking)),
            const SizedBox(height: 12),
          ],
          if (puntoEncuentro.isNotEmpty) ...[
            FilaDato(icono: Icons.place_outlined, texto: puntoEncuentro),
            const SizedBox(height: 12),
          ],
          FilaDato(
            icono: Icons.group_outlined,
            texto: '${textoPersonas(booking.pax)} · ${formatCOP(booking.montoTotal)}',
          ),
          if (pago != null) ...[
            const SizedBox(height: 12),
            FilaDato(icono: Icons.credit_card_rounded, texto: pago.textoReferencia),
          ],
          if (etiquetaReembolso != null) ...[
            const SizedBox(height: 12),
            FilaDato(
              icono: Icons.currency_exchange_rounded,
              texto: etiquetaReembolso,
              color: colorReembolso(booking, cs),
            ),
          ],
        ],
      ),
    );
  }
}

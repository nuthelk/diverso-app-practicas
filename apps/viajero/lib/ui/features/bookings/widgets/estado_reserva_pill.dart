import 'package:diverso_core/diverso_core.dart';
import 'package:flutter/material.dart';

import '../../../core/theme/app_radii.dart';
import '../../../core/theme/app_text.dart';
import '../../../core/theme/diverso_colors.dart';

/// Estado de la reserva: píldora de color sólido con texto blanco (legible sobre foto y sobre la
/// página). Una confirmada que ya salió dice «Realizada» (solo etiqueta: el estado no cambia).
class EstadoReservaPill extends StatelessWidget {
  const EstadoReservaPill({super.key, required this.booking});

  final Booking booking;

  @override
  Widget build(BuildContext context) {
    final realizada =
        booking.estado == BookingStatus.confirmada && booking.salida != null && !booking.esFutura();
    final colores = DiversoColors.of(context);
    final (color, texto) = switch (booking.estado) {
      BookingStatus.confirmada when realizada => (colores.estadoCerrada, 'Realizada'),
      BookingStatus.confirmada => (colores.estadoConfirmada, 'Confirmada'),
      BookingStatus.pendientePago => (colores.estadoPendiente, 'Pendiente'),
      BookingStatus.cancelada => (colores.estadoCancelada, 'Cancelada'),
      BookingStatus.completada => (colores.estadoCerrada, 'Completada'),
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 5),
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(AppRadios.pill),
        boxShadow: [
          BoxShadow(color: colores.sombraInsignia, blurRadius: 6, offset: const Offset(0, 2)),
        ],
      ),
      child: Text(
        texto,
        style: const TextStyle(
          color: Colors.white,
          fontSize: AppText.etiqueta,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}

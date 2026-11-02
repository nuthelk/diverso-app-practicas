import 'package:diverso_core/diverso_core.dart';
import 'package:flutter/material.dart';

import '../checkout/pago_wompi.dart';
import 'view_models/bookings_view_model.dart';
import 'widgets/cancel_dialog.dart';

/// Acciones sobre una reserva compartidas por «Mis reservas» y el detalle de la reserva.

/// Pide confirmación mostrando el reembolso que daría la política y, si el viajero confirma,
/// cancela. Devuelve true si el viajero confirmó (el resultado del servidor queda en `c.mensaje`).
Future<bool> cancelarConConfirmacion(BuildContext context, BookingsViewModel c, Booking b) async {
  final vista = await c.vistaPrevia(b);
  if (vista == null || !context.mounted) return false;
  final confirmo = await showDialog<bool>(
    context: context,
    builder: (context) => CancelacionDialog(codigo: b.codigo, vista: vista),
  );
  if (confirmo != true) return false;
  await c.cancelar(b);
  return true;
}

/// Retoma el pago de una reserva que sigue pendiente (mientras dure la retención de 30 min).
Future<void> completarPago(
  BuildContext context,
  BookingsViewModel c,
  PaymentGateway pasarela,
  Booking b,
) async {
  try {
    final terminado = await iniciarPago(context, pasarela: pasarela, bookingId: b.id);
    if (!terminado) {
      c.avisar('Cerraste el pago antes de terminar. Si ya pagaste, toca «Ya pagué, verificar».');
    }
  } on DiversoException catch (e) {
    c.avisar(e.mensajeUsuario);
  }
}

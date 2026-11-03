import 'package:diverso_core/diverso_core.dart';
import 'package:flutter/material.dart';

import '../checkout/pago_abierto.dart';
import '../checkout/pago_wompi.dart';
import 'view_models/reserva_acciones_view_model.dart';
import 'widgets/cancel_dialog.dart';

/// Acciones sobre una reserva compartidas por «Mis reservas» y el detalle de la reserva. Son la
/// parte con diálogos y navegación (necesitan el `BuildContext`); lo demás vive en el view model.

/// Muestra como snackbar el aviso pendiente del view model y lo consume.
void mostrarAviso(BuildContext context, ReservaAccionesViewModel viewModel) {
  final mensaje = viewModel.mensaje;
  if (mensaje == null) return;
  ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(mensaje)));
  viewModel.limpiarMensaje();
}

/// Pide confirmación mostrando el reembolso que daría la política y, si el viajero confirma,
/// cancela. Devuelve true si el viajero confirmó (el resultado del servidor queda en el aviso del
/// view model).
Future<bool> cancelarConConfirmacion(
  BuildContext context,
  ReservaAccionesViewModel viewModel,
  Booking b,
) async {
  final vista = await viewModel.vistaPrevia(b);
  if (vista == null || !context.mounted) return false;
  final confirmo = await showDialog<bool>(
    context: context,
    builder: (context) => CancelacionDialog(codigo: b.codigo, vista: vista),
  );
  if (confirmo != true) return false;
  await viewModel.cancelar(b);
  return true;
}

/// Retoma el pago de una reserva que sigue pendiente (mientras dure la retención de 30 min).
Future<void> completarPago(
  BuildContext context,
  ReservaAccionesViewModel viewModel,
  PaymentGateway pasarela,
  Booking b,
) async {
  try {
    final abierto = await iniciarPago(context, pasarela: pasarela, bookingId: b.id);
    if (abierto == PagoAbierto.cerrado) {
      viewModel.avisar(
        'Cerraste el pago antes de terminar. Si ya pagaste, toca «Ya pagué, verificar».',
      );
    }
  } on DiversoException catch (e) {
    viewModel.avisar(e.mensajeUsuario);
  }
}

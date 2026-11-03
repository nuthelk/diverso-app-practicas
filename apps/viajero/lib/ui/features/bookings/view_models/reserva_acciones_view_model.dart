import 'package:diverso_core/diverso_core.dart';
import 'package:flutter/foundation.dart';

import '../../../core/mensaje_de_error.dart';
import '../../../core/notifica_si_vive.dart';
import '../reserva_formato.dart';

/// Lo que comparten «Mis reservas» y el detalle de la reserva: el aviso (snackbar) que la vista
/// muestra y consume, la vista previa y la ejecución de la cancelación, y las reglas de qué se
/// puede hacer con una reserva según el reloj. Cada pantalla decide qué recargar ([cargar]).
abstract class ReservaAccionesViewModel extends ChangeNotifier with NotificaSiVive {
  ReservaAccionesViewModel({required BookingRepository reservas, DateTime Function()? reloj})
    : _reloj = reloj ?? DateTime.now,
      _reservas = reservas;

  final BookingRepository _reservas;
  final DateTime Function() _reloj;
  String? _mensaje;

  /// Aviso pendiente de mostrar (resultado de una cancelación, un pago cerrado…). La vista lo
  /// muestra y llama [limpiarMensaje].
  String? get mensaje => _mensaje;

  /// Recarga lo que muestra la pantalla; se llama tras una cancelación.
  Future<void> cargar();

  /// Pendiente o confirmada y que aún no sale (ver [Booking.vigente]), según el reloj del view model.
  bool esVigente(Booking b) => b.vigente(_reloj());

  bool puedeCancelar(Booking b) => esVigente(b);

  bool puedeResenar(Booking b) => b.puedeResenar(_reloj());

  /// Deja [texto] como aviso para la vista.
  void avisar(String texto) {
    _mensaje = texto;
    notificar();
  }

  /// La vista ya mostró el aviso: no hace falta repintar.
  void limpiarMensaje() => _mensaje = null;

  /// Reembolso que daría la política del plan si se cancelara ahora; null si no se pudo
  /// consultar (el motivo queda en [mensaje]).
  Future<VistaPreviaCancelacion?> vistaPrevia(Booking b) async {
    _mensaje = null;
    try {
      return await _reservas.vistaPreviaCancelacion(b.id);
    } on Object catch (e) {
      debugPrint('ReservaAccionesViewModel.vistaPrevia: $e');
      avisar(mensajeDeError(e));
      return null;
    }
  }

  /// Cancela [b], avisa con el reembolso y recarga. `false` si el servidor la rechazó (el motivo
  /// queda en [mensaje]).
  Future<bool> cancelar(Booking b) async {
    _mensaje = null;
    try {
      final resultado = await _reservas.cancelar(b.id);
      _mensaje = mensajeCancelacion(resultado);
    } on Object catch (e) {
      debugPrint('ReservaAccionesViewModel.cancelar: $e');
      avisar(mensajeDeError(e));
      return false;
    }
    await cargar();
    return true;
  }

  /// Para los view models de cada pantalla.
  @protected
  BookingRepository get repositorio => _reservas;
}

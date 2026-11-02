import 'package:diverso_core/diverso_core.dart';
import 'package:flutter/foundation.dart';

import '../../../core/mensaje_de_error.dart';
import 'reserva_acciones_view_model.dart';

/// ViewModel del detalle de una reserva (`/reservas/:bookingId`): la reserva que ya tenía la lista
/// se pinta de inmediato; sin ella (recarga en web, enlace directo) se carga por id. Recuerda si
/// algo cambió (cancelación, pago, reseña) para que, al volver, «Mis reservas» se recargue.
class ReservaDetalleViewModel extends ReservaAccionesViewModel {
  ReservaDetalleViewModel({
    required super.reservas,
    required String bookingId,
    Booking? inicial,
    super.reloj,
  }) : _bookingId = bookingId,
       _reserva = inicial;

  final String _bookingId;
  Booking? _reserva;
  bool _cargando = false;
  String? _error;
  bool _cambio = false;

  /// Null mientras se carga por primera vez o si esa carga falló.
  Booking? get reserva => _reserva;
  bool get cargando => _cargando || (_reserva == null && _error == null);

  /// Motivo si no se pudo cargar la reserva (con una ya a la vista, un fallo solo se avisa).
  String? get error => _error;

  /// Si hubo un cambio que «Mis reservas» debe recargar.
  bool get cambio => _cambio;

  /// Trae la reserva del backend. Si ya había una a la vista y falla, la deja y avisa.
  @override
  Future<void> cargar() async {
    _cargando = true;
    _error = null;
    notificar();
    try {
      final nueva = await repositorio.reserva(_bookingId);
      // `reserva(id)` no sabe si ya se reseñó: no se pierde lo que la lista ya había marcado.
      _reserva = (_reserva?.tieneResena ?? false) ? nueva.conResena() : nueva;
    } on Object catch (e) {
      debugPrint('ReservaDetalleViewModel.cargar: $e');
      if (_reserva != null) {
        avisar('No pudimos actualizar la reserva.');
      } else {
        _error = mensajeDeError(e);
      }
    } finally {
      _cargando = false;
      notificar();
    }
  }

  /// Cancelar siempre deja la lista por recargar, aunque el servidor la rechace (su estado puede
  /// haber cambiado).
  @override
  Future<bool> cancelar(Booking b) {
    _cambio = true;
    return super.cancelar(b);
  }

  /// El viajero salió del pago (terminó o lo cerró): cambió la reserva o puede haber cambiado.
  Future<void> pagoIntentado() {
    _cambio = true;
    return cargar();
  }

  /// La reseña se publicó: ya no se ofrece «Reseñar».
  void resenaPublicada() {
    _cambio = true;
    _reserva = _reserva?.conResena();
    notificar();
  }
}

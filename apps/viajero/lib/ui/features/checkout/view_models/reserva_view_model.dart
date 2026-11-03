import 'package:diverso_core/diverso_core.dart';
import 'package:flutter/foundation.dart';

import '../../../core/mensaje_de_error.dart';
import '../../../core/notifica_si_vive.dart';

/// ViewModel de `/reserva/:bookingId`: carga la reserva por id para que la confirmación
/// sobreviva a recargar la página en web.
class ReservaViewModel extends ChangeNotifier with NotificaSiVive {
  ReservaViewModel({required BookingRepository reservas, required String bookingId})
    : _reservas = reservas,
      _bookingId = bookingId;

  final BookingRepository _reservas;
  final String _bookingId;

  Booking? _reserva;
  bool _cargando = true;
  String? _error;

  /// Null mientras se carga o si la carga falló.
  Booking? get reserva => _reserva;
  bool get cargando => _cargando;

  /// Mensaje para el usuario si la carga falló.
  String? get error => _error;

  Future<void> cargar() async {
    _cargando = true;
    _error = null;
    notificar();
    try {
      _reserva = await _reservas.reserva(_bookingId);
    } on Object catch (e) {
      debugPrint('ReservaViewModel.cargar: $e');
      _error = mensajeDeError(e);
    } finally {
      _cargando = false;
      notificar();
    }
  }
}

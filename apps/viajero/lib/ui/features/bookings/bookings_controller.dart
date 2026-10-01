import 'package:flutter/foundation.dart';
import 'package:diverso_core/diverso_core.dart';

/// ViewModel de "Mis reservas": carga la lista y ejecuta cancelaciones.
class BookingsController extends ChangeNotifier {
  BookingsController({BookingService? reservas}) : _reservas = reservas ?? BookingService();

  final BookingService _reservas;

  List<Booking> reservas = const [];
  bool cargando = true;
  String? error;
  String? mensaje;

  List<Booking> get activas => reservas
      .where((b) => b.estado == BookingStatus.confirmada || b.estado == BookingStatus.pendientePago)
      .toList(growable: false);

  List<Booking> get historial => reservas
      .where((b) => b.estado == BookingStatus.cancelada || b.estado == BookingStatus.completada)
      .toList(growable: false);

  Future<void> cargar() async {
    cargando = true;
    error = null;
    notifyListeners();
    try {
      reservas = await _reservas.misReservas();
    } catch (_) {
      error = 'No pudimos cargar tus reservas.';
    } finally {
      cargando = false;
      notifyListeners();
    }
  }

  Future<void> cancelar(Booking b) async {
    mensaje = null;
    try {
      await _reservas.cancelar(b.id);
      mensaje = 'Reserva cancelada y cupos liberados.';
      await cargar();
    } on DiversoException catch (e) {
      mensaje = e.mensajeUsuario;
      notifyListeners();
    }
  }
}

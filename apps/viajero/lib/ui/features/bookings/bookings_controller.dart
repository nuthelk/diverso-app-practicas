import 'package:flutter/foundation.dart';
import 'package:diverso_core/diverso_core.dart';

/// ViewModel de "Mis reservas": carga la lista y ejecuta cancelaciones.
class BookingsController extends ChangeNotifier {
  BookingsController({required BookingService reservas}) : _reservas = reservas;

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

  /// Muestra [texto] como aviso (snackbar) en la vista.
  void avisar(String texto) {
    mensaje = texto;
    notifyListeners();
  }

  /// Reembolso que daría la política del plan si se cancelara ahora; null si no se pudo
  /// consultar (el motivo queda en [mensaje]).
  Future<VistaPreviaCancelacion?> vistaPrevia(Booking b) async {
    mensaje = null;
    try {
      return await _reservas.vistaPreviaCancelacion(b.id);
    } on DiversoException catch (e) {
      mensaje = e.mensajeUsuario;
      notifyListeners();
      return null;
    }
  }

  Future<void> cancelar(Booking b) async {
    mensaje = null;
    try {
      final r = await _reservas.cancelar(b.id);
      final reembolso = r.estado == EstadoReembolso.noAplica
          ? r.estado.etiqueta
          : '${r.estado.etiqueta}: ${formatCOP(r.monto)} (${r.porcentaje} %)';
      mensaje = 'Reserva cancelada y cupos liberados. $reembolso.';
      await cargar();
    } on DiversoException catch (e) {
      mensaje = e.mensajeUsuario;
      notifyListeners();
    }
  }
}

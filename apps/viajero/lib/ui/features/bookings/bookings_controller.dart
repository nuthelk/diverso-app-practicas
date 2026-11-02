import 'package:diverso_core/diverso_core.dart';
import 'package:flutter/foundation.dart';

/// ViewModel de "Mis reservas": carga la lista, la separa por salida y ejecuta cancelaciones.
class BookingsController extends ChangeNotifier {
  BookingsController({required BookingService reservas, DateTime Function()? reloj})
      : _reservas = reservas,
        _reloj = reloj ?? DateTime.now;

  final BookingService _reservas;
  final DateTime Function() _reloj;

  List<Booking> reservas = const [];
  bool cargando = true;
  String? error;
  String? mensaje;

  bool _vigente(Booking b) =>
      (b.estado == BookingStatus.confirmada || b.estado == BookingStatus.pendientePago) &&
      b.esFutura(_reloj());

  /// Próximas: pendientes o confirmadas que aún no salen, la salida más cercana primero.
  List<Booking> get activas =>
      reservas.where(_vigente).toList()..sort((a, b) => a.salida!.compareTo(b.salida!));

  /// Historial: todo lo demás, la salida más reciente primero.
  List<Booking> get historial => reservas.where((b) => !_vigente(b)).toList()
    ..sort((a, b) {
      final sa = a.salida, sb = b.salida;
      if (sa == null || sb == null) return sa == sb ? 0 : (sa == null ? 1 : -1);
      return sb.compareTo(sa);
    });

  /// Cancelar solo tiene sentido antes de la salida (el servidor lo rechaza después).
  bool puedeCancelar(Booking b) => _vigente(b);

  bool puedeResenar(Booking b) => b.puedeResenar(_reloj());

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

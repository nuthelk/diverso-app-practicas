import 'package:diverso_core/diverso_core.dart';
import 'package:flutter/foundation.dart';

import '../../../core/mensaje_de_error.dart';

/// ViewModel de la reseña (`/resena/:bookingId`): carga la reserva por id (o usa la que ya tenía
/// «Mis reservas»), decide si se puede reseñar, guarda la calificación elegida y publica la reseña.
class ReviewViewModel extends ChangeNotifier {
  ReviewViewModel({
    required BookingRepository reservas,
    required ReviewRepository resenas,
    required String bookingId,
    Booking? adelantada,
    DateTime Function()? reloj,
  }) : _reservas = reservas,
       _resenas = resenas,
       _bookingId = bookingId,
       _reloj = reloj ?? DateTime.now,
       // `extra` de la ruta solo vale si es la reserva pedida.
       _reserva = adelantada != null && adelantada.id == bookingId ? adelantada : null;

  /// Estrellas con las que empieza el formulario y máximo posible.
  static const int calificacionInicial = 5;
  static const int maxEstrellas = 5;

  final BookingRepository _reservas;
  final ReviewRepository _resenas;
  final String _bookingId;
  final DateTime Function() _reloj;
  bool _desechado = false;

  Booking? _reserva;
  bool _cargando = false;
  String? _error;
  int _calificacion = calificacionInicial;
  bool _enviando = false;
  bool _publicada = false;
  String? _errorEnvio;

  /// Null mientras se carga o si la carga falló.
  Booking? get reserva => _reserva;
  bool get cargando => _cargando || (_reserva == null && _error == null);

  /// Motivo si no se pudo cargar la reserva.
  String? get error => _error;

  /// Solo se reseñan los viajes ya realizados, confirmados y sin reseña (el servidor lo exige).
  bool get puedeResenar => _reserva?.puedeResenar(_reloj()) ?? false;

  int get calificacion => _calificacion;
  bool get enviando => _enviando;

  /// La reseña ya se publicó: la pantalla se cierra y el botón no vuelve a activarse.
  bool get publicada => _publicada;

  /// Motivo si el servidor rechazó la última reseña.
  String? get errorEnvio => _errorEnvio;

  /// Trae la reserva del backend; si ya se tiene (la de «Mis reservas»), no hace nada.
  Future<void> cargar() async {
    if (_reserva != null) return;
    _cargando = true;
    _error = null;
    _notificar();
    try {
      _reserva = await _reservas.reserva(_bookingId);
    } on Object catch (e) {
      debugPrint('ReviewViewModel.cargar: $e');
      _error = mensajeDeError(e);
    } finally {
      _cargando = false;
      _notificar();
    }
  }

  /// Elige de 1 a [maxEstrellas] estrellas; otro valor se ignora.
  void calificar(int estrellas) {
    if (estrellas < 1 || estrellas > maxEstrellas || estrellas == _calificacion) return;
    _calificacion = estrellas;
    _notificar();
  }

  /// Publica la reseña. `false` si ya hay un envío en curso, ya se publicó o el servidor la
  /// rechazó (el motivo queda en [errorEnvio] y se puede reintentar).
  Future<bool> enviar(String comentario) async {
    if (_enviando || _publicada) return false;
    _enviando = true;
    _errorEnvio = null;
    _notificar();
    try {
      await _resenas.crear(
        bookingId: _bookingId,
        calificacion: _calificacion,
        comentario: comentario,
      );
      _publicada = true;
      return true;
    } on Object catch (e) {
      debugPrint('ReviewViewModel.enviar: $e');
      _errorEnvio = mensajeDeError(e);
      return false;
    } finally {
      _enviando = false;
      _notificar();
    }
  }

  /// Una operación puede terminar cuando la pantalla ya se cerró: ahí no hay nadie a quien avisar.
  void _notificar() {
    if (!_desechado) notifyListeners();
  }

  @override
  void dispose() {
    _desechado = true;
    super.dispose();
  }
}

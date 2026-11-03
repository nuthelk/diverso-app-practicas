import 'dart:async';

import 'package:diverso_core/diverso_core.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';

import '../pago_abierto.dart';

/// ViewModel del checkout: crea la reserva atómica (cupos retenidos 30 min) y pide a la
/// pasarela abrir el pago de prueba de Wompi.
///
/// Regla anti-duplicados: por viajero y fecha hay a lo sumo UNA reserva pendiente de pago.
/// Si ya existe (p. ej. volvió atrás desde Wompi), `pagar` no crea otra: expone [pendiente]
/// para que el viajero la complete o la cancele.
class CheckoutViewModel extends ChangeNotifier {
  CheckoutViewModel({required BookingRepository reservas}) : _reservas = reservas;

  /// Máximo de personas por reserva.
  static const int maxPersonas = 20;

  final BookingRepository _reservas;
  bool _desechado = false;

  bool _procesando = false;
  String? _error;
  int _pax = 1;
  String? _bookingId;
  Booking? _pendiente;

  /// Hay una reserva, un pago o una cancelación en curso: los botones se bloquean.
  bool get procesando => _procesando;

  /// Mensaje para el usuario del último intento que falló.
  String? get error => _error;

  int get pax => _pax;

  /// Reserva de este checkout (creada aquí o retomada de [pendiente]). Si el pago no se
  /// completa, se reutiliza en el reintento y deja de poderse cambiar el número de viajeros.
  String? get bookingId => _bookingId;

  /// Reserva pendiente de pago de esta fecha que el viajero ya tenía; mientras exista, el
  /// checkout ofrece completarla o cancelarla en vez de crear otra.
  Booking? get pendiente => _pendiente;

  /// El número de viajeros ya no cambia una vez hay reserva (creada o pendiente).
  bool get _personasFijas => _bookingId != null || _pendiente != null;

  bool get puedeQuitarPersona => !_personasFijas && _pax > 1;

  /// Se puede sumar otra persona mientras haya [cupos] en la fecha y no se pase del máximo.
  bool puedeAgregarPersona(int cupos) => !_personasFijas && _pax < cupos && _pax < maxPersonas;

  /// «Pagar con Wompi» se bloquea mientras algo está en curso o hay una pendiente por resolver.
  bool get puedePagar => !_procesando && _pendiente == null;

  double total(Plan plan) => plan.precioCop * _pax;

  void setPax(int valor) {
    if (_personasFijas) return;
    _pax = valor.clamp(1, maxPersonas);
    _notificar();
  }

  /// Busca (al abrir el checkout) si ya hay una reserva pendiente vigente para [fecha].
  /// Es solo para mostrar el aviso antes de pagar; la guarda real está en [pagar].
  Future<void> cargarPendiente(PlanDate fecha) async {
    try {
      _pendiente = await _reservas.reservaPendiente(fecha.id);
    } on Object catch (e) {
      debugPrint('CheckoutViewModel.cargarPendiente: $e');
      _pendiente = null;
    }
    _notificar();
  }

  /// Reserva (una sola vez) y delega en [abrirPago] el cobro con Wompi. [abrirPago] dice cómo
  /// terminó: si el viajero lo cerró sin terminar queda un aviso; los errores quedan en [error].
  Future<void> pagar(
    PlanDate fecha,
    Future<PagoAbierto> Function(String bookingId) abrirPago,
  ) async {
    if (_procesando) return;
    await _ejecutar(() async {
      if (_bookingId == null) {
        final existente = await _reservas.reservaPendiente(fecha.id);
        if (existente != null) {
          _pendiente = existente;
          return;
        }
        try {
          _bookingId = (await _reservas.crearReserva(planDateId: fecha.id, pax: _pax)).bookingId;
        } on DiversoException catch (e) {
          // El servidor también impide la segunda pendiente (otra pestaña o dispositivo la abrió entre la
          // consulta y el alta): se muestra el mismo aviso de la reserva pendiente en vez de un error.
          if (e.codigo != 'RESERVA_PENDIENTE_EXISTENTE') rethrow;
          _pendiente = await _reservas.reservaPendiente(fecha.id);
          if (_pendiente == null) rethrow;
          return;
        }
      }
      await _abrir(abrirPago);
    });
  }

  /// Retoma [pendiente]: mismo id y mismas personas, sin crear otra reserva.
  Future<void> completarPendiente(Future<PagoAbierto> Function(String bookingId) abrirPago) async {
    final reserva = _pendiente;
    if (reserva == null || _procesando) return;
    await _ejecutar(() async {
      _bookingId = reserva.id;
      _pax = reserva.pax;
      _pendiente = null;
      await _abrir(abrirPago);
    });
  }

  /// Cancela [pendiente] (reservas-cancelar: sin pago no hay reembolso y se liberan los cupos)
  /// para que el viajero empiece de nuevo.
  Future<void> cancelarPendiente() async {
    final reserva = _pendiente;
    if (reserva == null || _procesando) return;
    await _ejecutar(() async {
      await _reservas.cancelar(reserva.id);
      _pendiente = null;
    });
  }

  Future<void> _abrir(Future<PagoAbierto> Function(String bookingId) abrirPago) async {
    final abierto = await abrirPago(_bookingId!);
    if (abierto == PagoAbierto.cerrado) {
      _error =
          'Cerraste el pago antes de terminar. Si ya pagaste, toca «Ya pagué, verificar»; '
          'si no, vuelve a intentarlo (tus cupos siguen retenidos unos minutos).';
    }
  }

  Future<void> _ejecutar(Future<void> Function() accion) async {
    _procesando = true;
    _error = null;
    _notificar();
    unawaited(HapticFeedback.mediumImpact());

    try {
      await accion();
    } on DiversoException catch (e) {
      _error = e.mensajeUsuario;
    } on Object catch (e) {
      debugPrint('CheckoutViewModel._ejecutar: $e');
      _error = 'No pudimos iniciar el pago. Intenta de nuevo.';
    }
    _procesando = false;
    _notificar();
  }

  /// Un pago puede terminar cuando la pantalla ya se cerró (el WebView navega al resultado): ahí
  /// no hay nadie a quien avisar.
  void _notificar() {
    if (!_desechado) notifyListeners();
  }

  @override
  void dispose() {
    _desechado = true;
    super.dispose();
  }
}

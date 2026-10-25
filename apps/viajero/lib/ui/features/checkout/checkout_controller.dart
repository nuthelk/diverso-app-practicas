import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:diverso_core/diverso_core.dart';

/// ViewModel del checkout: crea la reserva atómica (cupos retenidos 30 min) y pide a la
/// pasarela abrir el pago de prueba de Wompi.
///
/// Regla anti-duplicados: por viajero y fecha hay a lo sumo UNA reserva pendiente de pago.
/// Si ya existe (p. ej. volvió atrás desde Wompi), `pagar` no crea otra: expone [pendiente]
/// para que el viajero la complete o la cancele.
class CheckoutController extends ChangeNotifier {
  CheckoutController({required BookingService reservas}) : _reservas = reservas;

  final BookingService _reservas;

  bool procesando = false;
  String? error;

  int pax = 1;

  /// Reserva de este checkout (creada aquí o retomada de [pendiente]). Si el pago no se
  /// completa, se reutiliza en el reintento y deja de poderse cambiar el número de viajeros.
  String? bookingId;

  /// Reserva pendiente de pago de esta fecha que el viajero ya tenía; mientras exista, el
  /// checkout ofrece completarla o cancelarla en vez de crear otra.
  Booking? pendiente;

  double total(Plan plan) => plan.precioCop * pax;

  void setPax(int valor) {
    if (bookingId != null || pendiente != null) return;
    pax = valor.clamp(1, 20);
    notifyListeners();
  }

  /// Busca (al abrir el checkout) si ya hay una reserva pendiente vigente para [fecha].
  /// Es solo para mostrar el aviso antes de pagar; la guarda real está en [pagar].
  Future<void> cargarPendiente(PlanDate fecha) async {
    try {
      pendiente = await _reservas.reservaPendiente(fecha.id);
    } catch (_) {
      pendiente = null;
    }
    notifyListeners();
  }

  /// Reserva (una sola vez) y delega en [abrirPago] el cobro con Wompi. [abrirPago] devuelve
  /// false si el viajero cerró el pago sin terminar. Los errores quedan en [error].
  Future<void> pagar(PlanDate fecha, Future<bool> Function(String bookingId) abrirPago) async {
    if (procesando) return;
    await _ejecutar(() async {
      if (bookingId == null) {
        final existente = await _reservas.reservaPendiente(fecha.id);
        if (existente != null) {
          pendiente = existente;
          return;
        }
        bookingId = (await _reservas.crearReserva(planDateId: fecha.id, pax: pax)).bookingId;
      }
      await _abrir(abrirPago);
    });
  }

  /// Retoma [pendiente]: mismo id y mismas personas, sin crear otra reserva.
  Future<void> completarPendiente(Future<bool> Function(String bookingId) abrirPago) async {
    final reserva = pendiente;
    if (reserva == null || procesando) return;
    await _ejecutar(() async {
      bookingId = reserva.id;
      pax = reserva.pax;
      pendiente = null;
      await _abrir(abrirPago);
    });
  }

  /// Cancela [pendiente] (reservas-cancelar: sin pago no hay reembolso y se liberan los cupos)
  /// para que el viajero empiece de nuevo.
  Future<void> cancelarPendiente() async {
    final reserva = pendiente;
    if (reserva == null || procesando) return;
    await _ejecutar(() async {
      await _reservas.cancelar(reserva.id);
      pendiente = null;
    });
  }

  Future<void> _abrir(Future<bool> Function(String bookingId) abrirPago) async {
    final terminado = await abrirPago(bookingId!);
    if (!terminado) {
      error = 'Cerraste el pago antes de terminar. Si ya pagaste, toca «Ya pagué, verificar»; '
          'si no, vuelve a intentarlo (tus cupos siguen retenidos unos minutos).';
    }
  }

  Future<void> _ejecutar(Future<void> Function() accion) async {
    procesando = true;
    error = null;
    notifyListeners();
    HapticFeedback.mediumImpact();

    try {
      await accion();
    } on DiversoException catch (e) {
      error = e.mensajeUsuario;
    } catch (_) {
      error = 'No pudimos iniciar el pago. Intenta de nuevo.';
    }
    procesando = false;
    notifyListeners();
  }
}

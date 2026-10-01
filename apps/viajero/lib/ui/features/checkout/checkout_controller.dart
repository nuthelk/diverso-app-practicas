import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:diverso_core/diverso_core.dart';

/// ViewModel del checkout: ejecuta reserva atómica + pago y expone el estado
/// del proceso para la vista.
class CheckoutController extends ChangeNotifier {
  CheckoutController({BookingService? reservas, PaymentGateway? gateway})
      : _reservas = reservas ?? BookingService(),
        _gateway = gateway ?? SimulatedPaymentGateway();

  final BookingService _reservas;
  final PaymentGateway _gateway;

  bool procesando = false;
  String? error;

  int pax = 1;
  PaymentMethodOption metodo = PaymentMethodOption.nequi;

  double total(Plan plan) => plan.precioCop * pax;

  void setPax(int valor) {
    pax = valor.clamp(1, 20);
    notifyListeners();
  }

  void setMetodo(PaymentMethodOption m) {
    metodo = m;
    notifyListeners();
  }

  /// Reserva atómica → pago simulado → confirmación (Anexo 6: < 5 minutos).
  /// Devuelve los datos de éxito o null si falla (error queda en [error]).
  Future<SuccessArgs?> pagar(Plan plan, PlanDate fecha) async {
    procesando = true;
    error = null;
    notifyListeners();
    HapticFeedback.mediumImpact();

    try {
      final creada = await _reservas.crearReserva(planDateId: fecha.id, pax: pax);
      final pago = await _gateway.pagar(bookingId: creada.bookingId, metodo: metodo);
      procesando = false;
      notifyListeners();
      return SuccessArgs(
        codigo: pago.codigo,
        referencia: pago.referencia,
        monto: pago.monto,
        metodo: metodo,
        planTitulo: plan.titulo,
        fecha: fecha.fecha,
        pax: pax,
        puntoEncuentro: plan.puntoEncuentro,
        itinerario: plan.itinerario,
      );
    } on DiversoException catch (e) {
      error = e.mensajeUsuario;
    } catch (_) {
      error = 'No pudimos completar el pago. Intenta de nuevo.';
    }
    procesando = false;
    notifyListeners();
    return null;
  }
}

/// Argumentos de la pantalla de éxito (viajan como `extra` del router).
class SuccessArgs {
  SuccessArgs({
    required this.codigo,
    required this.referencia,
    required this.monto,
    required this.metodo,
    required this.planTitulo,
    required this.fecha,
    required this.pax,
    required this.puntoEncuentro,
    required this.itinerario,
  });

  final String codigo;
  final String referencia;
  final double monto;
  final PaymentMethodOption metodo;
  final String planTitulo;
  final DateTime fecha;
  final int pax;
  final String puntoEncuentro;
  final List<ItinerarioPaso> itinerario;
}

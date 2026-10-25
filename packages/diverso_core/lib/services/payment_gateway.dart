import '../models/pago.dart';
import 'edge_functions.dart';

/// Abstracción de pasarela de pago (Anexo 6: pagos locales seguros).
///
/// Wompi (sandbox) abre su Web Checkout: el medio de pago (tarjeta, PSE, Nequi,
/// Daviplata, Bancolombia) se elige en la página de Wompi y ningún dato de pago pasa por la
/// app. La app solo pide la URL de pago y luego pregunta al servidor cómo quedó.
abstract class PaymentGateway {
  /// Crea el intento de pago de una reserva pendiente y devuelve la URL del checkout.
  Future<CheckoutIniciado> iniciar({
    required String bookingId,
    required String redirectUrl,
  });

  /// Verifica el pago en el servidor (nunca se confía en la redirección del navegador).
  /// Exactamente uno de [transactionId] (tras la redirección) o [bookingId] («Ya pagué»).
  Future<PagoVerificado> verificar({String? transactionId, String? bookingId});
}

/// Pasarela Wompi en modo prueba: delega en las Edge Functions `pagos-iniciar` y `pagos-verificar`.
class WompiPaymentGateway implements PaymentGateway {
  WompiPaymentGateway({FunctionInvoker? invocar}) : _invocar = invocar ?? invocarEdgeFunction;

  final FunctionInvoker _invocar;

  @override
  Future<CheckoutIniciado> iniciar({
    required String bookingId,
    required String redirectUrl,
  }) async {
    final res = await llamarEdgeFunction(_invocar, 'pagos-iniciar', {
      'booking_id': bookingId,
      'redirect_url': redirectUrl,
    });
    return CheckoutIniciado.fromMap(res);
  }

  @override
  Future<PagoVerificado> verificar({String? transactionId, String? bookingId}) async {
    if ((transactionId == null) == (bookingId == null)) {
      throw ArgumentError('Indica exactamente uno de transactionId o bookingId');
    }
    final res = await llamarEdgeFunction(_invocar, 'pagos-verificar', {
      if (transactionId != null) 'transaction_id': transactionId,
      if (bookingId != null) 'booking_id': bookingId,
    });
    return PagoVerificado.fromMap(res);
  }
}

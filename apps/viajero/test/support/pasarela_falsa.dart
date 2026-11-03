import 'dart:async';

import 'package:diverso_core/diverso_core.dart';

/// [PaymentGateway] sin Wompi ni Supabase para pruebas de los view models del pago.
///
/// `verificar` responde en orden con [respuestas] (un [PagoVerificado] o un error que se lanza);
/// cuando se acaban repite la última.
class PasarelaFalsa implements PaymentGateway {
  PasarelaFalsa([this.respuestas = const []]);

  final List<Object> respuestas;

  /// Si no es null, `verificar` espera a que se complete (respuestas tardías).
  Completer<void>? compuerta;

  /// Error que lanza `iniciar` (por defecto, nada: las pruebas no abren el WebView de Wompi).
  Object falloAlIniciar = UnimplementedError();

  final verificaciones = <({String? transaccion, String? reserva})>[];
  final iniciadas = <String>[];

  @override
  Future<PagoVerificado> verificar({String? transactionId, String? bookingId}) async {
    verificaciones.add((transaccion: transactionId, reserva: bookingId));
    await compuerta?.future;
    final i = verificaciones.length - 1;
    final respuesta = respuestas[i < respuestas.length ? i : respuestas.length - 1];
    if (respuesta is PagoVerificado) return respuesta;
    throw respuesta;
  }

  @override
  Future<CheckoutIniciado> iniciar({required String bookingId, required String redirectUrl}) async {
    iniciadas.add(bookingId);
    throw falloAlIniciar;
  }
}

/// Resultado de `pagos-verificar` de la reserva `res-1` para las pruebas.
PagoVerificado pagoDePrueba(
  EstadoPago estado, [
  BookingStatus reserva = BookingStatus.confirmada,
]) => PagoVerificado(
  estado: estado,
  metodo: PaymentMethodOption.tarjeta,
  referencia: 'DIV-ABC123-1',
  bookingId: 'res-1',
  codigo: 'DIV-ABC123',
  bookingEstado: reserva,
);

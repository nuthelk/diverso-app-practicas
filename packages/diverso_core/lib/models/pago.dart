import 'enums.dart';

/// Respuesta de `pagos-iniciar`: dónde pagar en Wompi (sandbox) y hasta cuándo.
class CheckoutIniciado {
  CheckoutIniciado({
    required this.checkoutUrl,
    required this.referencia,
    required this.amountInCents,
    required this.expiraAt,
  });

  final String checkoutUrl;
  final String referencia;
  final int amountInCents;
  final DateTime expiraAt;

  double get monto => amountInCents / 100;

  factory CheckoutIniciado.fromMap(Map<String, dynamic> map) => CheckoutIniciado(
        checkoutUrl: map['checkout_url'] as String,
        referencia: map['referencia'] as String,
        amountInCents: (map['amount_in_cents'] as num).toInt(),
        expiraAt: DateTime.parse(map['expira_at'] as String).toUtc(),
      );
}

/// `estado_pago` de `pagos-verificar`.
enum EstadoPago { aprobado, rechazado, pendiente, error }

/// Respuesta de `pagos-verificar`: cómo quedó el pago y la reserva.
class PagoVerificado {
  PagoVerificado({
    required this.estado,
    required this.referencia,
    required this.bookingId,
    required this.codigo,
    required this.bookingEstado,
    this.metodo,
  });

  final EstadoPago estado;
  final PaymentMethodOption? metodo;
  final String? referencia;
  final String bookingId;
  final String codigo;
  final BookingStatus bookingEstado;

  factory PagoVerificado.fromMap(Map<String, dynamic> map) {
    final booking = (map['booking'] as Map).cast<String, dynamic>();
    final metodo = map['metodo'] as String?;
    return PagoVerificado(
      estado: enumFromString(EstadoPago.values, map['estado_pago'] as String?) ?? EstadoPago.error,
      metodo: metodo == null ? null : (enumFromString(PaymentMethodOption.values, metodo) ?? PaymentMethodOption.otro),
      referencia: map['referencia'] as String?,
      bookingId: booking['id'] as String,
      codigo: booking['codigo'] as String,
      bookingEstado: _estadoReserva(booking['estado'] as String?),
    );
  }

  /// El servidor usa `pendiente_pago`; el enum de Dart, `pendientePago`.
  static BookingStatus _estadoReserva(String? valor) {
    if (valor == 'pendiente_pago') return BookingStatus.pendientePago;
    return enumFromString(BookingStatus.values, valor) ?? BookingStatus.pendientePago;
  }

  /// Texto para el viajero según el resultado de la verificación.
  String get mensajeUsuario {
    switch (estado) {
      case EstadoPago.aprobado:
        return '¡Pago de prueba aprobado! Tu reserva está confirmada.';
      case EstadoPago.rechazado:
        return 'Wompi rechazó el pago de prueba (fondos, datos o el resultado del banco). '
            'Puedes intentar de nuevo mientras tu reserva siga vigente (30 minutos).';
      case EstadoPago.error:
        return 'Wompi no pudo procesar el pago de prueba. '
            'Puedes intentar de nuevo mientras tu reserva siga vigente (30 minutos).';
      case EstadoPago.pendiente:
        return 'Tu pago de prueba sigue pendiente. Te avisaremos en Mis reservas cuando Wompi lo confirme.';
    }
  }
}

import 'package:supabase_flutter/supabase_flutter.dart';

import '../models/booking.dart';
import '../models/enums.dart';

/// Error de dominio con código estable para mostrar mensajes de la app.
class DiversoException implements Exception {
  DiversoException(this.codigo, [this.mensaje]);

  /// SIN_CUPO, ESTADO_INVALIDO, NO_ES_DUENO, ...
  final String codigo;
  final String? mensaje;

  factory DiversoException.fromPostgrest(Object error) {
    if (error is PostgrestException) {
      // Las RPC elevan raise exception 'CODIGO'; PostgREST lo devuelve en message.
      final msg = error.message.trim();
      final conocidos = [
        'SIN_CUPO',
        'PAX_INVALIDO',
        'NO_AUTENTICADO',
        'FECHA_NO_EXISTE',
        'PLAN_NO_PUBLICADO',
        'RESERVA_NO_EXISTE',
        'ESTADO_INVALIDO',
        'NO_ES_DUENO',
        'RESERVA_INVALIDA',
        'AGENCIA_NO_VERIFICADA',
        'AGENCIA_NO_HABILITADA',
        'FECHA_PASADA',
        'RNT_VENCIDO',
      ];
      for (final c in conocidos) {
        if (msg.contains(c)) return DiversoException(c, msg);
      }
      return DiversoException('ERROR_BD', msg);
    }
    return DiversoException('ERROR_INESPERADO', error.toString());
  }

  String get mensajeUsuario {
    switch (codigo) {
      case 'SIN_CUPO':
        return 'Se acabaron los cupos para esa fecha. Prueba otra fecha u otro plan.';
      case 'ESTADO_INVALIDO':
        return 'La reserva ya no admite esta operación.';
      case 'NO_ES_DUENO':
        return 'Esta reserva no te pertenece.';
      case 'AGENCIA_NO_VERIFICADA':
        return 'La agencia debe estar verificada para publicar planes.';
      case 'AGENCIA_NO_HABILITADA':
      case 'RNT_VENCIDO':
        return 'Esta agencia no está habilitada para vender en este momento '
            '(verificación o RNT pendiente). Elige otro plan.';
      case 'FECHA_PASADA':
        return 'Esa fecha ya pasó. Elige una salida próxima.';
      case 'PLAN_NO_PUBLICADO':
        return 'Este plan ya no está disponible.';
      case 'ERROR_BD':
        return 'Error de conexión. Revisa tu internet e intenta de nuevo.';
      default:
        return 'Algo salió mal ($codigo). Intenta de nuevo.';
    }
  }

  @override
  String toString() => 'DiversoException($codigo): $mensaje';
}

class BookingService {
  SupabaseClient get _client => Supabase.instance.client;

  /// Crea la reserva decrementando cupos de forma atómica en el servidor.
  /// Devuelve el id de la reserva en estado pendiente_pago.
  Future<CreatedBooking> crearReserva({
    required String planDateId,
    required int pax,
  }) async {
    try {
      final res = await _client.rpc('create_booking', params: {
        'p_plan_date_id': planDateId,
        'p_pax': pax,
      });
      final map = (res as Map).cast<String, dynamic>();
      return CreatedBooking(
        bookingId: map['booking_id'] as String,
        codigo: map['codigo'] as String,
        montoTotal: (map['monto_total'] as num).toDouble(),
        planTitulo: map['plan_titulo'] as String? ?? '',
        fecha: map['fecha'] == null ? null : DateTime.parse(map['fecha'].toString()),
      );
    } catch (e) {
      throw DiversoException.fromPostgrest(e);
    }
  }

  /// Reservas del viajero autenticado con plan, agencia y pagos embebidos.
  Future<List<Booking>> misReservas() async {
    final uid = Supabase.instance.client.auth.currentUser?.id;
    if (uid == null) return const [];
    final res = await _client
        .from('bookings')
        .select(
          '*, plan_date:plan_dates(*, plan:plans(*, agency:agencies(*))), payments(*)',
        )
        .eq('viajero_id', uid)
        .order('created_at', ascending: false);

    final bookings =
        res.map((e) => Booking.fromMap((e as Map).cast<String, dynamic>())).toList();

    // Marca cuáles ya tienen reseña (habilita el botón en las que no).
    if (bookings.isNotEmpty) {
      final resenas = await _client
          .from('reviews')
          .select('booking_id')
          .eq('viajero_id', uid);
      final conResena = resenas.map((e) => e['booking_id'] as String).toSet();
      return bookings
          .map((b) => b.tieneResena || conResena.contains(b.id)
              ? _conResena(b)
              : b)
          .toList();
    }
    return bookings;
  }

  Booking _conResena(Booking b) => Booking(
        id: b.id,
        codigo: b.codigo,
        planDateId: b.planDateId,
        viajeroId: b.viajeroId,
        pax: b.pax,
        montoTotal: b.montoTotal,
        estado: b.estado,
        createdAt: b.createdAt,
        planDate: b.planDate,
        plan: b.plan,
        payments: b.payments,
        tieneResena: true,
      );

  Future<void> cancelar(String bookingId) async {
    try {
      await _client.rpc('cancel_booking', params: {'p_booking_id': bookingId});
    } catch (e) {
      throw DiversoException.fromPostgrest(e);
    }
  }
}

class CreatedBooking {
  CreatedBooking({
    required this.bookingId,
    required this.codigo,
    required this.montoTotal,
    required this.planTitulo,
    this.fecha,
  });

  final String bookingId;
  final String codigo;
  final double montoTotal;
  final String planTitulo;
  final DateTime? fecha;
}

/// Resultado del pago confirmado.
class PaymentResult {
  PaymentResult({
    required this.paymentId,
    required this.referencia,
    required this.codigo,
    required this.monto,
  });

  final String paymentId;
  final String referencia;
  final String codigo;
  final double monto;

  factory PaymentResult.fromRpc(Map<String, dynamic> map) => PaymentResult(
        paymentId: map['payment_id'] as String,
        referencia: map['referencia'] as String,
        codigo: map['codigo'] as String,
        monto: (map['monto'] as num?)?.toDouble() ?? 0,
      );
}

/// Abstracción de pasarela de pago (Anexo 6: pagos locales seguros).
///
/// El MVP usa [SimulatedPaymentGateway]: confirma vía RPC `confirm_payment`
/// con provider='simulado'. La integración real (Wompi/PayU sandbox) implementa
/// esta misma interfaz: crea la intención de pago, redirige/abre el medio y su
/// webhook termina llamando la misma RPC con simulated=false.
abstract class PaymentGateway {
  String get provider;
  bool get esSimulado;

  Future<PaymentResult> pagar({
    required String bookingId,
    required PaymentMethodOption metodo,
  });
}

class SimulatedPaymentGateway implements PaymentGateway {
  SimulatedPaymentGateway({this.latenciaSimulada = const Duration(milliseconds: 1800)});

  /// Tiempo de "procesamiento" para que la UX refleje un checkout real.
  final Duration latenciaSimulada;

  @override
  String get provider => 'simulado';

  @override
  bool get esSimulado => true;

  @override
  Future<PaymentResult> pagar({
    required String bookingId,
    required PaymentMethodOption metodo,
  }) async {
    await Future.delayed(latenciaSimulada);
    try {
      final res = await Supabase.instance.client.rpc('confirm_payment', params: {
        'p_booking_id': bookingId,
        'p_metodo': metodo.name,
      });
      return PaymentResult.fromRpc((res as Map).cast<String, dynamic>());
    } catch (e) {
      throw DiversoException.fromPostgrest(e);
    }
  }
}

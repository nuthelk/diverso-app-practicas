import 'package:supabase_flutter/supabase_flutter.dart';

import '../models/booking.dart';
import '../models/reembolso.dart';
import 'edge_functions.dart';

/// Error de dominio con código estable para mostrar mensajes de la app.
class DiversoException implements Exception {
  DiversoException(this.codigo, [this.mensaje, this.detalle]);

  /// SIN_CUPO, ESTADO_INVALIDO, NO_ES_DUENO, ...
  final String codigo;
  final String? mensaje;

  /// Cuerpo completo del error de una Edge Function (p. ej. `estado_pago`, `reembolso`).
  final Map<String, dynamic>? detalle;

  /// Errores de las Edge Functions: `{error, mensaje, ...}` con HTTP 4xx/5xx.
  factory DiversoException.fromFunction(FunctionException e) {
    final d = e.details;
    if (d is Map && d['error'] is String) {
      return DiversoException(
        d['error'] as String,
        d['mensaje'] as String?,
        d.cast<String, dynamic>(),
      );
    }
    if (e.status == 0) return DiversoException('SIN_CONEXION', e.details?.toString());
    if (e.status >= 500) return DiversoException('ERROR_SERVIDOR', e.details?.toString());
    return DiversoException('ERROR_FUNCION', e.details?.toString());
  }

  /// Pago aprobado por Wompi cuando la reserva ya había vencido: se reembolsa solo.
  bool get aprobadoTarde => detalle?['estado_pago'] == 'aprobado_tarde';

  factory DiversoException.fromPostgrest(Object error) {
    if (error is PostgrestException) {
      // Las RPC elevan raise exception 'CODIGO'; PostgREST lo devuelve en message.
      final msg = error.message.trim();
      // `raise exception 'RESERVA_PENDIENTE_EXISTENTE' using detail = <id de la reserva existente>`.
      if (msg.contains('RESERVA_PENDIENTE_EXISTENTE')) {
        final id = error.details?.toString();
        return DiversoException(
          'RESERVA_PENDIENTE_EXISTENTE',
          msg,
          id == null || id.isEmpty ? null : {'booking_id': id},
        );
      }
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
        'FECHA_YA_SALIO',
        'RESERVA_YA_SALIO',
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
      case 'FECHA_YA_SALIO':
        return 'Esta salida ya partió. Elige otra fecha.';
      case 'PLAN_NO_PUBLICADO':
        return 'Este plan ya no está disponible.';
      case 'RESERVA_PENDIENTE_EXISTENTE':
        return 'Ya tienes una reserva pendiente de pago para esta fecha. Complétala o cancélala para empezar de nuevo.';
      case 'RESERVA_YA_SALIO':
        return 'Este viaje ya salió, así que la reserva ya no se puede pagar ni cancelar.';
      case 'RESERVA_NO_EXISTE':
        return 'No encontramos esa reserva.';
      case 'NO_AUTENTICADO':
        return 'Tu sesión expiró. Inicia sesión de nuevo.';
      case 'RESERVA_VENCIDA':
        if (aprobadoTarde) {
          final estado = EstadoReembolsoX.desdeServidor(detalle?['reembolso'] as String?);
          final texto = estado == EstadoReembolso.noAplica ? 'en proceso' : estado.name;
          return 'Tu pago llegó cuando la reserva ya había vencido, así que no se confirmó. '
              'Te lo devolvemos automáticamente (reembolso de prueba $texto).';
        }
        return 'Tu reserva venció (los cupos se retienen 30 minutos). Vuelve a reservar.';
      case 'REDIRECT_NO_PERMITIDO':
        return 'Esta dirección de la app no está autorizada para pagos de prueba.';
      case 'MONTO_NO_COINCIDE':
        return 'El monto de la transacción no coincide con el de tu reserva, así que no la confirmamos. '
            'Contacta a soporte con tu referencia.';
      case 'TRANSACCION_NO_EXISTE':
      case 'REFERENCIA_DESCONOCIDA':
        return 'No encontramos ese pago. Si ya pagaste, toca «Ya pagué, verificar» en Mis reservas.';
      case 'WOMPI_NO_DISPONIBLE':
        return 'Wompi no está disponible en este momento. Intenta de nuevo en unos minutos.';
      case 'WOMPI_NO_AUTORIZADO':
        return 'La pasarela de prueba rechazó las credenciales configuradas. Avisa al equipo de Diverso.';
      case 'SOLO_MODO_PRUEBA':
        return 'La pasarela de prueba no está configurada.';
      case 'SIN_CONEXION':
        return 'Sin conexión con el servidor. Revisa tu internet e intenta de nuevo.';
      case 'ERROR_SERVIDOR':
      case 'ERROR_INTERNO':
      case 'CONFIG_SUPABASE':
      case 'SERVICIO_NO_DISPONIBLE':
        return 'El servidor tuvo un problema. Intenta de nuevo en un momento.';
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
  BookingService({FunctionInvoker? invocar}) : _invocar = invocar ?? invocarEdgeFunction;

  final FunctionInvoker _invocar;

  SupabaseClient get _client => Supabase.instance.client;

  /// Reserva con plan, agencia, pagos y reembolsos embebidos. Los reembolsos se piden con
  /// columnas explícitas: `refunds(*)` falla con 403 porque `raw` no se concede al viajero.
  static const _seleccionReserva =
      '*, plan_date:plan_dates(*, plan:plans(*, agency:agencies(*))), payments(*), '
      'refunds(${Refund.columnas})';

  /// Crea la reserva decrementando cupos de forma atómica en el servidor.
  /// Devuelve el id de la reserva en estado pendiente_pago.
  Future<CreatedBooking> crearReserva({required String planDateId, required int pax}) async {
    try {
      final res = await _client.rpc(
        'create_booking',
        params: {'p_plan_date_id': planDateId, 'p_pax': pax},
      );
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
        .select(_seleccionReserva)
        .eq('viajero_id', uid)
        .order('created_at', ascending: false);

    final bookings = res.map((e) => Booking.fromMap((e as Map).cast<String, dynamic>())).toList();

    // Marca cuáles ya tienen reseña (habilita el botón en las que no).
    if (bookings.isNotEmpty) {
      final resenas = await _client.from('reviews').select('booking_id').eq('viajero_id', uid);
      final conResena = resenas.map((e) => e['booking_id'] as String).toSet();
      return bookings
          .map((b) => b.tieneResena || conResena.contains(b.id) ? b.conResena() : b)
          .toList();
    }
    return bookings;
  }

  /// Una reserva propia cargada del backend (confirmación `/reserva/:bookingId` y detalle
  /// `/reservas/:bookingId`), marcada si ya tiene reseña.
  Future<Booking> reserva(String bookingId) async {
    try {
      final res = await _client
          .from('bookings')
          .select(_seleccionReserva)
          .eq('id', bookingId)
          .maybeSingle();
      if (res == null) throw DiversoException('RESERVA_NO_EXISTE');
      final booking = Booking.fromMap(res);
      // Igual que en misReservas: sin esto, el detalle cargado en frío ofrecería «Reseñar» de nuevo.
      final resena = await _client
          .from('reviews')
          .select('id')
          .eq('booking_id', bookingId)
          .maybeSingle();
      return resena == null ? booking : booking.conResena();
    } on DiversoException {
      rethrow;
    } catch (e) {
      throw DiversoException.fromPostgrest(e);
    }
  }

  /// Reserva propia de esta fecha que sigue pendiente de pago y con la retención vigente, si
  /// existe. El checkout la reutiliza en vez de crear otra (que retendría cupos dos veces).
  Future<Booking?> reservaPendiente(String planDateId) async {
    final uid = _client.auth.currentUser?.id;
    if (uid == null) return null;
    try {
      final desde = DateTime.now().toUtc().subtract(Booking.retencion);
      final res = await _client
          .from('bookings')
          .select()
          .eq('viajero_id', uid)
          .eq('plan_date_id', planDateId)
          .eq('estado', 'pendiente_pago')
          .gt('created_at', desde.toIso8601String())
          .order('created_at', ascending: false)
          .limit(1);
      return res.isEmpty ? null : Booking.fromMap(res.first);
    } catch (e) {
      throw DiversoException.fromPostgrest(e);
    }
  }

  /// Reembolso que daría la política del plan si se cancelara AHORA (solo lectura).
  Future<VistaPreviaCancelacion> vistaPreviaCancelacion(String bookingId) async {
    try {
      final res = await _client.rpc(
        'vista_previa_cancelacion',
        params: {'p_booking_id': bookingId},
      );
      return VistaPreviaCancelacion.fromMap((res as Map).cast<String, dynamic>());
    } catch (e) {
      throw DiversoException.fromPostgrest(e);
    }
  }

  /// Cancela con la política del plan (Edge Function `reservas-cancelar`, que también pide
  /// el reembolso de prueba a Wompi). Es idempotente.
  Future<ResultadoCancelacion> cancelar(String bookingId) async {
    final res = await llamarEdgeFunction(_invocar, 'reservas-cancelar', {'booking_id': bookingId});
    return ResultadoCancelacion.fromMap(res);
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

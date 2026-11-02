import 'package:supabase_flutter/supabase_flutter.dart';

import '../../models/enums.dart';
import '../../models/reembolso.dart';

/// Acceso crudo a las reservas en Supabase: devuelve filas (mapas) y deja los errores de
/// PostgREST tal cual; el mapeo a modelos y la traducción de errores son del repositorio.
class BookingApi {
  BookingApi({required SupabaseClient client}) : _client = client;

  final SupabaseClient _client;

  /// Reserva con plan, agencia, pagos y reembolsos embebidos. Los reembolsos se piden con
  /// columnas explícitas: `refunds(*)` falla con 403 porque `raw` no se concede al viajero.
  static const _seleccionReserva =
      '*, plan_date:plan_dates(*, plan:plans(*, agency:agencies(*))), payments(*), '
      'refunds(${Refund.columnas})';

  /// Id del usuario con sesión, o null.
  String? get usuarioId => _client.auth.currentUser?.id;

  /// `create_booking`: decrementa cupos de forma atómica en el servidor.
  Future<Map<String, dynamic>> crearReserva({required String planDateId, required int pax}) async {
    final res = await _client.rpc(
      'create_booking',
      params: {'p_plan_date_id': planDateId, 'p_pax': pax},
    );
    return (res as Map).cast<String, dynamic>();
  }

  /// Reservas del viajero, la más reciente primero.
  Future<List<Map<String, dynamic>>> reservasDe(String viajeroId) => _client
      .from('bookings')
      .select(_seleccionReserva)
      .eq('viajero_id', viajeroId)
      .order('created_at', ascending: false);

  /// `booking_id` de las reseñas que ya publicó el viajero.
  Future<List<Map<String, dynamic>>> resenasDe(String viajeroId) =>
      _client.from('reviews').select('booking_id').eq('viajero_id', viajeroId);

  Future<Map<String, dynamic>?> reserva(String bookingId) =>
      _client.from('bookings').select(_seleccionReserva).eq('id', bookingId).maybeSingle();

  /// La reseña de la reserva, si existe.
  Future<Map<String, dynamic>?> resenaDe(String bookingId) =>
      _client.from('reviews').select('id').eq('booking_id', bookingId).maybeSingle();

  /// La reserva más reciente del viajero para esa fecha que sigue `pendiente_pago` y se creó
  /// después de [creadaDespuesDe].
  Future<List<Map<String, dynamic>>> pendientesDe({
    required String viajeroId,
    required String planDateId,
    required DateTime creadaDespuesDe,
  }) => _client
      .from('bookings')
      .select()
      .eq('viajero_id', viajeroId)
      .eq('plan_date_id', planDateId)
      .eq('estado', BookingStatus.pendientePago.db)
      .gt('created_at', creadaDespuesDe.toIso8601String())
      .order('created_at', ascending: false)
      .limit(1);

  /// `vista_previa_cancelacion`: solo lectura.
  Future<Map<String, dynamic>> vistaPreviaCancelacion(String bookingId) async {
    final res = await _client.rpc('vista_previa_cancelacion', params: {'p_booking_id': bookingId});
    return (res as Map).cast<String, dynamic>();
  }
}

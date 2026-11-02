import '../../errors/diverso_exception.dart';
import '../../models/booking.dart';
import '../../models/created_booking.dart';
import '../../models/reembolso.dart';
import '../services/booking_api.dart';
import '../services/edge_functions_api.dart';
import 'llamar_edge_function.dart';

class BookingRepository {
  BookingRepository({required BookingApi api, required EdgeFunctionsApi edgeFunctions})
    : _api = api,
      _edgeFunctions = edgeFunctions;

  final BookingApi _api;
  final EdgeFunctionsApi _edgeFunctions;

  /// Crea la reserva decrementando cupos de forma atómica en el servidor.
  /// Devuelve el id de la reserva en estado pendiente_pago.
  Future<CreatedBooking> crearReserva({required String planDateId, required int pax}) async {
    try {
      final map = await _api.crearReserva(planDateId: planDateId, pax: pax);
      return CreatedBooking(
        bookingId: map['booking_id'] as String,
        codigo: map['codigo'] as String,
        montoTotal: (map['monto_total'] as num).toDouble(),
        planTitulo: map['plan_titulo'] as String? ?? '',
        fecha: map['fecha'] == null ? null : DateTime.parse(map['fecha'].toString()),
      );
    } on Object catch (e) {
      throw DiversoException.fromPostgrest(e);
    }
  }

  /// Reservas del viajero autenticado con plan, agencia y pagos embebidos.
  Future<List<Booking>> misReservas() async {
    final uid = _api.usuarioId;
    if (uid == null) return const [];
    final bookings = (await _api.reservasDe(uid)).map(Booking.fromMap).toList();

    // Marca cuáles ya tienen reseña (habilita el botón en las que no).
    if (bookings.isNotEmpty) {
      final resenas = await _api.resenasDe(uid);
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
      final res = await _api.reserva(bookingId);
      if (res == null) throw DiversoException('RESERVA_NO_EXISTE');
      final booking = Booking.fromMap(res);
      // Igual que en misReservas: sin esto, el detalle cargado en frío ofrecería «Reseñar» de nuevo.
      final resena = await _api.resenaDe(bookingId);
      return resena == null ? booking : booking.conResena();
    } on DiversoException {
      rethrow;
    } on Object catch (e) {
      throw DiversoException.fromPostgrest(e);
    }
  }

  /// Reserva propia de esta fecha que sigue pendiente de pago y con la retención vigente, si
  /// existe. El checkout la reutiliza en vez de crear otra (que retendría cupos dos veces).
  Future<Booking?> reservaPendiente(String planDateId) async {
    final uid = _api.usuarioId;
    if (uid == null) return null;
    try {
      final desde = DateTime.now().toUtc().subtract(Booking.retencion);
      final res = await _api.pendientesDe(
        viajeroId: uid,
        planDateId: planDateId,
        creadaDespuesDe: desde,
      );
      return res.isEmpty ? null : Booking.fromMap(res.first);
    } on Object catch (e) {
      throw DiversoException.fromPostgrest(e);
    }
  }

  /// Reembolso que daría la política del plan si se cancelara AHORA (solo lectura).
  Future<VistaPreviaCancelacion> vistaPreviaCancelacion(String bookingId) async {
    try {
      return VistaPreviaCancelacion.fromMap(await _api.vistaPreviaCancelacion(bookingId));
    } on Object catch (e) {
      throw DiversoException.fromPostgrest(e);
    }
  }

  /// Cancela con la política del plan (Edge Function `reservas-cancelar`, que también pide
  /// el reembolso de prueba a Wompi). Es idempotente.
  Future<ResultadoCancelacion> cancelar(String bookingId) async {
    final res = await llamarEdgeFunction(_edgeFunctions, 'reservas-cancelar', {
      'booking_id': bookingId,
    });
    return ResultadoCancelacion.fromMap(res);
  }
}

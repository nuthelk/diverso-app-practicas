import 'enums.dart';
import 'plan.dart';

class Payment {
  Payment({
    required this.id,
    required this.bookingId,
    required this.metodo,
    required this.estado,
    required this.monto,
    required this.referencia,
    required this.provider,
    required this.simulated,
  });

  final String id;
  final String bookingId;
  final PaymentMethodOption metodo;
  final PaymentStatus estado;
  final double monto;
  final String referencia;
  final String provider;
  final bool simulated;

  factory Payment.fromMap(Map<String, dynamic> map) => Payment(
        id: map['id'] as String,
        bookingId: map['booking_id'] as String,
        metodo: enumFromString(PaymentMethodOption.values, map['metodo'] as String?) ??
            PaymentMethodOption.pse,
        estado: enumFromString(PaymentStatus.values, map['estado'] as String?) ??
            PaymentStatus.pendiente,
        monto: (map['monto'] as num?)?.toDouble() ?? 0,
        referencia: (map['referencia'] as String?) ?? '',
        provider: (map['provider'] as String?) ?? 'simulado',
        simulated: (map['simulated'] as bool?) ?? true,
      );
}

class Booking {
  Booking({
    required this.id,
    required this.codigo,
    required this.planDateId,
    required this.viajeroId,
    required this.pax,
    required this.montoTotal,
    required this.estado,
    required this.createdAt,
    this.planDate,
    this.plan,
    this.payments = const [],
    this.tieneResena = false,
  });

  final String id;
  final String codigo;
  final String planDateId;
  final String viajeroId;
  final int pax;
  final double montoTotal;
  final BookingStatus estado;
  final DateTime createdAt;
  final PlanDate? planDate;
  final Plan? plan;
  final List<Payment> payments;
  final bool tieneResena;

  Payment? get pago => payments.isEmpty ? null : payments.first;

  bool get esFutura =>
      planDate != null &&
      planDate!.fecha.isAfter(DateTime.now().add(const Duration(days: 1)));

  /// Una reseña solo es posible si el viaje ya ocurrió, la reserva está
  /// confirmada/completada y aún no se reseñó (RLS lo respalda en el servidor).
  bool get puedeResenar =>
      (estado == BookingStatus.confirmada || estado == BookingStatus.completada) &&
      !esFutura &&
      !tieneResena;

  factory Booking.fromMap(Map<String, dynamic> map) {
    final pd = map['plan_date'];
    final pays = map['payments'];
    final PlanDate? planDate =
        pd is Map ? PlanDate.fromMap(pd.cast<String, dynamic>()) : null;
    final planMap = pd is Map ? pd['plans'] : null;
    return Booking(
      id: map['id'] as String,
      codigo: map['codigo'] as String,
      planDateId: map['plan_date_id'] as String,
      viajeroId: map['viajero_id'] as String,
      pax: (map['pax'] as num).toInt(),
      montoTotal: (map['monto_total'] as num?)?.toDouble() ?? 0,
      estado: enumFromString(BookingStatus.values, map['estado'] as String?) ??
          BookingStatus.pendientePago,
      createdAt: DateTime.parse(map['created_at'] as String),
      planDate: planDate,
      plan: planMap is Map ? Plan.fromMap(planMap.cast<String, dynamic>()) : null,
      payments: pays is List
          ? pays.map((e) => Payment.fromMap((e as Map).cast<String, dynamic>())).toList()
          : const [],
    );
  }
}

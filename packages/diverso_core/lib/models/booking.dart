import 'enums.dart';
import 'plan.dart';
import 'reembolso.dart';

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

  /// «Pagado con Nequi · ref. DIV-1-1 (prueba)»: el piloto solo cobra en sandbox.
  String get textoReferencia => 'Pagado con ${metodo.label} · ref. $referencia (prueba)';

  factory Payment.fromMap(Map<String, dynamic> map) => Payment(
    id: map['id'] as String,
    bookingId: map['booking_id'] as String,
    metodo:
        enumFromDb(PaymentMethodOption.values, map['metodo'] as String?) ??
        PaymentMethodOption.otro,
    estado: enumFromDb(PaymentStatus.values, map['estado'] as String?) ?? PaymentStatus.pendiente,
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
    this.salidaAt,
    this.planDate,
    this.plan,
    this.payments = const [],
    this.refunds = const [],
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

  /// Salida congelada al reservar (`bookings.salida_at`): no cambia aunque la agencia edite el plan.
  final DateTime? salidaAt;
  final PlanDate? planDate;
  final Plan? plan;
  final List<Payment> payments;
  final List<Refund> refunds;
  final bool tieneResena;

  Payment? get pago => payments.isEmpty ? null : payments.first;

  /// Tiempo que se retienen los cupos de una reserva pendiente de pago (mismo valor que el servidor).
  static const retencion = Duration(minutes: 30);

  /// Momento en que vence la retención de cupos si no se paga.
  DateTime get venceAt => createdAt.add(retencion);

  /// Reembolso más reciente de la reserva (cancelación o pago tardío).
  Refund? get reembolso => refunds.isEmpty
      ? null
      : (refunds.toList()..sort((a, b) => b.createdAt.compareTo(a.createdAt))).first;

  /// Estado del reembolso para mostrar en la tarjeta de la reserva. Una reserva cancelada que
  /// sí se pagó y no tiene reembolso es «Sin reembolso»; una que nunca se pagó no muestra nada.
  String? get etiquetaReembolso {
    final r = reembolso;
    if (r != null) return r.etiqueta;
    if (estado == BookingStatus.cancelada && pago != null) return EstadoReembolso.noAplica.etiqueta;
    return null;
  }

  Booking conResena() => Booking(
    id: id,
    codigo: codigo,
    planDateId: planDateId,
    viajeroId: viajeroId,
    pax: pax,
    montoTotal: montoTotal,
    estado: estado,
    createdAt: createdAt,
    salidaAt: salidaAt,
    planDate: planDate,
    plan: plan,
    payments: payments,
    refunds: refunds,
    tieneResena: true,
  );

  /// Momento de la salida: la congelada de la reserva o, si falta, el inicio de la fecha del plan.
  DateTime? get salida => salidaAt ?? planDate?.fecha;

  /// El viaje aún no sale. [ahora] permite fijar el reloj; sin salida conocida no es futuro.
  bool esFutura([DateTime? ahora]) => salida?.isAfter(ahora ?? DateTime.now()) ?? false;

  /// Una reseña solo es posible si el viaje ya salió, la reserva está confirmada/completada
  /// y aún no se reseñó (RLS lo respalda en el servidor).
  bool puedeResenar([DateTime? ahora]) =>
      (estado == BookingStatus.confirmada || estado == BookingStatus.completada) &&
      salida != null &&
      !esFutura(ahora) &&
      !tieneResena;

  factory Booking.fromMap(Map<String, dynamic> map) {
    final pd = map['plan_date'];
    final pays = map['payments'];
    final refs = map['refunds'];
    final PlanDate? planDate = pd is Map ? PlanDate.fromMap(pd.cast<String, dynamic>()) : null;
    final planMap = pd is Map ? pd['plan'] : null;
    return Booking(
      id: map['id'] as String,
      codigo: map['codigo'] as String,
      planDateId: map['plan_date_id'] as String,
      viajeroId: map['viajero_id'] as String,
      pax: (map['pax'] as num).toInt(),
      montoTotal: (map['monto_total'] as num?)?.toDouble() ?? 0,
      estado:
          enumFromDb(BookingStatus.values, map['estado'] as String?) ?? BookingStatus.pendientePago,
      createdAt: DateTime.parse(map['created_at'] as String),
      salidaAt: map['salida_at'] == null ? null : DateTime.parse(map['salida_at'] as String),
      planDate: planDate,
      plan: planMap is Map ? Plan.fromMap(planMap.cast<String, dynamic>()) : null,
      payments: pays is List
          ? pays.map((e) => Payment.fromMap((e as Map).cast<String, dynamic>())).toList()
          : const [],
      refunds: refs is List
          ? refs.map((e) => Refund.fromMap((e as Map).cast<String, dynamic>())).toList()
          : const [],
    );
  }
}

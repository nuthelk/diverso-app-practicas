/// Fila de la vista de conciliación agency_sales.
class VentaRow {
  VentaRow({
    required this.codigo,
    required this.planTitulo,
    required this.destino,
    required this.fecha,
    required this.pax,
    required this.montoTotal,
    required this.comision,
    required this.saldoAgencia,
    required this.bookingEstado,
    required this.pagoEstado,
    required this.provider,
    required this.referencia,
  });

  final String codigo;
  final String planTitulo;
  final String destino;
  final DateTime fecha;
  final int pax;
  final double montoTotal;
  final double comision;
  final double saldoAgencia;
  final String bookingEstado;
  final String? pagoEstado;
  final String? provider;
  final String? referencia;

  factory VentaRow.fromMap(Map<String, dynamic> map) => VentaRow(
    codigo: map['codigo'] as String,
    planTitulo: map['plan_titulo'] as String? ?? '',
    destino: map['destino'] as String? ?? '',
    fecha: DateTime.parse(map['fecha'] as String),
    pax: (map['pax'] as num?)?.toInt() ?? 0,
    montoTotal: (map['monto_total'] as num?)?.toDouble() ?? 0,
    comision: (map['comision'] as num?)?.toDouble() ?? 0,
    saldoAgencia: (map['saldo_agencia'] as num?)?.toDouble() ?? 0,
    bookingEstado: map['booking_estado'] as String? ?? '',
    pagoEstado: map['pago_estado'] as String?,
    provider: map['provider'] as String?,
    referencia: map['referencia'] as String?,
  );
}

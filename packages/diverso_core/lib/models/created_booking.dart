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

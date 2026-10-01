class Review {
  Review({
    required this.id,
    required this.bookingId,
    required this.planId,
    required this.viajeroId,
    required this.calificacion,
    required this.createdAt,
    this.comentario,
    this.viajeroNombre,
  });

  final String id;
  final String bookingId;
  final String planId;
  final String viajeroId;
  final int calificacion;
  final String? comentario;
  final DateTime createdAt;
  final String? viajeroNombre;

  factory Review.fromMap(Map<String, dynamic> map) {
    final profile = map['profiles'];
    return Review(
      id: map['id'] as String,
      bookingId: map['booking_id'] as String,
      planId: map['plan_id'] as String,
      viajeroId: map['viajero_id'] as String,
      calificacion: (map['calificacion'] as num).toInt(),
      comentario: map['comentario'] as String?,
      createdAt: DateTime.parse(map['created_at'] as String),
      viajeroNombre: profile is Map ? (profile['nombre'] as String?) : null,
    );
  }
}

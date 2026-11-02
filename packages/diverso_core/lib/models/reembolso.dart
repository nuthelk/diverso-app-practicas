import '../utils/formatters.dart';

/// Estado de un reembolso de prueba (tabla `refunds` / respuesta de `reservas-cancelar`).
enum EstadoReembolso { aprobado, pendiente, rechazado, noAplica }

extension EstadoReembolsoX on EstadoReembolso {
  String get etiqueta {
    switch (this) {
      case EstadoReembolso.aprobado:
        return 'Reembolso de prueba aprobado';
      case EstadoReembolso.pendiente:
        return 'Reembolso de prueba pendiente';
      case EstadoReembolso.rechazado:
        return 'Reembolso de prueba rechazado';
      case EstadoReembolso.noAplica:
        return 'Sin reembolso';
    }
  }

  static EstadoReembolso desdeServidor(String? valor) {
    switch (valor) {
      case 'aprobado':
        return EstadoReembolso.aprobado;
      case 'pendiente':
        return EstadoReembolso.pendiente;
      case 'rechazado':
        return EstadoReembolso.rechazado;
      default:
        return EstadoReembolso.noAplica;
    }
  }
}

/// Fila de `refunds` visible para el viajero (solo columnas explícitas: `raw` no se concede).
class Refund {
  Refund({
    required this.id,
    required this.bookingId,
    required this.monto,
    required this.porcentaje,
    required this.estado,
    required this.motivo,
    required this.createdAt,
  });

  /// Columnas que el viajero puede leer; el `select=*` de PostgREST devuelve 403.
  static const columnas = 'id, booking_id, monto, porcentaje, estado, origen, motivo, created_at';

  final String id;
  final String bookingId;
  final double monto;
  final int porcentaje;
  final EstadoReembolso estado;
  final String motivo;
  final DateTime createdAt;

  factory Refund.fromMap(Map<String, dynamic> map) => Refund(
    id: map['id'] as String,
    bookingId: map['booking_id'] as String,
    monto: (map['monto'] as num?)?.toDouble() ?? 0,
    porcentaje: (map['porcentaje'] as num?)?.toInt() ?? 0,
    estado: EstadoReembolsoX.desdeServidor(map['estado'] as String?),
    motivo: (map['motivo'] as String?) ?? '',
    createdAt: DateTime.parse(map['created_at'] as String),
  );

  /// «Reembolso de prueba aprobado · 50 % · $ 150.000».
  String get etiqueta => '${estado.etiqueta} · $porcentaje % · ${formatCOP(monto)}';
}

/// Respuesta de la RPC `vista_previa_cancelacion`: lo que daría cancelar AHORA.
class VistaPreviaCancelacion {
  VistaPreviaCancelacion({
    required this.aplica,
    required this.porcentaje,
    required this.monto,
    required this.horasAntes,
    required this.motivo,
  });

  final bool aplica;
  final int porcentaje;
  final double monto;
  final double horasAntes;
  final String motivo;

  factory VistaPreviaCancelacion.fromMap(Map<String, dynamic> map) => VistaPreviaCancelacion(
    aplica: map['aplica'] as bool? ?? false,
    porcentaje: (map['porcentaje'] as num?)?.toInt() ?? 0,
    monto: (map['monto'] as num?)?.toDouble() ?? 0,
    horasAntes: (map['horas_antes'] as num?)?.toDouble() ?? 0,
    motivo: (map['motivo'] as String?) ?? '',
  );
}

/// Respuesta de `reservas-cancelar` (`reembolso`).
class ResultadoCancelacion {
  ResultadoCancelacion({
    required this.aplica,
    required this.porcentaje,
    required this.monto,
    required this.estado,
    required this.motivo,
  });

  final bool aplica;
  final int porcentaje;
  final double monto;
  final EstadoReembolso estado;
  final String motivo;

  factory ResultadoCancelacion.fromMap(Map<String, dynamic> map) {
    final r = (map['reembolso'] as Map).cast<String, dynamic>();
    return ResultadoCancelacion(
      aplica: r['aplica'] as bool? ?? false,
      porcentaje: (r['porcentaje'] as num?)?.toInt() ?? 0,
      monto: (r['monto'] as num?)?.toDouble() ?? 0,
      estado: EstadoReembolsoX.desdeServidor(r['estado'] as String?),
      motivo: (r['motivo'] as String?) ?? '',
    );
  }
}

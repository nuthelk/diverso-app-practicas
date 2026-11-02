import 'package:supabase_flutter/supabase_flutter.dart';

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

  @override
  String toString() => 'DiversoException($codigo): $mensaje';
}

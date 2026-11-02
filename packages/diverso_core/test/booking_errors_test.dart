import 'package:diverso_core/diverso_core.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:supabase_flutter/supabase_flutter.dart' show PostgrestException;

/// `create_booking` rechaza una segunda reserva pendiente del mismo viajero para la misma fecha
/// con `raise exception 'RESERVA_PENDIENTE_EXISTENTE' using detail = <id de la existente>`.
void main() {
  group('DiversoException.fromPostgrest', () {
    test('RESERVA_PENDIENTE_EXISTENTE lleva el id de la reserva existente y un mensaje claro', () {
      final e = DiversoException.fromPostgrest(
        const PostgrestException(message: 'RESERVA_PENDIENTE_EXISTENTE', code: 'P0001', details: 'b0e1f2a3-0000-4000-8000-000000000001'),
      );
      expect(e.codigo, 'RESERVA_PENDIENTE_EXISTENTE');
      expect(e.detalle?['booking_id'], 'b0e1f2a3-0000-4000-8000-000000000001');
      expect(e.mensajeUsuario, contains('reserva pendiente'));
      expect(e.mensajeUsuario, contains('esta fecha'));
    });

    test('RESERVA_YA_SALIO (pagar o cancelar tras la salida) se reconoce y se explica', () {
      final e = DiversoException.fromPostgrest(const PostgrestException(message: 'RESERVA_YA_SALIO', code: 'P0001'));
      expect(e.codigo, 'RESERVA_YA_SALIO');
      expect(e.mensajeUsuario, 'Este viaje ya salió, así que la reserva ya no se puede pagar ni cancelar.');
      // También cuando llega desde la Edge Function con {error, mensaje}.
      expect(DiversoException('RESERVA_YA_SALIO').mensajeUsuario, contains('ya salió'));
    });

    test('PRESERVE: los códigos de antes se siguen reconociendo', () {
      final e = DiversoException.fromPostgrest(const PostgrestException(message: 'SIN_CUPO', code: 'P0001'));
      expect(e.codigo, 'SIN_CUPO');
      expect(e.detalle, isNull);
      expect(e.mensajeUsuario, contains('cupos'));
      expect(DiversoException.fromPostgrest(const PostgrestException(message: 'algo raro')).codigo, 'ERROR_BD');
    });
  });
}

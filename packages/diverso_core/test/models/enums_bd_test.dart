import 'package:diverso_core/diverso_core.dart';
import 'package:flutter_test/flutter_test.dart';

/// Cada enum que se lee de la BD (o de una Edge Function) debe reconocer TODOS los valores que el
/// servidor puede enviar, no solo los que casualmente coinciden con el nombre de Dart. Los valores
/// salen de los tipos `create type … as enum` de `supabase/migrations` (0001 y, para
/// `payment_method`, 0003) y de la respuesta de `pagos-verificar`.
void main() {
  group('enums leídos de la BD', () {
    void reconoce<T extends DbEnum>(String nombre, List<T> values, Map<String, T> bd) {
      test('$nombre: cada valor de la BD se reconoce', () {
        expect(bd.length, values.length, reason: 'la tabla debe cubrir todos los valores de Dart');
        bd.forEach((valor, esperado) {
          expect(enumFromDb(values, valor), esperado, reason: "'$valor'");
          expect(esperado.db, valor, reason: 'el valor que se escribe es el que se lee');
        });
        expect(enumFromDb(values, 'no_existe'), isNull);
        expect(enumFromDb(values, null), isNull);
      });
    }

    reconoce('user_role', UserRole.values, {
      'viajero': UserRole.viajero,
      'agencia': UserRole.agencia,
      'admin': UserRole.admin,
    });
    reconoce('verification_status', VerificationStatus.values, {
      'pendiente': VerificationStatus.pendiente,
      'verificado': VerificationStatus.verificado,
      'rechazado': VerificationStatus.rechazado,
    });
    reconoce('plan_status', PlanStatus.values, {
      'borrador': PlanStatus.borrador,
      'publicado': PlanStatus.publicado,
      'archivado': PlanStatus.archivado,
    });
    reconoce('booking_status', BookingStatus.values, {
      'pendiente_pago': BookingStatus.pendientePago,
      'confirmada': BookingStatus.confirmada,
      'cancelada': BookingStatus.cancelada,
      'completada': BookingStatus.completada,
    });
    reconoce('payment_method', PaymentMethodOption.values, {
      'pse': PaymentMethodOption.pse,
      'nequi': PaymentMethodOption.nequi,
      'daviplata': PaymentMethodOption.daviplata,
      'tarjeta': PaymentMethodOption.tarjeta,
      'bancolombia': PaymentMethodOption.bancolombia,
      'otro': PaymentMethodOption.otro,
    });
    reconoce('payment_status', PaymentStatus.values, {
      'pendiente': PaymentStatus.pendiente,
      'aprobado': PaymentStatus.aprobado,
      'rechazado': PaymentStatus.rechazado,
      'reembolsado': PaymentStatus.reembolsado,
    });
    reconoce('experience_category', ExperienceCategory.values, {
      'aventura': ExperienceCategory.aventura,
      'naturaleza': ExperienceCategory.naturaleza,
      'cultura': ExperienceCategory.cultura,
      'gastronomia': ExperienceCategory.gastronomia,
      'relax': ExperienceCategory.relax,
      'urbano': ExperienceCategory.urbano,
    });
    reconoce('estado_pago (pagos-verificar)', EstadoPago.values, {
      'aprobado': EstadoPago.aprobado,
      'rechazado': EstadoPago.rechazado,
      'pendiente': EstadoPago.pendiente,
      'error': EstadoPago.error,
    });
  });

  group('los modelos leen el valor de la BD', () {
    Map<String, dynamic> reserva(String estado) => {
      'id': 'b',
      'codigo': 'DIV-1',
      'plan_date_id': 'd',
      'viajero_id': 'v',
      'pax': 1,
      'monto_total': 100000,
      'estado': estado,
      'created_at': '2026-10-25T10:00:00+00:00',
    };

    test('Booking.fromMap: los cuatro estados de booking_status', () {
      for (final e in BookingStatus.values) {
        expect(Booking.fromMap(reserva(e.db)).estado, e);
      }
    });

    test('PRESERVE: un valor desconocido sigue cayendo en el valor por defecto', () {
      expect(Booking.fromMap(reserva('algo_nuevo')).estado, BookingStatus.pendientePago);
    });

    test('PagoVerificado.fromMap: estado de la reserva con pendiente_pago', () {
      PagoVerificado leer(String estado) => PagoVerificado.fromMap({
        'estado_pago': 'pendiente',
        'referencia': null,
        'booking': {'id': 'b', 'codigo': 'DIV-1', 'estado': estado},
      });
      for (final e in BookingStatus.values) {
        expect(leer(e.db).bookingEstado, e);
      }
    });
  });
}

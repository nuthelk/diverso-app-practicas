import 'package:diverso_core/diverso_core.dart';
import 'package:flutter_test/flutter_test.dart';

/// «Próxima» y «Reseñable» dependen de la salida congelada de la reserva (`bookings.salida_at`),
/// no de la fecha del plan ni de un margen de un día. El reloj se inyecta: nada depende de la hora real.
final _ahora = DateTime.utc(2026, 10, 25, 15, 0);

Booking _reserva({
  DateTime? salida,
  BookingStatus estado = BookingStatus.confirmada,
  bool conResena = false,
  DateTime? fechaPlan,
}) {
  final b = Booking(
    id: 'b-1',
    codigo: 'DIV-TEST01',
    planDateId: 'pd-1',
    viajeroId: 'v-1',
    pax: 2,
    montoTotal: 100000,
    estado: estado,
    createdAt: _ahora.subtract(const Duration(days: 30)),
    salidaAt: salida,
    planDate: fechaPlan == null
        ? null
        : PlanDate(id: 'pd-1', planId: 'p-1', fecha: fechaPlan, cupoTotal: 10, cupoDisponible: 5),
  );
  return conResena ? b.conResena() : b;
}

void main() {
  group('esFutura', () {
    test('salida 1 minuto después de ahora → futura', () {
      expect(_reserva(salida: _ahora.add(const Duration(minutes: 1))).esFutura(_ahora), isTrue);
    });

    test('salida 1 minuto antes de ahora → ya salió', () {
      expect(
        _reserva(salida: _ahora.subtract(const Duration(minutes: 1))).esFutura(_ahora),
        isFalse,
      );
    });

    test('salida exactamente ahora → ya salió', () {
      expect(_reserva(salida: _ahora).esFutura(_ahora), isFalse);
    });

    test('mañana → futura (sin margen de un día)', () {
      expect(_reserva(salida: _ahora.add(const Duration(days: 1))).esFutura(_ahora), isTrue);
    });

    test('sin salida congelada usa la fecha del plan', () {
      expect(
        _reserva(fechaPlan: DateTime(2026, 10, 26)).esFutura(DateTime(2026, 10, 25, 23)),
        isTrue,
      );
      expect(
        _reserva(fechaPlan: DateTime(2026, 10, 24)).esFutura(DateTime(2026, 10, 25, 23)),
        isFalse,
      );
    });

    test('sin salida ni fecha de plan no es futura', () {
      expect(_reserva().esFutura(_ahora), isFalse);
    });
  });

  group('vigente', () {
    final sale = _ahora.add(const Duration(minutes: 1));

    test('confirmada que sale en 1 minuto → vigente', () {
      expect(_reserva(salida: sale).vigente(_ahora), isTrue);
    });

    test('pendiente de pago que sale en 1 minuto → vigente', () {
      expect(_reserva(salida: sale, estado: BookingStatus.pendientePago).vigente(_ahora), isTrue);
    });

    test('salida exactamente ahora → ya no es vigente', () {
      expect(_reserva(salida: _ahora).vigente(_ahora), isFalse);
    });

    test('salió hace 1 minuto → no vigente', () {
      expect(
        _reserva(salida: _ahora.subtract(const Duration(minutes: 1))).vigente(_ahora),
        isFalse,
      );
    });

    test('cancelada o completada, aunque la salida sea futura → no vigente', () {
      expect(_reserva(salida: sale, estado: BookingStatus.cancelada).vigente(_ahora), isFalse);
      expect(_reserva(salida: sale, estado: BookingStatus.completada).vigente(_ahora), isFalse);
    });

    test('sin salida conocida → no vigente', () {
      expect(_reserva().vigente(_ahora), isFalse);
    });
  });

  group('puedeResenar', () {
    final salio = _ahora.subtract(const Duration(minutes: 1));

    test('confirmada que salió hace 1 minuto y sin reseña → sí', () {
      expect(_reserva(salida: salio).puedeResenar(_ahora), isTrue);
    });

    test('completada que ya salió → sí', () {
      expect(
        _reserva(salida: salio, estado: BookingStatus.completada).puedeResenar(_ahora),
        isTrue,
      );
    });

    test('sale en 1 minuto → no', () {
      expect(
        _reserva(salida: _ahora.add(const Duration(minutes: 1))).puedeResenar(_ahora),
        isFalse,
      );
    });

    test('sale mañana → no (el servidor la rechazaría)', () {
      expect(_reserva(salida: _ahora.add(const Duration(days: 1))).puedeResenar(_ahora), isFalse);
    });

    test('ya reseñada → no', () {
      expect(_reserva(salida: salio, conResena: true).puedeResenar(_ahora), isFalse);
    });

    test('pendiente de pago o cancelada → no', () {
      expect(
        _reserva(salida: salio, estado: BookingStatus.pendientePago).puedeResenar(_ahora),
        isFalse,
      );
      expect(
        _reserva(salida: salio, estado: BookingStatus.cancelada).puedeResenar(_ahora),
        isFalse,
      );
    });

    test('sin ninguna fecha conocida → no', () {
      expect(_reserva().puedeResenar(_ahora), isFalse);
    });
  });

  group('Booking.fromMap', () {
    Map<String, dynamic> mapa({String? salida}) => {
      'id': 'b-1',
      'codigo': 'DIV-TEST01',
      'plan_date_id': 'pd-1',
      'viajero_id': 'v-1',
      'pax': 2,
      'monto_total': 100000,
      'estado': 'confirmada',
      'created_at': '2026-09-01T10:00:00+00:00',
      'salida_at': ?salida,
    };

    test('lee la salida congelada con su zona horaria', () {
      final b = Booking.fromMap(mapa(salida: '2026-10-27T13:00:00+00:00'));
      expect(b.salidaAt, DateTime.utc(2026, 10, 27, 13));
      expect(b.esFutura(_ahora), isTrue);
    });

    test('sin salida_at queda en null y conResena la conserva', () {
      expect(Booking.fromMap(mapa()).salidaAt, isNull);
      final b = Booking.fromMap(mapa(salida: '2026-10-27T13:00:00+00:00')).conResena();
      expect(b.salidaAt, DateTime.utc(2026, 10, 27, 13));
      expect(b.tieneResena, isTrue);
    });
  });
}

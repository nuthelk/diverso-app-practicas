import 'package:diverso_core/diverso_core.dart';
import 'package:flutter_test/flutter_test.dart';

/// «Hoy» para el servidor es la fecha de Bogotá (UTC-5 todo el año), no la del reloj del teléfono.
void main() {
  group('hoyBogota', () {
    test('a las 21:00 en Bogotá (02:00 UTC del día siguiente) sigue siendo la fecha de Bogotá', () {
      expect(hoyBogota(DateTime.utc(2026, 11, 3, 2, 0)), DateTime(2026, 11, 2));
    });

    test('hasta las 23:59 Bogotá es el mismo día; a las 00:00 Bogotá (05:00 UTC) cambia', () {
      expect(hoyBogota(DateTime.utc(2026, 11, 3, 4, 59)), DateTime(2026, 11, 2));
      expect(hoyBogota(DateTime.utc(2026, 11, 3, 5, 0)), DateTime(2026, 11, 3));
    });

    test('a media mañana UTC es el mismo día', () {
      expect(hoyBogota(DateTime.utc(2026, 11, 2, 15, 0)), DateTime(2026, 11, 2));
    });

    test('da lo mismo si el instante llega en UTC o en hora local', () {
      final utc = DateTime.utc(2026, 11, 3, 2, 0);
      expect(hoyBogota(utc.toLocal()), hoyBogota(utc));
    });

    test('sin argumento usa el reloj real y se puede escribir como YYYY-MM-DD', () {
      final esperado = DateTime.now().toUtc().subtract(const Duration(hours: 5));
      expect(hoyBogota(), DateTime(esperado.year, esperado.month, esperado.day));
      expect(fechaToIso(DateTime(2026, 11, 2)), '2026-11-02');
    });
  });
}

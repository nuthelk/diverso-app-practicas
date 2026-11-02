import 'package:diverso_core/diverso_core.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// Una fecha de plan solo se ofrece mientras su salida (fecha + `plans.hora_salida`, hora de Bogotá,
/// UTC-5 todo el año) esté por ocurrir. El reloj se inyecta: nada depende de la hora real.
///
/// «Ahora» de los tests = lunes 2 de noviembre de 2026, 15:30 en Bogotá (20:30 UTC).
final _ahora = DateTime.utc(2026, 11, 2, 20, 30);
final _hoy = DateTime(2026, 11, 2);

PlanDate _fecha(DateTime dia, {int cupos = 5, String id = 'pd'}) =>
    PlanDate(id: id, planId: 'p', fecha: dia, cupoTotal: 10, cupoDisponible: cupos);

Plan _plan(Duration horaSalida, List<PlanDate> fechas) => Plan(
      id: 'p',
      agencyId: 'a',
      titulo: 'Plan',
      destino: 'Jericó',
      categoria: ExperienceCategory.cultura,
      precioCop: 100000,
      estado: PlanStatus.publicado,
      horaSalida: horaSalida,
      dates: fechas,
    );

void main() {
  group('fechasDisponiblesA: salidas que ya partieron', () {
    test('salida hace 1 minuto (15:29 Bogotá) → oculta', () {
      final plan = _plan(const Duration(hours: 15, minutes: 29), [_fecha(_hoy)]);
      expect(plan.fechasDisponiblesA(_ahora), isEmpty);
    });

    test('salida dentro de 1 minuto (15:31 Bogotá) → visible', () {
      final plan = _plan(const Duration(hours: 15, minutes: 31), [_fecha(_hoy)]);
      expect(plan.fechasDisponiblesA(_ahora), hasLength(1));
    });

    test('salida exactamente ahora (15:30 Bogotá) → oculta', () {
      final plan = _plan(const Duration(hours: 15, minutes: 30), [_fecha(_hoy)]);
      expect(plan.fechasDisponiblesA(_ahora), isEmpty);
    });

    test('la hora de salida es de Bogotá, no UTC: a las 21:00 Bogotá (02:00 UTC del día siguiente) '
        'una salida de hoy a las 22:00 sigue visible', () {
      final nocheBogota = DateTime.utc(2026, 11, 3, 2, 0);
      final plan = _plan(const Duration(hours: 22), [_fecha(_hoy)]);
      expect(plan.fechasDisponiblesA(nocheBogota), hasLength(1));
      expect(plan.fechasDisponiblesA(DateTime.utc(2026, 11, 3, 3, 1)), isEmpty);
    });

    test('mañana a la misma hora → visible; ayer → oculta', () {
      final plan = _plan(const Duration(hours: 6), [
        _fecha(DateTime(2026, 11, 1), id: 'ayer'),
        _fecha(DateTime(2026, 11, 3), id: 'manana'),
      ]);
      expect(plan.fechasDisponiblesA(_ahora).map((d) => d.id), ['manana']);
    });

    test('mantiene el orden por fecha y sigue ocultando las fechas sin cupos', () {
      final plan = _plan(const Duration(hours: 6), [
        _fecha(DateTime(2026, 11, 5), id: 'tarde'),
        _fecha(DateTime(2026, 11, 4), id: 'agotada', cupos: 0),
        _fecha(DateTime(2026, 11, 3), id: 'pronto'),
        _fecha(_hoy, id: 'salio'),
      ]);
      expect(plan.fechasDisponiblesA(_ahora).map((d) => d.id), ['pronto', 'tarde']);
    });

    test('yaSalio: misma regla para una fecha concreta (checkout)', () {
      final plan = _plan(const Duration(hours: 6), [_fecha(_hoy)]);
      expect(plan.yaSalio(plan.dates.first, _ahora), isTrue);
      expect(plan.yaSalio(_fecha(DateTime(2026, 11, 3)), _ahora), isFalse);
    });

    test('fechasDisponibles (reloj real) oculta una salida de hace 1 minuto y muestra una de dentro de 1', () {
      final bogota = DateTime.now().toUtc().subtract(const Duration(hours: 5));
      DateTime dia(DateTime t) => DateTime(t.year, t.month, t.day);
      Duration hora(DateTime t) => Duration(hours: t.hour, minutes: t.minute);
      final hace = bogota.subtract(const Duration(minutes: 1));
      final dentro = bogota.add(const Duration(minutes: 5));
      expect(_plan(hora(hace), [_fecha(dia(hace))]).fechasDisponibles, isEmpty);
      expect(_plan(hora(dentro), [_fecha(dia(dentro))]).fechasDisponibles, hasLength(1));
    });
  });

  group('Plan.fromMap con filas como las devuelve PostgREST', () {
    Plan planMapa(String hora, List<String> fechas) => Plan.fromMap({
          'id': 'p',
          'agency_id': 'a',
          'titulo': 'T',
          'destino': 'D',
          'precio_cop': 1000,
          'hora_salida': hora,
          'plan_dates': [
            for (final f in fechas)
              {'id': f, 'plan_id': 'p', 'fecha': f, 'cupo_total': 5, 'cupo_disponible': 5},
          ],
        });

    test('22:00 del 2026-11-02 en Bogotá es 03:00 UTC del 2026-11-03', () {
      final plan = planMapa('22:00:00', ['2026-11-02']);
      expect(plan.salidaDe(plan.dates.single), DateTime.utc(2026, 11, 3, 3));
    });

    test('el «ahora» puede venir en UTC o en hora local: mismo resultado en el límite (15:30 Bogotá)', () {
      final plan = planMapa('15:30:00', ['2026-11-02']);
      expect(plan.fechasDisponiblesA(DateTime.utc(2026, 11, 2, 20, 29).toLocal()), hasLength(1));
      expect(plan.fechasDisponiblesA(DateTime.utc(2026, 11, 2, 20, 30).toLocal()), isEmpty);
    });

    test('salida a las 00:00 de Bogotá (05:00 UTC): visible a las 23:59 del día anterior, oculta a las 00:00', () {
      final plan = planMapa('00:00:00', ['2026-11-03']);
      expect(plan.fechasDisponiblesA(DateTime.utc(2026, 11, 3, 4, 59)), hasLength(1));
      expect(plan.fechasDisponiblesA(DateTime.utc(2026, 11, 3, 5)), isEmpty);
    });
  });

  group('tieneSalidaEl (filtro de fecha del catálogo)', () {
    test('solo cuenta si ese día aún hay una salida por partir', () {
      final salio = _plan(const Duration(hours: 6), [_fecha(_hoy)]);
      final porSalir = _plan(const Duration(hours: 18), [_fecha(_hoy)]);
      expect(salio.tieneSalidaEl(_hoy, _ahora), isFalse);
      expect(porSalir.tieneSalidaEl(_hoy, _ahora), isTrue);
      expect(porSalir.tieneSalidaEl(DateTime(2026, 11, 3), _ahora), isFalse);
    });
  });

  group('Plan.fromMap: hora_salida', () {
    Map<String, dynamic> mapa([Object? hora = _sinHora]) => {
          'id': 'p',
          'agency_id': 'a',
          'titulo': 'Plan',
          'destino': 'Jericó',
          'precio_cop': 100000,
          if (!identical(hora, _sinHora)) 'hora_salida': hora,
        };

    test('lee el time de Postgres (HH:MM:SS)', () {
      expect(Plan.fromMap(mapa('06:00:00')).horaSalida, const Duration(hours: 6));
      expect(Plan.fromMap(mapa('15:45:00')).horaSalida, const Duration(hours: 15, minutes: 45));
    });

    test('acepta HH:MM y, si falta, usa el 06:00 por defecto de la columna', () {
      expect(Plan.fromMap(mapa('07:30')).horaSalida, const Duration(hours: 7, minutes: 30));
      expect(Plan.fromMap(mapa(null)).horaSalida, const Duration(hours: 6));
      expect(Plan.fromMap(mapa()).horaSalida, const Duration(hours: 6));
    });
  });

  group('FECHA_YA_SALIO', () {
    test('el RPC create_booking la reporta y la app la explica', () {
      final e = DiversoException.fromPostgrest(PostgrestException(message: 'FECHA_YA_SALIO', code: 'P0001'));
      expect(e.codigo, 'FECHA_YA_SALIO');
      expect(e.mensajeUsuario, 'Esta salida ya partió. Elige otra fecha.');
    });

    test('RESERVA_YA_SALIO (pagar o cancelar tras la salida) ya no dice solo «cancelar»', () {
      final texto = DiversoException('RESERVA_YA_SALIO').mensajeUsuario;
      expect(texto, contains('ya salió'));
      expect(texto, contains('pagar'));
    });
  });
}

const _sinHora = Object();

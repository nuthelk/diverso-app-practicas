import 'package:diverso_core/diverso_core.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:viajero/ui/features/bookings/bookings_controller.dart';

/// Caso real de L22: el 25-oct-2026 «Próximas» mostraba viajes del 3, 6, 12 y 18 de octubre
/// (ya salieron) y sin orden. Reloj fijo; sin red ni Supabase.
final _ahora = DateTime.utc(2026, 10, 25, 15, 0);

DateTime _dia(int dia) => DateTime.utc(2026, 10, dia, 13);

Booking _reserva(
  String codigo,
  DateTime salida, {
  BookingStatus estado = BookingStatus.confirmada,
}) => Booking(
  id: codigo,
  codigo: codigo,
  planDateId: 'pd',
  viajeroId: 'v',
  pax: 2,
  montoTotal: 190000,
  estado: estado,
  createdAt: _dia(1),
  salidaAt: salida,
);

class _Reservas implements BookingService {
  _Reservas(this.lista);

  final List<Booking> lista;

  @override
  Future<List<Booking>> misReservas() async => lista;

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

Future<BookingsController> _cargado(List<Booking> reservas) async {
  final c = BookingsController(reservas: _Reservas(reservas), reloj: () => _ahora);
  addTearDown(c.dispose);
  await c.cargar();
  return c;
}

List<String> _codigos(List<Booking> l) => l.map((b) => b.codigo).toList();

void main() {
  test(
    'L22: confirmadas del 3, 6, 12, 18 y 27 → solo el 27 es próximo; el resto, historial reciente primero',
    () async {
      final c = await _cargado([
        _reserva('D27', _dia(27)),
        _reserva('D18', _dia(18)),
        _reserva('D03', _dia(3)),
        _reserva('D06', _dia(6)),
        _reserva('D12', _dia(12)),
      ]);

      expect(_codigos(c.activas), ['D27']);
      expect(_codigos(c.historial), ['D18', 'D12', 'D06', 'D03']);
    },
  );

  test('próximas: pendiente y confirmada con salida futura, la más cercana primero', () async {
    final c = await _cargado([
      _reserva('D30', _dia(30), estado: BookingStatus.pendientePago),
      _reserva('D28', _dia(28)),
      _reserva('D26', _dia(26)),
    ]);

    expect(_codigos(c.activas), ['D26', 'D28', 'D30']);
    expect(c.historial, isEmpty);
  });

  test(
    'historial: canceladas y completadas (aunque su fecha sea futura) y pendientes ya vencidas por salida',
    () async {
      final c = await _cargado([
        _reserva('CAN-FUT', _dia(29), estado: BookingStatus.cancelada),
        _reserva('COMP', _dia(10), estado: BookingStatus.completada),
        _reserva('PEND-PASADA', _dia(20), estado: BookingStatus.pendientePago),
        _reserva('PROX', _dia(27)),
      ]);

      expect(_codigos(c.activas), ['PROX']);
      expect(_codigos(c.historial), ['CAN-FUT', 'PEND-PASADA', 'COMP']);
    },
  );

  test('límite: salida 1 minuto adelante es próxima y 1 minuto atrás es historial', () async {
    final c = await _cargado([
      _reserva('ADELANTE', _ahora.add(const Duration(minutes: 1))),
      _reserva('ATRAS', _ahora.subtract(const Duration(minutes: 1))),
    ]);

    expect(_codigos(c.activas), ['ADELANTE']);
    expect(_codigos(c.historial), ['ATRAS']);
  });

  test('PRESERVE: una lista vacía deja ambas pestañas vacías y cargar termina sin error', () async {
    final c = await _cargado(const []);
    expect(c.activas, isEmpty);
    expect(c.historial, isEmpty);
    expect(c.cargando, isFalse);
    expect(c.error, isNull);
  });
}

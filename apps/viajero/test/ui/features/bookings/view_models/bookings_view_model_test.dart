import 'dart:async';

import 'package:diverso_core/diverso_core.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:viajero/ui/features/bookings/view_models/bookings_view_model.dart';

import '../../../../support/reservas_falsas.dart';

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

class _Reservas implements BookingRepository {
  _Reservas(this.lista);

  final List<Booking> lista;

  @override
  Future<List<Booking>> misReservas() async => lista;

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

Future<BookingsViewModel> _cargado(List<Booking> reservas) async {
  final c = BookingsViewModel(reservas: _Reservas(reservas), reloj: () => _ahora);
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

  group('estados de la carga', () {
    late ReservasFalsas repo;
    late BookingsViewModel vm;

    setUp(() {
      repo = ReservasFalsas([reservaDePrueba()]);
      vm = BookingsViewModel(reservas: repo, reloj: () => _ahora);
      addTearDown(vm.dispose);
    });

    test('antes de cargar: cargando, sin reservas ni error ni mensaje', () {
      expect(vm.cargando, isTrue);
      expect(vm.reservas, isEmpty);
      expect(vm.error, isNull);
      expect(vm.mensaje, isNull);
    });

    test('éxito: cargando → listo con las reservas, una consulta', () async {
      final estados = <bool>[];
      vm.addListener(() => estados.add(vm.cargando));

      await vm.cargar();

      expect(estados, [true, false]);
      expect(vm.reservas.map((b) => b.id), ['res-1']);
      expect(vm.error, isNull);
      expect(repo.consultasLista, 1);
    });

    test(
      'error: avisa «No pudimos cargar tus reservas.», sin reservas, y reintentar lo limpia',
      () async {
        repo.fallo = Exception('sin red');
        await vm.cargar();

        expect(vm.error, 'No pudimos cargar tus reservas.');
        expect(vm.cargando, isFalse);
        expect(vm.reservas, isEmpty);

        repo.fallo = null;
        await vm.cargar();

        expect(vm.error, isNull);
        expect(vm.reservas, hasLength(1));
      },
    );

    test('vacío: sin reservas no hay error y ambas listas quedan vacías', () async {
      repo.lista = [];
      await vm.cargar();

      expect(vm.reservas, isEmpty);
      expect(vm.error, isNull);
      expect(vm.activas, isEmpty);
      expect(vm.historial, isEmpty);
    });

    test('el estado no se puede modificar desde fuera', () async {
      await vm.cargar();
      expect(() => vm.reservas.add(reservaDePrueba(id: 'x')), throwsUnsupportedError);
    });

    test('dispose: una carga que termina después no avisa a nadie ni lanza', () async {
      repo.compuerta = Completer<void>();
      final propio = BookingsViewModel(reservas: repo, reloj: () => _ahora);
      final carga = propio.cargar();
      propio.dispose();
      repo.compuerta!.complete();

      await expectLater(carga, completes);
    });
  });

  group('mensaje y cancelación', () {
    late ReservasFalsas repo;
    late BookingsViewModel vm;
    final reserva = reservaDePrueba(salida: _dia(27));

    setUp(() async {
      repo = ReservasFalsas([reserva]);
      vm = BookingsViewModel(reservas: repo, reloj: () => _ahora);
      addTearDown(vm.dispose);
      await vm.cargar();
    });

    test('avisar deja el texto en `mensaje` y avisa; limpiarMensaje lo consume', () {
      var avisos = 0;
      vm.addListener(() => avisos++);

      vm.avisar('Cerraste el pago');
      expect(vm.mensaje, 'Cerraste el pago');
      expect(avisos, 1);

      vm.limpiarMensaje();
      expect(vm.mensaje, isNull);
      expect(avisos, 1, reason: 'consumir el aviso no repinta');
    });

    test('vistaPrevia devuelve el reembolso y no deja mensaje', () async {
      final vista = await vm.vistaPrevia(reserva);
      expect(vista, isNotNull);
      expect(vista!.porcentaje, 100);
      expect(vm.mensaje, isNull);
    });

    test('vistaPrevia que falla devuelve null y explica el motivo en `mensaje`', () async {
      repo.falloAlCancelar = DiversoException('RESERVA_YA_SALIO');

      expect(await vm.vistaPrevia(reserva), isNull);
      expect(
        vm.mensaje,
        'Este viaje ya salió, así que la reserva ya no se puede pagar ni cancelar.',
      );
    });

    test('cancelar: avisa con el reembolso y recarga la lista', () async {
      expect(await vm.cancelar(reserva), isTrue);

      expect(repo.canceladas, ['res-1']);
      expect(
        vm.mensaje,
        'Reserva cancelada y cupos liberados. Reembolso de prueba aprobado: \$ 190.000 (100 %).',
      );
      expect(repo.consultasLista, 2, reason: 'una al abrir y otra tras cancelar');
    });

    test('cancelar sin reembolso solo dice «Sin reembolso»', () async {
      repo.resultado = ResultadoCancelacion(
        aplica: false,
        porcentaje: 0,
        monto: 0,
        estado: EstadoReembolso.noAplica,
        motivo: '',
      );

      await vm.cancelar(reserva);

      expect(vm.mensaje, 'Reserva cancelada y cupos liberados. Sin reembolso.');
    });

    test('cancelar que el servidor rechaza: explica el motivo y no recarga', () async {
      repo.falloAlCancelar = DiversoException('ESTADO_INVALIDO');

      expect(await vm.cancelar(reserva), isFalse);

      expect(vm.mensaje, 'La reserva ya no admite esta operación.');
      expect(repo.canceladas, isEmpty);
      expect(repo.consultasLista, 1);
    });

    test('un error inesperado al cancelar también se explica, no se pierde', () async {
      repo.falloAlCancelar = Exception('boom');

      expect(await vm.cancelar(reserva), isFalse);
      expect(vm.mensaje, isNotNull);
    });

    test('puedeCancelar / puedeResenar siguen las reglas de Próximas e Historial', () {
      final proxima = reservaDePrueba(salida: _dia(27));
      final pasada = reservaDePrueba(salida: _dia(10));
      final cancelada = reservaDePrueba(salida: _dia(27), estado: BookingStatus.cancelada);

      expect(vm.puedeCancelar(proxima), isTrue);
      expect(vm.puedeResenar(proxima), isFalse);
      expect(vm.puedeCancelar(pasada), isFalse);
      expect(vm.puedeResenar(pasada), isTrue);
      expect(vm.puedeCancelar(cancelada), isFalse);
      expect(vm.puedeResenar(reservaDePrueba(salida: _dia(10), tieneResena: true)), isFalse);
    });
  });
}

import 'dart:async';

import 'package:diverso_core/diverso_core.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:viajero/ui/features/checkout/pago_abierto.dart';
import 'package:viajero/ui/features/checkout/view_models/checkout_view_model.dart';

import '../../../../support/reservas_falsas.dart';

/// Estado, comandos y guarda de dispose de [CheckoutViewModel]. Las reglas de la reserva
/// pendiente están en `checkout_pendiente_test.dart`. Sin red ni Supabase.

final _fecha = PlanDate(
  id: 'fecha-1',
  planId: 'plan-1',
  fecha: DateTime.now().add(const Duration(days: 20)),
  cupoTotal: 10,
  cupoDisponible: 8,
);

Plan _plan() => Plan(
  id: 'plan-1',
  agencyId: 'ag-1',
  titulo: 'Guatapé en un día',
  destino: 'Guatapé',
  categoria: ExperienceCategory.aventura,
  precioCop: 150000,
  estado: PlanStatus.publicado,
  dates: [_fecha],
);

void main() {
  TestWidgetsFlutterBinding.ensureInitialized(); // HapticFeedback usa el canal de plataforma.

  late ReservasFalsas reservas;
  late CheckoutViewModel vm;
  final abiertos = <String>[];

  Future<PagoAbierto> Function(String) abrir(bool terminado) => (id) async {
    abiertos.add(id);
    return terminado ? PagoAbierto.completado : PagoAbierto.cerrado;
  };

  setUp(() {
    reservas = ReservasFalsas();
    vm = CheckoutViewModel(reservas: reservas);
    abiertos.clear();
  });
  tearDown(() => vm.dispose());

  test('estado inicial: una persona, sin reserva, sin error ni proceso en curso', () {
    expect(vm.pax, 1);
    expect(vm.bookingId, isNull);
    expect(vm.pendiente, isNull);
    expect(vm.error, isNull);
    expect(vm.procesando, isFalse);
    expect(vm.total(_plan()), 150000);
  });

  test('las personas van de 1 a 20 y el total las multiplica', () {
    vm.setPax(0);
    expect(vm.pax, 1);
    vm.setPax(99);
    expect(vm.pax, 20);
    vm.setPax(3);
    expect(vm.total(_plan()), 450000);
  });

  test('pagar avisa dos veces: empieza a procesar y termina', () async {
    final estados = <bool>[];
    vm.addListener(() => estados.add(vm.procesando));
    await vm.pagar(_fecha, abrir(true));
    expect(estados, [true, false]);
    expect(reservas.creadas, [(planDateId: 'fecha-1', pax: 1)]);
    expect(abiertos, ['nueva-1']);
    expect(vm.bookingId, 'nueva-1');
    expect(vm.error, isNull);
  });

  test('cerrar el pago sin terminar deja el aviso y conserva la reserva para reintentar', () async {
    await vm.pagar(_fecha, abrir(false));
    expect(vm.error, contains('Cerraste el pago antes de terminar'));
    expect(vm.error, contains('Ya pagué, verificar'));
    expect(vm.bookingId, 'nueva-1');
    expect(vm.procesando, isFalse);
  });

  test('bug F: en web el pago queda redirigido y «Procesando…» termina, sin error', () async {
    await vm.pagar(_fecha, (id) async {
      abiertos.add(id);
      return PagoAbierto.redirigido;
    });
    expect(vm.procesando, isFalse);
    expect(vm.error, isNull);
    expect(vm.bookingId, 'nueva-1', reason: 'la reserva sigue lista para «Ya pagué, verificar»');
    expect(abiertos, ['nueva-1']);
  });

  test('un error del servidor se muestra con su mensaje en español', () async {
    reservas.falloAlCrear = DiversoException('SIN_CUPO');
    await vm.pagar(_fecha, abrir(true));
    expect(vm.error, DiversoException('SIN_CUPO').mensajeUsuario);
    expect(vm.bookingId, isNull);
    expect(vm.procesando, isFalse);
  });

  test('un error del servidor al abrir el pago se muestra y no pierde la reserva', () async {
    await vm.pagar(_fecha, (id) => throw DiversoException('RESERVA_VENCIDA'));
    expect(vm.error, DiversoException('RESERVA_VENCIDA').mensajeUsuario);
    expect(vm.bookingId, 'nueva-1');
  });

  test('un error inesperado no se traga: mensaje genérico y el checkout sigue usable', () async {
    reservas.falloAlBuscarPendiente = StateError('boom');
    await vm.pagar(_fecha, abrir(true));
    expect(vm.error, 'No pudimos iniciar el pago. Intenta de nuevo.');
    expect(vm.procesando, isFalse);
    expect(abiertos, isEmpty);
  });

  test('un nuevo intento limpia el error anterior', () async {
    reservas.falloAlBuscarPendiente = StateError('boom');
    await vm.pagar(_fecha, abrir(true));
    reservas.falloAlBuscarPendiente = null;
    await vm.pagar(_fecha, abrir(true));
    expect(vm.error, isNull);
  });

  group('guarda de dispose', () {
    late CheckoutViewModel cerrado;
    setUp(() => cerrado = CheckoutViewModel(reservas: reservas));

    test('pagar que termina cuando la pantalla ya se cerró no avisa a nadie', () async {
      final puerta = Completer<PagoAbierto>();
      final pagando = cerrado.pagar(_fecha, (_) => puerta.future);
      await pumpEventQueue();
      expect(cerrado.procesando, isTrue);

      cerrado.dispose();
      puerta.complete(PagoAbierto.completado);
      await pagando;
    });

    test('pagar que falla cuando la pantalla ya se cerró tampoco avisa', () async {
      final puerta = Completer<PagoAbierto>();
      final pagando = cerrado.pagar(_fecha, (_) => puerta.future);
      await pumpEventQueue();

      cerrado.dispose();
      puerta.completeError(DiversoException('RESERVA_VENCIDA'));
      await pagando;
    });
  });
}

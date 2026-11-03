import 'dart:async';

import 'package:diverso_core/diverso_core.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:viajero/ui/features/checkout/view_models/reserva_view_model.dart';

import '../../../../support/reservas_falsas.dart';

/// Carga de `/reserva/:bookingId` por id (confirmación que sobrevive a recargar en web).
/// Sin red ni Supabase.

ReservaViewModel _vm(ReservasFalsas reservas, {String id = 'res-1'}) =>
    ReservaViewModel(reservas: reservas, bookingId: id);

void main() {
  test('arranca cargando, sin reserva ni error', () {
    final vm = _vm(ReservasFalsas());
    addTearDown(vm.dispose);
    expect(vm.cargando, isTrue);
    expect(vm.reserva, isNull);
    expect(vm.error, isNull);
  });

  test('cargar trae la reserva por id', () async {
    final reservas = ReservasFalsas([reservaDePrueba()]);
    final vm = _vm(reservas);
    addTearDown(vm.dispose);
    final estados = <bool>[];
    vm.addListener(() => estados.add(vm.cargando));
    await vm.cargar();

    expect(reservas.consultas, ['res-1']);
    expect(vm.reserva?.codigo, 'DIV-AAAA0001');
    expect(vm.cargando, isFalse);
    expect(vm.error, isNull);
    expect(estados, [true, false]);
  });

  test('una reserva inexistente muestra el mensaje del servidor', () async {
    final vm = _vm(ReservasFalsas(), id: 'nope');
    addTearDown(vm.dispose);
    await vm.cargar();
    expect(vm.error, DiversoException('RESERVA_NO_EXISTE').mensajeUsuario);
    expect(vm.reserva, isNull);
    expect(vm.cargando, isFalse);
  });

  test('un error inesperado también llega como mensaje, no como excepción', () async {
    final vm = _vm(ReservasFalsas()..fallo = StateError('sin red'));
    addTearDown(vm.dispose);
    await vm.cargar();
    expect(vm.error, isNotEmpty);
    expect(vm.reserva, isNull);
  });

  test('cargar de nuevo limpia el error anterior', () async {
    final reservas = ReservasFalsas([reservaDePrueba()])..fallo = StateError('sin red');
    final vm = _vm(reservas);
    addTearDown(vm.dispose);
    await vm.cargar();
    reservas.fallo = null;
    await vm.cargar();
    expect(vm.error, isNull);
    expect(vm.reserva, isNotNull);
  });

  test('cargar que termina con la pantalla ya cerrada no avisa a nadie', () async {
    final reservas = ReservasFalsas([reservaDePrueba()])..compuerta = Completer<void>();
    final vm = _vm(reservas);
    final cargando = vm.cargar();
    await pumpEventQueue();

    vm.dispose();
    reservas.compuerta!.complete();
    await cargando;
  });
}

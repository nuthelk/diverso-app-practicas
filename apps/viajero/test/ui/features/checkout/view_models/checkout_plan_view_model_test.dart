import 'dart:async';

import 'package:diverso_core/diverso_core.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:viajero/ui/features/checkout/view_models/checkout_plan_view_model.dart';

import '../../../../support/catalogo_falso.dart';

/// Carga del plan y la fecha de `/checkout/:planId/:fechaId` por id (sin `state.extra`).
/// Sin red ni Supabase.

PlanDate _fecha(String id, {required int dias}) => PlanDate(
  id: id,
  planId: 'plan-1',
  fecha: DateTime.now().add(Duration(days: dias)),
  cupoTotal: 10,
  cupoDisponible: 8,
);

Plan _plan({List<PlanDate>? fechas}) => Plan(
  id: 'plan-1',
  agencyId: 'ag-1',
  titulo: 'Guatapé en un día',
  destino: 'Guatapé',
  categoria: ExperienceCategory.aventura,
  precioCop: 150000,
  estado: PlanStatus.publicado,
  dates: fechas ?? [_fecha('fecha-1', dias: 20)],
);

CheckoutPlanViewModel _vm(CatalogoFalso catalogo, {String fechaId = 'fecha-1'}) =>
    CheckoutPlanViewModel(catalogo: catalogo, planId: 'plan-1', fechaId: fechaId);

void main() {
  test('arranca cargando, sin plan ni error', () {
    final vm = _vm(CatalogoFalso());
    addTearDown(vm.dispose);
    expect(vm.cargando, isTrue);
    expect(vm.plan, isNull);
    expect(vm.fecha, isNull);
    expect(vm.error, isNull);
  });

  test('cargar trae el plan por id y elige la fecha pedida', () async {
    final catalogo = CatalogoFalso(detalles: {'plan-1': _plan()});
    final vm = _vm(catalogo);
    addTearDown(vm.dispose);
    final estados = <bool>[];
    vm.addListener(() => estados.add(vm.cargando));
    await vm.cargar();

    expect(catalogo.detallesPedidos, ['plan-1']);
    expect(vm.plan?.titulo, 'Guatapé en un día');
    expect(vm.fecha?.id, 'fecha-1');
    expect(vm.cargando, isFalse);
    expect(vm.error, isNull);
    expect(estados, [true, false]);
  });

  test('una fecha que no es del plan no está disponible (y no es un error)', () async {
    final vm = _vm(CatalogoFalso(detalles: {'plan-1': _plan()}), fechaId: 'otra');
    addTearDown(vm.dispose);
    await vm.cargar();
    expect(vm.plan, isNotNull);
    expect(vm.fecha, isNull);
    expect(vm.error, isNull);
  });

  test('una fecha que ya salió no está disponible', () async {
    final plan = _plan(fechas: [_fecha('fecha-1', dias: -2)]);
    final vm = _vm(CatalogoFalso(detalles: {'plan-1': plan}));
    addTearDown(vm.dispose);
    await vm.cargar();
    expect(vm.plan, isNotNull);
    expect(vm.fecha, isNull);
  });

  test('si la carga falla: mensaje para el usuario y sin plan', () async {
    final vm = _vm(CatalogoFalso()..fallo = DiversoException('PLAN_NO_PUBLICADO'));
    addTearDown(vm.dispose);
    await vm.cargar();
    expect(vm.error, 'Revisa tu conexión e intenta de nuevo.');
    expect(vm.plan, isNull);
    expect(vm.cargando, isFalse);
  });

  test('«Reintentar» tras un fallo vuelve a cargar y limpia el error', () async {
    final catalogo = CatalogoFalso(detalles: {'plan-1': _plan()})..fallo = StateError('sin red');
    final vm = _vm(catalogo);
    addTearDown(vm.dispose);
    await vm.cargar();
    expect(vm.error, isNotNull);

    catalogo.fallo = null;
    await vm.cargar();
    expect(vm.error, isNull);
    expect(vm.fecha?.id, 'fecha-1');
    expect(catalogo.detallesPedidos, ['plan-1', 'plan-1']);
  });

  test('cargar que termina con la pantalla ya cerrada no avisa a nadie', () async {
    final catalogo = CatalogoFalso(detalles: {'plan-1': _plan()})..compuerta = Completer<void>();
    final vm = _vm(catalogo);
    final cargando = vm.cargar();
    await pumpEventQueue();

    vm.dispose();
    catalogo.compuerta!.complete();
    await cargando;
  });
}

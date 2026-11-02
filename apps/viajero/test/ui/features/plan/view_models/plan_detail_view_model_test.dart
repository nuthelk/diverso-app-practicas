import 'dart:async';

import 'package:diverso_core/diverso_core.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:viajero/ui/features/plan/view_models/plan_detail_view_model.dart';

import '../../../../support/catalogo_falso.dart';

/// `PlanDetailViewModel` con repositorios falsos: carga plan + reseñas (una consulta de cada
/// una), error, plan sin fechas, selección de fecha derivada y protección tras `dispose`.

Review _resena(String id) => Review(
  id: id,
  bookingId: 'b-$id',
  planId: 'plan-1',
  viajeroId: 'v-$id',
  calificacion: 5,
  createdAt: DateTime(2026, 10, 1),
);

void main() {
  late CatalogoFalso catalogo;
  late ResenasFalsas resenas;
  late PlanDetailViewModel vm;

  PlanDetailViewModel crear() =>
      PlanDetailViewModel(catalogo: catalogo, resenas: resenas, planId: 'plan-1');

  setUp(() {
    catalogo = CatalogoFalso(
      detalles: {
        'plan-1': planDePrueba(
          reviewsCount: 2,
          dates: [
            fechaDePrueba('f-3', dias: 9),
            fechaDePrueba('f-1'),
            fechaDePrueba('f-2', dias: 5),
          ],
        ),
      },
    );
    resenas = ResenasFalsas([_resena('r1'), _resena('r2')]);
    vm = crear();
    addTearDown(vm.dispose);
  });

  group('carga', () {
    test('antes de cargar: cargando, sin plan ni error', () {
      expect(vm.cargando, isTrue);
      expect(vm.plan, isNull);
      expect(vm.resenas, isEmpty);
      expect(vm.error, isNull);
      expect(vm.fechas, isEmpty);
      expect(vm.fechaSeleccionada, isNull);
    });

    test('éxito: plan y reseñas con una consulta de cada una, cargando → listo', () async {
      final estados = <bool>[];
      vm.addListener(() => estados.add(vm.cargando));

      await vm.cargar();

      expect(vm.plan!.id, 'plan-1');
      expect(vm.resenas.map((r) => r.id), ['r1', 'r2']);
      expect(vm.cargando, isFalse);
      expect(vm.error, isNull);
      expect(catalogo.detallesPedidos, ['plan-1']);
      expect(resenas.pedidas, ['plan-1']);
      expect(estados, [true, false]);
    });

    test('vacío: plan sin fechas ni reseñas', () async {
      catalogo.detalles['plan-1'] = planDePrueba();
      resenas.resenas = const [];

      await vm.cargar();

      expect(vm.plan, isNotNull);
      expect(vm.resenas, isEmpty);
      expect(vm.fechas, isEmpty);
      expect(vm.fechaSeleccionada, isNull);
      expect(vm.error, isNull);
    });

    test('error al cargar el plan: mensaje para el usuario y sin plan', () async {
      catalogo.fallo = Exception('sin red');

      await vm.cargar();

      expect(vm.error, 'Revisa tu conexión e intenta de nuevo.');
      expect(vm.plan, isNull);
      expect(vm.cargando, isFalse);
    });

    test('error al cargar las reseñas: toda la ficha falla, como antes', () async {
      resenas.fallo = Exception('sin red');

      await vm.cargar();

      expect(vm.error, isNotNull);
      expect(vm.plan, isNull);
    });

    test('reintentar tras un error carga el plan y limpia el error', () async {
      catalogo.fallo = Exception('sin red');
      await vm.cargar();
      catalogo.fallo = null;

      await vm.cargar();

      expect(vm.error, isNull);
      expect(vm.plan!.id, 'plan-1');
    });
  });

  group('fecha seleccionada', () {
    test('por defecto la más cercana; fechas de la más próxima a la más lejana', () async {
      await vm.cargar();

      expect(vm.fechas.map((f) => f.id), ['f-1', 'f-2', 'f-3']);
      expect(vm.fechaSeleccionada!.id, 'f-1');
    });

    test('seleccionarFecha cambia la selección y notifica', () async {
      await vm.cargar();
      var avisos = 0;
      vm.addListener(() => avisos++);

      vm.seleccionarFecha(vm.fechas[2]);

      expect(vm.fechaSeleccionada!.id, 'f-3');
      expect(avisos, 1);
    });

    test('leer la selección no la modifica ni notifica (nada se muta al leer)', () async {
      await vm.cargar();
      vm.seleccionarFecha(vm.fechas[1]);
      var avisos = 0;
      vm.addListener(() => avisos++);

      for (var i = 0; i < 3; i++) {
        expect(vm.fechaSeleccionada!.id, 'f-2');
        expect(vm.fechas, hasLength(3));
      }

      expect(avisos, 0);
    });

    test('una fecha que no está entre las disponibles se ignora', () async {
      await vm.cargar();
      vm.seleccionarFecha(vm.fechas[1]);

      vm.seleccionarFecha(fechaDePrueba('otra'));

      expect(vm.fechaSeleccionada!.id, 'f-2');
    });

    test('al recargar la selección vuelve a la primera fecha', () async {
      await vm.cargar();
      vm.seleccionarFecha(vm.fechas[2]);

      await vm.cargar();

      expect(vm.fechaSeleccionada!.id, 'f-1');
    });
  });

  group('dispose', () {
    test('una carga que termina después de dispose no notifica ni lanza', () async {
      final propio = crear();
      final puerta = catalogo.compuerta = Completer<void>();
      final carga = propio.cargar();

      propio.dispose();
      puerta.complete();

      await expectLater(carga, completes);
    });

    test('un error tardío después de dispose tampoco lanza', () async {
      final propio = crear();
      final puerta = catalogo.compuerta = Completer<void>();
      catalogo.fallo = Exception('sin red');
      final carga = propio.cargar();

      propio.dispose();
      puerta.complete();

      await expectLater(carga, completes);
    });
  });
}

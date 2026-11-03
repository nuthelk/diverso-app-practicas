import 'dart:async';

import 'package:diverso_core/diverso_core.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:viajero/ui/features/agencies/view_models/agencia_view_model.dart';

import '../../../../support/catalogo_falso.dart';

/// `AgenciaViewModel` con un catálogo falso: carga por id, agencia no encontrada, error, sin
/// planes y protección tras `dispose`.

const _rutas = AgenciaResumen(
  id: 'ag-rutas',
  nombre: 'Rutas de Antioquia Cultural',
  ciudad: 'Medellín',
  planesCount: 2,
);

void main() {
  late CatalogoFalso catalogo;
  late AgenciaViewModel vm;

  setUp(() {
    catalogo = CatalogoFalso(
      agenciasPublicas: [_rutas],
      planesPorAgencia: {
        'ag-rutas': [planDePrueba(id: 'plan-1'), planDePrueba(id: 'plan-2')],
      },
    );
    vm = AgenciaViewModel(catalogo: catalogo, agencyId: 'ag-rutas');
    addTearDown(vm.dispose);
  });

  group('carga', () {
    test('antes de cargar: cargando y sin datos', () {
      expect(vm.cargando, isTrue);
      expect(vm.agencia, isNull);
      expect(vm.planes, isEmpty);
      expect(vm.noEncontrada, isFalse);
      expect(vm.error, isNull);
      expect(catalogo.agenciasPedidas, isEmpty);
    });

    test('éxito: la agencia y sus planes, pedidos por id, y notifica cargando → listo', () async {
      final estados = <bool>[];
      vm.addListener(() => estados.add(vm.cargando));

      await vm.cargar();

      expect(vm.agencia?.id, 'ag-rutas');
      expect(vm.planes.map((p) => p.id), ['plan-1', 'plan-2']);
      expect(vm.noEncontrada, isFalse);
      expect(vm.cargando, isFalse);
      expect(vm.error, isNull);
      expect(vm.errorDetalle, isNull);
      expect(catalogo.agenciasPedidas, ['ag-rutas']);
      expect(estados, [true, false]);
    });

    test('agencia sin planes publicados: existe y la lista está vacía', () async {
      catalogo.planesPorAgencia.clear();

      await vm.cargar();

      expect(vm.agencia, isNotNull);
      expect(vm.planes, isEmpty);
      expect(vm.noEncontrada, isFalse);
    });

    test('agencia que no existe o no está habilitada: noEncontrada, sin error', () async {
      final otra = AgenciaViewModel(catalogo: catalogo, agencyId: 'ag-fantasma');
      addTearDown(otra.dispose);

      await otra.cargar();

      expect(otra.noEncontrada, isTrue);
      expect(otra.agencia, isNull);
      expect(otra.planes, isEmpty);
      expect(otra.error, isNull);
      expect(otra.cargando, isFalse);
    });

    test('error: mensaje para el usuario y detalle técnico, sin agencia', () async {
      catalogo.fallo = Exception('sin red');

      await vm.cargar();

      expect(vm.error, 'No pudimos cargar la agencia. Revisa tu conexión e intenta de nuevo.');
      expect(vm.errorDetalle, contains('sin red'));
      expect(vm.agencia, isNull);
      expect(vm.noEncontrada, isFalse);
      expect(vm.cargando, isFalse);
    });

    test('reintentar tras un error: limpia el error y muestra la agencia', () async {
      catalogo.fallo = Exception('sin red');
      await vm.cargar();

      catalogo.fallo = null;
      await vm.cargar();

      expect(vm.error, isNull);
      expect(vm.errorDetalle, isNull);
      expect(vm.agencia?.id, 'ag-rutas');
    });

    test('una recarga que falla conserva la agencia ya cargada', () async {
      await vm.cargar();

      catalogo.fallo = Exception('sin red');
      await vm.cargar();

      expect(vm.error, isNotNull);
      expect(vm.agencia?.id, 'ag-rutas');
      expect(vm.planes, hasLength(2));
    });

    test('la lista de planes expuesta es de solo lectura', () async {
      await vm.cargar();

      expect(() => vm.planes.add(planDePrueba()), throwsUnsupportedError);
    });
  });

  group('dispose', () {
    test('una carga que termina después de dispose no notifica ni lanza', () async {
      final propio = AgenciaViewModel(catalogo: catalogo, agencyId: 'ag-rutas');
      final puerta = catalogo.compuerta = Completer<void>();
      final carga = propio.cargar();

      propio.dispose();
      puerta.complete();

      await expectLater(carga, completes);
    });

    test('un error tardío después de dispose tampoco lanza', () async {
      final propio = AgenciaViewModel(catalogo: catalogo, agencyId: 'ag-rutas');
      final puerta = catalogo.compuerta = Completer<void>();
      catalogo.fallo = Exception('sin red');
      final carga = propio.cargar();

      propio.dispose();
      puerta.complete();

      await expectLater(carga, completes);
    });
  });
}

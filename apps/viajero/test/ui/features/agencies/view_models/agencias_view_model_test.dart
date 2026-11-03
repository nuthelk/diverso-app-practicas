import 'dart:async';

import 'package:diverso_core/diverso_core.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:viajero/ui/features/agencies/view_models/agencias_view_model.dart';

import '../../../../support/catalogo_falso.dart';

/// `AgenciasViewModel` con un catálogo falso: carga, vacío, error, orden y protección tras
/// `dispose`.

const _rutas = AgenciaResumen(
  id: 'ag-rutas',
  nombre: 'Rutas de Antioquia Cultural',
  ciudad: 'Medellín',
  planesCount: 2,
  rating: 4.5,
  reviewsTotal: 2,
);
const _eco = AgenciaResumen(
  id: 'ag-eco',
  nombre: 'EcoAndes Viajes',
  ciudad: 'Envigado',
  planesCount: 5,
);
const _cafe = AgenciaResumen(
  id: 'ag-cafe',
  nombre: 'Café y Montaña Tours',
  ciudad: 'Jardín',
  planesCount: 3,
  rating: 5.0,
  reviewsTotal: 3,
);

void main() {
  late CatalogoFalso catalogo;
  late AgenciasViewModel vm;

  setUp(() {
    catalogo = CatalogoFalso(agenciasPublicas: [_rutas, _eco, _cafe]);
    vm = AgenciasViewModel(catalogo: catalogo);
    addTearDown(vm.dispose);
  });

  group('carga', () {
    test('antes de cargar: cargando y sin datos', () {
      expect(vm.cargando, isTrue);
      expect(vm.agencias, isEmpty);
      expect(vm.hayAgencias, isFalse);
      expect(vm.error, isNull);
      expect(vm.orden, OrdenAgencias.puntaje);
      expect(catalogo.consultasAgencias, 0);
    });

    test('éxito: agencias, sin error, y notifica cargando → listo', () async {
      final estados = <bool>[];
      vm.addListener(() => estados.add(vm.cargando));

      await vm.cargar();

      expect(vm.agencias, hasLength(3));
      expect(vm.hayAgencias, isTrue);
      expect(vm.cargando, isFalse);
      expect(vm.error, isNull);
      expect(vm.errorDetalle, isNull);
      expect(estados, [true, false]);
    });

    test('vacío: sin agencias y sin error (la vista muestra «Aún no hay agencias»)', () async {
      catalogo.agenciasPublicas = const [];

      await vm.cargar();

      expect(vm.agencias, isEmpty);
      expect(vm.hayAgencias, isFalse);
      expect(vm.cargando, isFalse);
      expect(vm.error, isNull);
    });

    test('error: mensaje para el usuario y detalle técnico, sin agencias', () async {
      catalogo.fallo = Exception('sin red');

      await vm.cargar();

      expect(vm.error, 'No pudimos cargar las agencias. Revisa tu conexión e intenta de nuevo.');
      expect(vm.errorDetalle, contains('sin red'));
      expect(vm.agencias, isEmpty);
      expect(vm.cargando, isFalse);
    });

    test('reintentar tras un error: limpia el error y muestra las agencias', () async {
      catalogo.fallo = Exception('sin red');
      await vm.cargar();

      catalogo.fallo = null;
      await vm.cargar();

      expect(vm.error, isNull);
      expect(vm.errorDetalle, isNull);
      expect(vm.agencias, hasLength(3));
    });

    test('una recarga que falla conserva las agencias ya cargadas', () async {
      await vm.cargar();

      catalogo.fallo = Exception('sin red');
      await vm.cargar();

      expect(vm.error, isNotNull);
      expect(vm.agencias, hasLength(3));
    });

    test('la lista expuesta es de solo lectura', () async {
      await vm.cargar();

      expect(() => vm.agencias.add(_eco), throwsUnsupportedError);
    });
  });

  group('orden', () {
    test('por defecto, por puntaje: mayor primero y las «Nueva» al final', () async {
      await vm.cargar();

      expect(vm.agencias.map((a) => a.id), ['ag-cafe', 'ag-rutas', 'ag-eco']);
    });

    test('más planes: de más a menos planes', () async {
      await vm.cargar();

      vm.cambiarOrden(OrdenAgencias.masPlanes);

      expect(vm.orden, OrdenAgencias.masPlanes);
      expect(vm.agencias.map((a) => a.id), ['ag-eco', 'ag-cafe', 'ag-rutas']);
    });

    test('nombre: alfabético sin tildes ni mayúsculas', () async {
      await vm.cargar();

      vm.cambiarOrden(OrdenAgencias.nombre);

      expect(vm.agencias.map((a) => a.id), ['ag-cafe', 'ag-eco', 'ag-rutas']);
    });

    test('cambiar el orden notifica y no vuelve a consultar', () async {
      await vm.cargar();
      var avisos = 0;
      vm.addListener(() => avisos++);

      vm.cambiarOrden(OrdenAgencias.nombre);

      expect(avisos, 1);
      expect(catalogo.consultasAgencias, 1);
    });

    test('elegir el orden que ya está activo no notifica', () async {
      await vm.cargar();
      var avisos = 0;
      vm.addListener(() => avisos++);

      vm.cambiarOrden(OrdenAgencias.puntaje);

      expect(avisos, 0);
    });

    test('el orden elegido se conserva al recargar', () async {
      await vm.cargar();
      vm.cambiarOrden(OrdenAgencias.nombre);

      await vm.cargar();

      expect(vm.orden, OrdenAgencias.nombre);
      expect(vm.agencias.map((a) => a.id), ['ag-cafe', 'ag-eco', 'ag-rutas']);
    });
  });

  group('dispose', () {
    test('una carga que termina después de dispose no notifica ni lanza', () async {
      final propio = AgenciasViewModel(catalogo: catalogo);
      final puerta = catalogo.compuerta = Completer<void>();
      final carga = propio.cargar();

      propio.dispose();
      puerta.complete();

      await expectLater(carga, completes);
    });

    test('un error tardío después de dispose tampoco lanza', () async {
      final propio = AgenciasViewModel(catalogo: catalogo);
      final puerta = catalogo.compuerta = Completer<void>();
      catalogo.fallo = Exception('sin red');
      final carga = propio.cargar();

      propio.dispose();
      puerta.complete();

      await expectLater(carga, completes);
    });
  });
}

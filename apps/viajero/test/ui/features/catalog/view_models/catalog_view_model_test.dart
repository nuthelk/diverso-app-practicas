import 'dart:async';

import 'package:diverso_core/diverso_core.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:viajero/ui/features/catalog/view_models/catalog_view_model.dart';

import '../../../../support/catalogo_falso.dart';

/// `CatalogViewModel` con un catálogo falso: carga, error, vacío, filtros (una sola consulta por
/// comando), selección para comparar y protección tras `dispose`.

void main() {
  late CatalogoFalso catalogo;
  late CatalogViewModel vm;

  setUp(() {
    catalogo = CatalogoFalso(
      planes: [
        planDePrueba(id: 'a'),
        planDePrueba(id: 'b'),
        planDePrueba(id: 'c'),
      ],
      destinosDisponibles: ['Guatapé', 'Jardín'],
    );
    vm = CatalogViewModel(catalogo: catalogo);
    addTearDown(vm.dispose);
  });

  group('carga', () {
    test('antes de cargar: cargando y sin datos', () {
      expect(vm.cargando, isTrue);
      expect(vm.planes, isEmpty);
      expect(vm.destinos, isEmpty);
      expect(vm.error, isNull);
      expect(catalogo.busquedas, isEmpty);
    });

    test('éxito: planes y destinos, sin error, y notifica cargando → listo', () async {
      final estados = <bool>[];
      vm.addListener(() => estados.add(vm.cargando));

      await vm.cargar();

      expect(vm.planes.map((p) => p.id), ['a', 'b', 'c']);
      expect(vm.destinos, ['Guatapé', 'Jardín']);
      expect(vm.cargando, isFalse);
      expect(vm.error, isNull);
      expect(vm.errorDetalle, isNull);
      expect(estados, [true, false]);
    });

    test('vacío: sin planes y sin error (la vista muestra «Sin resultados»)', () async {
      catalogo.planes = const [];

      await vm.cargar();

      expect(vm.planes, isEmpty);
      expect(vm.cargando, isFalse);
      expect(vm.error, isNull);
    });

    test('error: mensaje para el usuario y detalle técnico; conserva lo anterior', () async {
      await vm.cargar();
      catalogo.fallo = Exception('sin red');

      await vm.cargar();

      expect(vm.error, 'No pudimos cargar los planes. Revisa tu conexión e intenta de nuevo.');
      expect(vm.errorDetalle, contains('sin red'));
      expect(vm.cargando, isFalse);
      expect(vm.planes.map((p) => p.id), ['a', 'b', 'c']);
    });

    test('reintentar tras un error limpia el error', () async {
      catalogo.fallo = Exception('sin red');
      await vm.cargar();
      expect(vm.error, isNotNull);
      catalogo.fallo = null;

      await vm.cargar();

      expect(vm.error, isNull);
      expect(vm.errorDetalle, isNull);
      expect(vm.planes, hasLength(3));
    });
  });

  group('filtros', () {
    test('buscar envía el texto escrito; escribir solo no consulta', () async {
      await vm.cargar();

      vm.setTexto('guatape');
      expect(vm.texto, 'guatape');
      expect(catalogo.busquedas, hasLength(1));

      await vm.buscar();
      expect(catalogo.busquedas, hasLength(2));
      expect(catalogo.busquedas.last.texto, 'guatape');
    });

    test('toggleCategoria selecciona y, con la misma, deselecciona', () async {
      await vm.toggleCategoria(ExperienceCategory.aventura);
      expect(vm.categoria, ExperienceCategory.aventura);
      expect(catalogo.busquedas.last.categoria, ExperienceCategory.aventura);

      await vm.toggleCategoria(ExperienceCategory.aventura);
      expect(vm.categoria, isNull);
      expect(catalogo.busquedas.last.categoria, isNull);
    });

    test('aplicarFiltros: destino, precio y fecha con UNA sola consulta', () async {
      await vm.cargar();
      final fecha = DateTime(2026, 12, 24);

      await vm.aplicarFiltros(destino: 'Guatapé', precioMax: 150000, fecha: fecha);

      expect(catalogo.busquedas, hasLength(2));
      expect(catalogo.consultasDestinos, 2);
      final filtros = catalogo.busquedas.last;
      expect(filtros.destino, 'Guatapé');
      expect(filtros.precioMax, 150000);
      expect(filtros.fecha, fecha);
      expect(vm.destino, 'Guatapé');
      expect(vm.precioMax, 150000);
      expect(vm.fecha, fecha);
      expect(vm.filtrosActivos, 3);
    });

    test('aplicarFiltros sin valores quita los tres filtros, también con una consulta', () async {
      await vm.aplicarFiltros(destino: 'Guatapé', precioMax: 1, fecha: DateTime(2026, 12, 24));
      final antes = catalogo.busquedas.length;

      await vm.aplicarFiltros();

      expect(catalogo.busquedas, hasLength(antes + 1));
      expect(vm.filtrosActivos, 0);
      expect(vm.destino, isNull);
    });

    test('aplicarFiltros notifica una sola carga (cargando → listo)', () async {
      await vm.cargar();
      final estados = <bool>[];
      vm.addListener(() => estados.add(vm.cargando));

      await vm.aplicarFiltros(destino: 'Jardín');

      expect(estados, [true, false]);
    });

    test(
      'PRESERVE: setDestino, setPrecioMax, setFecha y limpiarFiltros consultan una vez',
      () async {
        await vm.setDestino('Jardín');
        expect(catalogo.busquedas.last.destino, 'Jardín');
        await vm.setPrecioMax(90000);
        expect(catalogo.busquedas.last.precioMax, 90000);
        await vm.setFecha(DateTime(2026, 12, 1));
        expect(catalogo.busquedas.last.fecha, DateTime(2026, 12, 1));
        expect(catalogo.busquedas, hasLength(3));
        expect(vm.filtrosActivos, 3);

        await vm.limpiarFiltros();

        expect(catalogo.busquedas, hasLength(4));
        expect(vm.filtrosActivos, 0);
      },
    );

    test('cambiarOrden consulta con el nuevo orden', () async {
      await vm.cambiarOrden(OrdenCatalogo.precioAsc);

      expect(vm.orden, OrdenCatalogo.precioAsc);
      expect(catalogo.busquedas.last.orden, OrdenCatalogo.precioAsc);
    });
  });

  group('selección para comparar', () {
    test('agrega, quita y respeta el máximo de ${CatalogViewModel.maxComparar}', () async {
      catalogo.planes = [
        for (final id in ['a', 'b', 'c', 'd']) planDePrueba(id: id),
      ];
      await vm.cargar();
      final [a, b, c, d] = vm.planes;

      vm
        ..toggleComparar(a)
        ..toggleComparar(b)
        ..toggleComparar(c)
        ..toggleComparar(d);

      expect(vm.seleccion.map((p) => p.id), ['a', 'b', 'c']);
      expect(vm.comparando(d), isFalse);

      vm.toggleComparar(b);
      expect(vm.seleccion.map((p) => p.id), ['a', 'c']);
      expect(vm.comparando(b), isFalse);

      vm.limpiarComparar();
      expect(vm.seleccion, isEmpty);
    });

    test('al recargar se descartan los seleccionados que ya no aparecen', () async {
      await vm.cargar();
      vm
        ..toggleComparar(vm.planes[0])
        ..toggleComparar(vm.planes[1]);
      catalogo.planes = [planDePrueba(id: 'b')];

      await vm.cargar();

      expect(vm.seleccion.map((p) => p.id), ['b']);
    });
  });

  group('dispose', () {
    test('una carga que termina después de dispose no notifica ni lanza', () async {
      final propio = CatalogViewModel(catalogo: catalogo);
      final puerta = catalogo.compuerta = Completer<void>();
      final carga = propio.cargar();

      propio.dispose();
      puerta.complete();

      await expectLater(carga, completes);
    });

    test('un error tardío después de dispose tampoco lanza', () async {
      final propio = CatalogViewModel(catalogo: catalogo);
      final puerta = catalogo.compuerta = Completer<void>();
      catalogo.fallo = Exception('sin red');
      final carga = propio.cargar();

      propio.dispose();
      puerta.complete();

      await expectLater(carga, completes);
    });
  });
}

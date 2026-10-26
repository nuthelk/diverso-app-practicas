import 'package:diverso_core/diverso_core.dart';
import 'package:flutter_test/flutter_test.dart';

/// Resumen público de agencia (`agencias_publicas()`): parseo, etiqueta de puntaje («Nueva» sin
/// reseñas, nunca 0), iniciales del logo de respaldo y orden de la lista de «Agencias».

AgenciaResumen _ag(
  String nombre, {
  double? rating,
  int reviews = 0,
  int planes = 1,
}) =>
    AgenciaResumen(
      id: nombre,
      nombre: nombre,
      ciudad: 'Medellín',
      planesCount: planes,
      rating: rating,
      reviewsTotal: reviews,
    );

void main() {
  group('AgenciaResumen.fromMap', () {
    test('lee las columnas públicas y los agregados de la función', () {
      final a = AgenciaResumen.fromMap({
        'id': 'ag-1',
        'nombre': 'Rutas de Antioquia Cultural',
        'ciudad': 'Medellín',
        'descripcion': 'Cultura y memoria',
        'logo_url': 'https://logos.test/r.png',
        'planes_count': 3,
        'rating': 4.5,
        'reviews_total': 2,
        'portada_url': 'https://fotos.test/p.jpg',
      });
      expect(a.id, 'ag-1');
      expect(a.nombre, 'Rutas de Antioquia Cultural');
      expect(a.ciudad, 'Medellín');
      expect(a.descripcion, 'Cultura y memoria');
      expect(a.logoUrl, 'https://logos.test/r.png');
      expect(a.planesCount, 3);
      expect(a.rating, 4.5);
      expect(a.reviewsTotal, 2);
      expect(a.portadaUrl, 'https://fotos.test/p.jpg');
    });

    test('puntaje, logo y portada null se conservan; un entero se lee como double', () {
      final sin = AgenciaResumen.fromMap({
        'id': 'ag-2',
        'nombre': 'EcoAndes Viajes',
        'ciudad': 'Envigado',
        'descripcion': '',
        'logo_url': null,
        'planes_count': 5,
        'rating': null,
        'reviews_total': 0,
        'portada_url': null,
      });
      expect(sin.rating, isNull);
      expect(sin.logoUrl, isNull);
      expect(sin.portadaUrl, isNull);
      final entero = AgenciaResumen.fromMap({
        'id': 'ag-3',
        'nombre': 'X',
        'ciudad': 'Y',
        'descripcion': '',
        'planes_count': 1,
        'rating': 5,
        'reviews_total': 1,
      });
      expect(entero.rating, 5.0);
    });
  });

  group('etiquetas', () {
    test('sin reseñas dice «Nueva», nunca 0', () {
      final a = _ag('EcoAndes Viajes');
      expect(a.esNueva, isTrue);
      expect(a.puntajeTexto, 'Nueva');
    });

    test('con reseñas muestra el puntaje con un decimal', () {
      expect(_ag('A', rating: 4.5, reviews: 2).esNueva, isFalse);
      expect(_ag('A', rating: 4.5, reviews: 2).puntajeTexto, '4.5');
      expect(_ag('A', rating: 5, reviews: 1).puntajeTexto, '5.0');
    });

    test('«N planes» respeta el singular', () {
      expect(_ag('A', planes: 1).planesTexto, '1 plan');
      expect(_ag('A', planes: 3).planesTexto, '3 planes');
    });
  });

  group('iniciales', () {
    test('primera letra de las dos primeras palabras con contenido', () {
      expect(_ag('Rutas de Antioquia Cultural').iniciales, 'RA');
      expect(_ag('Café y Montaña Tours').iniciales, 'CM');
      expect(_ag('Guatapé Destinos SAS').iniciales, 'GD');
    });

    test('una sola palabra usa sus dos primeras letras; vacío no rompe', () {
      expect(_ag('Diverso').iniciales, 'DI');
      expect(_ag('a').iniciales, 'A');
      expect(_ag('   ').iniciales, '?');
    });
  });

  group('ordenarAgencias', () {
    final lista = [
      _ag('Zeta Nueva', planes: 9),
      _ag('Bravo', rating: 4.0, reviews: 5, planes: 2),
      _ag('Álamo', rating: 4.8, reviews: 1, planes: 4),
      _ag('Alfa', rating: 4.0, reviews: 9, planes: 2),
      _ag('Eco Nueva', planes: 9),
    ];

    List<String> nombres(OrdenAgencias o) => ordenarAgencias(lista, o).map((a) => a.nombre).toList();

    test('puntaje: mayor primero, empate por más reseñas, las «Nueva» al final por nombre', () {
      expect(nombres(OrdenAgencias.puntaje), ['Álamo', 'Alfa', 'Bravo', 'Eco Nueva', 'Zeta Nueva']);
    });

    test('más planes: más planes primero, empate por nombre', () {
      expect(nombres(OrdenAgencias.masPlanes), ['Eco Nueva', 'Zeta Nueva', 'Álamo', 'Alfa', 'Bravo']);
    });

    test('nombre: alfabético sin distinguir tildes ni mayúsculas', () {
      expect(nombres(OrdenAgencias.nombre), ['Álamo', 'Alfa', 'Bravo', 'Eco Nueva', 'Zeta Nueva']);
    });

    test('no modifica la lista original', () {
      final antes = lista.map((a) => a.nombre).toList();
      ordenarAgencias(lista, OrdenAgencias.nombre);
      expect(lista.map((a) => a.nombre).toList(), antes);
    });

    test('etiquetas de los criterios', () {
      expect(OrdenAgencias.values.map((o) => o.label).toList(), ['Puntaje', 'Más planes', 'Nombre']);
    });
  });
}

import {
  AgenciaResumen,
  LABEL_ORDEN_AGENCIAS,
  OrdenAgencias,
  ordenarAgencias,
} from '@/core/models/agencia-resumen';
import { valoresDe } from '@/core/models/enums';

/**
 * Resumen público de agencia (`agencias_publicas()`): parseo, etiqueta de puntaje («Nueva» sin
 * reseñas, nunca 0), iniciales del logo de respaldo y orden de la lista de «Agencias».
 */
function ag(
  nombre: string,
  { rating = null, reviews = 0, planes = 1 }: { rating?: number | null; reviews?: number; planes?: number } = {},
): AgenciaResumen {
  return new AgenciaResumen({
    id: nombre,
    nombre,
    ciudad: 'Medellín',
    planesCount: planes,
    rating,
    reviewsTotal: reviews,
  });
}

describe('AgenciaResumen.fromMap', () => {
  test('lee las columnas públicas y los agregados de la función', () => {
    const a = AgenciaResumen.fromMap({
      id: 'ag-1',
      nombre: 'Rutas de Antioquia Cultural',
      ciudad: 'Medellín',
      descripcion: 'Cultura y memoria',
      logo_url: 'https://logos.test/r.png',
      planes_count: 3,
      rating: 4.5,
      reviews_total: 2,
      portada_url: 'https://fotos.test/p.jpg',
    });
    expect(a.id).toBe('ag-1');
    expect(a.nombre).toBe('Rutas de Antioquia Cultural');
    expect(a.ciudad).toBe('Medellín');
    expect(a.descripcion).toBe('Cultura y memoria');
    expect(a.logoUrl).toBe('https://logos.test/r.png');
    expect(a.planesCount).toBe(3);
    expect(a.rating).toBe(4.5);
    expect(a.reviewsTotal).toBe(2);
    expect(a.portadaUrl).toBe('https://fotos.test/p.jpg');
  });

  test('puntaje, logo y portada null se conservan; un entero se lee como double', () => {
    const sin = AgenciaResumen.fromMap({
      id: 'ag-2',
      nombre: 'EcoAndes Viajes',
      ciudad: 'Envigado',
      descripcion: '',
      logo_url: null,
      planes_count: 5,
      rating: null,
      reviews_total: 0,
      portada_url: null,
    });
    expect(sin.rating).toBeNull();
    expect(sin.logoUrl).toBeNull();
    expect(sin.portadaUrl).toBeNull();
    const entero = AgenciaResumen.fromMap({
      id: 'ag-3',
      nombre: 'X',
      ciudad: 'Y',
      descripcion: '',
      planes_count: 1,
      rating: 5,
      reviews_total: 1,
    });
    expect(entero.rating).toBe(5.0);
    expect(entero.puntajeTexto).toBe('5.0');
  });
});

describe('etiquetas', () => {
  test('sin reseñas dice «Nueva», nunca 0', () => {
    const a = ag('EcoAndes Viajes');
    expect(a.esNueva).toBe(true);
    expect(a.puntajeTexto).toBe('Nueva');
  });

  test('con reseñas muestra el puntaje con un decimal', () => {
    expect(ag('A', { rating: 4.5, reviews: 2 }).esNueva).toBe(false);
    expect(ag('A', { rating: 4.5, reviews: 2 }).puntajeTexto).toBe('4.5');
    expect(ag('A', { rating: 5, reviews: 1 }).puntajeTexto).toBe('5.0');
  });

  test('«N planes» respeta el singular', () => {
    expect(ag('A', { planes: 1 }).planesTexto).toBe('1 plan');
    expect(ag('A', { planes: 3 }).planesTexto).toBe('3 planes');
  });
});

describe('iniciales', () => {
  test('primera letra de las dos primeras palabras con contenido', () => {
    expect(ag('Rutas de Antioquia Cultural').iniciales).toBe('RA');
    expect(ag('Café y Montaña Tours').iniciales).toBe('CM');
    expect(ag('Guatapé Destinos SAS').iniciales).toBe('GD');
  });

  test('una sola palabra usa sus dos primeras letras; vacío no rompe', () => {
    expect(ag('Diverso').iniciales).toBe('DI');
    expect(ag('a').iniciales).toBe('A');
    expect(ag('   ').iniciales).toBe('?');
  });
});

describe('ordenarAgencias', () => {
  const lista = [
    ag('Zeta Nueva', { planes: 9 }),
    ag('Bravo', { rating: 4.0, reviews: 5, planes: 2 }),
    ag('Álamo', { rating: 4.8, reviews: 1, planes: 4 }),
    ag('Alfa', { rating: 4.0, reviews: 9, planes: 2 }),
    ag('Eco Nueva', { planes: 9 }),
  ];

  const nombres = (o: OrdenAgencias) => ordenarAgencias(lista, o).map((a) => a.nombre);

  test('puntaje: mayor primero, empate por más reseñas, las «Nueva» al final por nombre', () => {
    expect(nombres(OrdenAgencias.puntaje)).toEqual(['Álamo', 'Alfa', 'Bravo', 'Eco Nueva', 'Zeta Nueva']);
  });

  test('más planes: más planes primero, empate por nombre', () => {
    expect(nombres(OrdenAgencias.masPlanes)).toEqual([
      'Eco Nueva',
      'Zeta Nueva',
      'Álamo',
      'Alfa',
      'Bravo',
    ]);
  });

  test('nombre: alfabético sin distinguir tildes ni mayúsculas', () => {
    expect(nombres(OrdenAgencias.nombre)).toEqual(['Álamo', 'Alfa', 'Bravo', 'Eco Nueva', 'Zeta Nueva']);
  });

  test('no modifica la lista original', () => {
    const antes = lista.map((a) => a.nombre);
    ordenarAgencias(lista, OrdenAgencias.nombre);
    expect(lista.map((a) => a.nombre)).toEqual(antes);
  });

  test('etiquetas de los criterios', () => {
    expect(valoresDe(OrdenAgencias).map((o) => LABEL_ORDEN_AGENCIAS[o])).toEqual([
      'Puntaje',
      'Más planes',
      'Nombre',
    ]);
  });
});

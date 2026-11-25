import {
  AgencySummary,
  LABEL_AGENCY_SORT,
  AgencySort,
  sortAgencies,
} from '@/core/models/agency-summary';
import { valuesOf } from '@/core/models/enums';

/**
 * Resumen público de agencia (`agencias_publicas()`): parseo, etiqueta de puntaje («Nueva» sin
 * reseñas, nunca 0), iniciales del logo de respaldo y orden de la lista de «Agencias».
 */
function agency(
  name: string,
  { rating = null, reviews = 0, plans = 1 }: { rating?: number | null; reviews?: number; plans?: number } = {},
): AgencySummary {
  return new AgencySummary({
    id: name,
    name,
    city: 'Medellín',
    planCount: plans,
    rating,
    reviewsTotal: reviews,
  });
}

describe('AgenciaResumen.fromMap', () => {
  test('lee las columnas públicas y los agregados de la función', () => {
    const a = AgencySummary.fromMap({
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
    expect(a.name).toBe('Rutas de Antioquia Cultural');
    expect(a.city).toBe('Medellín');
    expect(a.description).toBe('Cultura y memoria');
    expect(a.logoUrl).toBe('https://logos.test/r.png');
    expect(a.planCount).toBe(3);
    expect(a.rating).toBe(4.5);
    expect(a.reviewsTotal).toBe(2);
    expect(a.coverUrl).toBe('https://fotos.test/p.jpg');
  });

  test('puntaje, logo y portada null se conservan; un entero se lee como double', () => {
    const missing = AgencySummary.fromMap({
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
    expect(missing.rating).toBeNull();
    expect(missing.logoUrl).toBeNull();
    expect(missing.coverUrl).toBeNull();
    const wholeNumber = AgencySummary.fromMap({
      id: 'ag-3',
      nombre: 'X',
      ciudad: 'Y',
      descripcion: '',
      planes_count: 1,
      rating: 5,
      reviews_total: 1,
    });
    expect(wholeNumber.rating).toBe(5.0);
    expect(wholeNumber.ratingText).toBe('5.0');
  });
});

describe('etiquetas', () => {
  test('sin reseñas dice «Nueva», nunca 0', () => {
    const a = agency('EcoAndes Viajes');
    expect(a.isNew).toBe(true);
    expect(a.ratingText).toBe('Nueva');
  });

  test('con reseñas muestra el puntaje con un decimal', () => {
    expect(agency('A', { rating: 4.5, reviews: 2 }).isNew).toBe(false);
    expect(agency('A', { rating: 4.5, reviews: 2 }).ratingText).toBe('4.5');
    expect(agency('A', { rating: 5, reviews: 1 }).ratingText).toBe('5.0');
  });

  test('«N planes» respeta el singular', () => {
    expect(agency('A', { plans: 1 }).plansText).toBe('1 plan');
    expect(agency('A', { plans: 3 }).plansText).toBe('3 planes');
  });
});

describe('iniciales', () => {
  test('primera letra de las dos primeras palabras con contenido', () => {
    expect(agency('Rutas de Antioquia Cultural').initials).toBe('RA');
    expect(agency('Café y Montaña Tours').initials).toBe('CM');
    expect(agency('Guatapé Destinos SAS').initials).toBe('GD');
  });

  test('una sola palabra usa sus dos primeras letras; vacío no rompe', () => {
    expect(agency('Diverso').initials).toBe('DI');
    expect(agency('a').initials).toBe('A');
    expect(agency('   ').initials).toBe('?');
  });
});

describe('ordenarAgencias', () => {
  const list = [
    agency('Zeta Nueva', { plans: 9 }),
    agency('Bravo', { rating: 4.0, reviews: 5, plans: 2 }),
    agency('Álamo', { rating: 4.8, reviews: 1, plans: 4 }),
    agency('Alfa', { rating: 4.0, reviews: 9, plans: 2 }),
    agency('Eco Nueva', { plans: 9 }),
  ];

  const names = (o: AgencySort) => sortAgencies(list, o).map((a) => a.name);

  test('puntaje: mayor primero, empate por más reseñas, las «Nueva» al final por nombre', () => {
    expect(names(AgencySort.score)).toEqual(['Álamo', 'Alfa', 'Bravo', 'Eco Nueva', 'Zeta Nueva']);
  });

  test('más planes: más planes primero, empate por nombre', () => {
    expect(names(AgencySort.mostPlans)).toEqual([
      'Eco Nueva',
      'Zeta Nueva',
      'Álamo',
      'Alfa',
      'Bravo',
    ]);
  });

  test('nombre: alfabético sin distinguir tildes ni mayúsculas', () => {
    expect(names(AgencySort.name)).toEqual(['Álamo', 'Alfa', 'Bravo', 'Eco Nueva', 'Zeta Nueva']);
  });

  test('no modifica la lista original', () => {
    const before = list.map((a) => a.name);
    sortAgencies(list, AgencySort.name);
    expect(list.map((a) => a.name)).toEqual(before);
  });

  test('etiquetas de los criterios', () => {
    expect(valuesOf(AgencySort).map((o) => LABEL_AGENCY_SORT[o])).toEqual([
      'Puntaje',
      'Más planes',
      'Nombre',
    ]);
  });
});

import { describe, expect, it } from 'vitest';
import { componerDuracion, opcionesUnidad, parsearDuracion } from './duracion';

describe('componerDuracion', () => {
  it.each([
    [1, 'dias', '1 día'],
    [2, 'dias', '2 días'],
    [1, 'horas', '1 hora'],
    [4, 'horas', '4 horas'],
    [1, 'minutos', '1 minuto'],
    [90, 'minutos', '90 minutos'],
    [1.5, 'horas', '1.5 horas'],
  ] as const)('%s %s → «%s»', (cantidad, unidad, esperado) => {
    expect(componerDuracion(cantidad, unidad)).toBe(esperado);
  });

  it.each([null, 0, -3])('cantidad %s → texto vacío', (cantidad) => {
    expect(componerDuracion(cantidad, 'dias')).toBe('');
  });
});

describe('parsearDuracion', () => {
  it.each([
    ['1 día', 1, 'dias'],
    ['2 días / 1 noche', 2, 'dias'],
    ['4 horas', 4, 'horas'],
    ['2,5 horas', 2.5, 'horas'],
    ['90 minutos', 90, 'minutos'],
    ['3 DIAS', 3, 'dias'],
  ])('«%s» → %s %s', (texto, cantidad, unidad) => {
    expect(parsearDuracion(texto)).toEqual({ cantidad, unidad });
  });

  it.each(['', 'Medio día', 'Todo el día'])('«%s» no se entiende: sin cantidad y en días', (texto) => {
    expect(parsearDuracion(texto)).toEqual({ cantidad: null, unidad: 'dias' });
  });
});

describe('opcionesUnidad', () => {
  it('en singular solo cuando la cantidad es 1', () => {
    expect(opcionesUnidad(1)).toEqual([
      { valor: 'dias', etiqueta: 'día' },
      { valor: 'horas', etiqueta: 'hora' },
      { valor: 'minutos', etiqueta: 'minuto' },
    ]);
  });

  it.each([2, 0, null])('en plural con cantidad %s', (cantidad) => {
    expect(opcionesUnidad(cantidad).map((o) => o.etiqueta)).toEqual(['días', 'horas', 'minutos']);
  });
});

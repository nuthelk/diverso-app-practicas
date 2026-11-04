import { describe, expect, it } from 'vitest';
import { estrellasLlenas, haceCuanto, resenasParaMostrar } from '$lib/features/resumen/model/resenas';
import type { ResenaReciente } from '$lib/features/resumen/model/quienes-van';

/** Martes 3-nov-2026, 12:00 en Bogotá. */
const MARTES = new Date(Date.UTC(2026, 10, 3, 17, 0, 0));

describe('haceCuanto', () => {
  it.each([
    ['2026-11-03T15:00:00Z', 'hoy'],
    ['2026-11-02T20:00:00Z', 'ayer'],
    ['2026-10-31T20:00:00Z', 'hace 3 días'],
    ['2026-10-27T20:00:00Z', 'hace 7 días'],
    ['2026-10-20T20:00:00Z', 'hace 2 semanas'],
    ['2026-10-07T20:00:00Z', 'hace 3 semanas'],
    ['2026-09-01T20:00:00Z', 'hace 2 meses'],
    ['2025-09-01T20:00:00Z', 'hace 1 año'],
  ])('%s → %s', (iso, esperado) => {
    expect(haceCuanto(iso, MARTES)).toBe(esperado);
  });

  it('cuenta el día de Bogotá: 21:00 de ayer allá ya es "ayer" aunque en UTC sea hoy', () => {
    expect(haceCuanto('2026-11-03T02:00:00Z', MARTES)).toBe('ayer'); // lunes 21:00 en Bogotá
  });

  it('una fecha futura (reloj desfasado) cuenta como hoy', () => {
    expect(haceCuanto('2026-11-09T12:00:00Z', MARTES)).toBe('hoy');
  });
});

describe('estrellasLlenas', () => {
  it('redondea y se queda entre 0 y 5', () => {
    expect([5, 4.6, 3.2, 0, -1, 9].map(estrellasLlenas)).toEqual([5, 5, 3, 0, 0, 5]);
  });
});

describe('resenasParaMostrar', () => {
  const r = (parcial: Partial<ResenaReciente> = {}): ResenaReciente => ({
    calificacion: 5,
    comentario: 'Todo muy bien',
    nombre_corto: 'Laura V.',
    plan_titulo: 'Río Claro 2 días con hospedaje',
    created_at: '2026-11-02T20:00:00Z',
    ...parcial,
  });

  it('estrellas, texto, quién, plan y hace cuánto', () => {
    expect(resenasParaMostrar([r()], MARTES)).toEqual([
      {
        estrellas: 5,
        texto: 'Todo muy bien',
        nombre: 'Laura V.',
        plan: 'Río Claro 2 días con hospedaje',
        cuando: 'ayer',
      },
    ]);
  });

  it('sin comentario (o solo espacios) muestra solo las estrellas', () => {
    expect(resenasParaMostrar([r({ comentario: null })], MARTES)[0].texto).toBeNull();
    expect(resenasParaMostrar([r({ comentario: '   ' })], MARTES)[0].texto).toBeNull();
  });

  it('sin reseñas, lista vacía', () => {
    expect(resenasParaMostrar([], MARTES)).toEqual([]);
  });
});

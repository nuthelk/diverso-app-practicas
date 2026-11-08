import { describe, expect, it } from 'vitest';
import { tusPlanes } from '$lib/features/resumen/model/tus-planes';
import type { Salida } from '$lib/features/resumen/model/salidas';

let n = 0;
const salida = (planId: string, titulo: string, reservados: number, total = 24): Salida => ({
  id: `s${n++}`,
  planId,
  fecha: '2026-11-05',
  hora: '06:30',
  titulo,
  reservados,
  total,
  libres: total - reservados,
  porcentaje: Math.round((reservados / total) * 100),
  yaSalio: false,
  hoy: false,
  pendientes: 0,
  vendido: 0,
});

describe('tusPlanes · viajeros por plan en el período', () => {
  it('por plan: viajeros, salidas y ocupación de sus cupos, el que más viajeros tiene primero', () => {
    const planes = tusPlanes([
      salida('sr', 'San Rafael', 2),
      salida('rc', 'Río Claro', 5),
      salida('rc', 'Río Claro', 3),
      salida('rc', 'Río Claro', 4),
      salida('sr', 'San Rafael', 5),
    ]);
    expect(planes.map((p) => [p.id, p.titulo, p.personas, p.salidas, p.ocupacion])).toEqual([
      ['rc', 'Río Claro', 12, 3, 17], // 12 de 72 cupos
      ['sr', 'San Rafael', 7, 2, 15], // 7 de 48
    ]);
  });

  it('el ancho de la barra es relativo al plan con más viajeros', () => {
    const planes = tusPlanes([salida('a', 'A', 12), salida('b', 'B', 6), salida('c', 'C', 0)]);
    expect(planes.map((p) => [p.titulo, p.ancho])).toEqual([
      ['A', 100],
      ['B', 50],
      ['C', 0],
    ]);
  });

  it('un plan con salidas pero sin viajeros aparece con ceros; nadie divide por cero', () => {
    expect(tusPlanes([salida('a', 'A', 0)])).toEqual([
      { id: 'a', titulo: 'A', personas: 0, salidas: 1, cupos: 24, ocupacion: 0, ancho: 0 },
    ]);
    expect(tusPlanes([salida('a', 'A', 0, 0)])[0]).toMatchObject({ cupos: 0, ocupacion: 0 });
  });

  it('con igual número de viajeros ordena por título', () => {
    expect(tusPlanes([salida('b', 'Bahía', 4), salida('a', 'Alto', 4)]).map((p) => p.titulo)).toEqual(['Alto', 'Bahía']);
  });

  it('sin salidas en el período no hay planes', () => {
    expect(tusPlanes([])).toEqual([]);
  });
});

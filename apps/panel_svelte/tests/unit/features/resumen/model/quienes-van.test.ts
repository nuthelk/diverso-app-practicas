import { describe, expect, it } from 'vitest';
import {
  cuposDeSalida,
  puntosDeCupos,
  reservasPorFecha,
  type QuienViaja,
} from '$lib/features/resumen/model/quienes-van';

const fila = (parcial: Partial<QuienViaja> & Pick<QuienViaja, 'booking_id'>): QuienViaja => ({
  plan_date_id: 'pd-1',
  codigo: `DV-${parcial.booking_id}`,
  nombre_corto: 'Laura V.',
  pax: 2,
  estado: 'confirmada',
  ...parcial,
});

describe('reservasPorFecha', () => {
  it('agrupa las reservas por la fecha del plan', () => {
    const grupos = reservasPorFecha([
      fila({ booking_id: 'a', plan_date_id: 'pd-1', nombre_corto: 'Laura V.', pax: 2 }),
      fila({ booking_id: 'b', plan_date_id: 'pd-2', nombre_corto: 'Natalia B.', pax: 2 }),
      fila({ booking_id: 'c', plan_date_id: 'pd-1', nombre_corto: 'Andrés M.', pax: 3 }),
    ]);
    expect([...grupos.keys()]).toEqual(['pd-1', 'pd-2']);
    expect(grupos.get('pd-1')!.map((r) => [r.nombre, r.personas, r.texto])).toEqual([
      ['Laura V.', 2, '2 personas'],
      ['Andrés M.', 3, '3 personas'],
    ]);
  });

  it('distingue pendientes de pago de confirmadas y deja las confirmadas primero', () => {
    const [primera, segunda, tercera] = reservasPorFecha([
      fila({ booking_id: 'a', nombre_corto: 'Pendiente P.', estado: 'pendiente_pago' }),
      fila({ booking_id: 'b', nombre_corto: 'Confirmada C.' }),
      fila({ booking_id: 'c', nombre_corto: 'Otra O.' }),
    ]).get('pd-1')!;
    expect([primera.nombre, primera.pendiente]).toEqual(['Confirmada C.', false]);
    expect([segunda.nombre, segunda.pendiente]).toEqual(['Otra O.', false]);
    expect([tercera.nombre, tercera.pendiente]).toEqual(['Pendiente P.', true]);
  });

  it('una persona va en singular', () => {
    expect(reservasPorFecha([fila({ booking_id: 'a', pax: 1 })]).get('pd-1')![0].texto).toBe('1 persona');
  });

  it('sin filas no hay grupos', () => {
    expect(reservasPorFecha([]).size).toBe(0);
  });
});

describe('cuposDeSalida', () => {
  it('«5 de 24 cupos reservados · 19 libres»', () => {
    expect(cuposDeSalida({ reservados: 5, total: 24, libres: 19 })).toBe('5 de 24 cupos reservados · 19 libres');
  });

  it('singulares', () => {
    expect(cuposDeSalida({ reservados: 1, total: 2, libres: 1 })).toBe('1 de 2 cupos reservados · 1 libre');
  });
});

describe('puntosDeCupos', () => {
  it('un punto por cupo, llenos los reservados', () => {
    expect(puntosDeCupos(5, 24)).toEqual({ llenos: 5, total: 24 });
  });

  it('con muchos cupos reduce proporcionalmente para que quepan', () => {
    expect(puntosDeCupos(50, 100, 40)).toEqual({ llenos: 20, total: 40 });
  });

  it('una persona reservada siempre se ve, y lleno es lleno', () => {
    expect(puntosDeCupos(1, 200, 40)).toEqual({ llenos: 1, total: 40 });
    expect(puntosDeCupos(200, 200, 40)).toEqual({ llenos: 40, total: 40 });
  });

  it('sin cupos no hay puntos', () => {
    expect(puntosDeCupos(0, 0)).toEqual({ llenos: 0, total: 0 });
  });
});

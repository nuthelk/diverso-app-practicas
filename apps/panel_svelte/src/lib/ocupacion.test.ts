import { describe, expect, it } from 'vitest';
import { proximasSalidas, resumenOcupacion } from './ocupacion';
import { fecha, HOY, plan } from '../test/fixtures';

const planes = [
  plan('Guatapé', [
    fecha({ fecha: '2025-01-01', cupo_total: 10, cupo_disponible: 0 }), // pasada
    fecha({ fecha: '2026-10-30', cupo_total: 10, cupo_disponible: 2 }),
    fecha({ fecha: '2026-11-10', cupo_total: 10, cupo_disponible: 10 }),
  ]),
  plan('Jardín', [
    fecha({ fecha: '2026-11-01', cupo_total: 20, cupo_disponible: 10 }),
    fecha({ fecha: '2027-03-01', cupo_total: 10, cupo_disponible: 5 }), // fuera de las 8 semanas
    fecha({ fecha: '2026-11-20', cupo_total: 10, cupo_disponible: 0 }), // sin cupos: no es «próxima»
  ]),
];

describe('resumenOcupacion', () => {
  it('suma vendidos y total de las fechas dentro de las próximas 8 semanas', () => {
    // 10-30: 8/10, 11-01: 10/20, 11-10: 0/10, 11-20: 10/10 (llena, cuenta aquí).
    expect(resumenOcupacion(planes, HOY)).toEqual({ vendidos: 28, total: 50, ocup: 28 / 50 });
  });

  it('el día 56 ya queda fuera y hoy cuenta', () => {
    const p = [
      plan('P', [
        fecha({ fecha: '2026-10-25', cupo_total: 4, cupo_disponible: 0 }), // hoy
        fecha({ fecha: '2026-12-20', cupo_total: 4, cupo_disponible: 0 }), // hoy + 56 días
      ]),
    ];
    expect(resumenOcupacion(p, HOY)).toEqual({ vendidos: 4, total: 4, ocup: 1 });
  });

  it('sin planes la ocupación es 0 sin dividir por cero', () => {
    expect(resumenOcupacion([], HOY)).toEqual({ vendidos: 0, total: 0, ocup: 0 });
  });
});

describe('proximasSalidas', () => {
  it('ordena de la más llena a la más vacía, desempata por fecha y omite pasadas y sin cupos', () => {
    const salidas = proximasSalidas(planes, HOY);
    expect(salidas.map((s) => [s.titulo, s.fecha, s.vendidos, s.cupos])).toEqual([
      ['Guatapé', '2026-10-30', 8, 2],
      ['Jardín', '2026-11-01', 10, 10],
      ['Jardín', '2027-03-01', 5, 5],
      ['Guatapé', '2026-11-10', 0, 10],
    ]);
    expect(salidas[0].ocup).toBe(0.8);
  });

  it('devuelve como máximo 6 salidas', () => {
    const muchas = [
      plan(
        'Muchas',
        Array.from({ length: 9 }, (_, i) => fecha({ fecha: `2026-11-${String(i + 1).padStart(2, '0')}` })),
      ),
    ];
    expect(proximasSalidas(muchas, HOY)).toHaveLength(6);
  });
});

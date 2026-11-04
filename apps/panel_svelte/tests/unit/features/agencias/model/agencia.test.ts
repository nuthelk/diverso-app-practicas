import { describe, expect, it } from 'vitest';
import { diasParaVencer, estadoVigencia, vigenciaSugerida } from '$lib/features/agencias/model/agencia';
import { enZona, HOY, HOY_BOGOTA } from '$tests/fixtures';

describe('estadoVigencia', () => {
  it.each([
    [null, 'sin_vigencia'],
    ['2026-10-24', 'vencido'],
    ['2026-10-25', 'por_vencer'], // vence hoy: todavía sirve
    ['2026-11-24', 'por_vencer'], // 30 días: el límite
    ['2026-11-25', 'vigente'], // 31 días
    ['2027-03-31', 'vigente'],
  ])('rnt_vigente_hasta %s → %s', (hasta, esperado) => {
    expect(estadoVigencia({ rnt_vigente_hasta: hasta }, HOY)).toBe(esperado);
  });

  it('no depende de la hora del día', () => {
    expect(estadoVigencia({ rnt_vigente_hasta: '2026-10-25' }, new Date(2026, 9, 25, 23, 59))).toBe('por_vencer');
  });
});

describe('diasParaVencer', () => {
  it('cuenta días enteros, negativos si ya venció', () => {
    expect(diasParaVencer({ rnt_vigente_hasta: '2026-11-04' }, HOY)).toBe(10);
    expect(diasParaVencer({ rnt_vigente_hasta: '2026-10-25' }, HOY)).toBe(0);
    expect(diasParaVencer({ rnt_vigente_hasta: '2026-10-20' }, HOY)).toBe(-5);
  });

  it('sin vigencia devuelve null', () => {
    expect(diasParaVencer({ rnt_vigente_hasta: null }, HOY)).toBeNull();
  });

  // Mediodía en Bogotá (17:00 UTC) del domingo 25-oct; 23:30 en Bogotá ya es lunes 26 en UTC y en las zonas del este.
  const NOCHE_BOGOTA = new Date(Date.UTC(2026, 9, 26, 4, 30, 0));

  it.each(['America/Bogota', 'UTC', 'Europe/Madrid', 'Asia/Tokyo', 'Pacific/Auckland', 'Pacific/Kiritimati', 'America/Los_Angeles'])(
    'cuenta los días por la fecha de Bogotá, no por la zona del navegador (%s)',
    (zona) => {
      for (const ahora of [HOY_BOGOTA, NOCHE_BOGOTA]) {
        expect(enZona(zona, () => diasParaVencer({ rnt_vigente_hasta: '2026-10-25' }, ahora)), zona).toBe(0);
        expect(enZona(zona, () => diasParaVencer({ rnt_vigente_hasta: '2026-11-04' }, ahora)), zona).toBe(10);
        expect(enZona(zona, () => diasParaVencer({ rnt_vigente_hasta: '2026-10-24' }, ahora)), zona).toBe(-1);
      }
    },
  );

  it('al cruzar la medianoche de Bogotá cambia el día (00:30 del lunes 26 en Bogotá = 05:30 UTC)', () => {
    const lunes = new Date(Date.UTC(2026, 9, 26, 5, 30, 0));
    expect(diasParaVencer({ rnt_vigente_hasta: '2026-10-25' }, lunes)).toBe(-1);
    expect(estadoVigencia({ rnt_vigente_hasta: '2026-10-25' }, lunes)).toBe('vencido');
  });

  it('el estado del RNT también sigue a Bogotá: vence hoy sigue siendo «por vencer» con el navegador adelantado', () => {
    expect(enZona('Pacific/Auckland', () => estadoVigencia({ rnt_vigente_hasta: '2026-10-25' }, NOCHE_BOGOTA))).toBe('por_vencer');
  });
});

describe('vigenciaSugerida', () => {
  it('es el 31 de marzo del año siguiente', () => {
    expect(vigenciaSugerida(HOY)).toBe('2027-03-31');
    expect(vigenciaSugerida(new Date(2027, 0, 2))).toBe('2028-03-31');
  });
});

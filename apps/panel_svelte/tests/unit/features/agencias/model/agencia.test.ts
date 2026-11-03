import { describe, expect, it } from 'vitest';
import { diasParaVencer, estadoVigencia, vigenciaSugerida } from '$lib/features/agencias/model/agencia';
import { HOY } from '$tests/fixtures';

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
});

describe('vigenciaSugerida', () => {
  it('es el 31 de marzo del año siguiente', () => {
    expect(vigenciaSugerida(HOY)).toBe('2027-03-31');
    expect(vigenciaSugerida(new Date(2027, 0, 2))).toBe('2028-03-31');
  });
});

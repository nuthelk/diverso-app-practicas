import { describe, expect, it } from 'vitest';
import { avisoAnticiposGenerados, avisoSemanaGenerada, vigenciaInicial } from '$lib/features/admin/model/admin';
import { agencia, HOY } from '$tests/fixtures';

describe('vigenciaInicial', () => {
  it('al renovar una vigencia vigente, propone el año siguiente a la actual', () => {
    const a = agencia({ rnt_vigente_hasta: '2027-03-31' });
    expect(vigenciaInicial(a, 'vigencia', HOY)).toBe('2028-03-31');
  });

  it('al renovar una vigencia vencida, propone según hoy', () => {
    const a = agencia({ rnt_vigente_hasta: '2026-10-20' });
    expect(vigenciaInicial(a, 'vigencia', HOY)).toBe('2027-03-31');
  });

  it('al verificar, propone según hoy aunque haya vigencia previa', () => {
    const a = agencia({ rnt_vigente_hasta: '2027-03-31' });
    expect(vigenciaInicial(a, 'verificar', HOY)).toBe('2027-03-31');
  });

  it('sin vigencia previa, propone según hoy', () => {
    const a = agencia({ rnt_vigente_hasta: null });
    expect(vigenciaInicial(a, 'vigencia', HOY)).toBe('2027-03-31');
  });
});

describe('avisoSemanaGenerada', () => {
  const periodo = { periodo_inicio: '2026-10-19', periodo_fin: '2026-10-25' };

  it('avisa que no había nada nuevo cuando no se generó ninguna', () => {
    expect(avisoSemanaGenerada({ ...periodo, liquidaciones: 0, items: 0 })).toBe(
      'Semana del 19 oct – 25 oct 2026: no había nada nuevo por liquidar.',
    );
  });

  it('resume cuántas liquidaciones e items se generaron', () => {
    expect(avisoSemanaGenerada({ ...periodo, liquidaciones: 3, items: 7 })).toBe(
      'Semana del 19 oct – 25 oct 2026: 3 liquidaciones con 7 items.',
    );
  });
});

describe('avisoAnticiposGenerados', () => {
  it('avisa que no había anticipos nuevos', () => {
    expect(avisoAnticiposGenerados({ liquidaciones: 0, items: 0 })).toBe(
      'No había anticipos nuevos por generar.',
    );
  });

  it('resume cuántas liquidaciones y reservas se generaron', () => {
    expect(avisoAnticiposGenerados({ liquidaciones: 2, items: 5 })).toBe(
      'Anticipos generados: 2 liquidaciones con 5 reservas.',
    );
  });
});

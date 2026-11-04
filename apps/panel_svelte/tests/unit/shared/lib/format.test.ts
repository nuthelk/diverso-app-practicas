import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cop, fechaCorta, fechaLarga, fechaTexto, hoyISO, plural, unirNombres } from '$lib/shared/lib/format';

/** Normaliza el NBSP que Intl usa entre «$» y el número. */
const plano = (s: string) => s.replace(/\u00a0/g, ' ');

describe('cop', () => {
  it('formatea pesos colombianos sin decimales y con punto de miles', () => {
    expect(plano(cop(165000))).toBe('$ 165.000');
    expect(plano(cop(1370000))).toBe('$ 1.370.000');
    expect(plano(cop(0))).toBe('$ 0');
  });

  it('redondea a pesos enteros', () => {
    expect(plano(cop(1234.6))).toBe('$ 1.235');
  });

  it('los negativos conservan el signo', () => {
    expect(plano(cop(-5000))).toBe('-$ 5.000');
  });
});

describe('fechas', () => {
  it('fechaCorta: día de la semana, día y mes abreviados sin punto', () => {
    expect(fechaCorta('2026-10-25')).toBe('dom, 25 de oct');
    expect(fechaCorta('2026-12-01')).toBe('mar, 1 de dic');
  });

  it('fechaLarga: empieza en mayúscula e incluye el año', () => {
    expect(fechaLarga('2026-10-25')).toBe('Domingo, 25 de octubre de 2026');
  });

  it('fechaTexto: sirve dentro de una frase y acepta timestamps ISO', () => {
    expect(fechaTexto('2026-10-24')).toBe('24 de octubre de 2026');
    expect(fechaTexto('2027-03-31T18:30:00+00:00')).toBe('31 de marzo de 2027');
  });

  it('no se corre de día por la zona horaria (usa el mediodía local)', () => {
    expect(fechaTexto('2026-01-01')).toBe('1 de enero de 2026');
    expect(fechaTexto('2026-12-31')).toBe('31 de diciembre de 2026');
  });
});

describe('hoyISO', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
  });
  afterEach(() => vi.useRealTimers());

  it('devuelve la fecha de hoy como yyyy-mm-dd', () => {
    vi.setSystemTime(new Date(2026, 9, 25, 9, 30));
    expect(hoyISO()).toBe('2026-10-25');
  });
});

describe('plural', () => {
  it('singular solo con exactamente 1; cero y varios van en plural', () => {
    expect(plural(1, 'plan', 'planes')).toBe('plan');
    expect(plural(0, 'plan', 'planes')).toBe('planes');
    expect(plural(2, 'plan', 'planes')).toBe('planes');
  });
});

describe('unirNombres', () => {
  it('uno, dos o más, con «y» antes del último', () => {
    expect(unirNombres([])).toBe('');
    expect(unirNombres(['A'])).toBe('A');
    expect(unirNombres(['A', 'B'])).toBe('A y B');
    expect(unirNombres(['A', 'B', 'C'])).toBe('A, B y C');
  });
});

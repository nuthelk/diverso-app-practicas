import {
  formatCOP,
  formatFechaCorta,
  formatFechaLarga,
  formatFechaTexto,
  sinCortes,
} from '@/core/utils/formatters';
import { fechaLocal } from '@/core/utils/fechas';

/**
 * Paridad con `intl` de Dart (locale `es` / `es_CO`). Los valores esperados salen de correr
 * `formatters.dart` con `intl 0.20.2` (no hay tests de formato en el núcleo Dart): `Intl` de
 * Hermes no se usa porque sus abreviaturas difieren.
 */
describe('formatCOP', () => {
  test.each([
    [0, '$ 0'],
    [5, '$ 5'],
    [999, '$ 999'],
    [1000, '$ 1.000'],
    [5000, '$ 5.000'],
    [12345, '$ 12.345'],
    [150000, '$ 150.000'],
    [165000, '$ 165.000'],
    [1234567, '$ 1.234.567'],
    [1000000000, '$ 1.000.000.000'],
  ])('%p → %p', (monto, esperado) => {
    expect(formatCOP(monto)).toBe(esperado);
  });

  test('sin decimales: redondea la mitad alejándose de cero (como Dart)', () => {
    expect(formatCOP(0.5)).toBe('$ 1');
    expect(formatCOP(1.5)).toBe('$ 2');
    expect(formatCOP(2.5)).toBe('$ 3');
    expect(formatCOP(999.5)).toBe('$ 1.000');
    expect(formatCOP(1234.4999)).toBe('$ 1.234');
    expect(formatCOP(165000.49)).toBe('$ 165.000');
    expect(formatCOP(165000.5)).toBe('$ 165.001');
  });

  test('negativos: el signo va después del prefijo', () => {
    expect(formatCOP(-1000)).toBe('$ -1.000');
    expect(formatCOP(-0.5)).toBe('$ -1');
  });
});

describe('sinCortes (montos dentro de una línea que puede partirse)', () => {
  const NBSP = '\u00A0';

  test('el «$» queda pegado al número: la línea no puede partirse entre ellos', () => {
    expect(sinCortes(`Total ${formatCOP(399000)}`)).toBe(`Total $${NBSP}399.000`);
    expect(sinCortes(formatCOP(-1000))).toBe(`$${NBSP}-1.000`);
  });

  test('el «%» tampoco se separa de su número', () => {
    expect(sinCortes('Reembolso de prueba pendiente · 100 % · $ 399.000')).toBe(
      `Reembolso de prueba pendiente · 100${NBSP}% · $${NBSP}399.000`,
    );
  });

  test('cambia todas las apariciones y deja intacto el resto del texto', () => {
    expect(sinCortes('de $ 1.000 a $ 2.000 (50 %) y 2 personas')).toBe(
      `de $${NBSP}1.000 a $${NBSP}2.000 (50${NBSP}%) y 2 personas`,
    );
    expect(sinCortes('Sin reembolso')).toBe('Sin reembolso');
    expect(sinCortes('cuesta $ y punto')).toBe('cuesta $ y punto');
  });

  test('formatCOP no cambia (paridad con intl de Dart): solo la línea que lo contiene', () => {
    expect(formatCOP(399000)).toBe('$ 399.000');
  });
});

describe('fechas en español (intl es)', () => {
  const meses: [number, string, string, string][] = [
    [1, 'sáb, 3 ene', 'sábado 3 de enero de 2026', '3 de enero de 2026'],
    [2, 'mar, 3 feb', 'martes 3 de febrero de 2026', '3 de febrero de 2026'],
    [3, 'mar, 3 mar', 'martes 3 de marzo de 2026', '3 de marzo de 2026'],
    [4, 'vie, 3 abr', 'viernes 3 de abril de 2026', '3 de abril de 2026'],
    [5, 'dom, 3 may', 'domingo 3 de mayo de 2026', '3 de mayo de 2026'],
    [6, 'mié, 3 jun', 'miércoles 3 de junio de 2026', '3 de junio de 2026'],
    [7, 'vie, 3 jul', 'viernes 3 de julio de 2026', '3 de julio de 2026'],
    [8, 'lun, 3 ago', 'lunes 3 de agosto de 2026', '3 de agosto de 2026'],
    [9, 'jue, 3 sept', 'jueves 3 de septiembre de 2026', '3 de septiembre de 2026'],
    [10, 'sáb, 3 oct', 'sábado 3 de octubre de 2026', '3 de octubre de 2026'],
    [11, 'mar, 3 nov', 'martes 3 de noviembre de 2026', '3 de noviembre de 2026'],
    [12, 'jue, 3 dic', 'jueves 3 de diciembre de 2026', '3 de diciembre de 2026'],
  ];

  test.each(meses)('mes %p', (mes, corta, larga, texto) => {
    const d = fechaLocal(2026, mes, 3);
    expect(formatFechaCorta(d)).toBe(corta);
    expect(formatFechaLarga(d)).toBe(larga);
    expect(formatFechaTexto(d)).toBe(texto);
  });

  test('los siete días de la semana', () => {
    const dias = Array.from({ length: 7 }, (_, i) => fechaLocal(2026, 10, 4 + i));
    expect(dias.map(formatFechaCorta)).toEqual([
      'dom, 4 oct',
      'lun, 5 oct',
      'mar, 6 oct',
      'mié, 7 oct',
      'jue, 8 oct',
      'vie, 9 oct',
      'sáb, 10 oct',
    ]);
    expect(dias.map(formatFechaLarga)).toEqual([
      'domingo 4 de octubre de 2026',
      'lunes 5 de octubre de 2026',
      'martes 6 de octubre de 2026',
      'miércoles 7 de octubre de 2026',
      'jueves 8 de octubre de 2026',
      'viernes 9 de octubre de 2026',
      'sábado 10 de octubre de 2026',
    ]);
  });

  test('el año no se rellena con ceros (patrón y)', () => {
    expect(formatFechaLarga(fechaLocal(5, 1, 1))).toBe('sábado 1 de enero de 5');
  });
});

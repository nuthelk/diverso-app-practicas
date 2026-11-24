import { normalizarBusqueda } from '@/core/utils/busqueda';

/**
 * `normalizarBusqueda` debe producir lo mismo que la columna `plans.busqueda`
 * (minúsculas + unaccent, migración 0011) para que `ilike` encuentre sin importar tildes.
 */
describe('normalizarBusqueda', () => {
  test('quita tildes, diéresis y eñes', () => {
    expect(normalizarBusqueda('Guatapé')).toBe('guatape');
    expect(normalizarBusqueda('CAFÉ')).toBe('cafe');
    expect(normalizarBusqueda('Pingüino')).toBe('pinguino');
    expect(normalizarBusqueda('Año Nuevo')).toBe('ano nuevo');
    expect(normalizarBusqueda('áéíóú àèìòù âêîôû ãõ ç ý')).toBe('aeiou aeiou aeiou ao c y');
  });

  test('pasa a minúsculas y deja el texto ASCII igual', () => {
    expect(normalizarBusqueda('Parapente')).toBe('parapente');
    expect(normalizarBusqueda('guatape')).toBe('guatape');
  });

  test('recorta y colapsa espacios', () => {
    expect(normalizarBusqueda('  río   claro \n')).toBe('rio claro');
    expect(normalizarBusqueda('   ')).toBe('');
    expect(normalizarBusqueda('')).toBe('');
  });

  test('% _ * y \\ no actúan como comodines: se vuelven espacios', () => {
    expect(normalizarBusqueda('100%')).toBe('100');
    expect(normalizarBusqueda('a_b')).toBe('a b');
    expect(normalizarBusqueda('%%')).toBe('');
    expect(normalizarBusqueda('*café*')).toBe('cafe');
    expect(normalizarBusqueda('a\\b')).toBe('a b');
  });

  test('comas y paréntesis se conservan (ya no rompen ningún filtro)', () => {
    expect(normalizarBusqueda('Café, (Jardín)')).toBe('cafe, (jardin)');
  });
});

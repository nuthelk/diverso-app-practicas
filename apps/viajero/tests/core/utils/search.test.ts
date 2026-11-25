import { normalizeSearch } from '@/core/utils/search';

/**
 * `normalizeSearch` debe producir lo mismo que la columna `plans.busqueda`
 * (minúsculas + unaccent, migración 0011) para que `ilike` encuentre sin importar tildes.
 */
describe('normalizarBusqueda', () => {
  test('quita tildes, diéresis y eñes', () => {
    expect(normalizeSearch('Guatapé')).toBe('guatape');
    expect(normalizeSearch('CAFÉ')).toBe('cafe');
    expect(normalizeSearch('Pingüino')).toBe('pinguino');
    expect(normalizeSearch('Año Nuevo')).toBe('ano nuevo');
    expect(normalizeSearch('áéíóú àèìòù âêîôû ãõ ç ý')).toBe('aeiou aeiou aeiou ao c y');
  });

  test('pasa a minúsculas y deja el texto ASCII igual', () => {
    expect(normalizeSearch('Parapente')).toBe('parapente');
    expect(normalizeSearch('guatape')).toBe('guatape');
  });

  test('recorta y colapsa espacios', () => {
    expect(normalizeSearch('  río   claro \n')).toBe('rio claro');
    expect(normalizeSearch('   ')).toBe('');
    expect(normalizeSearch('')).toBe('');
  });

  test('% _ * y \\ no actúan como comodines: se vuelven espacios', () => {
    expect(normalizeSearch('100%')).toBe('100');
    expect(normalizeSearch('a_b')).toBe('a b');
    expect(normalizeSearch('%%')).toBe('');
    expect(normalizeSearch('*café*')).toBe('cafe');
    expect(normalizeSearch('a\\b')).toBe('a b');
  });

  test('comas y paréntesis se conservan (ya no rompen ningún filtro)', () => {
    expect(normalizeSearch('Café, (Jardín)')).toBe('cafe, (jardin)');
  });
});

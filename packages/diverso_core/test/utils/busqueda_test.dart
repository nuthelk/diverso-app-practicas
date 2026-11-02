import 'package:diverso_core/diverso_core.dart';
import 'package:flutter_test/flutter_test.dart';

/// `normalizarBusqueda` debe producir lo mismo que la columna `plans.busqueda`
/// (minúsculas + unaccent, migración 0011) para que `ilike` encuentre sin importar tildes.
void main() {
  group('normalizarBusqueda', () {
    test('quita tildes, diéresis y eñes', () {
      expect(normalizarBusqueda('Guatapé'), 'guatape');
      expect(normalizarBusqueda('CAFÉ'), 'cafe');
      expect(normalizarBusqueda('Pingüino'), 'pinguino');
      expect(normalizarBusqueda('Año Nuevo'), 'ano nuevo');
      expect(normalizarBusqueda('áéíóú àèìòù âêîôû ãõ ç ý'), 'aeiou aeiou aeiou ao c y');
    });

    test('pasa a minúsculas y deja el texto ASCII igual', () {
      expect(normalizarBusqueda('Parapente'), 'parapente');
      expect(normalizarBusqueda('guatape'), 'guatape');
    });

    test('recorta y colapsa espacios', () {
      expect(normalizarBusqueda('  río   claro \n'), 'rio claro');
      expect(normalizarBusqueda('   '), '');
      expect(normalizarBusqueda(''), '');
    });

    test('% _ * y \\ no actúan como comodines: se vuelven espacios', () {
      expect(normalizarBusqueda('100%'), '100');
      expect(normalizarBusqueda('a_b'), 'a b');
      expect(normalizarBusqueda('%%'), '');
      expect(normalizarBusqueda('*café*'), 'cafe');
      expect(normalizarBusqueda(r'a\b'), 'a b');
    });

    test('comas y paréntesis se conservan (ya no rompen ningún filtro)', () {
      expect(normalizarBusqueda('Café, (Jardín)'), 'cafe, (jardin)');
    });
  });
}

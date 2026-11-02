import 'package:diverso_core/diverso_core.dart';
import 'package:flutter_test/flutter_test.dart';

/// Los documentos legales deben describir los pagos como son hoy (Wompi en modo de prueba) y llevar
/// la misma versión que el panel y la función SQL `version_documentos_legales()` (el test del panel,
/// `apps/panel_svelte/src/lib/legal.test.ts`, compara las tres).
String _textos(String id) {
  final d = DocumentoLegal.porId(id)!;
  return d.secciones.expand((s) => [s.titulo, ...s.parrafos]).join('\n');
}

void main() {
  test('versión vigente: v2-2026-10', () {
    expect(kVersionLegal, 'v2-2026-10');
  });

  test('la política de datos cita la versión vigente', () {
    expect(_textos('privacidad'), contains('Versión $kVersionLegal.'));
  });

  test('ningún documento dice que los pagos son simulados', () {
    for (final id in ['privacidad', 'terminos-viajeros', 'terminos-agencias']) {
      expect(_textos(id).toLowerCase(), isNot(contains('simulad')), reason: id);
    }
  });

  test('viajeros: Wompi en modo de prueba, sin cobro de dinero real', () {
    final t = _textos('terminos-viajeros');
    expect(t, contains('Wompi'));
    expect(t, contains('modo de prueba'));
    expect(t, contains('no se cobra dinero real'));
    expect(t, isNot(contains('Pagos en el piloto')));
  });

  test('agencias: dispersión de prueba que no mueve dinero real', () {
    final t = _textos('terminos-agencias');
    expect(t, contains('Wompi'));
    expect(t, contains('modo de prueba'));
    expect(t, contains('Dispersión de prueba'));
    expect(t, contains('no mueve dinero real'));
  });
}

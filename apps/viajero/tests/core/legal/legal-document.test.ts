import { LegalDocument, LEGAL_VERSION } from '@/core/legal/legal-document';

/**
 * Los documentos legales deben describir los pagos como son hoy (Wompi en modo de prueba) y llevar
 * la misma versión que el panel y la función SQL `version_documentos_legales()`.
 */
function texts(id: string): string {
  const d = LegalDocument.byId(id)!;
  return d.sections.flatMap((s) => [s.title, ...s.paragraphs]).join('\n');
}

test('versión vigente: v2-2026-10', () => {
  expect(LEGAL_VERSION).toBe('v2-2026-10');
});

test('la política de datos cita la versión vigente', () => {
  expect(texts('privacidad')).toContain(`Versión ${LEGAL_VERSION}.`);
});

test('ningún documento dice que los pagos son simulados', () => {
  for (const id of ['privacidad', 'terminos-viajeros', 'terminos-agencias']) {
    expect(texts(id).toLowerCase()).not.toContain('simulad');
  }
});

test('viajeros: Wompi en modo de prueba, sin cobro de dinero real', () => {
  const t = texts('terminos-viajeros');
  expect(t).toContain('Wompi');
  expect(t).toContain('modo de prueba');
  expect(t).toContain('no se cobra dinero real');
  expect(t).not.toContain('Pagos en el piloto');
});

test('agencias: dispersión de prueba que no mueve dinero real', () => {
  const t = texts('terminos-agencias');
  expect(t).toContain('Wompi');
  expect(t).toContain('modo de prueba');
  expect(t).toContain('Dispersión de prueba');
  expect(t).toContain('no mueve dinero real');
});

test('los tres documentos, sus títulos y número de secciones (como en Dart)', () => {
  expect(
    LegalDocument.all.map((d) => [d.id, d.title, d.sections.length]),
  ).toEqual([
    ['privacidad', 'Política de tratamiento de datos personales', 7],
    ['terminos-viajeros', 'Términos y condiciones para viajeros', 5],
    ['terminos-agencias', 'Términos y condiciones para agencias', 6],
  ]);
  expect(LegalDocument.byId('no-existe')).toBeNull();
});

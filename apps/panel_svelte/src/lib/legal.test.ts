import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DOCUMENTOS, VERSION_LEGAL } from './legal';

// Raíz del repo (el cwd de `npm test` es apps/panel_svelte).
const RAIZ = resolve(process.cwd(), '../..');
const leer = (...ruta: string[]) => readFileSync(resolve(RAIZ, ...ruta), 'utf-8');

const textos = (id: keyof typeof DOCUMENTOS) =>
  DOCUMENTOS[id].secciones.flatMap((s) => [s.titulo, ...s.parrafos]).join('\n');

describe('versión de los documentos legales', () => {
  it('es la v2-2026-10 (los textos ya describen Wompi en modo de prueba)', () => {
    expect(VERSION_LEGAL).toBe('v2-2026-10');
  });

  it('coincide con la app móvil (legal.dart) y con la función SQL version_documentos_legales()', () => {
    const dart = leer('packages/diverso_core/lib/legal/documento_legal.dart');
    expect(dart).toContain(`const String kVersionLegal = '${VERSION_LEGAL}';`);

    // La última migración que redefine la función manda.
    const migraciones = readdirSync(resolve(RAIZ, 'supabase/migrations')).filter((f) => f.endsWith('.sql')).sort();
    let enSql: string | undefined;
    for (const archivo of migraciones) {
      const sql = leer('supabase/migrations', archivo);
      const m = [...sql.matchAll(/version_documentos_legales\(\)\s*returns text language sql immutable as \$\$ select '([^']+)'::text \$\$/g)];
      if (m.length > 0) enSql = m[m.length - 1][1];
    }
    expect(enSql).toBe(VERSION_LEGAL);
  });
});

describe('textos de pagos en los términos', () => {
  it('ya no dicen que los pagos son simulados', () => {
    for (const id of Object.keys(DOCUMENTOS) as (keyof typeof DOCUMENTOS)[]) {
      expect(textos(id).toLowerCase()).not.toContain('simulad');
    }
  });

  it('los viajeros leen que pagan con Wompi en modo de prueba y que no se cobra dinero real', () => {
    const t = textos('terminos-viajeros');
    expect(t).toContain('Wompi');
    expect(t).toContain('modo de prueba');
    expect(t).toMatch(/no se cobra dinero real/);
    expect(t).not.toContain('Pagos en el piloto');
  });

  it('las agencias leen que la dispersión de saldos es de prueba y no mueve dinero real', () => {
    const t = textos('terminos-agencias');
    expect(t).toContain('Wompi');
    expect(t).toContain('modo de prueba');
    expect(t).toMatch(/Dispersión de prueba/);
    expect(t).toMatch(/no mueve dinero real/);
  });

  it('el texto de pagos es el mismo que el de la app móvil (legal.dart)', () => {
    const dart = leer('packages/diverso_core/lib/legal/documento_legal.dart');
    const parrafos = [
      ...DOCUMENTOS['terminos-viajeros'].secciones.filter((s) => s.titulo.startsWith('5.')).flatMap((s) => [s.titulo, ...s.parrafos]),
      ...DOCUMENTOS['terminos-agencias'].secciones.filter((s) => s.titulo.startsWith('3.')).flatMap((s) => [s.titulo, ...s.parrafos]),
    ];
    for (const p of parrafos) {
      expect(dart, `legal.dart debe contener «${p}»`).toContain(p);
    }
  });
});

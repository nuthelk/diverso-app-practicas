import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { conPoliticaGenerada, horaCorta, textoPolitica, validarPolitica } from './politica';
import { draftToRow, draftVacio } from './types';

const base = { horasCancelacionGratuita: 48, horasReembolsoParcial: null, porcentajeReembolsoParcial: null };

describe('textoPolitica', () => {
  it('sin tramo parcial: gratis hasta la ventana y después sin reembolso', () => {
    expect(textoPolitica(base)).toBe(
      'Cancelación gratuita hasta 48 horas antes. Menos de 48 horas: sin reembolso.',
    );
  });

  it('con tramo parcial: el ejemplo del Anexo (48 h / 24 h / 50 %)', () => {
    expect(
      textoPolitica({ ...base, horasReembolsoParcial: 24, porcentajeReembolsoParcial: 50 }),
    ).toBe(
      'Cancelación gratuita hasta 48 horas antes. Entre 48 y 24 horas: reembolso del 50 %. Menos de 24 horas: sin reembolso.',
    );
  });

  it('singular cuando es una hora', () => {
    expect(textoPolitica({ ...base, horasCancelacionGratuita: 1 })).toBe(
      'Cancelación gratuita hasta 1 hora antes. Menos de 1 hora: sin reembolso.',
    );
    expect(
      textoPolitica({ ...base, horasCancelacionGratuita: 48, horasReembolsoParcial: 1, porcentajeReembolsoParcial: 30 }),
    ).toBe(
      'Cancelación gratuita hasta 48 horas antes. Entre 48 y 1 hora: reembolso del 30 %. Menos de 1 hora: sin reembolso.',
    );
  });

  it('ventana parcial de 0 h: el porcentaje rige hasta la salida', () => {
    expect(
      textoPolitica({ ...base, horasCancelacionGratuita: 168, horasReembolsoParcial: 0, porcentajeReembolsoParcial: 50 }),
    ).toBe('Cancelación gratuita hasta 168 horas antes. Menos de 168 horas: reembolso del 50 %.');
  });
});

/**
 * Vectores compartidos con la BD: la función SQL texto_politica() (migración 0005) debe producir EXACTAMENTE
 * estas cadenas. supabase/tests/0005_endurecimiento_pagos.sql afirma los mismos vectores; este test además
 * comprueba que ese archivo contiene cada cadena, para que ninguna de las dos mitades se desvíe sola.
 */
const VECTORES: [number, number | null, number | null, string][] = [
  [48, null, null, 'Cancelación gratuita hasta 48 horas antes. Menos de 48 horas: sin reembolso.'],
  [48, 24, 50, 'Cancelación gratuita hasta 48 horas antes. Entre 48 y 24 horas: reembolso del 50 %. Menos de 24 horas: sin reembolso.'],
  [1, null, null, 'Cancelación gratuita hasta 1 hora antes. Menos de 1 hora: sin reembolso.'],
  [48, 1, 30, 'Cancelación gratuita hasta 48 horas antes. Entre 48 y 1 hora: reembolso del 30 %. Menos de 1 hora: sin reembolso.'],
  [168, 0, 50, 'Cancelación gratuita hasta 168 horas antes. Menos de 168 horas: reembolso del 50 %.'],
  [72, 24, 40, 'Cancelación gratuita hasta 72 horas antes. Entre 72 y 24 horas: reembolso del 40 %. Menos de 24 horas: sin reembolso.'],
  [24, 12, 100, 'Cancelación gratuita hasta 24 horas antes. Entre 24 y 12 horas: reembolso del 100 %. Menos de 12 horas: sin reembolso.'],
  [12, 0, 0, 'Cancelación gratuita hasta 12 horas antes. Menos de 12 horas: reembolso del 0 %.'],
];

describe('vectores compartidos con la BD (texto_politica en SQL)', () => {
  const sql = readFileSync(resolve(process.cwd(), '../../supabase/tests/0005_endurecimiento_pagos.sql'), 'utf-8');

  it.each(VECTORES)('textoPolitica(%s, %s, %s)', (gratis, parcial, pct, esperado) => {
    expect(
      textoPolitica({
        horasCancelacionGratuita: gratis,
        horasReembolsoParcial: parcial,
        porcentajeReembolsoParcial: pct,
      }),
    ).toBe(esperado);
    expect(sql, 'la prueba SQL debe afirmar el mismo vector').toContain(`'${esperado}'`);
  });

  it('un tramo parcial incompleto se trata como «sin tramo» (igual que en SQL)', () => {
    const sinTramo = 'Cancelación gratuita hasta 48 horas antes. Menos de 48 horas: sin reembolso.';
    expect(textoPolitica({ ...base, horasReembolsoParcial: 24, porcentajeReembolsoParcial: null })).toBe(sinTramo);
    expect(textoPolitica({ ...base, horasReembolsoParcial: null, porcentajeReembolsoParcial: 50 })).toBe(sinTramo);
  });
});

describe('validarPolitica', () => {
  const ok = { ...base, horaSalida: '06:00' };

  it('una política válida no tiene errores', () => {
    expect(validarPolitica(ok)).toEqual({});
    expect(
      validarPolitica({ ...ok, horasReembolsoParcial: 24, porcentajeReembolsoParcial: 50 }),
    ).toEqual({});
    expect(
      validarPolitica({ ...ok, horasReembolsoParcial: 0, porcentajeReembolsoParcial: 99 }),
    ).toEqual({});
  });

  it.each([0, -5, 1.5, Number.NaN, null as unknown as number])(
    'la ventana gratuita %s no es válida (debe ser entera y > 0)',
    (h) => {
      expect(validarPolitica({ ...ok, horasCancelacionGratuita: h }).horasGratis).toMatch(/mayor a 0/);
    },
  );

  it('el tramo parcial va completo o vacío', () => {
    expect(validarPolitica({ ...ok, horasReembolsoParcial: 24 }).porcentajeParcial).toMatch(/Completa/);
    expect(validarPolitica({ ...ok, porcentajeReembolsoParcial: 50 }).horasParcial).toMatch(/Completa/);
  });

  it('la ventana parcial debe ser menor que la gratuita', () => {
    expect(
      validarPolitica({ ...ok, horasReembolsoParcial: 48, porcentajeReembolsoParcial: 50 }).horasParcial,
    ).toMatch(/menor que la de cancelación gratuita/);
    expect(
      validarPolitica({ ...ok, horasReembolsoParcial: 72, porcentajeReembolsoParcial: 50 }).horasParcial,
    ).toMatch(/menor/);
    expect(
      validarPolitica({ ...ok, horasReembolsoParcial: -1, porcentajeReembolsoParcial: 50 }).horasParcial,
    ).toMatch(/entero/);
  });

  it.each([0, 100, 150, 2.5, -10])('el porcentaje parcial %s está fuera de 1–99', (p) => {
    expect(
      validarPolitica({ ...ok, horasReembolsoParcial: 24, porcentajeReembolsoParcial: p }).porcentajeParcial,
    ).toMatch(/entre 1 y 99/);
  });

  it.each(['', '6:00', '24:00', '12:60', 'abc', '06:00:00'])('la hora de salida «%s» no es válida', (h) => {
    expect(validarPolitica({ ...ok, horaSalida: h }).horaSalida).toMatch(/HH:MM/);
  });
});

describe('horaCorta', () => {
  it('recorta los segundos que devuelve Postgres', () => {
    expect(horaCorta('06:00:00')).toBe('06:00');
    expect(horaCorta('17:30')).toBe('17:30');
    expect(horaCorta(null)).toBe('06:00');
    expect(horaCorta(undefined)).toBe('06:00');
  });
});

describe('conPoliticaGenerada', () => {
  it('reemplaza el texto por el generado desde los números y no toca lo demás', () => {
    const d = {
      ...draftVacio(),
      titulo: 'Guatapé',
      politicaCancelacion: 'Texto viejo que ya no coincide',
      horasCancelacionGratuita: 72,
      horasReembolsoParcial: 24,
      porcentajeReembolsoParcial: 40,
    };
    const r = conPoliticaGenerada(d);
    expect(r.politicaCancelacion).toBe(
      'Cancelación gratuita hasta 72 horas antes. Entre 72 y 24 horas: reembolso del 40 %. Menos de 24 horas: sin reembolso.',
    );
    expect(r.titulo).toBe('Guatapé');
    expect(d.politicaCancelacion).toBe('Texto viejo que ya no coincide'); // no muta el original
  });

  it('el borrador listo para guardar lleva texto y números coherentes', () => {
    const row = draftToRow(
      conPoliticaGenerada({
        ...draftVacio(),
        horasCancelacionGratuita: 48,
        horasReembolsoParcial: 24,
        porcentajeReembolsoParcial: 50,
        horaSalida: '07:30',
      }),
    );
    expect(row).toMatchObject({
      horas_cancelacion_gratuita: 48,
      horas_reembolso_parcial: 24,
      porcentaje_reembolso_parcial: 50,
      hora_salida: '07:30',
      politica_cancelacion:
        'Cancelación gratuita hasta 48 horas antes. Entre 48 y 24 horas: reembolso del 50 %. Menos de 24 horas: sin reembolso.',
    });
  });
});

describe('PlanDraft (política)', () => {
  it('draftVacio arranca con 48 h gratis, sin tramo parcial y salida 06:00 (los valores por omisión de la BD)', () => {
    expect(draftVacio()).toMatchObject({
      horasCancelacionGratuita: 48,
      horasReembolsoParcial: null,
      porcentajeReembolsoParcial: null,
      horaSalida: '06:00',
    });
  });

  it('un campo parcial vaciado (undefined) se guarda como null, no se omite', () => {
    const row = draftToRow({
      ...draftVacio(),
      horasReembolsoParcial: undefined as unknown as null,
      porcentajeReembolsoParcial: undefined as unknown as null,
    });
    expect(row.horas_reembolso_parcial).toBeNull();
    expect(row.porcentaje_reembolso_parcial).toBeNull();
  });

  it('draftToRow envía null en ambos campos parciales cuando no hay tramo', () => {
    expect(draftToRow(draftVacio())).toMatchObject({
      horas_cancelacion_gratuita: 48,
      horas_reembolso_parcial: null,
      porcentaje_reembolso_parcial: null,
      hora_salida: '06:00',
    });
  });
});

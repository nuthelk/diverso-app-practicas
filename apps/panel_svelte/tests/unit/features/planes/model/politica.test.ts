import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  conPoliticaGenerada,
  horaCorta,
  normalizarNotas,
  notasConPolitica,
  textoPolitica,
  textoPoliticaCompleto,
  validarPolitica,
} from '$lib/features/planes/model/politica';
import { MENSAJE_NOTAS_CON_POLITICA } from '$lib/shared/api/errores';
import { draftToRow, draftVacio } from '$lib/features/planes/model/plan';

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

/**
 * Vectores con notas, compartidos con la BD: texto_politica_con_notas() (migración 0006) debe producir EXACTAMENTE estas
 * cadenas; supabase/tests/0006_politica_notas.sql afirma los mismos vectores. Las notas son las frases del plan que no
 * son política (p. ej. «Avisar restricciones alimentarias.») y viajan detrás del texto canónico.
 */
const VECTORES_NOTAS: [number, number | null, number | null, string, string][] = [
  [48, null, null, '', 'Cancelación gratuita hasta 48 horas antes. Menos de 48 horas: sin reembolso.'],
  [24, null, null, 'Reprogramación gratuita si el clima no permite volar.', 'Cancelación gratuita hasta 24 horas antes. Menos de 24 horas: sin reembolso. Reprogramación gratuita si el clima no permite volar.'],
  [48, 24, 50, 'Avisar restricciones alimentarias.', 'Cancelación gratuita hasta 48 horas antes. Entre 48 y 24 horas: reembolso del 50 %. Menos de 24 horas: sin reembolso. Avisar restricciones alimentarias.'],
  [168, 0, 50, 'Requiere condición física media.', 'Cancelación gratuita hasta 168 horas antes. Menos de 168 horas: reembolso del 50 %. Requiere condición física media.'],
  [72, null, null, '  Requiere   condición\n física media.  ', 'Cancelación gratuita hasta 72 horas antes. Menos de 72 horas: sin reembolso. Requiere condición física media.'],
  [12, null, null, ' \t\n ', 'Cancelación gratuita hasta 12 horas antes. Menos de 12 horas: sin reembolso.'],
  [24, null, null, 'Nota A. Nota B.', 'Cancelación gratuita hasta 24 horas antes. Menos de 24 horas: sin reembolso. Nota A. Nota B.'],
];

describe('vectores con notas compartidos con la BD (texto_politica_con_notas en SQL)', () => {
  const sql = readFileSync(resolve(process.cwd(), '../../supabase/tests/0006_politica_notas.sql'), 'utf-8');

  it.each(VECTORES_NOTAS)('textoPoliticaCompleto(%s, %s, %s, %j)', (gratis, parcial, pct, notas, esperado) => {
    expect(
      textoPoliticaCompleto({
        horasCancelacionGratuita: gratis,
        horasReembolsoParcial: parcial,
        porcentajeReembolsoParcial: pct,
        politicaNotas: notas,
      }),
    ).toBe(esperado);
    expect(sql, 'la prueba SQL debe afirmar el mismo vector').toContain(`'${esperado}'`);
  });

  it('sin notas, el texto completo es el canónico de siempre', () => {
    const n = { horasCancelacionGratuita: 48, horasReembolsoParcial: 24, porcentajeReembolsoParcial: 50 };
    expect(textoPoliticaCompleto({ ...n, politicaNotas: '' })).toBe(textoPolitica(n));
    expect(textoPoliticaCompleto({ ...n, politicaNotas: undefined as unknown as string })).toBe(textoPolitica(n));
  });

  it('normalizarNotas recorta y colapsa espacios y saltos de línea (igual que normalizar_notas_politica en SQL)', () => {
    expect(normalizarNotas('  Requiere   condición\n física media.  ')).toBe('Requiere condición física media.');
    expect(normalizarNotas(' \t\n ')).toBe('');
    expect(normalizarNotas(undefined as unknown as string)).toBe('');
  });

  it('la migración 0006 restaura las frases originales de seed.sql, palabra por palabra', () => {
    const seed = readFileSync(resolve(process.cwd(), '../../supabase/seed.sql'), 'utf-8');
    const migracion = readFileSync(resolve(process.cwd(), '../../supabase/migrations/0006_politica_notas.sql'), 'utf-8');
    const originales = [
      'Reprogramación gratuita si el clima no permite volar. Cancelación gratuita hasta 24 horas antes.',
      'Cancelación gratuita hasta 72 horas antes. Requiere condición física media.',
      'Cancelación gratuita hasta 24 horas antes. Avisar restricciones alimentarias.',
      'Reprogramación gratuita por clima. Cancelación gratuita hasta 24 horas antes.',
    ];
    for (const o of originales) {
      expect(seed, `seed.sql debe contener «${o}»`).toContain(`'${o}'`);
      expect(migracion, `0006 debe restaurar «${o}»`).toContain(`'${o}'`);
    }
  });
});

describe('conPoliticaGenerada con notas', () => {
  it('el texto guardado lleva las notas normalizadas y el borrador queda con las notas normalizadas', () => {
    const d = conPoliticaGenerada({
      ...draftVacio(),
      horasCancelacionGratuita: 24,
      politicaNotas: '  Avisar   restricciones alimentarias. ',
    });
    expect(d.politicaCancelacion).toBe(
      'Cancelación gratuita hasta 24 horas antes. Menos de 24 horas: sin reembolso. Avisar restricciones alimentarias.',
    );
    expect(d.politicaNotas).toBe('Avisar restricciones alimentarias.');
  });

  it('draftToRow envía las notas junto con el texto y los números', () => {
    const row = draftToRow(
      conPoliticaGenerada({ ...draftVacio(), horasCancelacionGratuita: 24, politicaNotas: 'Requiere condición física media.' }),
    );
    expect(row).toMatchObject({
      horas_cancelacion_gratuita: 24,
      politica_notas: 'Requiere condición física media.',
      politica_cancelacion:
        'Cancelación gratuita hasta 24 horas antes. Menos de 24 horas: sin reembolso. Requiere condición física media.',
    });
    expect(draftToRow(draftVacio()).politica_notas).toBe('');
  });

  it('draftVacio no trae notas', () => {
    expect(draftVacio().politicaNotas).toBe('');
  });
});

describe('vectores de notas con política compartidos con la BD (notas_con_politica en SQL)', () => {
  const sql = readFileSync(resolve(process.cwd(), '../../supabase/tests/0007_notas_sin_politica.sql'), 'utf-8');

  // [notas, ¿son una regla de política?] — la prueba SQL afirma exactamente estas líneas.
  const VECTORES: [string, boolean][] = [
    ['Cancelación gratuita hasta 1 hora antes.', true],
    ['Cancelación gratuita hasta 3 días antes.', true],
    ['Entre 48 y 24 horas: reembolso del 50 %.', true],
    ['Entre 48 y 24 horas: 50%.', true],
    ['Menos de 24 horas: sin reembolso.', true],
    ['Menos de 24 horas: 50 %.', true],
    ['Menos de 2 días: reembolso del 50 %.', true],
    ['Reembolso del 100 % hasta 1 hora antes.', true],
    ['Sin reembolso a menos de 12 horas.', true],
    ['REEMBOLSO COMPLETO SI CANCELAS.', true],
    ['Política de reintegro flexible.', true],
    ['No se aceptan devoluciones.', true],
    ['Te devolvemos el dinero si cancelas.', true],
    ['El dinero no se devuelve.', true],
    ['Cancela gratis hasta 2 horas antes.', true],
    ['La cancelación es totalmente gratuita hasta 5 horas antes.', true],
    ['Cancelaciones con más de 6 horas de anticipación no tienen costo.', true],
    ['Con 2 días de anticipación puedes cancelar sin costo.', true],
    ['Cancelación sin penalización.', true],
    ['Si cancelas con menos de 3h cobramos el 50 %.', true],
    ['Requiere condición física media. Reembolso del 100 % hasta 1 hora antes.', true],
    ['  Sin   reembolso  a menos de 12 horas.  ', true],
    ['', false],
    ['Reprogramación gratuita si el clima no permite volar.', false],
    ['Reprogramación gratuita por clima.', false],
    ['Requiere condición física media.', false],
    ['Avisar restricciones alimentarias.', false],
    ['Llevar documento de identidad. Incluye 3 horas de guía.', false],
    ['Menos de 2 horas de caminata.', false],
    ['Entre 2 y 3 horas de recorrido.', false],
    ['Descuento del 10 % para grupos de 6 personas.', false],
    ['Para cancelaciones escribe a la agencia.', false],
    ['Si se cancela por clima, la reprogramación es gratis.', false],
    ['Devolver el equipo al guía.', false],
    ['Entrada sin costo para menores de 5 años.', false],
  ];

  it.each(VECTORES)('notasConPolitica(%j) = %s', (notas, esperado) => {
    expect(notasConPolitica(notas)).toBe(esperado);
    expect(sql, 'la prueba SQL debe afirmar el mismo vector').toContain(`pg_temp.vector('${notas}', ${esperado});`);
  });

  it('ignora saltos de línea y descompone/compone las tildes igual que SQL', () => {
    expect(notasConPolitica('Sin\nreembolso a menos de 12 horas.')).toBe(true);
    expect(notasConPolitica('Cancelacio\u0301n gratuita hasta 1 hora antes.')).toBe(true);
  });

  it('notas vacías, nulas o indefinidas no son una regla', () => {
    expect(notasConPolitica(null)).toBe(false);
    expect(notasConPolitica(undefined)).toBe(false);
    expect(notasConPolitica(' \t\n ')).toBe(false);
  });

  it('las notas de los 6 planes del seed (restauradas por la migración 0006) siguen siendo válidas', () => {
    for (const n of [
      'Reprogramación gratuita si el clima no permite volar.',
      'Avisar restricciones alimentarias.',
      'Requiere condición física media.',
      'Reprogramación gratuita por clima.',
    ]) {
      expect(notasConPolitica(n), n).toBe(false);
    }
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

  it('las notas que son una regla de reembolso son un error de «notas»', () => {
    expect(MENSAJE_NOTAS_CON_POLITICA).toBe(
      'Las notas no pueden contener reglas de reembolso; usa los campos de horas y porcentaje.',
    );
    expect(validarPolitica({ ...ok, politicaNotas: 'Cancelación gratuita hasta 1 hora antes.' })).toEqual({
      notas: MENSAJE_NOTAS_CON_POLITICA,
    });
    expect(validarPolitica({ ...ok, politicaNotas: 'Sin reembolso a menos de 12 horas.' }).notas).toBe(MENSAJE_NOTAS_CON_POLITICA);
  });

  it('PRESERVE: notas que no son política, vacías o ausentes no producen error', () => {
    expect(validarPolitica({ ...ok, politicaNotas: 'Avisar restricciones alimentarias.' })).toEqual({});
    expect(validarPolitica({ ...ok, politicaNotas: '' })).toEqual({});
    expect(validarPolitica({ ...ok, politicaNotas: undefined })).toEqual({});
  });

  it('el error de notas convive con los demás errores de la política', () => {
    const e = validarPolitica({ ...ok, horasCancelacionGratuita: 0, politicaNotas: 'Reembolso del 100 % hasta 1 hora antes.' });
    expect(Object.keys(e).sort()).toEqual(['horasGratis', 'notas']);
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

/**
 * Política de cancelación de un plan: los números que usa el backend para reembolsar
 * (ventana gratuita, tramo parcial y hora de salida) y el texto que lee el viajero,
 * generado SIEMPRE desde esos números para que nunca se contradigan.
 */

import { MENSAJE_NOTAS_CON_POLITICA } from '@/shared/api/errores';
import type { PlanDraft } from './plan';

export type PoliticaNumeros = Pick<
  PlanDraft,
  'horasCancelacionGratuita' | 'horasReembolsoParcial' | 'porcentajeReembolsoParcial'
>;

/** Números + notas: lo que define el texto completo que lee el viajero. */
export type PoliticaConNotas = PoliticaNumeros & Pick<PlanDraft, 'politicaNotas'>;

export type ErroresPolitica = Partial<
  Record<'horasGratis' | 'horasParcial' | 'porcentajeParcial' | 'horaSalida' | 'notas', string>
>;

const horas = (n: number) => `${n} ${n === 1 ? 'hora' : 'horas'}`;

const esEntero = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v);
const hayValor = (v: unknown) => v !== null && v !== undefined && !Number.isNaN(v);

/** «Cancelación gratuita hasta 48 horas antes. Entre 48 y 24 horas: reembolso del 50 %. Menos de 24 horas: sin reembolso.» */
export function textoPolitica(p: PoliticaNumeros): string {
  const gratis = p.horasCancelacionGratuita;
  const base = `Cancelación gratuita hasta ${horas(gratis)} antes.`;
  const parcial = p.horasReembolsoParcial;
  const pct = p.porcentajeReembolsoParcial;
  if (!hayValor(parcial) || !hayValor(pct)) return `${base} Menos de ${horas(gratis)}: sin reembolso.`;
  if (parcial === 0) return `${base} Menos de ${horas(gratis)}: reembolso del ${pct} %.`;
  return `${base} Entre ${gratis} y ${horas(parcial!)}: reembolso del ${pct} %. Menos de ${horas(parcial!)}: sin reembolso.`;
}

/**
 * Recorta y colapsa espacios, tabuladores y saltos de línea (igual que normalizar_notas_politica en SQL).
 * Se escribe con clases explícitas, no con \s, para que SQL y TS coincidan carácter por carácter.
 */
export function normalizarNotas(notas: string | null | undefined): string {
  return (notas ?? '').replace(/[ \t\r\n]+/g, ' ').replace(/^ | $/g, '');
}

/**
 * Texto completo: el canónico de los números y, si el plan tiene notas (frases que no son política, p. ej.
 * «Avisar restricciones alimentarias.»), las notas detrás. Igual que texto_politica_con_notas en SQL.
 */
export function textoPoliticaCompleto(p: PoliticaConNotas): string {
  const notas = normalizarNotas(p.politicaNotas);
  return notas === '' ? textoPolitica(p) : `${textoPolitica(p)} ${notas}`;
}

/**
 * Expresiones que reconocen una regla de política dentro de unas notas: las frases de politica_desde_texto
 * («Cancelación gratuita hasta N …», «Entre N y M …: …», «Menos de N …: …») y la redacción libre de un reembolso
 * («Reembolso del 100 % hasta 1 hora antes.», «Sin reembolso a menos de 12 horas.»). Son LAS MISMAS cadenas que
 * notas_con_politica en SQL (migración 0007): ASCII, sin delimitadores de palabra, sin distinguir mayúsculas, y
 * [^.] limita cada una a una frase. Las pruebas SQL y vitest afirman los mismos vectores. Es una guarda de
 * coherencia, no un analizador de lenguaje: lo que se reembolsa lo deciden siempre los números.
 */
const REGLAS_EN_NOTAS = [
  'reembols|reintegr|devoluciones',
  '(devol|devuelv)[^ ]*( [^ ]+){0,3} (dinero|valor|pago|plata|abono|monto|total)',
  '(dinero|valor|pago|plata|abono|monto)( [^ ]+){0,3} (devol|devuelv)',
  'cancel[^ ]*( [^ ]+){0,2} (gratis|gratuit)',
  'grat(is|uit)[^ ]* hasta',
  'cancel[^.]*[0-9]+ ?(%|h(rs?|oras?)?|d.as?)([^a-z]|$)',
  '[0-9]+ ?(%|h(rs?|oras?)?|d.as?)([^a-z]|$)[^.]*cancel',
  'cancel[^.]*(penaliz|multa|cobr|(sin|con) (costo|cargo|penal|recargo))',
  '(sin|con) (costo|cargo|penal|recargo)[^.]*cancel',
  'entre [0-9]+ y [0-9]+ (horas?|d.as?) ?:',
  'menos de [0-9]+ (horas?|d.as?) ?:',
].map((re) => new RegExp(re, 'i'));

/** ¿Alguna frase de las notas es una regla de política (que podría contradecir los números)? */
export function notasConPolitica(notas: string | null | undefined): boolean {
  const texto = normalizarNotas(notas).normalize('NFC');
  return REGLAS_EN_NOTAS.some((regla) => regla.test(texto));
}

/** Mismas reglas que los CHECK de la BD (plans_politica_parcial_coherente y rangos) y que el disparador de notas. */
export function validarPolitica(
  p: PoliticaNumeros & { horaSalida: string; politicaNotas?: string | null },
): ErroresPolitica {
  const errores: ErroresPolitica = {};
  const gratis = p.horasCancelacionGratuita;
  if (!esEntero(gratis) || gratis <= 0) {
    errores.horasGratis = 'Indica las horas de cancelación gratuita (un número entero mayor a 0).';
  }

  const hayParcial = hayValor(p.horasReembolsoParcial);
  const hayPct = hayValor(p.porcentajeReembolsoParcial);
  if (hayParcial !== hayPct) {
    const msg = 'Completa la ventana y el porcentaje del reembolso parcial, o deja ambos vacíos.';
    if (hayParcial) errores.porcentajeParcial = msg;
    else errores.horasParcial = msg;
  } else if (hayParcial && hayPct) {
    const parcial = p.horasReembolsoParcial;
    const pct = p.porcentajeReembolsoParcial;
    if (!esEntero(parcial) || parcial < 0) {
      errores.horasParcial = 'Las horas del reembolso parcial deben ser un número entero (0 o más).';
    } else if (esEntero(gratis) && gratis > 0 && parcial >= gratis) {
      errores.horasParcial = 'La ventana parcial debe ser menor que la de cancelación gratuita.';
    }
    if (!esEntero(pct) || pct < 1 || pct > 99) {
      errores.porcentajeParcial = 'El porcentaje del reembolso parcial debe estar entre 1 y 99.';
    }
  }

  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(p.horaSalida)) {
    errores.horaSalida = 'Indica la hora de salida en formato HH:MM (hora de Colombia).';
  }
  if (notasConPolitica(p.politicaNotas)) errores.notas = MENSAJE_NOTAS_CON_POLITICA;
  return errores;
}

/** Postgres devuelve la hora como «06:00:00»; el formulario trabaja con «06:00». */
export function horaCorta(h: string | null | undefined): string {
  return h ? h.slice(0, 5) : '06:00';
}

/** Copia del borrador con el texto de la política generado desde sus números y sus notas. */
export function conPoliticaGenerada(d: PlanDraft): PlanDraft {
  const politicaNotas = normalizarNotas(d.politicaNotas);
  return { ...d, politicaNotas, politicaCancelacion: textoPoliticaCompleto({ ...d, politicaNotas }) };
}

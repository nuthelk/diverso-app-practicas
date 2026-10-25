/**
 * Política de cancelación de un plan: los números que usa el backend para reembolsar
 * (ventana gratuita, tramo parcial y hora de salida) y el texto que lee el viajero,
 * generado SIEMPRE desde esos números para que nunca se contradigan.
 */

import type { PlanDraft } from './types';

export type PoliticaNumeros = Pick<
  PlanDraft,
  'horasCancelacionGratuita' | 'horasReembolsoParcial' | 'porcentajeReembolsoParcial'
>;

export type ErroresPolitica = Partial<
  Record<'horasGratis' | 'horasParcial' | 'porcentajeParcial' | 'horaSalida', string>
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

/** Mismas reglas que los CHECK de la BD (plans_politica_parcial_coherente y rangos). */
export function validarPolitica(p: PoliticaNumeros & { horaSalida: string }): ErroresPolitica {
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
  return errores;
}

/** Postgres devuelve la hora como «06:00:00»; el formulario trabaja con «06:00». */
export function horaCorta(h: string | null | undefined): string {
  return h ? h.slice(0, 5) : '06:00';
}

/** Copia del borrador con el texto de la política generado desde sus números. */
export function conPoliticaGenerada(d: PlanDraft): PlanDraft {
  return { ...d, politicaCancelacion: textoPolitica(d) };
}

/** El plan (tablas `plans` y `plan_dates`), su borrador de formulario y el paso a fila. */

import type { Agency } from '$lib/features/agencias/model/agencia';
import { plural } from '$lib/shared/lib/format';
import { horaCorta } from './politica';

export type PlanStatus = 'borrador' | 'publicado';

export interface PlanDate {
  id: string;
  plan_id: string;
  fecha: string; // yyyy-mm-dd
  cupo_total: number;
  cupo_disponible: number;
}

export interface Plan {
  id: string;
  agency_id: string;
  titulo: string;
  destino: string;
  categoria: string;
  resumen: string;
  descripcion: string;
  duracion_texto: string;
  punto_encuentro: string;
  precio_cop: number;
  incluye: string[];
  incluye_transporte: boolean;
  incluye_comida: boolean;
  incluye_hospedaje: boolean;
  itinerario: { hora: string; actividad: string }[];
  politica_cancelacion: string;
  /** Frases del plan que no son política (el texto de arriba = política de los números + estas notas). */
  politica_notas: string;
  horas_cancelacion_gratuita: number;
  horas_reembolso_parcial: number | null;
  porcentaje_reembolso_parcial: number | null;
  /** time de Postgres: «06:00:00». */
  hora_salida: string;
  fotos: string[];
  estado: PlanStatus;
  rating_promedio: number;
  reviews_count: number;
  agencies: Agency | null;
  plan_dates: PlanDate[];
}

export const CATEGORIAS = [
  { valor: 'aventura', label: 'Aventura', emoji: '🧭' },
  { valor: 'naturaleza', label: 'Naturaleza', emoji: '🌿' },
  { valor: 'cultura', label: 'Cultura', emoji: '🏘️' },
  { valor: 'gastronomia', label: 'Gastronomía', emoji: '🍽️' },
  { valor: 'relax', label: 'Relax', emoji: '💤' },
  { valor: 'urbano', label: 'Urbano', emoji: '🏙️' },
] as const;

export type CategoriaValor = (typeof CATEGORIAS)[number]['valor'];

/** El nombre de una categoría para mostrarlo («naturaleza» → «Naturaleza»); un valor desconocido se muestra tal cual. */
export function etiquetaCategoria(valor: string): string {
  return CATEGORIAS.find((c) => c.valor === valor)?.label ?? valor;
}

export interface ItinerarioPaso {
  hora: string;
  actividad: string;
}

export interface PlanDraft {
  id: string | null;
  titulo: string;
  destino: string;
  categoria: CategoriaValor;
  precioCop: number;
  resumen: string;
  descripcion: string;
  duracionTexto: string;
  puntoEncuentro: string;
  incluye: string[];
  incluyeTransporte: boolean;
  incluyeComida: boolean;
  incluyeHospedaje: boolean;
  itinerario: ItinerarioPaso[];
  /** Texto derivado de los números de abajo y de las notas (lo genera conPoliticaGenerada al guardar). */
  politicaCancelacion: string;
  /** Frases opcionales que no son política (p. ej. «Avisar restricciones alimentarias.»); van tras el texto generado. */
  politicaNotas: string;
  horasCancelacionGratuita: number;
  horasReembolsoParcial: number | null;
  porcentajeReembolsoParcial: number | null;
  /** HH:MM, hora de Colombia: base de la ventana de cancelación. */
  horaSalida: string;
  fotos: string[];
}

export function draftVacio(): PlanDraft {
  return {
    id: null,
    titulo: '',
    destino: '',
    categoria: 'aventura',
    precioCop: 0,
    resumen: '',
    descripcion: '',
    duracionTexto: '1 día',
    puntoEncuentro: '',
    incluye: [],
    incluyeTransporte: true,
    incluyeComida: false,
    incluyeHospedaje: false,
    itinerario: [],
    politicaCancelacion: '',
    politicaNotas: '',
    horasCancelacionGratuita: 48,
    horasReembolsoParcial: null,
    porcentajeReembolsoParcial: null,
    horaSalida: '06:00',
    fotos: [],
  };
}

/** La fila de un plan guardado como borrador del formulario (copia las listas para poder editarlas). */
export function draftDesdePlan(p: Plan): PlanDraft {
  return {
    id: p.id,
    titulo: p.titulo,
    destino: p.destino,
    categoria: p.categoria as CategoriaValor,
    precioCop: p.precio_cop,
    resumen: p.resumen,
    descripcion: p.descripcion,
    duracionTexto: p.duracion_texto,
    puntoEncuentro: p.punto_encuentro,
    incluye: [...p.incluye],
    incluyeTransporte: p.incluye_transporte,
    incluyeComida: p.incluye_comida,
    incluyeHospedaje: p.incluye_hospedaje,
    itinerario: p.itinerario.map((i) => ({ ...i })),
    politicaCancelacion: p.politica_cancelacion,
    politicaNotas: p.politica_notas ?? '',
    horasCancelacionGratuita: p.horas_cancelacion_gratuita,
    horasReembolsoParcial: p.horas_reembolso_parcial,
    porcentajeReembolsoParcial: p.porcentaje_reembolso_parcial,
    horaSalida: horaCorta(p.hora_salida),
    fotos: [...p.fotos],
  };
}

/** La lista con el ítem nuevo, o null si está vacío o ya estaba. */
export function agregarIncluye(incluye: string[], texto: string): string[] | null {
  const v = texto.trim();
  return v && !incluye.includes(v) ? [...incluye, v] : null;
}

/** La lista con la URL nueva, o null si no es http(s) o ya estaba. */
export function agregarFoto(fotos: string[], url: string): string[] | null {
  const v = url.trim();
  return v.startsWith('http') && !fotos.includes(v) ? [...fotos, v] : null;
}

function duracionHoras(texto: string): number {
  const t = texto.toLowerCase();
  const m = /(\d+(?:[.,]\d+)?)/.exec(t);
  const n = m ? parseFloat(m[1].replace(',', '.')) : null;
  if (t.includes('minuto')) return n ? Math.round((n / 60) * 100) / 100 : 0.5;
  if (t.includes('hora')) return n ?? 4;
  if (t.includes('día') || t.includes('dia')) return n === 2 ? 40 : (n ?? 1) * 12;
  return 12;
}

export function draftToRow(d: PlanDraft) {
  return {
    titulo: d.titulo,
    destino: d.destino,
    categoria: d.categoria,
    precio_cop: d.precioCop,
    resumen: d.resumen,
    descripcion: d.descripcion,
    duracion_texto: d.duracionTexto,
    duracion_horas: duracionHoras(d.duracionTexto),
    punto_encuentro: d.puntoEncuentro,
    incluye: d.incluye,
    incluye_transporte: d.incluyeTransporte,
    incluye_comida: d.incluyeComida,
    incluye_hospedaje: d.incluyeHospedaje,
    itinerario: d.itinerario,
    politica_cancelacion: d.politicaCancelacion,
    politica_notas: d.politicaNotas ?? '',
    horas_cancelacion_gratuita: d.horasCancelacionGratuita,
    // Un campo numérico vacío llega como undefined: la BD necesita null para borrar el tramo parcial.
    horas_reembolso_parcial: d.horasReembolsoParcial ?? null,
    porcentaje_reembolso_parcial: d.porcentajeReembolsoParcial ?? null,
    hora_salida: d.horaSalida,
    fotos: d.fotos,
  };
}

/** Bogotá no tiene horario de verano: UTC−5 todo el año (el servidor usa 'America/Bogota'). */
const OFFSET_BOGOTA_MS = 5 * 3_600_000;

/**
 * Instante (UTC) en que parte una fecha del plan: el día de la fecha + `hora_salida` en hora de Bogotá.
 * Es la misma cuenta del servidor (`(fecha + hora_salida) at time zone 'America/Bogota'`) y de la app del
 * viajero, y no depende de la zona horaria del navegador.
 */
export function salidaDe(plan: Pick<Plan, 'hora_salida'>, fecha: Pick<PlanDate, 'fecha'>): Date {
  const [y, m, d] = fecha.fecha.split('-').map(Number);
  const [hh, mm, ss] = horaCorta(plan.hora_salida).split(':').map(Number);
  return new Date(Date.UTC(y, m - 1, d, hh, mm, ss || 0) + OFFSET_BOGOTA_MS);
}

/** La salida ya ocurrió o es justo ahora: no es una salida próxima (como `yaSalio` del viajero). */
export function yaSalio(plan: Pick<Plan, 'hora_salida'>, fecha: Pick<PlanDate, 'fecha'>, ahora = new Date()): boolean {
  return salidaDe(plan, fecha).getTime() <= ahora.getTime();
}

/** El día de calendario (yyyy-mm-dd) que es [ahora] en Bogotá, sin importar la zona del navegador. */
export function fechaBogota(ahora = new Date()): string {
  return new Date(ahora.getTime() - OFFSET_BOGOTA_MS).toISOString().slice(0, 10);
}

/** Fechas con cupos que aún no parten (fecha + hora de salida en Bogotá), ordenadas. */
export function fechasFuturas(plan: Plan, ahora = new Date()): PlanDate[] {
  return plan.plan_dates
    .filter((d) => !yaSalio(plan, d, ahora) && d.cupo_disponible > 0)
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
}

/** «3 planes · 2 publicados»: la línea de contexto bajo el título de «Planes». */
export function resumenPlanes(planes: Pick<Plan, 'estado'>[]): string {
  const publicados = planes.filter((p) => p.estado === 'publicado').length;
  return `${planes.length} ${plural(planes.length, 'plan', 'planes')} · ${publicados} ${plural(publicados, 'publicado', 'publicados')}`;
}

/** El motivo por el que el precio no sirve (un precio vacío o 0 no se guarda), o undefined si es válido. */
export function errorPrecio(precio: number | null | undefined): string | undefined {
  return precio != null && precio > 0 ? undefined : 'El precio debe ser mayor a 0.';
}

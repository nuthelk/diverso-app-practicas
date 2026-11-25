import { fechaLocal } from './fechas';

/**
 * Bogotá es UTC-5 todo el año (Colombia no tiene horario de verano). El servidor interpreta
 * `plan_dates.fecha` + `plans.hora_salida` en esta zona (`at time zone 'America/Bogota'`).
 */
export const OFFSET_BOGOTA_MS = 5 * 60 * 60 * 1000;

/**
 * La fecha de hoy en Bogotá (medianoche local, sin hora), con [ahora] como reloj (por defecto, el
 * real). De 19:00 a 24:00 en Bogotá el reloj UTC ya marca el día siguiente: por eso no se usa la
 * fecha del teléfono ni la UTC.
 */
export function hoyBogota(ahora: Date = new Date()): Date {
  const bogota = new Date(ahora.getTime() - OFFSET_BOGOTA_MS);
  return fechaLocal(bogota.getUTCFullYear(), bogota.getUTCMonth() + 1, bogota.getUTCDate());
}

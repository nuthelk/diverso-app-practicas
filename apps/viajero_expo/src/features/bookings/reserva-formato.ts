import {
  BookingStatus,
  DIAS_CORTOS,
  ETIQUETA_REEMBOLSO,
  EstadoReembolso,
  formatCOP,
  MESES_CORTOS,
  type Booking,
  type ResultadoCancelacion,
  type VistaPreviaCancelacion,
} from '@/core';

/**
 * Textos de «Mis reservas» y del detalle (`reserva_formato.dart` y `textoPoliticaCancelacion` de
 * `cancel_dialog.dart`). Fechas en hora LOCAL del dispositivo, como el `toLocal()` de Flutter.
 */

const dosCifras = (n: number) => String(n).padStart(2, '0');

/**
 * «lun 27 oct · 06:00». Sin la hora si la reserva no tiene `salidaAt` (solo se conoce el día de
 * la fecha del plan); null si no hay ninguna salida conocida.
 */
export function textoSalida(b: Booking): string | null {
  const salida = b.salida;
  if (salida === null) return null;
  const dia = `${DIAS_CORTOS[salida.getDay()]} ${salida.getDate()} ${MESES_CORTOS[salida.getMonth()]}`;
  return b.salidaAt === null ? dia : `${dia} · ${dosCifras(salida.getHours())}:${dosCifras(salida.getMinutes())}`;
}

/**
 * Tiempo que falta para salir: «Hoy», «Mañana» o «en N días» (por día de CALENDARIO, no por
 * bloques de 24 h). Null si el viaje ya salió, no tiene salida o la reserva está cancelada.
 */
export function cuentaRegresiva(b: Booking, ahora: Date = new Date()): string | null {
  if (b.estado === BookingStatus.cancelada || !b.esFutura(ahora)) return null;
  const salida = b.salida!;
  // Como Dart: diferencia entre las fechas Y/M/D en UTC (sin saltos de horario de verano).
  const dias = Math.round(
    (Date.UTC(salida.getFullYear(), salida.getMonth(), salida.getDate()) -
      Date.UTC(ahora.getFullYear(), ahora.getMonth(), ahora.getDate())) /
      (24 * 60 * 60 * 1000),
  );
  if (dias === 0) return 'Hoy';
  if (dias === 1) return 'Mañana';
  return `en ${dias} días`;
}

export function textoPersonas(pax: number): string {
  return pax === 1 ? '1 persona' : `${pax} personas`;
}

/**
 * Aviso tras cancelar: «Reserva cancelada y cupos liberados. Reembolso de prueba aprobado:
 * $ 190.000 (100 %).» (sin monto si no hay reembolso).
 */
export function mensajeCancelacion(r: ResultadoCancelacion): string {
  const etiqueta = ETIQUETA_REEMBOLSO[r.estado];
  const reembolso =
    r.estado === EstadoReembolso.noAplica ? etiqueta : `${etiqueta}: ${formatCOP(r.monto)} (${r.porcentaje} %)`;
  return `Reserva cancelada y cupos liberados. ${reembolso}.`;
}

/** Lo que la política del plan da si se cancela AHORA (viene de `vista_previa_cancelacion`). */
export function textoPoliticaCancelacion(v: VistaPreviaCancelacion): string {
  if (!v.aplica || v.porcentaje <= 0) return `Si cancelas ahora no recibirás reembolso. ${v.motivo}`;
  const cuanto = `${v.porcentaje} % (${formatCOP(v.monto)})`;
  const politica = v.porcentaje >= 100 ? '' : ' según la política del plan';
  return `Si cancelas ahora te devolvemos el ${cuanto}${politica}. Es un reembolso de prueba: no se mueve dinero real.`;
}

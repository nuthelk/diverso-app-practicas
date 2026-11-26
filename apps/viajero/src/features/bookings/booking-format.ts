import {
  BookingStatus,
  SHORT_DAY_NAMES,
  LABEL_REFUND_STATUS,
  RefundStatus,
  formatCOP,
  SHORT_MONTH_NAMES,
  type Booking,
  type CancellationResult,
  type CancellationPreview,
} from '@/core';

/**
 * Textos de «Mis reservas» y del detalle (`reserva_formato.dart` y `textoPoliticaCancelacion` de
 * `cancel_dialog.dart`). Fechas en hora LOCAL del dispositivo, como el `toLocal()` de Flutter.
 */

const twoDigits = (n: number) => String(n).padStart(2, '0');

/**
 * «lun 27 oct · 06:00». Sin la hora si la reserva no tiene `departureAt` (solo se conoce el día de
 * la fecha del plan); null si no hay ninguna salida conocida.
 */
export function departureText(b: Booking): string | null {
  const departure = b.departure;
  if (departure === null) return null;
  const day = `${SHORT_DAY_NAMES[departure.getDay()]} ${departure.getDate()} ${SHORT_MONTH_NAMES[departure.getMonth()]}`;
  return b.departureAt === null ? day : `${day} · ${twoDigits(departure.getHours())}:${twoDigits(departure.getMinutes())}`;
}

/**
 * Tiempo que falta para salir: «Hoy», «Mañana» o «en N días» (por día de CALENDARIO, no por
 * bloques de 24 h). Null si el viaje ya salió, no tiene salida o la reserva está cancelada.
 */
export function countdown(b: Booking, now: Date = new Date()): string | null {
  if (b.status === BookingStatus.cancelled || !b.isUpcoming(now)) return null;
  const departure = b.departure!;
  // Como Dart: diferencia entre las fechas Y/M/D en UTC (sin saltos de horario de verano).
  const days = Math.round(
    (Date.UTC(departure.getFullYear(), departure.getMonth(), departure.getDate()) -
      Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())) /
      (24 * 60 * 60 * 1000),
  );
  if (days === 0) return 'Hoy';
  if (days === 1) return 'Mañana';
  return `en ${days} días`;
}

export function travelersText(pax: number): string {
  return pax === 1 ? '1 persona' : `${pax} personas`;
}

/**
 * Aviso tras cancelar: «Reserva cancelada y cupos liberados. Reembolso de prueba aprobado:
 * $ 190.000 (100 %).» (sin monto si no hay reembolso).
 */
export function cancellationMessage(r: CancellationResult): string {
  const label = LABEL_REFUND_STATUS[r.status];
  const refund =
    r.status === RefundStatus.notApplicable ? label : `${label}: ${formatCOP(r.amount)} (${r.percentage} %)`;
  return `Reserva cancelada y cupos liberados. ${refund}.`;
}

/** Lo que la política del plan da si se cancela AHORA (viene de `vista_previa_cancelacion`). */
export function cancellationPolicyText(v: CancellationPreview): string {
  if (!v.applies || v.percentage <= 0) return `Si cancelas ahora no recibirás reembolso. ${v.reason}`;
  const howMuch = `${v.percentage} % (${formatCOP(v.amount)})`;
  const policy = v.percentage >= 100 ? '' : ' según la política del plan';
  return `Si cancelas ahora te devolvemos el ${howMuch}${policy}. Es un reembolso de prueba: no se mueve dinero real.`;
}

import { asBoolOr, asDoubleOr, asIntOr, type Row, asString, asStringOr } from './row';
import { parsearFecha } from '../utils/fechas';
import { formatCOP } from '../utils/formatters';

/**
 * Estado de un reembolso de prueba (tabla `refunds` / respuesta de `reservas-cancelar`). No es un
 * enum de la BD: el valor es el nombre de Dart (`noAplica`; el servidor manda `no_aplica`).
 */
export const RefundStatus = {
  approved: 'aprobado',
  pending: 'pendiente',
  rejected: 'rechazado',
  notApplicable: 'noAplica',
} as const;
export type RefundStatus = (typeof RefundStatus)[keyof typeof RefundStatus];

/** `EstadoReembolso.etiqueta` de Dart. */
export const LABEL_REFUND_STATUS: Record<RefundStatus, string> = {
  aprobado: 'Reembolso de prueba aprobado',
  pendiente: 'Reembolso de prueba pendiente',
  rechazado: 'Reembolso de prueba rechazado',
  noAplica: 'Sin reembolso',
};

/** `'aprobado' | 'pendiente' | 'rechazado'` → su valor; cualquier otro (incl. `'no_aplica'`, null) → `noAplica`. */
export function refundStatusFromServer(value: unknown): RefundStatus {
  switch (value) {
    case 'aprobado':
      return RefundStatus.approved;
    case 'pendiente':
      return RefundStatus.pending;
    case 'rechazado':
      return RefundStatus.rejected;
    default:
      return RefundStatus.notApplicable;
  }
}

export interface RefundData {
  id: string;
  bookingId: string;
  amount: number;
  percentage: number;
  status: RefundStatus;
  reason: string;
  createdAt: Date;
}

/** Fila de `refunds` visible para el viajero (solo columnas explícitas: `raw` no se concede). */
export class Refund {
  /** Columnas que el viajero puede leer; `select=*` / `refunds(*)` de PostgREST devuelve 403. */
  static readonly columns = 'id, booking_id, monto, porcentaje, estado, origen, motivo, created_at';

  readonly id: string;
  readonly bookingId: string;
  readonly amount: number;
  readonly percentage: number;
  readonly status: RefundStatus;
  readonly reason: string;
  readonly createdAt: Date;

  constructor(d: RefundData) {
    this.id = d.id;
    this.bookingId = d.bookingId;
    this.amount = d.amount;
    this.percentage = d.percentage;
    this.status = d.status;
    this.reason = d.reason;
    this.createdAt = d.createdAt;
  }

  static fromMap(map: Row): Refund {
    return new Refund({
      id: asString(map['id']),
      bookingId: asString(map['booking_id']),
      amount: asDoubleOr(map['monto'], 0),
      percentage: asIntOr(map['porcentaje'], 0),
      status: refundStatusFromServer(map['estado']),
      reason: asStringOr(map['motivo'], ''),
      createdAt: parsearFecha(asString(map['created_at'])),
    });
  }

  /** «Reembolso de prueba aprobado · 50 % · $ 150.000». */
  get label(): string {
    return `${LABEL_REFUND_STATUS[this.status]} · ${this.percentage} % · ${formatCOP(this.amount)}`;
  }
}

/** Respuesta de la RPC `vista_previa_cancelacion`: lo que daría cancelar AHORA. */
export class CancellationPreview {
  readonly applies: boolean;
  readonly percentage: number;
  readonly amount: number;
  readonly hoursBefore: number;
  readonly reason: string;

  constructor(d: { applies: boolean; percentage: number; amount: number; hoursBefore: number; reason: string }) {
    this.applies = d.applies;
    this.percentage = d.percentage;
    this.amount = d.amount;
    this.hoursBefore = d.hoursBefore;
    this.reason = d.reason;
  }

  static fromMap(map: Row): CancellationPreview {
    return new CancellationPreview({
      applies: asBoolOr(map['aplica'], false),
      percentage: asIntOr(map['porcentaje'], 0),
      amount: asDoubleOr(map['monto'], 0),
      hoursBefore: asDoubleOr(map['horas_antes'], 0),
      reason: asStringOr(map['motivo'], ''),
    });
  }
}

/** Respuesta de `reservas-cancelar` (objeto `reembolso`). */
export class CancellationResult {
  readonly applies: boolean;
  readonly percentage: number;
  readonly amount: number;
  readonly status: RefundStatus;
  readonly reason: string;

  constructor(d: { applies: boolean; percentage: number; amount: number; status: RefundStatus; reason: string }) {
    this.applies = d.applies;
    this.percentage = d.percentage;
    this.amount = d.amount;
    this.status = d.status;
    this.reason = d.reason;
  }

  static fromMap(map: Row): CancellationResult {
    const r = map['reembolso'] as Row;
    return new CancellationResult({
      applies: asBoolOr(r['aplica'], false),
      percentage: asIntOr(r['porcentaje'], 0),
      amount: asDoubleOr(r['monto'], 0),
      status: refundStatusFromServer(r['estado']),
      reason: asStringOr(r['motivo'], ''),
    });
  }
}

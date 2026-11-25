import {
  BookingStatus,
  enumFromDb,
  LABEL_PAYMENT_METHOD,
  PaymentMethodOption,
  PaymentStatus,
  valuesOf,
} from './enums';
import { asBoolOr, asDoubleOr, asInt, isRow, type Row, listOf, asString, asStringOr } from './row';
import { Plan, PlanDate } from './plan';
import { LABEL_REFUND_STATUS, RefundStatus, Refund } from './refund';
import { parsearFecha } from '../utils/fechas';

export interface PaymentData {
  id: string;
  bookingId: string;
  method: PaymentMethodOption;
  status: PaymentStatus;
  amount: number;
  reference: string;
  provider: string;
  simulated: boolean;
}

/** Tabla `payments` (embebida `payments(*)`). */
export class Payment {
  readonly id: string;
  readonly bookingId: string;
  readonly method: PaymentMethodOption;
  readonly status: PaymentStatus;
  readonly amount: number;
  readonly reference: string;
  readonly provider: string;
  readonly simulated: boolean;

  constructor(d: PaymentData) {
    this.id = d.id;
    this.bookingId = d.bookingId;
    this.method = d.method;
    this.status = d.status;
    this.amount = d.amount;
    this.reference = d.reference;
    this.provider = d.provider;
    this.simulated = d.simulated;
  }

  /** «Pagado con Nequi · ref. DIV-1-1 (prueba)»: el piloto solo cobra en sandbox. */
  get referenceText(): string {
    return `Pagado con ${LABEL_PAYMENT_METHOD[this.method]} · ref. ${this.reference} (prueba)`;
  }

  static fromMap(map: Row): Payment {
    return new Payment({
      id: asString(map['id']),
      bookingId: asString(map['booking_id']),
      method: enumFromDb(valuesOf(PaymentMethodOption), map['metodo'] as string | null) ?? PaymentMethodOption.other,
      status: enumFromDb(valuesOf(PaymentStatus), map['estado'] as string | null) ?? PaymentStatus.pending,
      amount: asDoubleOr(map['monto'], 0),
      reference: asStringOr(map['referencia'], ''),
      provider: asStringOr(map['provider'], 'simulado'),
      simulated: asBoolOr(map['simulated'], true),
    });
  }
}

export interface BookingData {
  id: string;
  code: string;
  planDateId: string;
  travelerId: string;
  pax: number;
  totalAmount: number;
  status: BookingStatus;
  createdAt: Date;
  departureAt?: Date | null;
  planDate?: PlanDate | null;
  plan?: Plan | null;
  payments?: readonly Payment[];
  refunds?: readonly Refund[];
  hasReview?: boolean;
}

/** Tabla `bookings` (+ `plan_date` → `plan` → `agencies`, `payments`, `refunds`). */
export class Booking {
  /** Tiempo que se retienen los cupos de una reserva pendiente de pago (mismo valor que el servidor). */
  static readonly holdMs = 30 * 60 * 1000;

  readonly id: string;
  readonly code: string;
  readonly planDateId: string;
  readonly travelerId: string;
  readonly pax: number;
  readonly totalAmount: number;
  readonly status: BookingStatus;
  readonly createdAt: Date;
  /** Salida congelada al reservar (`bookings.salida_at`): no cambia aunque la agencia edite el plan. */
  readonly departureAt: Date | null;
  readonly planDate: PlanDate | null;
  readonly plan: Plan | null;
  readonly payments: readonly Payment[];
  readonly refunds: readonly Refund[];
  /** No viene de la BD: lo marca el repositorio. */
  readonly hasReview: boolean;

  constructor(d: BookingData) {
    this.id = d.id;
    this.code = d.code;
    this.planDateId = d.planDateId;
    this.travelerId = d.travelerId;
    this.pax = d.pax;
    this.totalAmount = d.totalAmount;
    this.status = d.status;
    this.createdAt = d.createdAt;
    this.departureAt = d.departureAt ?? null;
    this.planDate = d.planDate ?? null;
    this.plan = d.plan ?? null;
    this.payments = d.payments ?? [];
    this.refunds = d.refunds ?? [];
    this.hasReview = d.hasReview ?? false;
  }

  get payment(): Payment | null {
    return this.payments[0] ?? null;
  }

  /** Momento en que vence la retención de cupos si no se paga. */
  get expiresAt(): Date {
    return new Date(this.createdAt.getTime() + Booking.holdMs);
  }

  /** Reembolso más reciente de la reserva (cancelación o pago tardío). */
  get refund(): Refund | null {
    if (this.refunds.length === 0) return null;
    return [...this.refunds].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0]!;
  }

  /**
   * Estado del reembolso para mostrar en la tarjeta de la reserva. Una reserva cancelada que
   * sí se pagó y no tiene reembolso es «Sin reembolso»; una que nunca se pagó no muestra nada.
   */
  get refundLabel(): string | null {
    const r = this.refund;
    if (r !== null) return r.label;
    if (this.status === BookingStatus.cancelled && this.payment !== null) return LABEL_REFUND_STATUS[RefundStatus.notApplicable];
    return null;
  }

  /** Copia marcada como reseñada (inmutable: conserva todo lo demás). */
  withReview(): Booking {
    return new Booking({ ...this, hasReview: true });
  }

  /**
   * Momento de la salida: la congelada de la reserva o, si falta, el inicio (medianoche local) de la
   * fecha del plan.
   */
  get departure(): Date | null {
    return this.departureAt ?? this.planDate?.date ?? null;
  }

  /** El viaje aún no sale. [now] permite fijar el reloj; sin salida conocida no es futuro. */
  isUpcoming(now: Date = new Date()): boolean {
    const s = this.departure;
    return s !== null && s.getTime() > now.getTime();
  }

  /**
   * Pendiente de pago o confirmada y que aún no sale: la única que se puede cancelar (el servidor
   * rechaza la cancelación después de la salida).
   */
  isActive(now: Date = new Date()): boolean {
    return (
      (this.status === BookingStatus.confirmed || this.status === BookingStatus.pendingPayment) && this.isUpcoming(now)
    );
  }

  /**
   * Una reseña solo es posible si el viaje ya salió, la reserva está confirmada/completada
   * y aún no se reseñó (RLS lo respalda en el servidor).
   */
  canReview(now: Date = new Date()): boolean {
    return (
      (this.status === BookingStatus.confirmed || this.status === BookingStatus.completed) &&
      this.departure !== null &&
      !this.isUpcoming(now) &&
      !this.hasReview
    );
  }

  static fromMap(map: Row): Booking {
    const pd = map['plan_date'];
    const planMap = isRow(pd) ? pd['plan'] : null;
    const departure = map['salida_at'];
    return new Booking({
      id: asString(map['id']),
      code: asString(map['codigo']),
      planDateId: asString(map['plan_date_id']),
      travelerId: asString(map['viajero_id']),
      pax: asInt(map['pax']),
      totalAmount: asDoubleOr(map['monto_total'], 0),
      status: enumFromDb(valuesOf(BookingStatus), map['estado'] as string | null) ?? BookingStatus.pendingPayment,
      createdAt: parsearFecha(asString(map['created_at'])),
      departureAt: departure == null ? null : parsearFecha(asString(departure)),
      planDate: isRow(pd) ? PlanDate.fromMap(pd) : null,
      plan: isRow(planMap) ? Plan.fromMap(planMap) : null,
      payments: listOf(map['payments'], Payment.fromMap),
      refunds: listOf(map['refunds'], Refund.fromMap),
    });
  }
}

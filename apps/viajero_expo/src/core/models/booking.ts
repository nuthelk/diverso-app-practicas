import {
  BookingStatus,
  enumFromDb,
  LABEL_PAYMENT_METHOD,
  PaymentMethodOption,
  PaymentStatus,
  valoresDe,
} from './enums';
import { booleanoO, decimalO, entero, esFila, type Fila, listaDe, texto, textoO } from './fila';
import { Plan, PlanDate } from './plan';
import { ETIQUETA_REEMBOLSO, EstadoReembolso, Refund } from './reembolso';
import { parsearFecha } from '../utils/fechas';

export interface DatosPayment {
  id: string;
  bookingId: string;
  metodo: PaymentMethodOption;
  estado: PaymentStatus;
  monto: number;
  referencia: string;
  provider: string;
  simulated: boolean;
}

/** Tabla `payments` (embebida `payments(*)`). */
export class Payment {
  readonly id: string;
  readonly bookingId: string;
  readonly metodo: PaymentMethodOption;
  readonly estado: PaymentStatus;
  readonly monto: number;
  readonly referencia: string;
  readonly provider: string;
  readonly simulated: boolean;

  constructor(d: DatosPayment) {
    this.id = d.id;
    this.bookingId = d.bookingId;
    this.metodo = d.metodo;
    this.estado = d.estado;
    this.monto = d.monto;
    this.referencia = d.referencia;
    this.provider = d.provider;
    this.simulated = d.simulated;
  }

  /** «Pagado con Nequi · ref. DIV-1-1 (prueba)»: el piloto solo cobra en sandbox. */
  get textoReferencia(): string {
    return `Pagado con ${LABEL_PAYMENT_METHOD[this.metodo]} · ref. ${this.referencia} (prueba)`;
  }

  static fromMap(map: Fila): Payment {
    return new Payment({
      id: texto(map['id']),
      bookingId: texto(map['booking_id']),
      metodo: enumFromDb(valoresDe(PaymentMethodOption), map['metodo'] as string | null) ?? PaymentMethodOption.otro,
      estado: enumFromDb(valoresDe(PaymentStatus), map['estado'] as string | null) ?? PaymentStatus.pendiente,
      monto: decimalO(map['monto'], 0),
      referencia: textoO(map['referencia'], ''),
      provider: textoO(map['provider'], 'simulado'),
      simulated: booleanoO(map['simulated'], true),
    });
  }
}

export interface DatosBooking {
  id: string;
  codigo: string;
  planDateId: string;
  viajeroId: string;
  pax: number;
  montoTotal: number;
  estado: BookingStatus;
  createdAt: Date;
  salidaAt?: Date | null;
  planDate?: PlanDate | null;
  plan?: Plan | null;
  payments?: readonly Payment[];
  refunds?: readonly Refund[];
  tieneResena?: boolean;
}

/** Tabla `bookings` (+ `plan_date` → `plan` → `agencies`, `payments`, `refunds`). */
export class Booking {
  /** Tiempo que se retienen los cupos de una reserva pendiente de pago (mismo valor que el servidor). */
  static readonly retencionMs = 30 * 60 * 1000;

  readonly id: string;
  readonly codigo: string;
  readonly planDateId: string;
  readonly viajeroId: string;
  readonly pax: number;
  readonly montoTotal: number;
  readonly estado: BookingStatus;
  readonly createdAt: Date;
  /** Salida congelada al reservar (`bookings.salida_at`): no cambia aunque la agencia edite el plan. */
  readonly salidaAt: Date | null;
  readonly planDate: PlanDate | null;
  readonly plan: Plan | null;
  readonly payments: readonly Payment[];
  readonly refunds: readonly Refund[];
  /** No viene de la BD: lo marca el repositorio. */
  readonly tieneResena: boolean;

  constructor(d: DatosBooking) {
    this.id = d.id;
    this.codigo = d.codigo;
    this.planDateId = d.planDateId;
    this.viajeroId = d.viajeroId;
    this.pax = d.pax;
    this.montoTotal = d.montoTotal;
    this.estado = d.estado;
    this.createdAt = d.createdAt;
    this.salidaAt = d.salidaAt ?? null;
    this.planDate = d.planDate ?? null;
    this.plan = d.plan ?? null;
    this.payments = d.payments ?? [];
    this.refunds = d.refunds ?? [];
    this.tieneResena = d.tieneResena ?? false;
  }

  get pago(): Payment | null {
    return this.payments[0] ?? null;
  }

  /** Momento en que vence la retención de cupos si no se paga. */
  get venceAt(): Date {
    return new Date(this.createdAt.getTime() + Booking.retencionMs);
  }

  /** Reembolso más reciente de la reserva (cancelación o pago tardío). */
  get reembolso(): Refund | null {
    if (this.refunds.length === 0) return null;
    return [...this.refunds].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0]!;
  }

  /**
   * Estado del reembolso para mostrar en la tarjeta de la reserva. Una reserva cancelada que
   * sí se pagó y no tiene reembolso es «Sin reembolso»; una que nunca se pagó no muestra nada.
   */
  get etiquetaReembolso(): string | null {
    const r = this.reembolso;
    if (r !== null) return r.etiqueta;
    if (this.estado === BookingStatus.cancelada && this.pago !== null) return ETIQUETA_REEMBOLSO[EstadoReembolso.noAplica];
    return null;
  }

  /** Copia marcada como reseñada (inmutable: conserva todo lo demás). */
  conResena(): Booking {
    return new Booking({ ...this, tieneResena: true });
  }

  /**
   * Momento de la salida: la congelada de la reserva o, si falta, el inicio (medianoche local) de la
   * fecha del plan.
   */
  get salida(): Date | null {
    return this.salidaAt ?? this.planDate?.fecha ?? null;
  }

  /** El viaje aún no sale. [ahora] permite fijar el reloj; sin salida conocida no es futuro. */
  esFutura(ahora: Date = new Date()): boolean {
    const s = this.salida;
    return s !== null && s.getTime() > ahora.getTime();
  }

  /**
   * Pendiente de pago o confirmada y que aún no sale: la única que se puede cancelar (el servidor
   * rechaza la cancelación después de la salida).
   */
  vigente(ahora: Date = new Date()): boolean {
    return (
      (this.estado === BookingStatus.confirmada || this.estado === BookingStatus.pendientePago) && this.esFutura(ahora)
    );
  }

  /**
   * Una reseña solo es posible si el viaje ya salió, la reserva está confirmada/completada
   * y aún no se reseñó (RLS lo respalda en el servidor).
   */
  puedeResenar(ahora: Date = new Date()): boolean {
    return (
      (this.estado === BookingStatus.confirmada || this.estado === BookingStatus.completada) &&
      this.salida !== null &&
      !this.esFutura(ahora) &&
      !this.tieneResena
    );
  }

  static fromMap(map: Fila): Booking {
    const pd = map['plan_date'];
    const planMap = esFila(pd) ? pd['plan'] : null;
    const salida = map['salida_at'];
    return new Booking({
      id: texto(map['id']),
      codigo: texto(map['codigo']),
      planDateId: texto(map['plan_date_id']),
      viajeroId: texto(map['viajero_id']),
      pax: entero(map['pax']),
      montoTotal: decimalO(map['monto_total'], 0),
      estado: enumFromDb(valoresDe(BookingStatus), map['estado'] as string | null) ?? BookingStatus.pendientePago,
      createdAt: parsearFecha(texto(map['created_at'])),
      salidaAt: salida == null ? null : parsearFecha(texto(salida)),
      planDate: esFila(pd) ? PlanDate.fromMap(pd) : null,
      plan: esFila(planMap) ? Plan.fromMap(planMap) : null,
      payments: listaDe(map['payments'], Payment.fromMap),
      refunds: listaDe(map['refunds'], Refund.fromMap),
    });
  }
}

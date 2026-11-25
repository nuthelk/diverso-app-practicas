import { BookingStatus, enumFromDb, PaymentMethodOption, valuesOf } from './enums';
import { asInt, type Row, asString, asStringOrNull } from './row';
import { parseDate } from '../utils/dates';

/** Respuesta de `pagos-iniciar`: dónde pagar en Wompi (sandbox) y hasta cuándo. */
export class StartedCheckout {
  readonly checkoutUrl: string;
  readonly reference: string;
  readonly amountInCents: number;
  readonly expiresAt: Date;

  constructor(d: { checkoutUrl: string; reference: string; amountInCents: number; expiresAt: Date }) {
    this.checkoutUrl = d.checkoutUrl;
    this.reference = d.reference;
    this.amountInCents = d.amountInCents;
    this.expiresAt = d.expiresAt;
  }

  get amount(): number {
    return this.amountInCents / 100;
  }

  static fromMap(map: Row): StartedCheckout {
    return new StartedCheckout({
      checkoutUrl: asString(map['checkout_url']),
      reference: asString(map['referencia']),
      amountInCents: asInt(map['amount_in_cents']),
      expiresAt: parseDate(asString(map['expira_at'])),
    });
  }
}

/** `estado_pago` de `pagos-verificar`. */
export const VerifiedPaymentStatus = {
  approved: 'aprobado',
  rejected: 'rechazado',
  pending: 'pendiente',
  error: 'error',
} as const;
export type VerifiedPaymentStatus = (typeof VerifiedPaymentStatus)[keyof typeof VerifiedPaymentStatus];

export interface VerifiedPaymentData {
  status: VerifiedPaymentStatus;
  reference: string | null;
  bookingId: string;
  code: string;
  bookingStatus: BookingStatus;
  method?: PaymentMethodOption | null;
}

/** Respuesta de `pagos-verificar`: cómo quedó el pago y la reserva. */
export class VerifiedPayment {
  readonly status: VerifiedPaymentStatus;
  readonly method: PaymentMethodOption | null;
  readonly reference: string | null;
  readonly bookingId: string;
  readonly code: string;
  readonly bookingStatus: BookingStatus;

  constructor(d: VerifiedPaymentData) {
    this.status = d.status;
    this.method = d.method ?? null;
    this.reference = d.reference;
    this.bookingId = d.bookingId;
    this.code = d.code;
    this.bookingStatus = d.bookingStatus;
  }

  static fromMap(map: Row): VerifiedPayment {
    const booking = map['booking'] as Row;
    const method = asStringOrNull(map['metodo']);
    return new VerifiedPayment({
      status: enumFromDb(valuesOf(VerifiedPaymentStatus), map['estado_pago'] as string | null) ?? VerifiedPaymentStatus.error,
      method: method === null ? null : (enumFromDb(valuesOf(PaymentMethodOption), method) ?? PaymentMethodOption.other),
      reference: asStringOrNull(map['referencia']),
      bookingId: asString(booking['id']),
      code: asString(booking['codigo']),
      bookingStatus:
        enumFromDb(valuesOf(BookingStatus), booking['estado'] as string | null) ?? BookingStatus.pendingPayment,
    });
  }

  /** Texto para el viajero según el resultado de la verificación. */
  get userMessage(): string {
    switch (this.status) {
      case VerifiedPaymentStatus.approved:
        return '¡Pago de prueba aprobado! Tu reserva está confirmada.';
      case VerifiedPaymentStatus.rejected:
        return (
          'Wompi rechazó el pago de prueba (fondos, datos o el resultado del banco). ' +
          'Puedes intentar de nuevo mientras tu reserva siga vigente (30 minutos).'
        );
      case VerifiedPaymentStatus.error:
        return (
          'Wompi no pudo procesar el pago de prueba. ' +
          'Puedes intentar de nuevo mientras tu reserva siga vigente (30 minutos).'
        );
      case VerifiedPaymentStatus.pending:
        return 'Tu pago de prueba sigue pendiente. Te avisaremos en Mis reservas cuando Wompi lo confirme.';
    }
  }
}

import { BookingStatus, enumFromDb, PaymentMethodOption, valoresDe } from './enums';
import { entero, type Fila, texto, textoONulo } from './fila';
import { parsearFecha } from '../utils/fechas';

/** Respuesta de `pagos-iniciar`: dónde pagar en Wompi (sandbox) y hasta cuándo. */
export class CheckoutIniciado {
  readonly checkoutUrl: string;
  readonly referencia: string;
  readonly amountInCents: number;
  readonly expiraAt: Date;

  constructor(d: { checkoutUrl: string; referencia: string; amountInCents: number; expiraAt: Date }) {
    this.checkoutUrl = d.checkoutUrl;
    this.referencia = d.referencia;
    this.amountInCents = d.amountInCents;
    this.expiraAt = d.expiraAt;
  }

  get monto(): number {
    return this.amountInCents / 100;
  }

  static fromMap(map: Fila): CheckoutIniciado {
    return new CheckoutIniciado({
      checkoutUrl: texto(map['checkout_url']),
      referencia: texto(map['referencia']),
      amountInCents: entero(map['amount_in_cents']),
      expiraAt: parsearFecha(texto(map['expira_at'])),
    });
  }
}

/** `estado_pago` de `pagos-verificar`. */
export const EstadoPago = {
  aprobado: 'aprobado',
  rechazado: 'rechazado',
  pendiente: 'pendiente',
  error: 'error',
} as const;
export type EstadoPago = (typeof EstadoPago)[keyof typeof EstadoPago];

export interface DatosPagoVerificado {
  estado: EstadoPago;
  referencia: string | null;
  bookingId: string;
  codigo: string;
  bookingEstado: BookingStatus;
  metodo?: PaymentMethodOption | null;
}

/** Respuesta de `pagos-verificar`: cómo quedó el pago y la reserva. */
export class PagoVerificado {
  readonly estado: EstadoPago;
  readonly metodo: PaymentMethodOption | null;
  readonly referencia: string | null;
  readonly bookingId: string;
  readonly codigo: string;
  readonly bookingEstado: BookingStatus;

  constructor(d: DatosPagoVerificado) {
    this.estado = d.estado;
    this.metodo = d.metodo ?? null;
    this.referencia = d.referencia;
    this.bookingId = d.bookingId;
    this.codigo = d.codigo;
    this.bookingEstado = d.bookingEstado;
  }

  static fromMap(map: Fila): PagoVerificado {
    const booking = map['booking'] as Fila;
    const metodo = textoONulo(map['metodo']);
    return new PagoVerificado({
      estado: enumFromDb(valoresDe(EstadoPago), map['estado_pago'] as string | null) ?? EstadoPago.error,
      metodo: metodo === null ? null : (enumFromDb(valoresDe(PaymentMethodOption), metodo) ?? PaymentMethodOption.otro),
      referencia: textoONulo(map['referencia']),
      bookingId: texto(booking['id']),
      codigo: texto(booking['codigo']),
      bookingEstado:
        enumFromDb(valoresDe(BookingStatus), booking['estado'] as string | null) ?? BookingStatus.pendientePago,
    });
  }

  /** Texto para el viajero según el resultado de la verificación. */
  get mensajeUsuario(): string {
    switch (this.estado) {
      case EstadoPago.aprobado:
        return '¡Pago de prueba aprobado! Tu reserva está confirmada.';
      case EstadoPago.rechazado:
        return (
          'Wompi rechazó el pago de prueba (fondos, datos o el resultado del banco). ' +
          'Puedes intentar de nuevo mientras tu reserva siga vigente (30 minutos).'
        );
      case EstadoPago.error:
        return (
          'Wompi no pudo procesar el pago de prueba. ' +
          'Puedes intentar de nuevo mientras tu reserva siga vigente (30 minutos).'
        );
      case EstadoPago.pendiente:
        return 'Tu pago de prueba sigue pendiente. Te avisaremos en Mis reservas cuando Wompi lo confirme.';
    }
  }
}

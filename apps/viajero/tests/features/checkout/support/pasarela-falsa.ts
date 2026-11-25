import {
  BookingStatus,
  StartedCheckout,
  VerifiedPaymentStatus,
  VerifiedPayment,
  PaymentMethodOption,
  type PaymentGateway,
} from '@/core';

import type { Compuerta } from '../../../support/compuerta';

/**
 * [PaymentGateway] sin Wompi ni Supabase (port de `pasarela_falsa.dart`).
 *
 * `verificar` responde en orden con [respuestas] (un `PagoVerificado` o un error que se lanza);
 * cuando se acaban repite la última. Registra también las CLAVES que recibió: el contrato es
 * exactamente una (`transactionId` o `bookingId`), nunca la otra en null.
 */
export class PasarelaFalsa implements PaymentGateway {
  /** Si no es null, `verificar` espera a que se complete (respuestas tardías). */
  compuerta: Compuerta | null = null;

  /**
   * Qué hace `iniciar`: lanzar este error (por defecto, como en Dart, las pruebas no abren el
   * WebView) o, si es una URL (`string`), devolver ese checkout.
   */
  falloAlIniciar: unknown = new Error('UnimplementedError');
  checkoutUrl: string | null = null;

  readonly verificaciones: { transaccion: string | null; reserva: string | null }[] = [];
  readonly clavesVerificar: string[][] = [];
  readonly iniciadas: { bookingId: string; redirectUrl: string }[] = [];

  constructor(readonly respuestas: (VerifiedPayment | unknown)[] = []) {}

  async verificar(p: { transactionId?: string | null; bookingId?: string | null }): Promise<VerifiedPayment> {
    this.verificaciones.push({ transaccion: p.transactionId ?? null, reserva: p.bookingId ?? null });
    this.clavesVerificar.push(Object.keys(p));
    await this.compuerta?.promesa;
    const i = this.verificaciones.length - 1;
    const respuesta = this.respuestas[i < this.respuestas.length ? i : this.respuestas.length - 1];
    if (respuesta instanceof VerifiedPayment) return respuesta;
    throw respuesta;
  }

  async iniciar({ bookingId, redirectUrl }: { bookingId: string; redirectUrl: string }): Promise<StartedCheckout> {
    this.iniciadas.push({ bookingId, redirectUrl });
    if (this.checkoutUrl !== null) {
      return new StartedCheckout({
        checkoutUrl: this.checkoutUrl,
        reference: 'DIV-ABC123-1',
        amountInCents: 30000000,
        expiresAt: new Date(Date.now() + 30 * 60_000),
      });
    }
    throw this.falloAlIniciar;
  }
}

/** Resultado de `pagos-verificar` de la reserva `res-1` para las pruebas. */
export function pagoDePrueba(estado: VerifiedPaymentStatus, reserva: BookingStatus = BookingStatus.confirmed): VerifiedPayment {
  return new VerifiedPayment({
    status: estado,
    method: PaymentMethodOption.card,
    reference: 'DIV-ABC123-1',
    bookingId: 'res-1',
    code: 'DIV-ABC123',
    bookingStatus: reserva,
  });
}

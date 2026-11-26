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
 * `verify` responde en orden con [responses] (un `VerifiedPayment` o un error que se lanza);
 * cuando se acaban repite la última. Registra también las CLAVES que recibió: el contrato es
 * exactamente una (`transactionId` o `bookingId`), nunca la otra en null.
 */
export class FakePaymentGateway implements PaymentGateway {
  /** Si no es null, `verify` espera a que se complete (respuestas tardías). */
  gate: Compuerta | null = null;

  /**
   * Qué hace `start`: lanzar este error (por defecto, como en Dart, las pruebas no abren el
   * WebView) o, si es una URL (`string`), devolver ese checkout.
   */
  startFailure: unknown = new Error('UnimplementedError');
  checkoutUrl: string | null = null;

  readonly verifications: { transactionId: string | null; bookingId: string | null }[] = [];
  readonly verifyKeys: string[][] = [];
  readonly startedCheckouts: { bookingId: string; redirectUrl: string }[] = [];

  constructor(readonly responses: (VerifiedPayment | unknown)[] = []) {}

  async verify(p: { transactionId?: string | null; bookingId?: string | null }): Promise<VerifiedPayment> {
    this.verifications.push({ transactionId: p.transactionId ?? null, bookingId: p.bookingId ?? null });
    this.verifyKeys.push(Object.keys(p));
    await this.gate?.promesa;
    const i = this.verifications.length - 1;
    const response = this.responses[i < this.responses.length ? i : this.responses.length - 1];
    if (response instanceof VerifiedPayment) return response;
    throw response;
  }

  async start({ bookingId, redirectUrl }: { bookingId: string; redirectUrl: string }): Promise<StartedCheckout> {
    this.startedCheckouts.push({ bookingId, redirectUrl });
    if (this.checkoutUrl !== null) {
      return new StartedCheckout({
        checkoutUrl: this.checkoutUrl,
        reference: 'DIV-ABC123-1',
        amountInCents: 30000000,
        expiresAt: new Date(Date.now() + 30 * 60_000),
      });
    }
    throw this.startFailure;
  }
}

/** Resultado de `pagos-verificar` de la reserva `res-1` para las pruebas. */
export function testPayment(status: VerifiedPaymentStatus, bookingStatus: BookingStatus = BookingStatus.confirmed): VerifiedPayment {
  return new VerifiedPayment({
    status,
    method: PaymentMethodOption.card,
    reference: 'DIV-ABC123-1',
    bookingId: 'res-1',
    code: 'DIV-ABC123',
    bookingStatus,
  });
}

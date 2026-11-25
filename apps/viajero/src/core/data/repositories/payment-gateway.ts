import { ArgumentError } from '../../errors/programming-errors';
import { StartedCheckout, VerifiedPayment } from '../../models/payment-checkout';
import type { EdgeFunctionsApi } from '../services/edge-functions-api';
import { callEdgeFunction } from './call-edge-function';

/**
 * Abstracción de pasarela de pago (Anexo 6: pagos locales seguros).
 *
 * Wompi (sandbox) abre su Web Checkout: el medio de pago se elige en la página de Wompi y ningún
 * dato de pago pasa por la app. La app solo pide la URL de pago y luego pregunta al servidor cómo
 * quedó. Los resultados `rechazado`/`error`/`pendiente` son VALORES; los 4xx/5xx son `DiversoError`.
 */
export interface PaymentGateway {
  /** Crea el intento de pago de una reserva pendiente y devuelve la URL del checkout. */
  start(p: { bookingId: string; redirectUrl: string }): Promise<StartedCheckout>;

  /**
   * Verifica el pago en el servidor (nunca se confía en la redirección del navegador).
   * Exactamente uno de `transactionId` (tras la redirección) o `bookingId` («Ya pagué»); si no,
   * `ArgumentError` sin llamar al servidor.
   */
  verify(p: { transactionId?: string | null; bookingId?: string | null }): Promise<VerifiedPayment>;
}

/** Pasarela Wompi en modo prueba: delega en las Edge Functions `pagos-iniciar` y `pagos-verificar`. */
export class WompiPaymentGateway implements PaymentGateway {
  private readonly edgeFunctions: EdgeFunctionsApi;

  constructor({ edgeFunctions }: { edgeFunctions: EdgeFunctionsApi }) {
    this.edgeFunctions = edgeFunctions;
  }

  async start({ bookingId, redirectUrl }: { bookingId: string; redirectUrl: string }): Promise<StartedCheckout> {
    const res = await callEdgeFunction(this.edgeFunctions, 'pagos-iniciar', {
      booking_id: bookingId,
      redirect_url: redirectUrl,
    });
    return StartedCheckout.fromMap(res);
  }

  async verify({
    transactionId = null,
    bookingId = null,
  }: {
    transactionId?: string | null;
    bookingId?: string | null;
  }): Promise<VerifiedPayment> {
    if ((transactionId === null) === (bookingId === null)) {
      throw new ArgumentError('Indica exactamente uno de transactionId o bookingId');
    }
    // El servidor compara con `=== undefined`: la clave ausente se OMITE (mandarla en null → 400).
    const body = transactionId !== null ? { transaction_id: transactionId } : { booking_id: bookingId };
    const res = await callEdgeFunction(this.edgeFunctions, 'pagos-verificar', body);
    return VerifiedPayment.fromMap(res);
  }
}

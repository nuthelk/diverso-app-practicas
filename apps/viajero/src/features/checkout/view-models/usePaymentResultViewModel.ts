import { DiversoError, VerifiedPaymentStatus, type VerifiedPayment, type PaymentGateway } from '@/core';

import { PaymentOutcome, type OpenPayment } from '../payment-outcome';
import { useLiveState } from './use-live-state';

interface PaymentResultState {
  loading: boolean;
  /** Lo que dijo el servidor del pago; null mientras se verifica o si hubo [failure]. */
  result: VerifiedPayment | null;
  /** Por qué no se pudo verificar el pago. */
  failure: DiversoError | null;
  /** Cuántas veces se ha preguntado al servidor en esta verificación. */
  attempts: number;
  /** «Intentar de nuevo» está abriendo otra vez el pago de la misma reserva. */
  retryingPayment: boolean;
  /** Motivo si ese nuevo intento de pago no se pudo abrir o se cerró sin terminar. */
  retryError: string | null;
}

const waitMs = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * ViewModel de `/pago/resultado` (`PagoResultadoViewModel`): pregunta al servidor cómo quedó el
 * pago (nunca se confía en la redirección del navegador) y, si Wompi aún no resuelve, reintenta
 * [maxAttempts] veces cada [pauseMs]. Al desmontar la pantalla el sondeo se corta.
 *
 * [transactionId]: `id` que Wompi añadió a la redirección (flujo normal). [bookingId]: reserva a
 * verificar sin transacción conocida («Ya pagué, verificar»). A `pagos-verificar` se le manda
 * exactamente UNA de las dos claves.
 */
export function usePaymentResultViewModel(
  { gateway }: { gateway: PaymentGateway },
  {
    transactionId,
    bookingId,
    maxAttempts = 5,
    pauseMs = 3000,
  }: { transactionId: string | null; bookingId: string | null; maxAttempts?: number; pauseMs?: number },
) {
  const { state, latest, update, alive } = useLiveState<PaymentResultState>(() => ({
    loading: true,
    result: null,
    failure: null,
    attempts: 0,
    retryingPayment: false,
    retryError: null,
  }));

  const verify = async (): Promise<void> => {
    const wasLoading = latest.current.loading;
    update({ loading: true, result: null, failure: null, attempts: 0 }, !wasLoading);

    while (alive.current) {
      // Cada intento se avisa: la vista muestra «… (intento N)» desde el segundo. (En Dart no se
      // notificaba y ese texto nunca llegaba a verse.)
      update({ attempts: latest.current.attempts + 1 });
      let result: VerifiedPayment;
      try {
        result = await gateway.verify(transactionId !== null ? { transactionId } : { bookingId });
        update({ result, failure: null }, false);
      } catch (e) {
        if (!(e instanceof DiversoError)) console.warn('PaymentResultViewModel.verify:', e);
        update({ failure: e instanceof DiversoError ? e : new DiversoError('ERROR_INESPERADO'), result: null }, false);
        break;
      }
      if (result.status !== VerifiedPaymentStatus.pending || latest.current.attempts >= maxAttempts) break;
      await waitMs(pauseMs);
    }
    update({ loading: false });
  };

  /**
   * Vuelve a abrir el pago de [bookingId] (rechazado o cerrado) con [openPayment]. No crea otra
   * reserva: es la misma, que sigue pendiente de pago.
   */
  const retryPayment = async (bookingId: string, openPayment: OpenPayment): Promise<void> => {
    if (latest.current.retryingPayment) return;
    update({ retryingPayment: true, retryError: null });
    try {
      const outcome = await openPayment(bookingId);
      if (outcome === PaymentOutcome.closed) {
        update({ retryError: 'Cerraste el pago antes de terminar. Si ya pagaste, toca «Verificar de nuevo».' }, false);
      }
    } catch (e) {
      if (e instanceof DiversoError) {
        update({ retryError: e.userMessage }, false);
      } else {
        console.warn('PaymentResultViewModel.retryPayment:', e);
        update({ retryError: 'No pudimos iniciar el pago. Intenta de nuevo.' }, false);
      }
    }
    update({ retryingPayment: false });
  };

  return {
    ...state,
    noData: transactionId === null && bookingId === null,
    verify,
    retryPayment,
  };
}

export type PaymentResultViewModel = ReturnType<typeof usePaymentResultViewModel>;

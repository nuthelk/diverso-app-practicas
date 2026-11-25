import { DiversoError, VerifiedPaymentStatus, type VerifiedPayment, type PaymentGateway } from '@/core';

import { PagoAbierto, type AbrirPago } from '../pago-abierto';
import { useEstadoVivo } from './use-estado-vivo';

interface EstadoPagoResultado {
  cargando: boolean;
  /** Lo que dijo el servidor del pago; null mientras se verifica o si hubo [falla]. */
  resultado: VerifiedPayment | null;
  /** Por qué no se pudo verificar el pago. */
  falla: DiversoError | null;
  /** Cuántas veces se ha preguntado al servidor en esta verificación. */
  intentos: number;
  /** «Intentar de nuevo» está abriendo otra vez el pago de la misma reserva. */
  reintentandoPago: boolean;
  /** Motivo si ese nuevo intento de pago no se pudo abrir o se cerró sin terminar. */
  errorReintento: string | null;
}

const esperarMs = (ms: number) => new Promise<void>((resolver) => setTimeout(resolver, ms));

/**
 * ViewModel de `/pago/resultado` (`PagoResultadoViewModel`): pregunta al servidor cómo quedó el
 * pago (nunca se confía en la redirección del navegador) y, si Wompi aún no resuelve, reintenta
 * [maxIntentos] veces cada [pausaMs]. Al desmontar la pantalla el sondeo se corta.
 *
 * [transactionId]: `id` que Wompi añadió a la redirección (flujo normal). [bookingId]: reserva a
 * verificar sin transacción conocida («Ya pagué, verificar»). A `pagos-verificar` se le manda
 * exactamente UNA de las dos claves.
 */
export function usePagoResultadoViewModel(
  { pasarela }: { pasarela: PaymentGateway },
  {
    transactionId,
    bookingId,
    maxIntentos = 5,
    pausaMs = 3000,
  }: { transactionId: string | null; bookingId: string | null; maxIntentos?: number; pausaMs?: number },
) {
  const { estado, actual, cambiar, vivo } = useEstadoVivo<EstadoPagoResultado>(() => ({
    cargando: true,
    resultado: null,
    falla: null,
    intentos: 0,
    reintentandoPago: false,
    errorReintento: null,
  }));

  const verificar = async (): Promise<void> => {
    const yaCargando = actual.current.cargando;
    cambiar({ cargando: true, resultado: null, falla: null, intentos: 0 }, !yaCargando);

    while (vivo.current) {
      // Cada intento se avisa: la vista muestra «… (intento N)» desde el segundo. (En Dart no se
      // notificaba y ese texto nunca llegaba a verse.)
      cambiar({ intentos: actual.current.intentos + 1 });
      let resultado: VerifiedPayment;
      try {
        resultado = await pasarela.verificar(transactionId !== null ? { transactionId } : { bookingId });
        cambiar({ resultado, falla: null }, false);
      } catch (e) {
        if (!(e instanceof DiversoError)) console.warn('PagoResultadoViewModel.verificar:', e);
        cambiar({ falla: e instanceof DiversoError ? e : new DiversoError('ERROR_INESPERADO'), resultado: null }, false);
        break;
      }
      if (resultado.status !== VerifiedPaymentStatus.pending || actual.current.intentos >= maxIntentos) break;
      await esperarMs(pausaMs);
    }
    cambiar({ cargando: false });
  };

  /**
   * Vuelve a abrir el pago de [reserva] (rechazado o cerrado) con [abrirPago]. No crea otra
   * reserva: es la misma, que sigue pendiente de pago.
   */
  const intentarDeNuevo = async (reserva: string, abrirPago: AbrirPago): Promise<void> => {
    if (actual.current.reintentandoPago) return;
    cambiar({ reintentandoPago: true, errorReintento: null });
    try {
      const abierto = await abrirPago(reserva);
      if (abierto === PagoAbierto.cerrado) {
        cambiar({ errorReintento: 'Cerraste el pago antes de terminar. Si ya pagaste, toca «Verificar de nuevo».' }, false);
      }
    } catch (e) {
      if (e instanceof DiversoError) {
        cambiar({ errorReintento: e.userMessage }, false);
      } else {
        console.warn('PagoResultadoViewModel.intentarDeNuevo:', e);
        cambiar({ errorReintento: 'No pudimos iniciar el pago. Intenta de nuevo.' }, false);
      }
    }
    cambiar({ reintentandoPago: false });
  };

  return {
    ...estado,
    sinDatos: transactionId === null && bookingId === null,
    verificar,
    intentarDeNuevo,
  };
}

export type PagoResultadoViewModel = ReturnType<typeof usePagoResultadoViewModel>;

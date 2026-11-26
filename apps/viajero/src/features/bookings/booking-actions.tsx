import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

import type { Booking, CancellationPreview } from '@/core';
import { PaymentOutcome, type OpenPayment } from '@/features/checkout/payment-outcome';
import { showSnackbar } from '@/features/shared/snackbar';
import { errorMessageFor } from '@/features/shared/error-message';

import { CancellationDialog } from './components/CancellationDialog';
import type { ReservaAcciones } from './view-models/useReservaAcciones';

/** Aviso cuando el viajero cierra el WebView del pago sin terminar. */
export const PAYMENT_CLOSED_NOTICE = 'Cerraste el pago antes de terminar. Si ya pagaste, toca «Ya pagué, verificar».';

/**
 * Acciones sobre una reserva compartidas por «Mis reservas» y el detalle (`acciones_reserva.dart`):
 * la parte con diálogos y avisos (en Flutter, la que necesita el `BuildContext`); lo demás vive en
 * el view model.
 *
 * - Muestra como aviso flotante el `message` pendiente del view model y lo consume (`showSnackbar`).
 * - `cancelWithConfirmation(b)`: pide la vista previa; si llegó, muestra el diálogo con la
 *   política y, si el viajero confirma, cancela. Devuelve si confirmó (el resultado del servidor
 *   queda en el aviso).
 * - `completePayment(b)`: retoma el pago de una reserva pendiente con [openPayment] (`iniciarPago`).
 *
 * [dialog] es lo que la pantalla debe pintar (el `showDialog` de Flutter).
 */
export function useBookingActions(vm: ReservaAcciones, openPayment: OpenPayment) {
  const { mensaje, limpiarMensaje, vistaPrevia, cancelar, avisar } = vm;
  const [confirmation, setConfirmation] = useState<{
    code: string;
    preview: CancellationPreview;
    respond: (confirmed: boolean) => void;
  } | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (mensaje === null) return;
    showSnackbar(mensaje);
    limpiarMensaje();
  }, [mensaje, limpiarMensaje]);

  const cancelWithConfirmation = useCallback(
    async (b: Booking): Promise<boolean> => {
      const preview = await vistaPrevia(b);
      if (preview === null || !mounted.current) return false;
      const confirmed = await new Promise<boolean>((respond) => setConfirmation({ code: b.code, preview, respond }));
      if (!confirmed) return false;
      await cancelar(b);
      return true;
    },
    [vistaPrevia, cancelar],
  );

  const completePayment = useCallback(
    async (b: Booking): Promise<void> => {
      try {
        if ((await openPayment(b.id)) === PaymentOutcome.closed) avisar(PAYMENT_CLOSED_NOTICE);
      } catch (e) {
        avisar(errorMessageFor(e));
      }
    },
    [openPayment, avisar],
  );

  const dialog: ReactNode = confirmation ? (
    <CancellationDialog
      code={confirmation.code}
      preview={confirmation.preview}
      onResult={(confirmed) => {
        setConfirmation(null);
        confirmation.respond(confirmed);
      }}
    />
  ) : null;

  return { cancelWithConfirmation, completePayment, dialog };
}

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

import type { Booking, CancellationPreview } from '@/core';
import { PagoAbierto, type AbrirPago } from '@/features/checkout/pago-abierto';
import { showSnackbar } from '@/features/shared/snackbar';
import { errorMessageFor } from '@/features/shared/error-message';

import { CancelacionDialog } from './components/CancelacionDialog';
import type { ReservaAcciones } from './view-models/useReservaAcciones';

/** Aviso cuando el viajero cierra el WebView del pago sin terminar. */
export const AVISO_PAGO_CERRADO = 'Cerraste el pago antes de terminar. Si ya pagaste, toca «Ya pagué, verificar».';

/**
 * Acciones sobre una reserva compartidas por «Mis reservas» y el detalle (`acciones_reserva.dart`):
 * la parte con diálogos y avisos (en Flutter, la que necesita el `BuildContext`); lo demás vive en
 * el view model.
 *
 * - Muestra como aviso flotante el `mensaje` pendiente del view model y lo consume (`showSnackbar`).
 * - `cancelarConConfirmacion(b)`: pide la vista previa; si llegó, muestra el diálogo con la
 *   política y, si el viajero confirma, cancela. Devuelve si confirmó (el resultado del servidor
 *   queda en el aviso).
 * - `completarPago(b)`: retoma el pago de una reserva pendiente con [abrirPago] (`iniciarPago`).
 *
 * [dialogo] es lo que la pantalla debe pintar (el `showDialog` de Flutter).
 */
export function useAccionesReserva(vm: ReservaAcciones, abrirPago: AbrirPago) {
  const { mensaje, limpiarMensaje, vistaPrevia, cancelar, avisar } = vm;
  const [pregunta, setPregunta] = useState<{
    codigo: string;
    vista: CancellationPreview;
    responder: (confirmo: boolean) => void;
  } | null>(null);
  const montada = useRef(true);

  useEffect(() => {
    montada.current = true;
    return () => {
      montada.current = false;
    };
  }, []);

  useEffect(() => {
    if (mensaje === null) return;
    showSnackbar(mensaje);
    limpiarMensaje();
  }, [mensaje, limpiarMensaje]);

  const cancelarConConfirmacion = useCallback(
    async (b: Booking): Promise<boolean> => {
      const vista = await vistaPrevia(b);
      if (vista === null || !montada.current) return false;
      const confirmo = await new Promise<boolean>((responder) => setPregunta({ codigo: b.code, vista, responder }));
      if (!confirmo) return false;
      await cancelar(b);
      return true;
    },
    [vistaPrevia, cancelar],
  );

  const completarPago = useCallback(
    async (b: Booking): Promise<void> => {
      try {
        if ((await abrirPago(b.id)) === PagoAbierto.cerrado) avisar(AVISO_PAGO_CERRADO);
      } catch (e) {
        avisar(errorMessageFor(e));
      }
    },
    [abrirPago, avisar],
  );

  const dialogo: ReactNode = pregunta ? (
    <CancelacionDialog
      codigo={pregunta.codigo}
      vista={pregunta.vista}
      onResultado={(confirmo) => {
        setPregunta(null);
        pregunta.responder(confirmo);
      }}
    />
  ) : null;

  return { cancelarConConfirmacion, completarPago, dialogo };
}

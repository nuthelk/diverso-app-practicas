import { useRouter } from 'expo-router';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';

import type { PaymentGateway } from '@/core';
import { AppRoutes } from '@/router';

import { PagoWompiModal } from './components/PagoWompiModal';
import { irA } from './ir-a';
import { PagoAbierto, type AbrirPago } from './pago-abierto';
import { abrirEnLaMismaVentana, urlRetornoPago } from './pago-wompi';

/**
 * `iniciarPago` de `pago_wompi.dart` como hook: pide el checkout de la reserva a `pagos-iniciar`
 * y lo abre; el `PagoAbierto` dice cómo terminó.
 * - Web: navega en la MISMA pestaña a Wompi (`redirigido`); la página se descarga y el resultado
 *   llega a `/pago/resultado?id=…`.
 * - Android/iOS: WebView modal ([modalPago], que la pantalla debe pintar). Al interceptar la
 *   redirección va a `/pago/resultado?id=…` (`completado`); si el viajero lo cierra, `cerrado`.
 * Lanza `DiversoError` si el servidor rechaza el inicio del pago.
 */
export function useAbrirPago(pasarela: PaymentGateway): { abrirPago: AbrirPago; modalPago: ReactNode } {
  const router = useRouter();
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const resolver = useRef<((id: string | null) => void) | null>(null);
  const montado = useRef(true);

  useEffect(() => {
    montado.current = true;
    return () => {
      montado.current = false;
      // Si la pantalla se va con el WebView abierto, el pago queda «cerrado» (nadie lo espera).
      resolver.current?.(null);
      resolver.current = null;
    };
  }, []);

  const terminar = (id: string | null) => {
    setCheckoutUrl(null);
    const r = resolver.current;
    resolver.current = null;
    r?.(id);
  };

  const abrirPago: AbrirPago = async (bookingId) => {
    const checkout = await pasarela.start({ bookingId, redirectUrl: urlRetornoPago() });
    if (Platform.OS === 'web') return abrirEnLaMismaVentana(checkout.checkoutUrl);
    if (!montado.current) return PagoAbierto.cerrado;
    const id = await new Promise<string | null>((resolve) => {
      resolver.current = resolve;
      setCheckoutUrl(checkout.checkoutUrl);
    });
    if (id === null || !montado.current) return PagoAbierto.cerrado;
    irA(router, AppRoutes.pagoDeTransaccion(id));
    return PagoAbierto.completado;
  };

  return { abrirPago, modalPago: <PagoWompiModal checkoutUrl={checkoutUrl} onTerminar={terminar} /> };
}

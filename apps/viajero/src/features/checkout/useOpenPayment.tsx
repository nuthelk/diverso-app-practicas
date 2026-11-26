import { useRouter } from 'expo-router';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';

import type { PaymentGateway } from '@/core';
import { AppRoutes } from '@/router';

import { WompiPaymentModal } from './components/WompiPaymentModal';
import { goTo } from './go-to';
import { PaymentOutcome, type OpenPayment } from './payment-outcome';
import { openInSameWindow, paymentReturnUrl } from './wompi-payment';

/**
 * `iniciarPago` de `pago_wompi.dart` como hook: pide el checkout de la reserva a `pagos-iniciar`
 * y lo abre; el `PaymentOutcome` dice cómo terminó.
 * - Web: navega en la MISMA pestaña a Wompi (`redirigido`); la página se descarga y el resultado
 *   llega a `/pago/resultado?id=…`.
 * - Android/iOS: WebView modal ([paymentModal], que la pantalla debe pintar). Al interceptar la
 *   redirección va a `/pago/resultado?id=…` (`completado`); si el viajero lo cierra, `cerrado`.
 * Lanza `DiversoError` si el servidor rechaza el inicio del pago.
 */
export function useOpenPayment(gateway: PaymentGateway): { openPayment: OpenPayment; paymentModal: ReactNode } {
  const router = useRouter();
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const resolveRef = useRef<((id: string | null) => void) | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      // Si la pantalla se va con el WebView abierto, el pago queda «cerrado» (nadie lo espera).
      resolveRef.current?.(null);
      resolveRef.current = null;
    };
  }, []);

  const finish = (id: string | null) => {
    setCheckoutUrl(null);
    const r = resolveRef.current;
    resolveRef.current = null;
    r?.(id);
  };

  const openPayment: OpenPayment = async (bookingId) => {
    const checkout = await gateway.start({ bookingId, redirectUrl: paymentReturnUrl() });
    if (Platform.OS === 'web') return openInSameWindow(checkout.checkoutUrl);
    if (!mounted.current) return PaymentOutcome.closed;
    const id = await new Promise<string | null>((resolve) => {
      resolveRef.current = resolve;
      setCheckoutUrl(checkout.checkoutUrl);
    });
    if (id === null || !mounted.current) return PaymentOutcome.closed;
    goTo(router, AppRoutes.pagoDeTransaccion(id));
    return PaymentOutcome.completed;
  };

  return { openPayment, paymentModal: <WompiPaymentModal checkoutUrl={checkoutUrl} onFinish={finish} /> };
}

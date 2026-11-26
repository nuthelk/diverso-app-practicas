import type { WompiPaymentModalProps } from '../wompi-payment';

/**
 * Web: no hay WebView. El pago navega esta MISMA pestaña a Wompi (`openInSameWindow`) y el
 * resultado llega por la URL a `/pago/resultado`, así que aquí no se pinta nada. La versión de
 * Android/iOS está en `WompiPaymentModal.native.tsx` (Metro elige el archivo por plataforma; así
 * `react-native-webview` no entra al bundle web).
 */
export function WompiPaymentModal(_props: WompiPaymentModalProps) {
  return null;
}

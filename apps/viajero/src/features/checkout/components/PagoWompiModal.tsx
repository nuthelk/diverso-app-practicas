import type { PagoWompiModalProps } from '../pago-wompi';

/**
 * Web: no hay WebView. El pago navega esta MISMA pestaña a Wompi (`abrirEnLaMismaVentana`) y el
 * resultado llega por la URL a `/pago/resultado`, así que aquí no se pinta nada. La versión de
 * Android/iOS está en `PagoWompiModal.native.tsx` (Metro elige el archivo por plataforma; así
 * `react-native-webview` no entra al bundle web).
 */
export function PagoWompiModal(_props: PagoWompiModalProps) {
  return null;
}

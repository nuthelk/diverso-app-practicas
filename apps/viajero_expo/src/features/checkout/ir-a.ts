import type { Href } from 'expo-router';

/** Lo que se usa del router de Expo para `irA`. */
export interface RouterParaIr {
  canDismiss: () => boolean;
  dismissAll: () => void;
  replace: (href: Href) => void;
}

/**
 * `context.go(ruta)` de go_router: la pila queda SOLO con [ruta] (no se apila encima). Lo usan el
 * resultado del pago (`/reserva/:id`, `/reservas`), la confirmación y la vuelta del WebView: así
 * «atrás» no devuelve al checkout ni a un pago ya resuelto.
 */
export function irA(router: RouterParaIr, ruta: string): void {
  if (router.canDismiss()) router.dismissAll();
  router.replace(ruta as Href);
}

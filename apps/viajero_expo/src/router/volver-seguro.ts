import type { Href } from 'expo-router';

/** Lo que se usa del router de Expo (`useRouter()` o el `router` imperativo). */
export interface RouterParaVolver {
  canGoBack: () => boolean;
  back: () => void;
  replace: (href: Href) => void;
}

/**
 * «Volver» seguro (§1.5, gotcha 6): `canGoBack() ? back() : replace(raiz)`. Una pantalla abierta
 * en frío (recarga web o deep link) no tiene historial: en vez de no hacer nada (o salir de la
 * app) va a su raíz lógica (agencia → `/agencias`, plan → `/`, detalle de reserva → `/reservas`…).
 */
export function volverSeguro(router: RouterParaVolver, raiz: string): void {
  if (router.canGoBack()) router.back();
  else router.replace(raiz as Href);
}

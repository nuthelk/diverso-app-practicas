import { AppState, Platform, type AppStateStatus } from 'react-native';

/** Lo único que se usa del cliente de Supabase (para probarlo sin red). */
export interface ClienteConAutoRefresh {
  auth: { startAutoRefresh: () => Promise<void>; stopAutoRefresh: () => Promise<void> };
}

interface AppStateLike {
  currentState: AppStateStatus | null;
  addEventListener: (tipo: 'change', escucha: (estado: AppStateStatus) => void) => { remove: () => void };
}

/**
 * supabase-js solo refresca el token por su cuenta en navegador (con la visibilidad de la
 * pestaña). En Android/iOS hay que arrancar el refresco con la app en primer plano y detenerlo en
 * segundo plano (supabase_flutter lo hacía solo). Devuelve la función para desvincular.
 */
export function vincularAutoRefresh(
  client: ClienteConAutoRefresh,
  { plataforma = Platform.OS, appState = AppState as AppStateLike }: { plataforma?: string; appState?: AppStateLike } = {},
): () => void {
  if (plataforma === 'web') return () => {};
  const aplicar = (estado: AppStateStatus | null) => {
    if (estado === 'active') void client.auth.startAutoRefresh();
    else void client.auth.stopAutoRefresh();
  };
  if (appState.currentState === 'active') aplicar('active');
  const suscripcion = appState.addEventListener('change', aplicar);
  return () => suscripcion.remove();
}

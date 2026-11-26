import { AppState, Platform, type AppStateStatus } from 'react-native';

/** Lo único que se usa del cliente de Supabase (para probarlo sin red). */
export interface AutoRefreshClient {
  auth: { startAutoRefresh: () => Promise<void>; stopAutoRefresh: () => Promise<void> };
}

interface AppStateLike {
  currentState: AppStateStatus | null;
  addEventListener: (eventType: 'change', listener: (state: AppStateStatus) => void) => { remove: () => void };
}

/**
 * supabase-js solo refresca el token por su cuenta en navegador (con la visibilidad de la
 * pestaña). En Android/iOS hay que arrancar el refresco con la app en primer plano y detenerlo en
 * segundo plano (supabase_flutter lo hacía solo). Devuelve la función para desvincular.
 */
export function bindAutoRefresh(
  client: AutoRefreshClient,
  { platform = Platform.OS, appState = AppState as AppStateLike }: { platform?: string; appState?: AppStateLike } = {},
): () => void {
  if (platform === 'web') return () => {};
  const apply = (state: AppStateStatus | null) => {
    if (state === 'active') void client.auth.startAutoRefresh();
    else void client.auth.stopAutoRefresh();
  };
  if (appState.currentState === 'active') apply('active');
  const subscription = appState.addEventListener('change', apply);
  return () => subscription.remove();
}

import { SplashScreen } from 'expo-router';
import { useEffect } from 'react';

import { bindAutoRefresh } from '@/composition';
import { createRealDependencies } from '@/composition/real-dependencies';
import { AppRoot } from '@/composition/AppRoot';

// La splash queda hasta que la raíz tenga fuentes (ver AppRoot).
SplashScreen.preventAutoHideAsync().catch(() => {});

// Composición de producción: UN cliente de Supabase y sus repositorios para toda la app.
const { dependencies, client } = createRealDependencies();

/** Raíz de rutas: providers + fuentes + Stack con guard (las pruebas montan AppRoot con dobles). */
export default function RootLayout() {
  // En Android/iOS supabase-js no refresca el token solo: arranca/para según AppState.
  useEffect(() => bindAutoRefresh(client), []);
  return <AppRoot dependencies={dependencies} />;
}

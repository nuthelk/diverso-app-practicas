import { SplashScreen } from 'expo-router';
import { useEffect } from 'react';

import { vincularAutoRefresh } from '@/composition';
import { crearDependenciasReales } from '@/composition/dependencias-reales';
import { RaizDeLaApp } from '@/composition/RaizDeLaApp';

// La splash queda hasta que la raíz tenga fuentes (ver RaizDeLaApp).
SplashScreen.preventAutoHideAsync().catch(() => {});

// Composición de producción: UN cliente de Supabase y sus repositorios para toda la app.
const { dependencias, client } = crearDependenciasReales();

/** Raíz de rutas: providers + fuentes + Stack con guard (las pruebas montan RaizDeLaApp con dobles). */
export default function RootLayout() {
  // En Android/iOS supabase-js no refresca el token solo: arranca/para según AppState.
  useEffect(() => vincularAutoRefresh(client), []);
  return <RaizDeLaApp dependencias={dependencias} />;
}

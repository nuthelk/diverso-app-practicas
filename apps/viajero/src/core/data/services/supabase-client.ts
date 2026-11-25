/**
 * Cliente de Supabase para React Native (único módulo del core que toca APIs de RN).
 *
 * - `react-native-url-polyfill/auto`: el `URL` que trae React Native es «un subconjunto pequeño»
 *   (lo dice su propio código) sin el parseo/codificación WHATWG completos, y postgrest-js arma
 *   TODAS las consultas mutando `url.searchParams` (con valores no ASCII como `destino=eq.Jericó`).
 *   Es la configuración que recomienda la guía de Supabase para Expo. En web no hace nada
 *   (`auto.js` solo actúa si `Platform.OS !== 'web'`).
 * - Sesión en AsyncStorage (no SecureStore: el JWT pasa el límite de 2 KB), `persistSession` y
 *   `autoRefreshToken`. `detectSessionInUrl: false`: la app no tiene OAuth, magic link ni deep
 *   links de auth (tampoco en web), así que nunca hay sesión en la URL.
 * - supabase-js solo arranca el refresco automático en navegador: en nativo la composición debe
 *   llamar `client.auth.startAutoRefresh()` / `stopAutoRefresh()` según `AppState` (supabase_flutter
 *   lo hacía solo).
 */
import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { configDelEntorno, type DiversoConfig, hostDeMetro } from '../../config/diverso-config';

/**
 * En desarrollo, en un dispositivo, el Supabase local vive en el PC que sirve Metro: se usa su
 * host (LAN, o 127.0.0.1 con `--localhost` + `adb reverse`). En web y en producción, nada.
 */
function hostDesarrollo(): string | undefined {
  if (!__DEV__ || Platform.OS === 'web') return undefined;
  return hostDeMetro(Constants.expoConfig?.hostUri);
}

export function opcionesSupabase() {
  return {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  };
}

/** Crea el cliente (una vez, en la raíz de composición). */
export function crearClienteSupabase(config: DiversoConfig = configDelEntorno(hostDesarrollo())): SupabaseClient {
  return createClient(config.supabaseUrl, config.supabaseKey, opcionesSupabase());
}

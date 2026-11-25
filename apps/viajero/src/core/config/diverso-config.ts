/**
 * Configuración de conexión a Supabase.
 *
 * Se sobreescribe con `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_KEY` (ver `.env.example`).
 * Son públicas por diseño (la clave publicable no es secreta); los valores por defecto son los de la
 * instancia LOCAL de `supabase start` (`supabase/config.toml`), igual que `DiversoConfig` de Dart.
 * Nunca poner aquí claves de producción.
 *
 * En un dispositivo (emulador, simulador o celular con Expo Go), `127.0.0.1` es el propio
 * dispositivo: en desarrollo el cliente pasa [hostDesarrollo] = el host desde el que Metro sirve
 * la app, que es el PC donde corre `supabase start` (Docker publica el 54331 en 0.0.0.0).
 */
export interface DiversoConfig {
  readonly supabaseUrl: string;
  readonly supabaseKey: string;
  /** Ruta de la app a la que Wompi devuelve al viajero (`?id=<transacción>`). */
  readonly pagoResultadoPath: string;
  /**
   * URL de retorno en Android/iOS: el WebView la intercepta y nunca se carga (el backend la tiene
   * en su lista de permitidos).
   */
  readonly pagoRetornoMovil: string;
}

const PUERTO_LOCAL = 54331;
const URL_LOCAL = `http://127.0.0.1:${PUERTO_LOCAL}`;
/** Clave publicable de la instancia local (la misma que trae `supabase start` por defecto). */
const CLAVE_LOCAL = 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH';
const PAGO_RESULTADO_PATH = '/pago/resultado';

/**
 * Arma la configuración a partir de las variables (vacío = ausente). [hostDesarrollo]: host de
 * Metro en un dispositivo, solo en desarrollo; la variable explícita siempre gana.
 */
export function configDesde(env: { url?: string; key?: string; hostDesarrollo?: string }): DiversoConfig {
  const local = env.hostDesarrollo ? `http://${env.hostDesarrollo}:${PUERTO_LOCAL}` : URL_LOCAL;
  return {
    supabaseUrl: env.url || local,
    supabaseKey: env.key || CLAVE_LOCAL,
    pagoResultadoPath: PAGO_RESULTADO_PATH,
    pagoRetornoMovil: `https://diverso.app${PAGO_RESULTADO_PATH}`,
  };
}

/** Host de `Constants.expoConfig.hostUri` («192.168.1.4:8081» → «192.168.1.4»). */
export function hostDeMetro(hostUri: string | undefined): string | undefined {
  if (!hostUri) return undefined;
  return hostUri.slice(0, hostUri.lastIndexOf(':')) || undefined;
}

/** Configuración con las variables de entorno; el cliente le suma el host de Metro en desarrollo. */
export function configDelEntorno(hostDesarrollo?: string): DiversoConfig {
  // Expo solo incrusta `process.env.EXPO_PUBLIC_*` con acceso estático literal (sin desestructurar).
  return configDesde({
    url: process.env.EXPO_PUBLIC_SUPABASE_URL,
    key: process.env.EXPO_PUBLIC_SUPABASE_KEY,
    hostDesarrollo,
  });
}

export const diversoConfig: DiversoConfig = configDelEntorno();

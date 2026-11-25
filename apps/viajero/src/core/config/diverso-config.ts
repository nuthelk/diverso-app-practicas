/**
 * Configuración de conexión a Supabase.
 *
 * Se sobreescribe con `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_KEY` (ver `.env.example`).
 * Son públicas por diseño (la clave publicable no es secreta); los valores por defecto son los de la
 * instancia LOCAL de `supabase start` (`supabase/config.toml`), igual que `DiversoConfig` de Dart.
 * Nunca poner aquí claves de producción.
 *
 * En un dispositivo (emulador, simulador o celular con Expo Go), `127.0.0.1` es el propio
 * dispositivo: en desarrollo el cliente pasa [devHost] = el host desde el que Metro sirve
 * la app, que es el PC donde corre `supabase start` (Docker publica el 54331 en 0.0.0.0).
 */
export interface DiversoConfig {
  readonly supabaseUrl: string;
  readonly supabaseKey: string;
  /** Ruta de la app a la que Wompi devuelve al viajero (`?id=<transacción>`). */
  readonly paymentResultPath: string;
  /**
   * URL de retorno en Android/iOS: el WebView la intercepta y nunca se carga (el backend la tiene
   * en su lista de permitidos).
   */
  readonly mobilePaymentReturnUrl: string;
}

const LOCAL_PORT = 54331;
const LOCAL_URL = `http://127.0.0.1:${LOCAL_PORT}`;
/** Clave publicable de la instancia local (la misma que trae `supabase start` por defecto). */
const LOCAL_KEY = 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH';
const PAYMENT_RESULT_PATH = '/pago/resultado';

/**
 * Arma la configuración a partir de las variables (vacío = ausente). [devHost]: host de
 * Metro en un dispositivo, solo en desarrollo; la variable explícita siempre gana.
 */
export function configFrom(env: { url?: string; key?: string; devHost?: string }): DiversoConfig {
  const local = env.devHost ? `http://${env.devHost}:${LOCAL_PORT}` : LOCAL_URL;
  return {
    supabaseUrl: env.url || local,
    supabaseKey: env.key || LOCAL_KEY,
    paymentResultPath: PAYMENT_RESULT_PATH,
    mobilePaymentReturnUrl: `https://diverso.app${PAYMENT_RESULT_PATH}`,
  };
}

/** Host de `Constants.expoConfig.hostUri` («192.168.1.4:8081» → «192.168.1.4»). */
export function metroHost(hostUri: string | undefined): string | undefined {
  if (!hostUri) return undefined;
  return hostUri.slice(0, hostUri.lastIndexOf(':')) || undefined;
}

/** Configuración con las variables de entorno; el cliente le suma el host de Metro en desarrollo. */
export function configFromEnv(devHost?: string): DiversoConfig {
  // Expo solo incrusta `process.env.EXPO_PUBLIC_*` con acceso estático literal (sin desestructurar).
  return configFrom({
    url: process.env.EXPO_PUBLIC_SUPABASE_URL,
    key: process.env.EXPO_PUBLIC_SUPABASE_KEY,
    devHost,
  });
}

export const diversoConfig: DiversoConfig = configFromEnv();

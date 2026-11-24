/**
 * Configuración de conexión a Supabase.
 *
 * Se sobreescribe con `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_KEY` (ver `.env.example`).
 * Son públicas por diseño (la clave publicable no es secreta); los valores por defecto son los de la
 * instancia LOCAL de `supabase start` (`supabase/config.toml`), igual que `DiversoConfig` de Dart.
 * Nunca poner aquí claves de producción.
 *
 * Para el emulador de Android usar http://10.0.2.2:54331 (127.0.0.1 del host).
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

const URL_LOCAL = 'http://127.0.0.1:54331';
/** Clave publicable de la instancia local (la misma que trae `supabase start` por defecto). */
const CLAVE_LOCAL = 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH';
const PAGO_RESULTADO_PATH = '/pago/resultado';

/** Arma la configuración a partir de las variables (vacío = ausente). */
export function configDesde(env: { url?: string; key?: string }): DiversoConfig {
  return {
    supabaseUrl: env.url || URL_LOCAL,
    supabaseKey: env.key || CLAVE_LOCAL,
    pagoResultadoPath: PAGO_RESULTADO_PATH,
    pagoRetornoMovil: `https://diverso.app${PAGO_RESULTADO_PATH}`,
  };
}

// Expo solo incrusta `process.env.EXPO_PUBLIC_*` con acceso estático literal (sin desestructurar).
export const diversoConfig: DiversoConfig = configDesde({
  url: process.env.EXPO_PUBLIC_SUPABASE_URL,
  key: process.env.EXPO_PUBLIC_SUPABASE_KEY,
});

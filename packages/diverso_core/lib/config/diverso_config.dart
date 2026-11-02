/// Configuración de conexión a Supabase.
///
/// Los valores se pueden sobreescribir en tiempo de compilación:
///   flutter run --dart-define=SUPABASE_URL=... --dart-define=SUPABASE_KEY=...
///
/// Para el emulador de Android usar http://10.0.2.2:54331 (127.0.0.1 del host).
class DiversoConfig {
  DiversoConfig._();

  static const String supabaseUrl = String.fromEnvironment(
    'SUPABASE_URL',
    defaultValue: 'http://127.0.0.1:54331',
  );

  static const String supabaseKey = String.fromEnvironment(
    'SUPABASE_KEY',
    defaultValue: 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH',
  );

  /// Ruta de la app a la que Wompi devuelve al viajero (`?id=<transacción>`).
  static const String pagoResultadoPath = '/pago/resultado';

  /// URL de retorno en Android/iOS: el WebView la intercepta y nunca se carga
  /// (el backend la tiene en su lista de permitidos).
  static const String pagoRetornoMovil = 'https://diverso.app$pagoResultadoPath';
}

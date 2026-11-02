import 'package:diverso_core/diverso_core.dart';

/// Rutas de la app del viajero: los patrones que registra la tabla del router y los helpers que
/// arman cada ubicación. Ninguna pantalla escribe una ruta a mano: así un cambio de ruta (y los
/// deep links y recargas en web que dependen de ella) se hace en un solo sitio.
abstract final class AppRoutes {
  // Sin parámetros.
  static const login = '/login';
  static const consentimiento = '/consentimiento';
  static const explorar = '/';
  static const agencias = '/agencias';
  static const reservas = '/reservas';
  static const perfil = '/perfil';
  static const pagoResultado = DiversoConfig.pagoResultadoPath;
  static const comparar = '/comparar';
  static const resenaBase = '/resena';

  /// `/consentimiento` recordando a dónde volver al aceptar (`desde`: ubicación original completa).
  static String consentimientoDesde(String ubicacion) =>
      '$consentimiento?desde=${Uri.encodeQueryComponent(ubicacion)}';

  /// Los documentos legales se leen antes de crear la cuenta y mientras se pide el consentimiento.
  static const legalPrefijo = '/legal/';

  // Patrones con parámetros (tabla del router).
  static const legalPatron = '$legalPrefijo:doc';
  static const agenciaPatron = '/agencia/:id';
  static const planPatron = '/plan/:id';
  static const checkoutPatron = '/checkout/:planId/:fechaId';
  static const reservaPatron = '/reserva/:bookingId';
  static const reservaDetallePatron = '$reservas/:bookingId';
  static const resenaPatron = '$resenaBase/:bookingId';

  // Ubicaciones concretas.
  static String legal(String doc) => '$legalPrefijo$doc';
  static String agencia(String id) => '/agencia/$id';
  static String plan(String id) => '/plan/$id';
  static String checkout(String planId, String fechaId) => '/checkout/$planId/$fechaId';

  /// Confirmación de una reserva.
  static String reserva(String bookingId) => '/reserva/$bookingId';

  /// Detalle de una reserva propia (desde «Mis reservas»).
  static String reservaDetalle(String bookingId) => '$reservas/$bookingId';

  /// Reseña de una reserva propia ya viajada.
  static String resena(String bookingId) => '$resenaBase/$bookingId';

  /// Vuelta de Wompi: verifica en el servidor el pago de la transacción [transactionId].
  static String pagoDeTransaccion(String transactionId) =>
      '$pagoResultado?id=${Uri.encodeQueryComponent(transactionId)}';

  /// «Ya pagué, verificar»: verifica el pago más reciente de una reserva.
  static String pagoDeReserva(String bookingId) =>
      '$pagoResultado?reserva=${Uri.encodeQueryComponent(bookingId)}';

  /// Comparador de planes: los ids viajan en la URL (`?ids=a,b,c`) y la pantalla carga los planes.
  static String compararPlanes(Iterable<String> ids) =>
      '$comparar?ids=${ids.map(Uri.encodeQueryComponent).join(',')}';
}

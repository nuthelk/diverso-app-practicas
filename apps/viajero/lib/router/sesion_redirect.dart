import '../ui/features/legal/view_models/consent_view_model.dart';
import 'app_routes.dart';

/// Decide a dónde mandar al usuario según la sesión y el consentimiento (Ley 1581 de 2012).
/// Devuelve `null` si puede quedarse donde está. Es una función pura: la tabla del router solo
/// le pasa el estado y la ubicación completa (con query).
///
/// Con sesión, mientras el consentimiento no esté **aceptado** (se está verificando, falta
/// aceptar, o la consulta falló y no se sabe) todo lleva a `/consentimiento?desde=<ubicación>`,
/// salvo los documentos legales: ninguna pantalla protegida se abre ni carga datos antes de
/// saberlo, y un fallo de red nunca deja entrar. Al quedar aceptado, quien está en
/// `/consentimiento` vuelve a `desde` (si es una ubicación interna segura) o al inicio.
String? sesionRedirect({
  required bool haySesion,
  required EstadoConsentimiento consentimiento,
  required String ubicacion,
}) {
  final uri = Uri.parse(ubicacion);
  final enLegal = uri.path.startsWith(AppRoutes.legalPrefijo);
  final enLogin = uri.path == AppRoutes.login;
  final enConsentimiento = uri.path == AppRoutes.consentimiento;

  if (!haySesion) return enLogin || enLegal ? null : AppRoutes.login;
  if (enLegal) return null;

  if (consentimiento == EstadoConsentimiento.aceptado) {
    if (enLogin) return AppRoutes.explorar;
    if (enConsentimiento) return destinoSeguro(uri.queryParameters['desde']) ?? AppRoutes.explorar;
    return null;
  }
  return enConsentimiento ? null : AppRoutes.consentimientoDesde(ubicacion);
}

/// [desde] si es una ubicación interna a la que se puede volver; null si no. Viene de la URL, así
/// que no se confía en ella: debe empezar por `/` (no `//` ni `/\`, que el navegador toma como otro
/// sitio), no llevar esquema ni autoridad, y no ser `/login` ni `/consentimiento` (bucle).
String? destinoSeguro(String? desde) {
  if (desde == null || !desde.startsWith('/') || desde.startsWith('//')) return null;
  if (desde.contains(r'\')) return null;
  final uri = Uri.tryParse(desde);
  if (uri == null || uri.hasScheme || uri.hasAuthority) return null;
  if (uri.path == AppRoutes.login || uri.path == AppRoutes.consentimiento) return null;
  return desde;
}

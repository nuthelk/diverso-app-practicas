import '../ui/features/legal/view_models/consent_view_model.dart';
import 'app_routes.dart';

/// Decide a dónde mandar al usuario según la sesión y el consentimiento (Ley 1581 de 2012).
/// Devuelve `null` si puede quedarse donde está. Es una función pura: la tabla del router solo
/// le pasa el estado y la ubicación.
///
/// Con sesión, un consentimiento pendiente **o desconocido por un error** lleva a
/// `/consentimiento`: un fallo de red nunca deja entrar sin la autorización (esa pantalla ofrece
/// «Reintentar»). Mientras se está verificando no se mueve a nadie.
String? sesionRedirect({
  required bool haySesion,
  required EstadoConsentimiento consentimiento,
  required String ubicacion,
}) {
  final enLegal = ubicacion.startsWith(AppRoutes.legalPrefijo);
  final enLogin = ubicacion == AppRoutes.login;
  final enConsentimiento = ubicacion == AppRoutes.consentimiento;

  if (!haySesion) return enLogin || enLegal ? null : AppRoutes.login;

  switch (consentimiento) {
    case EstadoConsentimiento.pendiente:
    case EstadoConsentimiento.error:
      return enConsentimiento || enLegal ? null : AppRoutes.consentimiento;
    case EstadoConsentimiento.verificando:
      return enLogin ? AppRoutes.explorar : null;
    case EstadoConsentimiento.aceptado:
      return enLogin || enConsentimiento ? AppRoutes.explorar : null;
  }
}

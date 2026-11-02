import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:viajero/router/app_router.dart';
import 'package:viajero/ui/features/legal/view_models/consent_view_model.dart';

import 'auth_falso.dart';

/// Router real de la app con un usuario con sesión y al día con el consentimiento, sin Supabase.
GoRouter routerDePrueba(String url, {AuthFalso? auth}) {
  final sesion = auth ?? AuthFalso();
  final consentimiento = ConsentViewModel(auth: sesion);
  addTearDown(consentimiento.dispose);
  return buildViajeroRouter(auth: sesion, consentimiento: consentimiento, initialLocation: url);
}

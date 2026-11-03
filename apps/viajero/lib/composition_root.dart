import 'package:diverso_core/diverso_core.dart';
import 'package:flutter/widgets.dart';
import 'package:provider/provider.dart';

import 'app.dart';
import 'ui/core/theme/theme_mode_view_model.dart';
import 'ui/features/legal/view_models/consent_view_model.dart';

/// Raíz de composición de la app del viajero: todo lo que la UI puede pedir con `context.read`,
/// más [DiversoApp]. `main()` le pasa los repositorios reales (Supabase) y las pruebas de
/// arranque, dobles: así la prueba construye la app con el mismo cableado que producción.
///
/// Si una pantalla pide con `context.read<X>()` algo que no se provee aquí, falla al abrirla con
/// `ProviderNotFoundException`; `test/app_arranque_test.dart` recorre las pestañas para atraparlo.
Widget buildViajeroApp({
  required AuthRepository auth,
  required BookingRepository reservas,
  required CatalogRepository catalogo,
  required ReviewRepository resenas,
  required PaymentGateway pasarela,
}) {
  return MultiProvider(
    providers: [
      ChangeNotifierProvider(create: (_) => ThemeModeViewModel()),
      Provider<BookingRepository>.value(value: reservas),
      Provider<CatalogRepository>.value(value: catalogo),
      Provider<ReviewRepository>.value(value: resenas),
      Provider<AuthRepository>.value(value: auth),
      ChangeNotifierProvider(create: (context) => ConsentViewModel(auth: context.read())),
      Provider<PaymentGateway>.value(value: pasarela),
    ],
    child: const DiversoApp(),
  );
}

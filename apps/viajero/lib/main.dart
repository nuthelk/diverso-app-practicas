import 'package:diverso_core/diverso_core.dart';
import 'package:flutter/material.dart';
import 'package:flutter_web_plugins/url_strategy.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'app.dart';
import 'ui/core/theme/theme_mode_view_model.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  // URLs sin «#»: /pago/resultado y /reserva/:id deben poder cargarse directo (y tras recargar).
  usePathUrlStrategy();
  await initializeDateFormatting('es');

  await Supabase.initialize(
    url: DiversoConfig.supabaseUrl,
    publishableKey: DiversoConfig.supabaseKey,
  );

  // Composición de dependencias: el cliente de Supabase se crea una vez y se pasa por
  // constructor a los servicios (Api) y estos a los repositorios; la UI solo ve repositorios.
  final client = Supabase.instance.client;
  final edgeFunctions = EdgeFunctionsApi(client: client);

  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => ThemeModeViewModel()),
        Provider<BookingRepository>.value(
          value: BookingRepository(
            api: BookingApi(client: client),
            edgeFunctions: edgeFunctions,
          ),
        ),
        Provider<CatalogRepository>.value(
          value: CatalogRepository(api: CatalogApi(client: client)),
        ),
        Provider<ReviewRepository>.value(value: ReviewRepository(client: client)),
        Provider<AuthRepository>.value(value: AuthRepository(client: client)),
        Provider<PaymentGateway>.value(value: WompiPaymentGateway(edgeFunctions: edgeFunctions)),
      ],
      child: const DiversoApp(),
    ),
  );
}

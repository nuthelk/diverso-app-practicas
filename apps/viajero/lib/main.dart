import 'package:flutter/material.dart';
import 'package:flutter_web_plugins/url_strategy.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'app.dart';
import 'package:diverso_core/diverso_core.dart';
import 'theme_mode_controller.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  // URLs sin «#»: /pago/resultado y /reserva/:id deben poder cargarse directo (y tras recargar).
  usePathUrlStrategy();
  await initializeDateFormatting('es');

  await Supabase.initialize(
    url: DiversoConfig.supabaseUrl,
    publishableKey: DiversoConfig.supabaseKey,
  );

  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => ThemeModeController()),
        Provider<BookingService>(create: (_) => BookingService()),
        Provider<CatalogService>(create: (_) => CatalogService()),
        Provider<ReviewService>(create: (_) => ReviewService()),
        Provider<AuthService>(create: (_) => AuthService()),
        Provider<PaymentGateway>(create: (_) => WompiPaymentGateway()),
      ],
      child: const DiversoApp(),
    ),
  );
}

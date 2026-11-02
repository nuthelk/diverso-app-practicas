import 'package:flutter/material.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'app.dart';
import 'package:diverso_core/diverso_core.dart';
import 'theme_mode_controller.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await initializeDateFormatting('es');

  await Supabase.initialize(
    url: DiversoConfig.supabaseUrl,
    publishableKey: DiversoConfig.supabaseKey,
  );

  // Composición de dependencias: el cliente de Supabase se crea una vez y se pasa por
  // constructor a los servicios (Api) y estos a los repositorios; la UI solo ve repositorios.
  final client = Supabase.instance.client;

  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => ThemeModeController()),
        Provider<SupabaseClient>.value(value: client),
        Provider<AuthRepository>.value(value: AuthRepository(client: client)),
        Provider<AgencyRepository>.value(value: AgencyRepository(api: AgencyApi(client: client))),
      ],
      child: const PanelAgenciasApp(),
    ),
  );
}

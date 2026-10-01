import 'package:flutter/material.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'app.dart';
import 'package:diverso_core/diverso_core.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await initializeDateFormatting('es');

  await Supabase.initialize(
    url: DiversoConfig.supabaseUrl,
    publishableKey: DiversoConfig.supabaseKey,
  );

  runApp(const PanelAgenciasApp());
}

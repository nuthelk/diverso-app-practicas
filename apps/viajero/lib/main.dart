import 'package:diverso_core/diverso_core.dart';
import 'package:flutter/material.dart';
import 'package:flutter_web_plugins/url_strategy.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'composition_root.dart';

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
    buildViajeroApp(
      auth: AuthRepository(client: client),
      reservas: BookingRepository(
        api: BookingApi(client: client),
        edgeFunctions: edgeFunctions,
      ),
      catalogo: CatalogRepository(api: CatalogApi(client: client)),
      resenas: ReviewRepository(client: client),
      pasarela: WompiPaymentGateway(edgeFunctions: edgeFunctions),
    ),
  );
}

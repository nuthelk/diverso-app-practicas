import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:diverso_core/diverso_core.dart';

/// Prueba de integración del panel contra el Supabase local (docker):
/// reproduce exactamente PanelController.cargarTodo() para verificar que
/// agencia, planes (con embeds y orden) y la vista agency_sales parsean.
///
/// Requiere: `supabase start` + seed cargado en diverso-app/.
class IntegrationTestBinding extends AutomatedTestWidgetsFlutterBinding {
  @override
  bool get overrideHttpClient => false;
}

void main() {
  IntegrationTestBinding();

  const canal = MethodChannel('plugins.flutter.io/shared_preferences');
  TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
      .setMockMethodCallHandler(canal, (call) async {
    if (call.method == 'getAll') return <String, Object>{};
    return true;
  });

  final servicio = AgencyService();

  setUpAll(() async {
    try {
      await Supabase.initialize(
        url: DiversoConfig.supabaseUrl,
        publishableKey: DiversoConfig.supabaseKey,
      );
    } catch (_) {
      // Ya inicializado en este proceso.
    }
    try {
      await Supabase.instance.client.auth.signInWithPassword(
        email: 'graffiti@demo.com',
        password: 'demo1234',
      );
    } catch (e) {
      fail('No se pudo conectar al Supabase local. ¿Está corriendo? ($e)');
    }
  });

  tearDownAll(() async {
    await Supabase.instance.client.auth.signOut();
  });

  test('cargarTodo del panel: agencia, planes y ventas parsean', () async {
    final agencia = await servicio.miAgencia();
    expect(agencia, isNotNull, reason: 'La agencia graffiti debe existir');
    expect(agencia!.estadoVerificacion, VerificationStatus.verificado);

    final resultados = await Future.wait([
      servicio.misPlanes(agencia.id),
      servicio.ventas(agencia.id),
    ]);
    final planes = resultados[0] as List<Plan>;
    final ventas = resultados[1] as List<VentaRow>;

    expect(planes, isNotEmpty, reason: 'El seed crea planes para graffiti');
    // Los embeds deben haber llegado completos (RLS permite ver la propia).
    expect(planes.first.agency, isNotNull);
    expect(planes.first.fechasDisponibles, isNotEmpty,
        reason: 'El embed plan_dates debe parsear');
    // El orden embebido (plan_dates.order=fecha) no debe romper la consulta.
    expect(ventas, isA<List<VentaRow>>());
    if (ventas.isNotEmpty) {
      expect(ventas.first.bookingEstado, isA<String>());
      expect(ventas.first.montoTotal, greaterThanOrEqualTo(0));
      expect(ventas.first.codigo, startsWith('DIV-'));
    }
  });
}

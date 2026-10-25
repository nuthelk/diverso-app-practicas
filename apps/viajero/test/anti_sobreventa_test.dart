import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:diverso_core/diverso_core.dart';

/// Prueba de integración contra el Supabase local (docker). Verifica el
/// requisito central del Anexo 6: dos reservas simultáneas que compiten por
/// los últimos cupos nunca generan sobreventa (decremento atómico condicional en la RPC).
///
/// Requiere: `supabase start` + `supabase db reset` en diverso-app/.
/// Binding para pruebas de integración: permite HTTP real contra el
/// Supabase local (el binding normal responde 400 a toda petición).
class IntegrationTestBinding extends AutomatedTestWidgetsFlutterBinding {
  @override
  bool get overrideHttpClient => false;
}

void main() {
  // Instanciar el binding de integración (se registra como binding global).
  IntegrationTestBinding();

  // supabase_flutter persiste la sesión en shared_preferences; en tests no
  // hay implementación del plugin, así que simulamos un almacenamiento vacío.
  const canal = MethodChannel('plugins.flutter.io/shared_preferences');
  TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
      .setMockMethodCallHandler(canal, (call) async {
    if (call.method == 'getAll') return <String, Object>{};
    return true; // setValue/remove/clear reportan éxito
  });

  late SupabaseClient client;
  final bookings = BookingService();

  setUpAll(() async {
    try {
      await Supabase.initialize(
        url: DiversoConfig.supabaseUrl,
        publishableKey: DiversoConfig.supabaseKey,
      );
    } catch (e) {
      // Si ya fue inicializado en este proceso, continuar con la instancia.
    }
    client = Supabase.instance.client;
    try {
      await client.auth.signInWithPassword(
        email: 'santiago@demo.com',
        password: 'demo1234',
      );
    } catch (e) {
      fail('No se pudo conectar al Supabase local. ¿Está corriendo? ($e)');
    }
  });

  tearDownAll(() async {
    await client.auth.signOut();
  });

  test('la carrera por el último cupo nunca se sobrevende', () async {
    // 1. Buscar una fecha futura con cupo conocido.
    final hoy = DateTime.now();
    final iso = '${hoy.year}-${hoy.month.toString().padLeft(2, '0')}-${hoy.day.toString().padLeft(2, '0')}';
    final fechas = await client
        .from('plan_dates')
        .select('id, cupo_disponible, plan_id, plans(estado)')
        .gte('fecha', iso)
        .limit(50);
    // Cupo entre 3 y 21: deja exactamente 1 cupo tras reservar cupo-1 pax
    // sin exceder el máximo de 20 personas por reserva.
    final conCupo = (fechas as List)
        .map((e) => e as Map<String, dynamic>)
        .where((f) => (f['cupo_disponible'] as num).toInt() >= 3)
        .where((f) => (f['cupo_disponible'] as num).toInt() <= 21)
        .where((f) => f['plans'] != null)
        .toList();
    expect(conCupo, isNotEmpty, reason: 'El seed debe dejar fechas con cupos');
    final fecha = conCupo.first;
    final planDateId = fecha['id'] as String;
    final cupo = fecha['cupo_disponible'] as int;
    final creadas = <String>[];

    try {
      // 2. Consumir cupo-1 asientos en una reserva grande.
      final grande = await bookings.crearReserva(planDateId: planDateId, pax: cupo - 1);
      creadas.add(grande.bookingId);
      expect(grande.codigo, startsWith('DIV-'));

      // 3. Carrera: dos reservas simultáneas de 1 pax por el último cupo.
      Future<(String, Object?)> intento() async {
        try {
          final r = await bookings.crearReserva(planDateId: planDateId, pax: 1);
          return ('ok', r);
        } catch (e) {
          return ('error', e);
        }
      }

      final resultados = await Future.wait([intento(), intento()]);

      final exitosas = resultados.where((r) => r.$1 == 'ok').toList();
      final fallidas = resultados.where((r) => r.$1 != 'ok').toList();

      expect(exitosas.length, 1, reason: 'exactamente una reserva debe ganar');
      for (final r in exitosas) {
        creadas.add((r.$2 as CreatedBooking).bookingId);
      }

      expect(fallidas.length, 1, reason: 'la otra debe fallar');
      final error = fallidas.first.$2 as DiversoException;
      expect(error.codigo, 'SIN_CUPO');

      // 4. El cupo quedó exactamente en 0 (sin sobreventa).
      final despues = await client
          .from('plan_dates')
          .select('cupo_disponible')
          .eq('id', planDateId)
          .single();
      expect(despues['cupo_disponible'], 0);
    } finally {
      // 5. Limpieza: cancelar libera los cupos para otros tests/demos.
      for (final id in creadas) {
        await client.rpc('cancel_booking', params: {'p_booking_id': id});
      }
    }
  });

  test('el pago simulado confirma y deja referencia SIMULADO-', () async {
    final hoy = DateTime.now();
    final iso = '${hoy.year}-${hoy.month.toString().padLeft(2, '0')}-${hoy.day.toString().padLeft(2, '0')}';
    final fechas = await client
        .from('plan_dates')
        .select('id, cupo_disponible, plans(estado)')
        .gte('fecha', iso)
        .limit(50);
    final fecha = (fechas as List)
        .map((e) => e as Map<String, dynamic>)
        .firstWhere((f) =>
            (f['cupo_disponible'] as int) >= 2 && f['plans'] != null);

    final reserva = await bookings.crearReserva(
        planDateId: fecha['id'] as String, pax: 1);
    try {
      final pago = await SimulatedPaymentGateway(latenciaSimulada: Duration.zero)
          .pagar(
              bookingId: reserva.bookingId,
              metodo: PaymentMethodOption.tarjeta);

      expect(pago.referencia, startsWith('SIMULADO-'));
      expect(pago.codigo, reserva.codigo);
      expect(pago.monto, reserva.montoTotal);

      final estado = await client
          .from('bookings')
          .select('estado')
          .eq('id', reserva.bookingId)
          .single();
      expect(estado['estado'], 'confirmada');
    } finally {
      await client
          .rpc('cancel_booking', params: {'p_booking_id': reserva.bookingId});
    }
  });
}

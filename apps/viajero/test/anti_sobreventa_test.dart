import 'dart:io' show Platform;

import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:diverso_core/diverso_core.dart';

/// Prueba de integración contra el Supabase local (docker). Verifica el
/// requisito central del Anexo 6: dos reservas simultáneas que compiten por
/// los últimos cupos nunca generan sobreventa (decremento atómico condicional en la RPC).
///
/// Requiere `supabase start` (migraciones y seed aplicados) en diverso-app/.
///
/// Las pruebas que CREAN reservas no dejan nada en la base: al terminar cancelan (para
/// devolver los cupos) y borran lo que crearon con la llave `service_role`, que se lee SOLO de
/// la variable de entorno SUPABASE_SERVICE_ROLE_KEY (nunca va en el código ni en el repo).
/// Sin esa variable esas pruebas se omiten, con el motivo a la vista. Para correrlas:
///
///     eval "$(supabase status -o env | sed 's/^/export SUPABASE_/')"   # bash
///     flutter test test/anti_sobreventa_test.dart
///
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

  final llaveServicio = Platform.environment['SUPABASE_SERVICE_ROLE_KEY'] ?? '';
  final String? sinLlave = llaveServicio.isEmpty
      ? 'Define SUPABASE_SERVICE_ROLE_KEY (supabase status -o env) para que la prueba limpie lo que crea'
      : null;
  late SupabaseClient admin;

  /// Deja la base como estaba: devuelve los cupos de las reservas de prueba (cancelar_reserva,
  /// solo service_role) y las borra; el borrado arrastra pagos, intentos y reembolsos.
  Future<void> limpiar(List<String> ids) async {
    if (ids.isEmpty) return;
    final uid = client.auth.currentUser!.id;
    final filas = await admin.from('bookings').select('id, estado').inFilter('id', ids);
    for (final f in filas) {
      if (f['estado'] != 'cancelada') {
        await admin.rpc('cancelar_reserva', params: {'p_booking_id': f['id'], 'p_viajero_id': uid});
      }
    }
    await admin.from('bookings').delete().inFilter('id', ids);
  }

  Future<int> cupoDe(String planDateId) async {
    final r = await admin.from('plan_dates').select('cupo_disponible').eq('id', planDateId).single();
    return (r['cupo_disponible'] as num).toInt();
  }

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
    if (sinLlave == null) admin = SupabaseClient(DiversoConfig.supabaseUrl, llaveServicio);
  });

  tearDownAll(() async {
    if (sinLlave == null) await admin.dispose();
    await client.auth.signOut();
  });

  test('la carrera por el último cupo nunca se sobrevende', skip: sinLlave, () async {
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
      // 5. Limpieza: devuelve cupos y borra las reservas de prueba.
      await limpiar(creadas);
    }
    expect(await cupoDe(planDateId), cupo, reason: 'la limpieza debe devolver los cupos');
  });

  test('reservaPendiente encuentra la reserva sin pagar de esa fecha y solo de esa', skip: sinLlave, () async {
    final fechas = await admin
        .from('plan_dates')
        .select('id, cupo_disponible, plans!inner(estado)')
        .gte('fecha', DateTime.now().toIso8601String().substring(0, 10))
        .eq('plans.estado', 'publicado')
        .gte('cupo_disponible', 2)
        .limit(2);
    expect(fechas.length, 2, reason: 'el seed debe dejar dos fechas con cupos');
    final a = fechas[0]['id'] as String;
    final b = fechas[1]['id'] as String;
    final cupoA = await cupoDe(a);

    expect(await bookings.reservaPendiente(a), isNull, reason: 'antes de reservar no hay pendiente');
    final creada = await bookings.crearReserva(planDateId: a, pax: 1);
    try {
      final pendiente = await bookings.reservaPendiente(a);
      expect(pendiente?.id, creada.bookingId);
      expect(pendiente?.estado, BookingStatus.pendientePago);
      expect(pendiente?.pax, 1);
      expect(pendiente!.venceAt.isAfter(DateTime.now()), isTrue);
      expect(await bookings.reservaPendiente(b), isNull, reason: 'otra fecha no se ve afectada');
    } finally {
      await limpiar([creada.bookingId]);
    }
    expect(await bookings.reservaPendiente(a), isNull);
    expect(await cupoDe(a), cupoA);
  });

  group('el cliente ya no puede confirmar pagos ni saltarse la política', () {
    final noExiste = throwsA(isA<PostgrestException>().having((e) => e.code, 'code', 'PGRST202'));
    final sinPermiso = throwsA(isA<PostgrestException>().having((e) => e.code, 'code', '42501'));
    const uuid = '00000000-0000-0000-0000-000000000001';

    test('confirm_payment y cancel_booking ya no existen en la API (404)', () async {
      await expectLater(
        client.rpc('confirm_payment', params: {'p_booking_id': uuid, 'p_metodo': 'tarjeta'}),
        noExiste,
      );
      await expectLater(
        client.rpc('cancel_booking', params: {'p_booking_id': uuid}),
        noExiste,
      );
    });

    test('las funciones de pagos y reembolsos son solo del servidor (permiso denegado)', () async {
      await expectLater(
        client.rpc('aplicar_resultado_pago', params: {
          'p_referencia': 'X-1',
          'p_transaction_id': 'tx',
          'p_status': 'APPROVED',
          'p_amount_in_cents': 100,
          'p_metodo': 'CARD',
          'p_raw': <String, dynamic>{},
        }),
        sinPermiso,
      );
      await expectLater(
        client.rpc('crear_intento_pago', params: {'p_booking_id': uuid, 'p_viajero_id': uuid}),
        sinPermiso,
      );
      await expectLater(
        client.rpc('cancelar_reserva', params: {'p_booking_id': uuid, 'p_viajero_id': uuid}),
        sinPermiso,
      );
    });

    test('escribir directo en payments/bookings no marca la reserva como pagada', skip: sinLlave, () async {
      final hoy = DateTime.now();
      final iso = '${hoy.year}-${hoy.month.toString().padLeft(2, '0')}-${hoy.day.toString().padLeft(2, '0')}';
      final fechas = await client
          .from('plan_dates')
          .select('id, cupo_disponible, plans(estado)')
          .gte('fecha', iso)
          .limit(50);
      final fecha = (fechas as List)
          .map((e) => e as Map<String, dynamic>)
          .firstWhere((f) => (f['cupo_disponible'] as int) >= 2 && f['plans'] != null);
      final reserva = await bookings.crearReserva(planDateId: fecha['id'] as String, pax: 1);
      try {
        await expectLater(
          client.from('payments').insert({
            'booking_id': reserva.bookingId,
            'metodo': 'tarjeta',
            'estado': 'aprobado',
            'monto': reserva.montoTotal,
            'referencia': 'FALSO-${reserva.codigo}',
          }),
          throwsA(isA<PostgrestException>()),
        );
        // El UPDATE sobre bookings no tiene política para el viajero: no cambia nada.
        final actualizadas = await client
            .from('bookings')
            .update({'estado': 'confirmada'})
            .eq('id', reserva.bookingId)
            .select();
        expect(actualizadas, isEmpty);
        final estado = await client.from('bookings').select('estado').eq('id', reserva.bookingId).single();
        expect(estado['estado'], 'pendiente_pago');
      } finally {
        await limpiar([reserva.bookingId]);
      }
    });
  });
}

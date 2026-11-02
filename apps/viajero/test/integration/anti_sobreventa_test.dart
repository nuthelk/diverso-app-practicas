import 'dart:io' show Platform;

import 'package:diverso_core/diverso_core.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

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
  TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger.setMockMethodCallHandler(
    canal,
    (call) async {
      if (call.method == 'getAll') return <String, Object>{};
      return true; // setValue/remove/clear reportan éxito
    },
  );

  late SupabaseClient client;
  final bookings = BookingService();

  final llaveServicio = Platform.environment['SUPABASE_SERVICE_ROLE_KEY'] ?? '';
  final String? sinLlave = llaveServicio.isEmpty
      ? 'Define SUPABASE_SERVICE_ROLE_KEY (supabase status -o env) para que la prueba limpie lo que crea'
      : null;
  late SupabaseClient admin;

  /// Las pruebas reservan solo fechas POSTERIORES a hoy (en Bogotá, como decide el servidor): una fecha
  /// de hoy puede haber salido ya (create_booking la rechaza con FECHA_YA_SALIO y cancelar_reserva
  /// con RESERVA_YA_SALIO).
  String hoyIso() => fechaToIso(hoyBogota());

  /// Deja la base como estaba: cancela primero (cancelar_reserva, solo service_role) para devolver
  /// los cupos y luego borra las reservas de prueba; el borrado arrastra pagos, intentos y reembolsos.
  /// Borrar sin cancelar NO devuelve el cupo, así que una reserva que no se pueda cancelar no se borra
  /// y la limpieza FALLA con su código: nunca deja residuos en silencio.
  Future<void> limpiar(List<String> ids) async {
    if (ids.isEmpty) return;
    final filas = await admin
        .from('bookings')
        .select('id, codigo, estado, viajero_id')
        .inFilter('id', ids);
    final sinCancelar = <String>[];
    final aBorrar = <String>[];
    for (final f in filas) {
      if (f['estado'] != 'cancelada') {
        try {
          await admin.rpc(
            'cancelar_reserva',
            params: {'p_booking_id': f['id'], 'p_viajero_id': f['viajero_id']},
          );
        } catch (e) {
          sinCancelar.add('${f['codigo']} (${f['estado']}): $e');
          continue;
        }
      }
      aBorrar.add(f['id'] as String);
    }
    if (aBorrar.isNotEmpty) await admin.from('bookings').delete().inFilter('id', aBorrar);
    if (sinCancelar.isNotEmpty) {
      throw StateError(
        'RESIDUO: la limpieza no pudo cancelar estas reservas de prueba, quedan en la base y '
        'sus cupos retenidos: ${sinCancelar.join('; ')}',
      );
    }
  }

  Future<int> cupoDe(String planDateId) async {
    final r = await admin
        .from('plan_dates')
        .select('cupo_disponible')
        .eq('id', planDateId)
        .single();
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
      await client.auth.signInWithPassword(email: 'santiago@demo.com', password: 'demo1234');
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
    // 1. Buscar una fecha futura (posterior a hoy) con cupo conocido.
    final fechas = await client
        .from('plan_dates')
        .select('id, cupo_disponible, plan_id, plans(estado)')
        .gt('fecha', hoyIso())
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

    // La regla "una sola reserva pendiente por viajero y fecha" (servidor) impide que UN viajero compita
    // consigo mismo: la carrera por el último cupo es entre DOS viajeros distintos.
    final email = 'carrera-${DateTime.now().millisecondsSinceEpoch}@example.com';
    final otro = SupabaseClient(DiversoConfig.supabaseUrl, DiversoConfig.supabaseKey);
    final usuario = await admin.auth.admin.createUser(
      AdminUserAttributes(email: email, password: 'Carrera-1234', emailConfirm: true),
    );
    final otroId = usuario.user!.id;

    try {
      await otro.auth.signInWithPassword(email: email, password: 'Carrera-1234');

      // 2. Consumir cupo-1 asientos en una reserva grande.
      final grande = await bookings.crearReserva(planDateId: planDateId, pax: cupo - 1);
      creadas.add(grande.bookingId);
      expect(grande.codigo, startsWith('DIV-'));
      // La reserva grande queda pagada: si siguiera pendiente, la regla de una pendiente por viajero y
      // fecha rechazaría el segundo intento de este mismo viajero por ese motivo y no por falta de cupo.
      await admin.from('bookings').update({'estado': 'confirmada'}).eq('id', grande.bookingId);

      // 3. Carrera: dos reservas simultáneas de 1 pax (de dos viajeros) por el último cupo.
      Future<(String, Object?)> intento(Future<CreatedBooking> Function() reservar) async {
        try {
          return ('ok', await reservar());
        } catch (e) {
          return ('error', e);
        }
      }

      final resultados = await Future.wait([
        intento(() => bookings.crearReserva(planDateId: planDateId, pax: 1)),
        intento(() async {
          try {
            final res = await otro.rpc(
              'create_booking',
              params: {'p_plan_date_id': planDateId, 'p_pax': 1},
            );
            final map = (res as Map).cast<String, dynamic>();
            return CreatedBooking(
              bookingId: map['booking_id'] as String,
              codigo: map['codigo'] as String,
              montoTotal: (map['monto_total'] as num).toDouble(),
              planTitulo: map['plan_titulo'] as String? ?? '',
            );
          } catch (e) {
            throw DiversoException.fromPostgrest(e);
          }
        }),
      ]);

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
      // 5. Limpieza: devuelve cupos, borra las reservas de prueba y el viajero creado para la carrera.
      await limpiar(creadas);
      await otro.auth.signOut();
      await otro.dispose();
      await admin.auth.admin.deleteUser(otroId);
    }
    expect(await cupoDe(planDateId), cupo, reason: 'la limpieza debe devolver los cupos');
  });

  test(
    'el mismo viajero no abre una segunda reserva pendiente de la misma fecha (RESERVA_PENDIENTE_EXISTENTE)',
    skip: sinLlave,
    () async {
      final fechas = await admin
          .from('plan_dates')
          .select('id, cupo_disponible, plans!inner(estado)')
          .gt('fecha', hoyIso())
          .eq('plans.estado', 'publicado')
          .gte('cupo_disponible', 3)
          .limit(1);
      expect(fechas, isNotEmpty, reason: 'el seed debe dejar una fecha con cupos');
      final planDateId = fechas.first['id'] as String;
      final cupo = await cupoDe(planDateId);

      final primera = await bookings.crearReserva(planDateId: planDateId, pax: 1);
      try {
        final error = await bookings
            .crearReserva(planDateId: planDateId, pax: 1)
            .then<DiversoException?>((_) => null, onError: (Object e) => e as DiversoException);
        expect(error, isNotNull, reason: 'la segunda reserva pendiente debe rechazarse');
        expect(error!.codigo, 'RESERVA_PENDIENTE_EXISTENTE');
        expect(
          error.detalle?['booking_id'],
          primera.bookingId,
          reason: 'el error trae el id de la reserva existente',
        );
        expect(await cupoDe(planDateId), cupo - 1, reason: 'el rechazo no retiene cupos');
      } finally {
        await limpiar([primera.bookingId]);
      }
      expect(await cupoDe(planDateId), cupo);
    },
  );

  test(
    'reservaPendiente encuentra la reserva sin pagar de esa fecha y solo de esa',
    skip: sinLlave,
    () async {
      final fechas = await admin
          .from('plan_dates')
          .select('id, cupo_disponible, plans!inner(estado)')
          .gt('fecha', hoyIso())
          .eq('plans.estado', 'publicado')
          .gte('cupo_disponible', 2)
          .limit(2);
      expect(fechas.length, 2, reason: 'el seed debe dejar dos fechas con cupos');
      final a = fechas[0]['id'] as String;
      final b = fechas[1]['id'] as String;
      final cupoA = await cupoDe(a);

      expect(
        await bookings.reservaPendiente(a),
        isNull,
        reason: 'antes de reservar no hay pendiente',
      );
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
    },
  );

  group('el cliente ya no puede confirmar pagos ni saltarse la política', () {
    final noExiste = throwsA(isA<PostgrestException>().having((e) => e.code, 'code', 'PGRST202'));
    final sinPermiso = throwsA(isA<PostgrestException>().having((e) => e.code, 'code', '42501'));
    const uuid = '00000000-0000-0000-0000-000000000001';

    test('confirm_payment y cancel_booking ya no existen en la API (404)', () async {
      await expectLater(
        client.rpc('confirm_payment', params: {'p_booking_id': uuid, 'p_metodo': 'tarjeta'}),
        noExiste,
      );
      await expectLater(client.rpc('cancel_booking', params: {'p_booking_id': uuid}), noExiste);
    });

    test('las funciones de pagos y reembolsos son solo del servidor (permiso denegado)', () async {
      await expectLater(
        client.rpc(
          'aplicar_resultado_pago',
          params: {
            'p_referencia': 'X-1',
            'p_transaction_id': 'tx',
            'p_status': 'APPROVED',
            'p_amount_in_cents': 100,
            'p_metodo': 'CARD',
            'p_raw': <String, dynamic>{},
          },
        ),
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

    test(
      'escribir directo en payments/bookings no marca la reserva como pagada',
      skip: sinLlave,
      () async {
        final fechas = await client
            .from('plan_dates')
            .select('id, cupo_disponible, plans(estado)')
            .gt('fecha', hoyIso())
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
          final estado = await client
              .from('bookings')
              .select('estado')
              .eq('id', reserva.bookingId)
              .single();
          expect(estado['estado'], 'pendiente_pago');
        } finally {
          await limpiar([reserva.bookingId]);
        }
      },
    );
  });
}

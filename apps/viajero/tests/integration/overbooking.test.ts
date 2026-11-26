/**
 * @jest-environment node
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { configFrom } from '@/core/config/diverso-config';
import { BookingRepository } from '@/core/data/repositories/booking-repository';
import { BookingApiSupabase } from '@/core/data/services/booking-api';
import { EdgeFunctionsApiSupabase } from '@/core/data/services/edge-functions-api';
import { DiversoError } from '@/core/errors/diverso-error';
import { CreatedBooking } from '@/core/models/created-booking';
import { BookingStatus } from '@/core/models/enums';
import { asDouble, asInt, isRow, asString, asStringOr, type Row } from '@/core/models/row';
import { dateToIso } from '@/core/utils/dates';
import { todayInBogota } from '@/core/utils/bogota-time';

/**
 * Prueba de integración contra el Supabase local de Diverso (docker). Verifica el requisito central
 * del Anexo 6: dos reservas simultáneas que compiten por los últimos cupos nunca generan sobreventa
 * (decremento atómico condicional en la RPC). Port de `test/integration/anti_sobreventa_test.dart`.
 *
 * Requiere `supabase start` (migraciones y seed aplicados) en diverso-app/.
 *
 * Las pruebas que CREAN reservas no dejan nada en la base: al terminar cancelan (para devolver los
 * cupos) y borran lo que crearon con la llave `service_role`, que se lee SOLO de la variable de entorno
 * SUPABASE_SERVICE_ROLE_KEY (nunca va en el código ni en el repo). Sin esa variable TODO el archivo se
 * omite (`describe.skip`). URL: `EXPO_PUBLIC_SUPABASE_URL` o, si no está, http://127.0.0.1:54331.
 *
 * Entorno `node`: fetch real de Node y clientes SIN persistencia de sesión creados solo para la
 * prueba (el cliente de la app usa AsyncStorage y el polyfill de URL de React Native).
 */

// Desestructurado a propósito: babel-preset-expo incrusta `process.env.EXPO_PUBLIC_*` con acceso
// estático literal al transformar (y Jest cachea la transformación); así se lee en tiempo de ejecución.
const {
  EXPO_PUBLIC_SUPABASE_URL: urlEnv,
  EXPO_PUBLIC_SUPABASE_KEY: keyEnv,
  SUPABASE_SERVICE_ROLE_KEY: serviceKeyEnv,
} = process.env;
const config = configFrom({ url: urlEnv, key: keyEnv });
const serviceRoleKey = serviceKeyEnv ?? '';

const describeWithServiceKey = serviceRoleKey === '' ? describe.skip : describe;

/**
 * `fetch` real de Node. El setup de jest-expo (`expo/src/winter`) reemplaza el `fetch` global por
 * `expo/fetch` con un módulo nativo de mentira (`text()` devuelve undefined), también en el entorno
 * `node`. `vm.runInThisContext` evalúa en el contexto principal del proceso (no en el sandbox de
 * Jest), donde `fetch` sigue siendo el de Node.
 */
const fetchNode = (require('node:vm') as { runInThisContext(code: string): unknown }).runInThisContext(
  'fetch',
) as typeof fetch;

function newClient(key: string): SupabaseClient {
  return createClient(config.supabaseUrl, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: fetchNode },
  });
}

/**
 * Las pruebas reservan solo fechas POSTERIORES a hoy (en Bogotá, como decide el servidor): una fecha
 * de hoy puede haber salido ya (create_booking la rechaza con FECHA_YA_SALIO y cancelar_reserva con
 * RESERVA_YA_SALIO).
 */
const todayIso = (): string => dateToIso(todayInBogota());

describeWithServiceKey('anti-sobreventa (integración contra el Supabase local)', () => {
  let client: SupabaseClient;
  let admin: SupabaseClient;
  let bookings: BookingRepository;

  /**
   * Deja la base como estaba: cancela primero (cancelar_reserva, solo service_role) para devolver los
   * cupos y luego borra las reservas de prueba; el borrado arrastra pagos, intentos y reembolsos.
   * Borrar sin cancelar NO devuelve el cupo, así que una reserva que no se pueda cancelar no se borra
   * y la limpieza FALLA con su código: nunca deja residuos en silencio.
   */
  async function cleanUp(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    const { data: rows } = await admin
      .from('bookings')
      .select('id, codigo, estado, viajero_id')
      .in('id', ids)
      .throwOnError();
    const notCancelled: string[] = [];
    const toDelete: string[] = [];
    for (const f of (rows ?? []) as Row[]) {
      if (f['estado'] !== 'cancelada') {
        try {
          await admin
            .rpc('cancelar_reserva', { p_booking_id: f['id'], p_viajero_id: f['viajero_id'] })
            .throwOnError();
        } catch (e) {
          notCancelled.push(`${String(f['codigo'])} (${String(f['estado'])}): ${String(e)}`);
          continue;
        }
      }
      toDelete.push(asString(f['id']));
    }
    if (toDelete.length > 0) await admin.from('bookings').delete().in('id', toDelete).throwOnError();
    if (notCancelled.length > 0) {
      throw new Error(
        'RESIDUO: la limpieza no pudo cancelar estas reservas de prueba, quedan en la base y ' +
          `sus cupos retenidos: ${notCancelled.join('; ')}`,
      );
    }
  }

  async function spotsOf(planDateId: string): Promise<number> {
    const { data } = await admin
      .from('plan_dates')
      .select('cupo_disponible')
      .eq('id', planDateId)
      .single()
      .throwOnError();
    return asInt((data as Row)['cupo_disponible']);
  }

  /** Fechas futuras de planes publicados con al menos [minimo] cupos (consulta con service_role). */
  async function publishedDates(minSpots: number, limit: number): Promise<Row[]> {
    const { data } = await admin
      .from('plan_dates')
      .select('id, cupo_disponible, plans!inner(estado)')
      .gt('fecha', todayIso())
      .eq('plans.estado', 'publicado')
      .gte('cupo_disponible', minSpots)
      .limit(limit)
      .throwOnError();
    return (data ?? []) as Row[];
  }

  beforeAll(async () => {
    client = newClient(config.supabaseKey);
    bookings = new BookingRepository({
      api: new BookingApiSupabase({ client }),
      edgeFunctions: new EdgeFunctionsApiSupabase({ client }),
    });
    let failure: unknown;
    try {
      const { error } = await client.auth.signInWithPassword({ email: 'santiago@demo.com', password: 'demo1234' });
      failure = error;
    } catch (e) {
      failure = e;
    }
    if (failure) throw new Error(`No se pudo conectar al Supabase local. ¿Está corriendo? (${String(failure)})`);
    admin = newClient(serviceRoleKey);
  });

  afterAll(async () => {
    await client?.auth.signOut();
  });

  test('la carrera por el último cupo nunca se sobrevende', async () => {
    // 1. Buscar una fecha futura (posterior a hoy) con cupo conocido.
    const { data: dates } = await client
      .from('plan_dates')
      .select('id, cupo_disponible, plan_id, plans(estado)')
      .gt('fecha', todayIso())
      .limit(50)
      .throwOnError();
    // Cupo entre 3 y 21: deja exactamente 1 cupo tras reservar cupo-1 pax sin exceder el máximo de
    // 20 personas por reserva.
    const withSpots = ((dates ?? []) as Row[])
      .filter((f) => asInt(f['cupo_disponible']) >= 3)
      .filter((f) => asInt(f['cupo_disponible']) <= 21)
      .filter((f) => f['plans'] != null);
    expect(withSpots.length).toBeGreaterThan(0); // El seed debe dejar fechas con cupos
    const date = withSpots[0]!;
    const planDateId = asString(date['id']);
    const spots = asInt(date['cupo_disponible']);
    const createdIds: string[] = [];

    // La regla "una sola reserva pendiente por viajero y fecha" (servidor) impide que UN viajero
    // compita consigo mismo: la carrera por el último cupo es entre DOS viajeros distintos.
    const email = `carrera-${Date.now()}@example.com`;
    const other = newClient(config.supabaseKey);
    const { data: createdUser, error: createUserError } = await admin.auth.admin.createUser({
      email,
      password: 'Carrera-1234',
      email_confirm: true,
    });
    if (createUserError || !createdUser.user) throw createUserError ?? new Error('createUser no devolvió el usuario');
    const otherId = createdUser.user.id;

    try {
      const { error: otherSignInError } = await other.auth.signInWithPassword({ email, password: 'Carrera-1234' });
      if (otherSignInError) throw otherSignInError;

      // 2. Consumir cupo-1 asientos en una reserva grande.
      const large = await bookings.createBooking({ planDateId, pax: spots - 1 });
      createdIds.push(large.bookingId);
      expect(large.code.startsWith('DIV-')).toBe(true);
      // La reserva grande queda pagada: si siguiera pendiente, la regla de una pendiente por viajero y
      // fecha rechazaría el segundo intento de este mismo viajero por ese motivo y no por falta de cupo.
      await admin.from('bookings').update({ estado: 'confirmada' }).eq('id', large.bookingId).throwOnError();

      // 3. Carrera: dos reservas simultáneas de 1 pax (de dos viajeros) por el último cupo.
      type Attempt = { ok: true; booking: CreatedBooking } | { ok: false; error: unknown };
      const attempt = async (book: () => Promise<CreatedBooking>): Promise<Attempt> => {
        try {
          return { ok: true, booking: await book() };
        } catch (e) {
          return { ok: false, error: e };
        }
      };

      const results = await Promise.all([
        attempt(() => bookings.createBooking({ planDateId, pax: 1 })),
        attempt(async () => {
          try {
            const { data: res } = await other
              .rpc('create_booking', { p_plan_date_id: planDateId, p_pax: 1 })
              .throwOnError();
            if (!isRow(res)) throw new Error(`create_booking devolvió ${String(res)}`);
            return new CreatedBooking({
              bookingId: asString(res['booking_id']),
              code: asString(res['codigo']),
              totalAmount: asDouble(res['monto_total']),
              planTitle: asStringOr(res['plan_titulo'], ''),
            });
          } catch (e) {
            throw DiversoError.fromPostgrest(e);
          }
        }),
      ]);

      const succeeded = results.filter((r) => r.ok);
      const failed = results.filter((r) => !r.ok);

      expect(succeeded).toHaveLength(1); // exactamente una reserva debe ganar
      for (const r of succeeded) if (r.ok) createdIds.push(r.booking.bookingId);

      expect(failed).toHaveLength(1); // la otra debe fallar
      const failedResult = failed[0]!;
      const error = failedResult.ok ? null : failedResult.error;
      expect(error).toBeInstanceOf(DiversoError);
      expect((error as DiversoError).code).toBe('SIN_CUPO');

      // 4. El cupo quedó exactamente en 0 (sin sobreventa).
      const { data: after } = await client
        .from('plan_dates')
        .select('cupo_disponible')
        .eq('id', planDateId)
        .single()
        .throwOnError();
      expect((after as Row)['cupo_disponible']).toBe(0);
    } finally {
      // 5. Limpieza: devuelve cupos, borra las reservas de prueba y el viajero creado para la carrera.
      await cleanUp(createdIds);
      await other.auth.signOut();
      const { error: deleteUserError } = await admin.auth.admin.deleteUser(otherId);
      if (deleteUserError) throw deleteUserError;
    }
    expect(await spotsOf(planDateId)).toBe(spots); // la limpieza debe devolver los cupos
  });

  test('el mismo viajero no abre una segunda reserva pendiente de la misma fecha (RESERVA_PENDIENTE_EXISTENTE)', async () => {
    const dates = await publishedDates(3, 1);
    expect(dates.length).toBeGreaterThan(0); // el seed debe dejar una fecha con cupos
    const planDateId = asString(dates[0]!['id']);
    const spots = await spotsOf(planDateId);

    const first = await bookings.createBooking({ planDateId, pax: 1 });
    try {
      const error = await bookings.createBooking({ planDateId, pax: 1 }).then(
        () => null,
        (e: unknown) => e,
      );
      expect(error).not.toBeNull(); // la segunda reserva pendiente debe rechazarse
      expect(error).toBeInstanceOf(DiversoError);
      const diverso = error as DiversoError;
      expect(diverso.code).toBe('RESERVA_PENDIENTE_EXISTENTE');
      // el error trae el id de la reserva existente
      expect(diverso.details?.['booking_id']).toBe(first.bookingId);
      expect(await spotsOf(planDateId)).toBe(spots - 1); // el rechazo no retiene cupos
    } finally {
      await cleanUp([first.bookingId]);
    }
    expect(await spotsOf(planDateId)).toBe(spots);
  });

  test('pendingBooking encuentra la reserva sin pagar de esa fecha y solo de esa', async () => {
    const dates = await publishedDates(2, 2);
    expect(dates).toHaveLength(2); // el seed debe dejar dos fechas con cupos
    const a = asString(dates[0]!['id']);
    const b = asString(dates[1]!['id']);
    const spotsA = await spotsOf(a);

    expect(await bookings.pendingBooking(a)).toBeNull(); // antes de reservar no hay pendiente
    const created = await bookings.createBooking({ planDateId: a, pax: 1 });
    try {
      const pending = await bookings.pendingBooking(a);
      expect(pending?.id).toBe(created.bookingId);
      expect(pending?.status).toBe(BookingStatus.pendingPayment);
      expect(pending?.pax).toBe(1);
      expect(pending!.expiresAt.getTime()).toBeGreaterThan(Date.now());
      expect(await bookings.pendingBooking(b)).toBeNull(); // otra fecha no se ve afectada
    } finally {
      await cleanUp([created.bookingId]);
    }
    expect(await bookings.pendingBooking(a)).toBeNull();
    expect(await spotsOf(a)).toBe(spotsA);
  });

  describe('el cliente ya no puede confirmar pagos ni saltarse la política', () => {
    const NOT_FOUND = 'PGRST202';
    const PERMISSION_DENIED = '42501';
    const uuid = '00000000-0000-0000-0000-000000000001';

    test('confirm_payment y cancel_booking ya no existen en la API (404)', async () => {
      const confirm = await client.rpc('confirm_payment', { p_booking_id: uuid, p_metodo: 'tarjeta' });
      expect(confirm.error?.code).toBe(NOT_FOUND);
      const cancel = await client.rpc('cancel_booking', { p_booking_id: uuid });
      expect(cancel.error?.code).toBe(NOT_FOUND);
    });

    test('las funciones de pagos y reembolsos son solo del servidor (permiso denegado)', async () => {
      const apply = await client.rpc('aplicar_resultado_pago', {
        p_referencia: 'X-1',
        p_transaction_id: 'tx',
        p_status: 'APPROVED',
        p_amount_in_cents: 100,
        p_metodo: 'CARD',
        p_raw: {},
      });
      expect(apply.error?.code).toBe(PERMISSION_DENIED);
      const attempt = await client.rpc('crear_intento_pago', { p_booking_id: uuid, p_viajero_id: uuid });
      expect(attempt.error?.code).toBe(PERMISSION_DENIED);
      const cancel = await client.rpc('cancelar_reserva', { p_booking_id: uuid, p_viajero_id: uuid });
      expect(cancel.error?.code).toBe(PERMISSION_DENIED);
    });

    test('escribir directo en payments/bookings no marca la reserva como pagada', async () => {
      const { data: dates } = await client
        .from('plan_dates')
        .select('id, cupo_disponible, plans(estado)')
        .gt('fecha', todayIso())
        .limit(50)
        .throwOnError();
      const date = ((dates ?? []) as Row[]).find(
        (f) => asInt(f['cupo_disponible']) >= 2 && f['plans'] != null,
      );
      if (date === undefined) throw new Error('el seed debe dejar una fecha con cupos');
      const booking = await bookings.createBooking({ planDateId: asString(date['id']), pax: 1 });
      try {
        const insertion = await client.from('payments').insert({
          booking_id: booking.bookingId,
          metodo: 'tarjeta',
          estado: 'aprobado',
          monto: booking.totalAmount,
          referencia: `FALSO-${booking.code}`,
        });
        expect(insertion.error).not.toBeNull();
        // El UPDATE sobre bookings no tiene política para el viajero: no cambia nada.
        const { data: updated } = await client
          .from('bookings')
          .update({ estado: 'confirmada' })
          .eq('id', booking.bookingId)
          .select()
          .throwOnError();
        expect(updated).toEqual([]);
        const { data: statusRow } = await client
          .from('bookings')
          .select('estado')
          .eq('id', booking.bookingId)
          .single()
          .throwOnError();
        expect((statusRow as Row)['estado']).toBe('pendiente_pago');
      } finally {
        await cleanUp([booking.bookingId]);
      }
    });
  });
});

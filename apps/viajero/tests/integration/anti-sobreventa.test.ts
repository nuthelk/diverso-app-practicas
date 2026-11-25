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
  EXPO_PUBLIC_SUPABASE_KEY: claveEnv,
  SUPABASE_SERVICE_ROLE_KEY: llaveEnv,
} = process.env;
const config = configFrom({ url: urlEnv, key: claveEnv });
const llaveServicio = llaveEnv ?? '';

const describeConLlave = llaveServicio === '' ? describe.skip : describe;

/**
 * `fetch` real de Node. El setup de jest-expo (`expo/src/winter`) reemplaza el `fetch` global por
 * `expo/fetch` con un módulo nativo de mentira (`text()` devuelve undefined), también en el entorno
 * `node`. `vm.runInThisContext` evalúa en el contexto principal del proceso (no en el sandbox de
 * Jest), donde `fetch` sigue siendo el de Node.
 */
const fetchNode = (require('node:vm') as { runInThisContext(codigo: string): unknown }).runInThisContext(
  'fetch',
) as typeof fetch;

function nuevoCliente(clave: string): SupabaseClient {
  return createClient(config.supabaseUrl, clave, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: fetchNode },
  });
}

/**
 * Las pruebas reservan solo fechas POSTERIORES a hoy (en Bogotá, como decide el servidor): una fecha
 * de hoy puede haber salido ya (create_booking la rechaza con FECHA_YA_SALIO y cancelar_reserva con
 * RESERVA_YA_SALIO).
 */
const hoyIso = (): string => dateToIso(todayInBogota());

describeConLlave('anti-sobreventa (integración contra el Supabase local)', () => {
  let client: SupabaseClient;
  let admin: SupabaseClient;
  let bookings: BookingRepository;

  /**
   * Deja la base como estaba: cancela primero (cancelar_reserva, solo service_role) para devolver los
   * cupos y luego borra las reservas de prueba; el borrado arrastra pagos, intentos y reembolsos.
   * Borrar sin cancelar NO devuelve el cupo, así que una reserva que no se pueda cancelar no se borra
   * y la limpieza FALLA con su código: nunca deja residuos en silencio.
   */
  async function limpiar(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    const { data: filas } = await admin
      .from('bookings')
      .select('id, codigo, estado, viajero_id')
      .in('id', ids)
      .throwOnError();
    const sinCancelar: string[] = [];
    const aBorrar: string[] = [];
    for (const f of (filas ?? []) as Row[]) {
      if (f['estado'] !== 'cancelada') {
        try {
          await admin
            .rpc('cancelar_reserva', { p_booking_id: f['id'], p_viajero_id: f['viajero_id'] })
            .throwOnError();
        } catch (e) {
          sinCancelar.push(`${String(f['codigo'])} (${String(f['estado'])}): ${String(e)}`);
          continue;
        }
      }
      aBorrar.push(asString(f['id']));
    }
    if (aBorrar.length > 0) await admin.from('bookings').delete().in('id', aBorrar).throwOnError();
    if (sinCancelar.length > 0) {
      throw new Error(
        'RESIDUO: la limpieza no pudo cancelar estas reservas de prueba, quedan en la base y ' +
          `sus cupos retenidos: ${sinCancelar.join('; ')}`,
      );
    }
  }

  async function cupoDe(planDateId: string): Promise<number> {
    const { data } = await admin
      .from('plan_dates')
      .select('cupo_disponible')
      .eq('id', planDateId)
      .single()
      .throwOnError();
    return asInt((data as Row)['cupo_disponible']);
  }

  /** Fechas futuras de planes publicados con al menos [minimo] cupos (consulta con service_role). */
  async function fechasPublicadas(minimo: number, limite: number): Promise<Row[]> {
    const { data } = await admin
      .from('plan_dates')
      .select('id, cupo_disponible, plans!inner(estado)')
      .gt('fecha', hoyIso())
      .eq('plans.estado', 'publicado')
      .gte('cupo_disponible', minimo)
      .limit(limite)
      .throwOnError();
    return (data ?? []) as Row[];
  }

  beforeAll(async () => {
    client = nuevoCliente(config.supabaseKey);
    bookings = new BookingRepository({
      api: new BookingApiSupabase({ client }),
      edgeFunctions: new EdgeFunctionsApiSupabase({ client }),
    });
    let fallo: unknown;
    try {
      const { error } = await client.auth.signInWithPassword({ email: 'santiago@demo.com', password: 'demo1234' });
      fallo = error;
    } catch (e) {
      fallo = e;
    }
    if (fallo) throw new Error(`No se pudo conectar al Supabase local. ¿Está corriendo? (${String(fallo)})`);
    admin = nuevoCliente(llaveServicio);
  });

  afterAll(async () => {
    await client?.auth.signOut();
  });

  test('la carrera por el último cupo nunca se sobrevende', async () => {
    // 1. Buscar una fecha futura (posterior a hoy) con cupo conocido.
    const { data: fechas } = await client
      .from('plan_dates')
      .select('id, cupo_disponible, plan_id, plans(estado)')
      .gt('fecha', hoyIso())
      .limit(50)
      .throwOnError();
    // Cupo entre 3 y 21: deja exactamente 1 cupo tras reservar cupo-1 pax sin exceder el máximo de
    // 20 personas por reserva.
    const conCupo = ((fechas ?? []) as Row[])
      .filter((f) => asInt(f['cupo_disponible']) >= 3)
      .filter((f) => asInt(f['cupo_disponible']) <= 21)
      .filter((f) => f['plans'] != null);
    expect(conCupo.length).toBeGreaterThan(0); // El seed debe dejar fechas con cupos
    const fecha = conCupo[0]!;
    const planDateId = asString(fecha['id']);
    const cupo = asInt(fecha['cupo_disponible']);
    const creadas: string[] = [];

    // La regla "una sola reserva pendiente por viajero y fecha" (servidor) impide que UN viajero
    // compita consigo mismo: la carrera por el último cupo es entre DOS viajeros distintos.
    const email = `carrera-${Date.now()}@example.com`;
    const otro = nuevoCliente(config.supabaseKey);
    const { data: usuario, error: errorUsuario } = await admin.auth.admin.createUser({
      email,
      password: 'Carrera-1234',
      email_confirm: true,
    });
    if (errorUsuario || !usuario.user) throw errorUsuario ?? new Error('createUser no devolvió el usuario');
    const otroId = usuario.user.id;

    try {
      const { error: errorOtro } = await otro.auth.signInWithPassword({ email, password: 'Carrera-1234' });
      if (errorOtro) throw errorOtro;

      // 2. Consumir cupo-1 asientos en una reserva grande.
      const grande = await bookings.crearReserva({ planDateId, pax: cupo - 1 });
      creadas.push(grande.bookingId);
      expect(grande.code.startsWith('DIV-')).toBe(true);
      // La reserva grande queda pagada: si siguiera pendiente, la regla de una pendiente por viajero y
      // fecha rechazaría el segundo intento de este mismo viajero por ese motivo y no por falta de cupo.
      await admin.from('bookings').update({ estado: 'confirmada' }).eq('id', grande.bookingId).throwOnError();

      // 3. Carrera: dos reservas simultáneas de 1 pax (de dos viajeros) por el último cupo.
      type Intento = { ok: true; reserva: CreatedBooking } | { ok: false; error: unknown };
      const intento = async (reservar: () => Promise<CreatedBooking>): Promise<Intento> => {
        try {
          return { ok: true, reserva: await reservar() };
        } catch (e) {
          return { ok: false, error: e };
        }
      };

      const resultados = await Promise.all([
        intento(() => bookings.crearReserva({ planDateId, pax: 1 })),
        intento(async () => {
          try {
            const { data: res } = await otro
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

      const exitosas = resultados.filter((r) => r.ok);
      const fallidas = resultados.filter((r) => !r.ok);

      expect(exitosas).toHaveLength(1); // exactamente una reserva debe ganar
      for (const r of exitosas) if (r.ok) creadas.push(r.reserva.bookingId);

      expect(fallidas).toHaveLength(1); // la otra debe fallar
      const fallida = fallidas[0]!;
      const error = fallida.ok ? null : fallida.error;
      expect(error).toBeInstanceOf(DiversoError);
      expect((error as DiversoError).code).toBe('SIN_CUPO');

      // 4. El cupo quedó exactamente en 0 (sin sobreventa).
      const { data: despues } = await client
        .from('plan_dates')
        .select('cupo_disponible')
        .eq('id', planDateId)
        .single()
        .throwOnError();
      expect((despues as Row)['cupo_disponible']).toBe(0);
    } finally {
      // 5. Limpieza: devuelve cupos, borra las reservas de prueba y el viajero creado para la carrera.
      await limpiar(creadas);
      await otro.auth.signOut();
      const { error: errorBorrado } = await admin.auth.admin.deleteUser(otroId);
      if (errorBorrado) throw errorBorrado;
    }
    expect(await cupoDe(planDateId)).toBe(cupo); // la limpieza debe devolver los cupos
  });

  test('el mismo viajero no abre una segunda reserva pendiente de la misma fecha (RESERVA_PENDIENTE_EXISTENTE)', async () => {
    const fechas = await fechasPublicadas(3, 1);
    expect(fechas.length).toBeGreaterThan(0); // el seed debe dejar una fecha con cupos
    const planDateId = asString(fechas[0]!['id']);
    const cupo = await cupoDe(planDateId);

    const primera = await bookings.crearReserva({ planDateId, pax: 1 });
    try {
      const error = await bookings.crearReserva({ planDateId, pax: 1 }).then(
        () => null,
        (e: unknown) => e,
      );
      expect(error).not.toBeNull(); // la segunda reserva pendiente debe rechazarse
      expect(error).toBeInstanceOf(DiversoError);
      const diverso = error as DiversoError;
      expect(diverso.code).toBe('RESERVA_PENDIENTE_EXISTENTE');
      // el error trae el id de la reserva existente
      expect(diverso.details?.['booking_id']).toBe(primera.bookingId);
      expect(await cupoDe(planDateId)).toBe(cupo - 1); // el rechazo no retiene cupos
    } finally {
      await limpiar([primera.bookingId]);
    }
    expect(await cupoDe(planDateId)).toBe(cupo);
  });

  test('reservaPendiente encuentra la reserva sin pagar de esa fecha y solo de esa', async () => {
    const fechas = await fechasPublicadas(2, 2);
    expect(fechas).toHaveLength(2); // el seed debe dejar dos fechas con cupos
    const a = asString(fechas[0]!['id']);
    const b = asString(fechas[1]!['id']);
    const cupoA = await cupoDe(a);

    expect(await bookings.reservaPendiente(a)).toBeNull(); // antes de reservar no hay pendiente
    const creada = await bookings.crearReserva({ planDateId: a, pax: 1 });
    try {
      const pendiente = await bookings.reservaPendiente(a);
      expect(pendiente?.id).toBe(creada.bookingId);
      expect(pendiente?.status).toBe(BookingStatus.pendingPayment);
      expect(pendiente?.pax).toBe(1);
      expect(pendiente!.expiresAt.getTime()).toBeGreaterThan(Date.now());
      expect(await bookings.reservaPendiente(b)).toBeNull(); // otra fecha no se ve afectada
    } finally {
      await limpiar([creada.bookingId]);
    }
    expect(await bookings.reservaPendiente(a)).toBeNull();
    expect(await cupoDe(a)).toBe(cupoA);
  });

  describe('el cliente ya no puede confirmar pagos ni saltarse la política', () => {
    const NO_EXISTE = 'PGRST202';
    const SIN_PERMISO = '42501';
    const uuid = '00000000-0000-0000-0000-000000000001';

    test('confirm_payment y cancel_booking ya no existen en la API (404)', async () => {
      const confirmar = await client.rpc('confirm_payment', { p_booking_id: uuid, p_metodo: 'tarjeta' });
      expect(confirmar.error?.code).toBe(NO_EXISTE);
      const cancelar = await client.rpc('cancel_booking', { p_booking_id: uuid });
      expect(cancelar.error?.code).toBe(NO_EXISTE);
    });

    test('las funciones de pagos y reembolsos son solo del servidor (permiso denegado)', async () => {
      const aplicar = await client.rpc('aplicar_resultado_pago', {
        p_referencia: 'X-1',
        p_transaction_id: 'tx',
        p_status: 'APPROVED',
        p_amount_in_cents: 100,
        p_metodo: 'CARD',
        p_raw: {},
      });
      expect(aplicar.error?.code).toBe(SIN_PERMISO);
      const intento = await client.rpc('crear_intento_pago', { p_booking_id: uuid, p_viajero_id: uuid });
      expect(intento.error?.code).toBe(SIN_PERMISO);
      const cancelar = await client.rpc('cancelar_reserva', { p_booking_id: uuid, p_viajero_id: uuid });
      expect(cancelar.error?.code).toBe(SIN_PERMISO);
    });

    test('escribir directo en payments/bookings no marca la reserva como pagada', async () => {
      const { data: fechas } = await client
        .from('plan_dates')
        .select('id, cupo_disponible, plans(estado)')
        .gt('fecha', hoyIso())
        .limit(50)
        .throwOnError();
      const fecha = ((fechas ?? []) as Row[]).find(
        (f) => asInt(f['cupo_disponible']) >= 2 && f['plans'] != null,
      );
      if (fecha === undefined) throw new Error('el seed debe dejar una fecha con cupos');
      const reserva = await bookings.crearReserva({ planDateId: asString(fecha['id']), pax: 1 });
      try {
        const insercion = await client.from('payments').insert({
          booking_id: reserva.bookingId,
          metodo: 'tarjeta',
          estado: 'aprobado',
          monto: reserva.totalAmount,
          referencia: `FALSO-${reserva.code}`,
        });
        expect(insercion.error).not.toBeNull();
        // El UPDATE sobre bookings no tiene política para el viajero: no cambia nada.
        const { data: actualizadas } = await client
          .from('bookings')
          .update({ estado: 'confirmada' })
          .eq('id', reserva.bookingId)
          .select()
          .throwOnError();
        expect(actualizadas).toEqual([]);
        const { data: estado } = await client
          .from('bookings')
          .select('estado')
          .eq('id', reserva.bookingId)
          .single()
          .throwOnError();
        expect((estado as Row)['estado']).toBe('pendiente_pago');
      } finally {
        await limpiar([reserva.bookingId]);
      }
    });
  });
});

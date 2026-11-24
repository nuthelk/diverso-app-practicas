import type { SupabaseClient } from '@supabase/supabase-js';

import { BookingStatus } from '../../models/enums';
import type { Fila } from '../../models/fila';
import { Refund } from '../../models/reembolso';

/**
 * Reserva con plan, agencia, pagos y reembolsos embebidos. Los reembolsos se piden con columnas
 * explícitas: `refunds(*)` falla con 403 porque `raw` no se concede al viajero.
 *
 * Bug S5 corregido: Flutter embebía la agencia como `agency:agencies(*)`, pero `Plan.fromMap` lee
 * `agencies`, así que la agencia de una reserva nunca llegaba. Sin alias, la fila tiene la misma
 * forma que en el catálogo.
 */
export const SELECCION_RESERVA =
  `*, plan_date:plan_dates(*, plan:plans(*, agencies(*))), payments(*), refunds(${Refund.columnas})`;

/**
 * Acceso crudo a las reservas en Supabase: devuelve filas y LANZA los errores de PostgREST tal
 * cual; el mapeo a modelos y la traducción de errores son del repositorio.
 */
export interface BookingApi {
  /** Id del usuario con sesión, o null (en supabase-js no hay `currentUser` síncrono). */
  usuarioId(): Promise<string | null>;
  /** `create_booking`: decrementa cupos de forma atómica en el servidor. */
  crearReserva(p: { planDateId: string; pax: number }): Promise<Fila>;
  /** Reservas del viajero, la más reciente primero. */
  reservasDe(viajeroId: string): Promise<Fila[]>;
  /** `booking_id` de las reseñas que ya publicó el viajero. */
  resenasDe(viajeroId: string): Promise<Fila[]>;
  reserva(bookingId: string): Promise<Fila | null>;
  /** La reseña de la reserva, si existe. */
  resenaDe(bookingId: string): Promise<Fila | null>;
  /** La reserva más reciente del viajero para esa fecha que sigue `pendiente_pago` y se creó después de `creadaDespuesDe`. */
  pendientesDe(p: { viajeroId: string; planDateId: string; creadaDespuesDe: Date }): Promise<Fila[]>;
  /** `vista_previa_cancelacion`: solo lectura. */
  vistaPreviaCancelacion(bookingId: string): Promise<Fila>;
}

export class BookingApiSupabase implements BookingApi {
  private readonly client: SupabaseClient;

  constructor({ client }: { client: SupabaseClient }) {
    this.client = client;
  }

  async usuarioId(): Promise<string | null> {
    // getSession lee la sesión guardada (sin red); equivale a `auth.currentUser?.id`.
    const { data } = await this.client.auth.getSession();
    return data.session?.user.id ?? null;
  }

  async crearReserva({ planDateId, pax }: { planDateId: string; pax: number }): Promise<Fila> {
    const { data } = await this.client
      .rpc('create_booking', { p_plan_date_id: planDateId, p_pax: pax })
      .throwOnError();
    return data as Fila;
  }

  async reservasDe(viajeroId: string): Promise<Fila[]> {
    const { data } = await this.client
      .from('bookings')
      .select(SELECCION_RESERVA)
      .eq('viajero_id', viajeroId)
      .order('created_at', { ascending: false })
      .throwOnError();
    return data as unknown as Fila[];
  }

  async resenasDe(viajeroId: string): Promise<Fila[]> {
    const { data } = await this.client.from('reviews').select('booking_id').eq('viajero_id', viajeroId).throwOnError();
    return data as Fila[];
  }

  async reserva(bookingId: string): Promise<Fila | null> {
    const { data } = await this.client
      .from('bookings')
      .select(SELECCION_RESERVA)
      .eq('id', bookingId)
      .maybeSingle()
      .throwOnError();
    return (data as unknown as Fila | null) ?? null;
  }

  async resenaDe(bookingId: string): Promise<Fila | null> {
    const { data } = await this.client
      .from('reviews')
      .select('id')
      .eq('booking_id', bookingId)
      .maybeSingle()
      .throwOnError();
    return (data as Fila | null) ?? null;
  }

  async pendientesDe({
    viajeroId,
    planDateId,
    creadaDespuesDe,
  }: {
    viajeroId: string;
    planDateId: string;
    creadaDespuesDe: Date;
  }): Promise<Fila[]> {
    const { data } = await this.client
      .from('bookings')
      .select()
      .eq('viajero_id', viajeroId)
      .eq('plan_date_id', planDateId)
      .eq('estado', BookingStatus.pendientePago)
      .gt('created_at', creadaDespuesDe.toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .throwOnError();
    return data as Fila[];
  }

  async vistaPreviaCancelacion(bookingId: string): Promise<Fila> {
    const { data } = await this.client
      .rpc('vista_previa_cancelacion', { p_booking_id: bookingId })
      .throwOnError();
    return data as Fila;
  }
}

import {
  Booking,
  BookingStatus,
  CreatedBooking,
  DiversoError,
  EstadoReembolso,
  ResultadoCancelacion,
  type BookingRepository,
  type Plan,
  type Publico,
} from '@/core';

import type { Compuerta } from '../../../support/compuerta';

/**
 * [BookingRepository] sin Supabase para los view models y vistas del checkout (port de
 * `reservas_falsas.dart`, solo lo que usa el checkout). Vive en la carpeta de la funcionalidad
 * para no pisar los dobles de reservas de T7.
 */
export class ReservasFalsas
  implements Pick<Publico<BookingRepository>, 'reserva' | 'reservaPendiente' | 'crearReserva' | 'cancelar' | 'misReservas'>
{
  lista: Booking[];

  /** Si no es null, `misReservas` y `reserva` lo lanzan. */
  fallo: unknown = null;

  /** Si no es null, `cancelar` lo lanza. */
  falloAlCancelar: unknown = null;

  /** Si no es null, `misReservas` y `reserva` esperan a que se complete (respuestas tardías). */
  compuerta: Compuerta | null = null;

  /** Reserva pendiente de pago que `reservaPendiente` devuelve (null = no hay ninguna). */
  pendiente: Booking | null = null;

  /** Si no es null, `reservaPendiente` lo lanza. */
  falloAlBuscarPendiente: unknown = null;

  /**
   * Si no es null, `crearReserva` lo lanza; antes deja `pendienteTrasFalla` como la pendiente
   * (otra pestaña la creó entre la consulta y el alta).
   */
  falloAlCrear: unknown = null;
  pendienteTrasFalla: Booking | null = null;

  resultado = new ResultadoCancelacion({
    aplica: false,
    porcentaje: 0,
    monto: 0,
    estado: EstadoReembolso.noAplica,
    motivo: 'Reserva sin pago confirmado',
  });

  consultasLista = 0;
  busquedasPendiente = 0;
  readonly consultas: string[] = [];
  readonly canceladas: string[] = [];
  readonly creadas: { planDateId: string; pax: number }[] = [];

  constructor(lista: Booking[] = []) {
    this.lista = [...lista];
  }

  async misReservas(): Promise<Booking[]> {
    this.consultasLista++;
    await this.compuerta?.promesa;
    if (this.fallo !== null) throw this.fallo;
    return this.lista;
  }

  async reserva(bookingId: string): Promise<Booking> {
    this.consultas.push(bookingId);
    await this.compuerta?.promesa;
    if (this.fallo !== null) throw this.fallo;
    const b = this.lista.find((x) => x.id === bookingId);
    if (!b) throw new DiversoError('RESERVA_NO_EXISTE');
    return b;
  }

  async reservaPendiente(_planDateId: string): Promise<Booking | null> {
    this.busquedasPendiente++;
    if (this.falloAlBuscarPendiente !== null) throw this.falloAlBuscarPendiente;
    return this.pendiente;
  }

  async crearReserva({ planDateId, pax }: { planDateId: string; pax: number }): Promise<CreatedBooking> {
    if (this.falloAlCrear !== null) {
      this.pendiente = this.pendienteTrasFalla;
      throw this.falloAlCrear;
    }
    this.creadas.push({ planDateId, pax });
    return new CreatedBooking({
      bookingId: `nueva-${this.creadas.length}`,
      codigo: 'DIV-NEW',
      montoTotal: 1,
      planTitulo: '',
    });
  }

  async cancelar(bookingId: string): Promise<ResultadoCancelacion> {
    if (this.falloAlCancelar !== null) throw this.falloAlCancelar;
    this.canceladas.push(bookingId);
    if (this.pendiente?.id === bookingId) this.pendiente = null;
    return this.resultado;
  }
}

/** Reserva de prueba confirmada (`reservaDePrueba` de Dart). */
export function reservaDePrueba({
  id = 'res-1',
  codigo = 'DIV-AAAA0001',
  estado = BookingStatus.confirmada,
  plan = null,
}: { id?: string; codigo?: string; estado?: BookingStatus; plan?: Plan | null } = {}): Booking {
  return new Booking({
    id,
    codigo,
    planDateId: 'pd',
    viajeroId: 'v',
    pax: 2,
    montoTotal: 190000,
    estado,
    createdAt: new Date(2026, 9, 1),
    salidaAt: new Date(Date.now() + 3 * 24 * 3600 * 1000),
    plan,
  });
}

/** Reserva pendiente de pago de `fecha-1` creada hace [haceMin] minutos. */
export function pendienteDePrueba({ pax = 2, haceMin = 5 }: { pax?: number; haceMin?: number } = {}): Booking {
  return new Booking({
    id: 'pend-1',
    codigo: 'DIV-PEND01',
    planDateId: 'fecha-1',
    viajeroId: 'v-1',
    pax,
    montoTotal: 150000 * pax,
    estado: BookingStatus.pendientePago,
    createdAt: new Date(Date.now() - haceMin * 60_000),
  });
}

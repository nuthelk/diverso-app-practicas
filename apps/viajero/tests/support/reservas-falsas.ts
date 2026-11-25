import {
  Booking,
  BookingStatus,
  CreatedBooking,
  DiversoError,
  RefundStatus,
  CancellationResult,
  CancellationPreview,
  type BookingRepository,
  type Plan,
  type Public,
  type Review,
  type ReviewRepository,
} from '@/core';

import type { Compuerta } from './compuerta';

/**
 * [BookingRepository] sin Supabase para pruebas de los view models y las vistas de reservas
 * (port de `test/support/reservas_falsas.dart`).
 */
export class ReservasFalsas implements Public<BookingRepository> {
  lista: Booking[];

  /** Si no es null, `misReservas` y `reserva` lo lanzan. */
  fallo: unknown = null;

  /** Si no es null, `vistaPreviaCancelacion` y `cancelar` lo lanzan. */
  falloAlCancelar: unknown = null;

  /** Si no es null, `misReservas` y `reserva` esperan a que se complete (respuestas tardías). */
  compuerta: Compuerta | null = null;

  vista = new CancellationPreview({ applies: true, percentage: 100, amount: 190000, hoursBefore: 72, reason: '' });

  resultado = new CancellationResult({
    applies: true,
    percentage: 100,
    amount: 190000,
    status: RefundStatus.approved,
    reason: '',
  });

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

  consultasLista = 0;
  readonly consultas: string[] = [];
  readonly canceladas: string[] = [];
  readonly creadas: { planDateId: string; pax: number }[] = [];

  constructor(lista: Booking[] = []) {
    this.lista = [...lista];
  }

  async misReservas(): Promise<Booking[]> {
    this.consultasLista++;
    await this.compuerta?.promesa;
    if (this.fallo != null) throw this.fallo;
    return this.lista;
  }

  async reserva(bookingId: string): Promise<Booking> {
    this.consultas.push(bookingId);
    await this.compuerta?.promesa;
    if (this.fallo != null) throw this.fallo;
    const b = this.lista.find((r) => r.id === bookingId);
    if (!b) throw new DiversoError('RESERVA_NO_EXISTE');
    return b;
  }

  async reservaPendiente(_planDateId: string): Promise<Booking | null> {
    if (this.falloAlBuscarPendiente != null) throw this.falloAlBuscarPendiente;
    return this.pendiente;
  }

  async crearReserva({ planDateId, pax }: { planDateId: string; pax: number }): Promise<CreatedBooking> {
    if (this.falloAlCrear != null) {
      this.pendiente = this.pendienteTrasFalla;
      throw this.falloAlCrear;
    }
    this.creadas.push({ planDateId, pax });
    return new CreatedBooking({ bookingId: `nueva-${this.creadas.length}`, code: 'DIV-NEW', totalAmount: 1, planTitle: '' });
  }

  async vistaPreviaCancelacion(_bookingId: string): Promise<CancellationPreview> {
    if (this.falloAlCancelar != null) throw this.falloAlCancelar;
    return this.vista;
  }

  async cancelar(bookingId: string): Promise<CancellationResult> {
    if (this.falloAlCancelar != null) throw this.falloAlCancelar;
    this.canceladas.push(bookingId);
    if (this.pendiente?.id === bookingId) this.pendiente = null;
    return this.resultado;
  }
}

/** [ReviewRepository] sin Supabase para el envío de reseñas. */
export class PublicadorDeResenasFalso implements Public<ReviewRepository> {
  /** Si no es null, `crear` lo lanza. */
  fallo: unknown = null;

  /** Si no es null, `crear` espera a que se complete. */
  compuerta: Compuerta | null = null;

  readonly creadas: { bookingId: string; calificacion: number; comentario: string | null }[] = [];

  async porPlan(_planId: string): Promise<Review[]> {
    return [];
  }

  async crear({
    bookingId,
    calificacion,
    comentario = null,
  }: {
    bookingId: string;
    calificacion: number;
    comentario?: string | null;
  }): Promise<void> {
    await this.compuerta?.promesa;
    if (this.fallo != null) throw this.fallo;
    this.creadas.push({ bookingId, calificacion, comentario });
  }
}

/** Reserva de prueba confirmada con salida en [salida] (por defecto, 3 días adelante). */
export function reservaDePrueba({
  id = 'res-1',
  codigo = 'DIV-AAAA0001',
  salida,
  estado = BookingStatus.confirmed,
  tieneResena = false,
  plan = null,
}: {
  id?: string;
  codigo?: string;
  salida?: Date;
  estado?: BookingStatus;
  tieneResena?: boolean;
  plan?: Plan | null;
} = {}): Booking {
  return new Booking({
    id,
    code: codigo,
    planDateId: 'pd',
    travelerId: 'v',
    pax: 2,
    totalAmount: 190000,
    status: estado,
    createdAt: new Date(2026, 9, 1),
    departureAt: salida ?? new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    hasReview: tieneResena,
    plan,
  });
}

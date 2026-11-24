import { entero, esFila, type Fila, texto, textoONulo } from './fila';
import { parsearFecha } from '../utils/fechas';

export interface DatosReview {
  id: string;
  bookingId: string;
  planId: string;
  viajeroId: string;
  calificacion: number;
  createdAt: Date;
  comentario?: string | null;
  viajeroNombre?: string | null;
}

/** Tabla `reviews` (+ `profiles(nombre)` embebido). */
export class Review {
  readonly id: string;
  readonly bookingId: string;
  readonly planId: string;
  readonly viajeroId: string;
  readonly calificacion: number;
  readonly comentario: string | null;
  readonly createdAt: Date;
  /**
   * Nombre del autor. Llega null en reseñas AJENAS porque RLS de `profiles` solo deja ver la fila
   * propia (se mantiene igual que en Flutter: la UI usa un texto de respaldo).
   */
  readonly viajeroNombre: string | null;

  constructor(d: DatosReview) {
    this.id = d.id;
    this.bookingId = d.bookingId;
    this.planId = d.planId;
    this.viajeroId = d.viajeroId;
    this.calificacion = d.calificacion;
    this.comentario = d.comentario ?? null;
    this.createdAt = d.createdAt;
    this.viajeroNombre = d.viajeroNombre ?? null;
  }

  static fromMap(map: Fila): Review {
    const perfil = map['profiles'];
    return new Review({
      id: texto(map['id']),
      bookingId: texto(map['booking_id']),
      planId: texto(map['plan_id']),
      viajeroId: texto(map['viajero_id']),
      calificacion: entero(map['calificacion']),
      comentario: textoONulo(map['comentario']),
      createdAt: parsearFecha(texto(map['created_at'])),
      viajeroNombre: esFila(perfil) ? textoONulo(perfil['nombre']) : null,
    });
  }
}

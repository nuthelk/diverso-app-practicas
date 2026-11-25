import { asInt, isRow, type Row, asString, asStringOrNull } from './row';
import { parseDate } from '../utils/dates';

export interface ReviewData {
  id: string;
  bookingId: string;
  planId: string;
  travelerId: string;
  rating: number;
  createdAt: Date;
  comment?: string | null;
  travelerName?: string | null;
}

/** Tabla `reviews` (+ `profiles(nombre)` embebido). */
export class Review {
  readonly id: string;
  readonly bookingId: string;
  readonly planId: string;
  readonly travelerId: string;
  readonly rating: number;
  readonly comment: string | null;
  readonly createdAt: Date;
  /**
   * Nombre del autor. Llega null en reseñas AJENAS porque RLS de `profiles` solo deja ver la fila
   * propia (se mantiene igual que en Flutter: la UI usa un texto de respaldo).
   */
  readonly travelerName: string | null;

  constructor(d: ReviewData) {
    this.id = d.id;
    this.bookingId = d.bookingId;
    this.planId = d.planId;
    this.travelerId = d.travelerId;
    this.rating = d.rating;
    this.comment = d.comment ?? null;
    this.createdAt = d.createdAt;
    this.travelerName = d.travelerName ?? null;
  }

  static fromMap(map: Row): Review {
    const profile = map['profiles'];
    return new Review({
      id: asString(map['id']),
      bookingId: asString(map['booking_id']),
      planId: asString(map['plan_id']),
      travelerId: asString(map['viajero_id']),
      rating: asInt(map['calificacion']),
      comment: asStringOrNull(map['comentario']),
      createdAt: parseDate(asString(map['created_at'])),
      travelerName: isRow(profile) ? asStringOrNull(profile['nombre']) : null,
    });
  }
}

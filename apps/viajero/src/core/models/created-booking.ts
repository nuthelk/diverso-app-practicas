/** Resultado de la RPC `create_booking` (devuelve además `cupos_restantes`, que se ignora). */
export class CreatedBooking {
  readonly bookingId: string;
  readonly code: string;
  readonly totalAmount: number;
  readonly planTitle: string;
  /** Día de la salida (medianoche local), si el RPC lo devolvió. */
  readonly date: Date | null;

  constructor(d: { bookingId: string; code: string; totalAmount: number; planTitle: string; date?: Date | null }) {
    this.bookingId = d.bookingId;
    this.code = d.code;
    this.totalAmount = d.totalAmount;
    this.planTitle = d.planTitle;
    this.date = d.date ?? null;
  }
}

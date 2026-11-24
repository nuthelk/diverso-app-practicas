/** Resultado de la RPC `create_booking` (devuelve además `cupos_restantes`, que se ignora). */
export class CreatedBooking {
  readonly bookingId: string;
  readonly codigo: string;
  readonly montoTotal: number;
  readonly planTitulo: string;
  /** Día de la salida (medianoche local), si el RPC lo devolvió. */
  readonly fecha: Date | null;

  constructor(d: { bookingId: string; codigo: string; montoTotal: number; planTitulo: string; fecha?: Date | null }) {
    this.bookingId = d.bookingId;
    this.codigo = d.codigo;
    this.montoTotal = d.montoTotal;
    this.planTitulo = d.planTitulo;
    this.fecha = d.fecha ?? null;
  }
}

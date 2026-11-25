import { booleanoO, decimalO, enteroO, type Fila, texto, textoO } from './fila';
import { parsearFecha } from '../utils/fechas';
import { formatCOP } from '../utils/formatters';

/**
 * Estado de un reembolso de prueba (tabla `refunds` / respuesta de `reservas-cancelar`). No es un
 * enum de la BD: el valor es el nombre de Dart (`noAplica`; el servidor manda `no_aplica`).
 */
export const EstadoReembolso = {
  aprobado: 'aprobado',
  pendiente: 'pendiente',
  rechazado: 'rechazado',
  noAplica: 'noAplica',
} as const;
export type EstadoReembolso = (typeof EstadoReembolso)[keyof typeof EstadoReembolso];

/** `EstadoReembolso.etiqueta` de Dart. */
export const ETIQUETA_REEMBOLSO: Record<EstadoReembolso, string> = {
  aprobado: 'Reembolso de prueba aprobado',
  pendiente: 'Reembolso de prueba pendiente',
  rechazado: 'Reembolso de prueba rechazado',
  noAplica: 'Sin reembolso',
};

/** `'aprobado' | 'pendiente' | 'rechazado'` → su valor; cualquier otro (incl. `'no_aplica'`, null) → `noAplica`. */
export function estadoReembolsoDesdeServidor(valor: unknown): EstadoReembolso {
  switch (valor) {
    case 'aprobado':
      return EstadoReembolso.aprobado;
    case 'pendiente':
      return EstadoReembolso.pendiente;
    case 'rechazado':
      return EstadoReembolso.rechazado;
    default:
      return EstadoReembolso.noAplica;
  }
}

export interface DatosRefund {
  id: string;
  bookingId: string;
  monto: number;
  porcentaje: number;
  estado: EstadoReembolso;
  motivo: string;
  createdAt: Date;
}

/** Fila de `refunds` visible para el viajero (solo columnas explícitas: `raw` no se concede). */
export class Refund {
  /** Columnas que el viajero puede leer; `select=*` / `refunds(*)` de PostgREST devuelve 403. */
  static readonly columnas = 'id, booking_id, monto, porcentaje, estado, origen, motivo, created_at';

  readonly id: string;
  readonly bookingId: string;
  readonly monto: number;
  readonly porcentaje: number;
  readonly estado: EstadoReembolso;
  readonly motivo: string;
  readonly createdAt: Date;

  constructor(d: DatosRefund) {
    this.id = d.id;
    this.bookingId = d.bookingId;
    this.monto = d.monto;
    this.porcentaje = d.porcentaje;
    this.estado = d.estado;
    this.motivo = d.motivo;
    this.createdAt = d.createdAt;
  }

  static fromMap(map: Fila): Refund {
    return new Refund({
      id: texto(map['id']),
      bookingId: texto(map['booking_id']),
      monto: decimalO(map['monto'], 0),
      porcentaje: enteroO(map['porcentaje'], 0),
      estado: estadoReembolsoDesdeServidor(map['estado']),
      motivo: textoO(map['motivo'], ''),
      createdAt: parsearFecha(texto(map['created_at'])),
    });
  }

  /** «Reembolso de prueba aprobado · 50 % · $ 150.000». */
  get etiqueta(): string {
    return `${ETIQUETA_REEMBOLSO[this.estado]} · ${this.porcentaje} % · ${formatCOP(this.monto)}`;
  }
}

/** Respuesta de la RPC `vista_previa_cancelacion`: lo que daría cancelar AHORA. */
export class VistaPreviaCancelacion {
  readonly aplica: boolean;
  readonly porcentaje: number;
  readonly monto: number;
  readonly horasAntes: number;
  readonly motivo: string;

  constructor(d: { aplica: boolean; porcentaje: number; monto: number; horasAntes: number; motivo: string }) {
    this.aplica = d.aplica;
    this.porcentaje = d.porcentaje;
    this.monto = d.monto;
    this.horasAntes = d.horasAntes;
    this.motivo = d.motivo;
  }

  static fromMap(map: Fila): VistaPreviaCancelacion {
    return new VistaPreviaCancelacion({
      aplica: booleanoO(map['aplica'], false),
      porcentaje: enteroO(map['porcentaje'], 0),
      monto: decimalO(map['monto'], 0),
      horasAntes: decimalO(map['horas_antes'], 0),
      motivo: textoO(map['motivo'], ''),
    });
  }
}

/** Respuesta de `reservas-cancelar` (objeto `reembolso`). */
export class ResultadoCancelacion {
  readonly aplica: boolean;
  readonly porcentaje: number;
  readonly monto: number;
  readonly estado: EstadoReembolso;
  readonly motivo: string;

  constructor(d: { aplica: boolean; porcentaje: number; monto: number; estado: EstadoReembolso; motivo: string }) {
    this.aplica = d.aplica;
    this.porcentaje = d.porcentaje;
    this.monto = d.monto;
    this.estado = d.estado;
    this.motivo = d.motivo;
  }

  static fromMap(map: Fila): ResultadoCancelacion {
    const r = map['reembolso'] as Fila;
    return new ResultadoCancelacion({
      aplica: booleanoO(r['aplica'], false),
      porcentaje: enteroO(r['porcentaje'], 0),
      monto: decimalO(r['monto'], 0),
      estado: estadoReembolsoDesdeServidor(r['estado']),
      motivo: textoO(r['motivo'], ''),
    });
  }
}

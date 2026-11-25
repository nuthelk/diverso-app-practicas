import { enumFromDb, ExperienceCategory, PlanStatus, valoresDe } from './enums';
import {
  booleanoO,
  decimal,
  decimalO,
  entero,
  enteroO,
  esFila,
  type Fila,
  listaDe,
  texto,
  textoO,
  textos,
} from './fila';
import { Agency } from './profile';
import { fechaToIso, fechaUtc, mismoDia, parsearFecha } from '../utils/fechas';
import { OFFSET_BOGOTA_MS } from '../utils/hora-bogota';

/** Elemento del `jsonb` `plans.itinerario`. */
export class ItinerarioPaso {
  readonly hora: string;
  readonly actividad: string;

  constructor(d: { hora: string; actividad: string }) {
    this.hora = d.hora;
    this.actividad = d.actividad;
  }

  static fromMap(map: Fila): ItinerarioPaso {
    return new ItinerarioPaso({ hora: textoO(map['hora'], ''), actividad: textoO(map['actividad'], '') });
  }

  toMap(): { hora: string; actividad: string } {
    return { hora: this.hora, actividad: this.actividad };
  }
}

/** 06:00, el default de la columna `plans.hora_salida`. */
const HORA_SALIDA_POR_DEFECTO = 6 * 60;

/** `plans.hora_salida` es un `time` ('06:00:00' o '06:00') → minutos desde la medianoche; si falta, 06:00. */
function horaDesdePostgres(hora: string | null | undefined): number {
  const partes = hora?.split(':');
  if (partes === undefined || partes.length < 2) return HORA_SALIDA_POR_DEFECTO;
  return Number.parseInt(partes[0]!, 10) * 60 + Number.parseInt(partes[1]!, 10);
}

export interface DatosPlanDate {
  id: string;
  planId: string;
  /** Medianoche local del día (`date` de Postgres). */
  fecha: Date;
  cupoTotal: number;
  cupoDisponible: number;
}

/** Tabla `plan_dates`. */
export class PlanDate {
  readonly id: string;
  readonly planId: string;
  /** Medianoche LOCAL del día de la salida (la `date` sin zona). */
  readonly fecha: Date;
  readonly cupoTotal: number;
  readonly cupoDisponible: number;

  constructor(d: DatosPlanDate) {
    this.id = d.id;
    this.planId = d.planId;
    this.fecha = d.fecha;
    this.cupoTotal = d.cupoTotal;
    this.cupoDisponible = d.cupoDisponible;
  }

  get tieneCupos(): boolean {
    return this.cupoDisponible > 0;
  }

  static fromMap(map: Fila): PlanDate {
    return new PlanDate({
      id: texto(map['id']),
      planId: texto(map['plan_id']),
      fecha: parsearFecha(texto(map['fecha'])),
      cupoTotal: entero(map['cupo_total']),
      cupoDisponible: entero(map['cupo_disponible']),
    });
  }

  /** Resto del panel Flutter antiguo (la app viajero no lo usa). */
  toInsertMap(): Fila {
    return {
      plan_id: this.planId,
      fecha: fechaToIso(this.fecha),
      cupo_total: this.cupoTotal,
      cupo_disponible: this.cupoDisponible,
    };
  }
}

export interface DatosPlan {
  id: string;
  agencyId: string;
  titulo: string;
  destino: string;
  categoria: ExperienceCategory;
  precioCop: number;
  estado: PlanStatus;
  resumen?: string;
  descripcion?: string;
  duracionTexto?: string;
  duracionHoras?: number;
  puntoEncuentro?: string;
  /** Minutos desde la medianoche (hora de Bogotá). 06:00 = 360. */
  horaSalidaMinutos?: number;
  incluye?: readonly string[];
  incluyeTransporte?: boolean;
  incluyeComida?: boolean;
  incluyeHospedaje?: boolean;
  itinerario?: readonly ItinerarioPaso[];
  politicaCancelacion?: string;
  fotos?: readonly string[];
  ratingPromedio?: number;
  reviewsCount?: number;
  agency?: Agency | null;
  dates?: readonly PlanDate[];
}

/** Tabla `plans` (+ `agencies` y `plan_dates` embebidos). */
export class Plan {
  readonly id: string;
  readonly agencyId: string;
  readonly titulo: string;
  readonly destino: string;
  readonly categoria: ExperienceCategory;
  readonly resumen: string;
  readonly descripcion: string;
  readonly duracionTexto: string;
  readonly duracionHoras: number;
  readonly puntoEncuentro: string;
  /**
   * Hora de salida (hora de Bogotá) de todas las fechas del plan, `plans.hora_salida`, en minutos
   * desde la medianoche (en Dart era un `Duration`).
   */
  readonly horaSalidaMinutos: number;
  readonly precioCop: number;
  readonly incluye: readonly string[];
  readonly incluyeTransporte: boolean;
  readonly incluyeComida: boolean;
  readonly incluyeHospedaje: boolean;
  readonly itinerario: readonly ItinerarioPaso[];
  readonly politicaCancelacion: string;
  readonly fotos: readonly string[];
  readonly estado: PlanStatus;
  readonly ratingPromedio: number;
  readonly reviewsCount: number;
  readonly agency: Agency | null;
  readonly dates: readonly PlanDate[];

  constructor(d: DatosPlan) {
    this.id = d.id;
    this.agencyId = d.agencyId;
    this.titulo = d.titulo;
    this.destino = d.destino;
    this.categoria = d.categoria;
    this.resumen = d.resumen ?? '';
    this.descripcion = d.descripcion ?? '';
    this.duracionTexto = d.duracionTexto ?? '1 día';
    this.duracionHoras = d.duracionHoras ?? 12;
    this.puntoEncuentro = d.puntoEncuentro ?? '';
    this.horaSalidaMinutos = d.horaSalidaMinutos ?? HORA_SALIDA_POR_DEFECTO;
    this.precioCop = d.precioCop;
    this.incluye = d.incluye ?? [];
    this.incluyeTransporte = d.incluyeTransporte ?? false;
    this.incluyeComida = d.incluyeComida ?? false;
    this.incluyeHospedaje = d.incluyeHospedaje ?? false;
    this.itinerario = d.itinerario ?? [];
    this.politicaCancelacion = d.politicaCancelacion ?? '';
    this.fotos = d.fotos ?? [];
    this.estado = d.estado;
    this.ratingPromedio = d.ratingPromedio ?? 0;
    this.reviewsCount = d.reviewsCount ?? 0;
    this.agency = d.agency ?? null;
    this.dates = d.dates ?? [];
  }

  get fotoPrincipal(): string | null {
    return this.fotos[0] ?? null;
  }

  /** Sin reseñas todavía: se muestra «Nueva» en vez de un 0.0 engañoso. */
  get esNuevo(): boolean {
    return this.reviewsCount === 0;
  }

  /**
   * Instante (UTC) en que parte [fecha]: el día de la fecha + hora de salida en hora de Bogotá.
   * Misma cuenta que el servidor (`(fecha + hora_salida) at time zone 'America/Bogota'`).
   */
  salidaDe(fecha: PlanDate): Date {
    const dia = fechaUtc(fecha.fecha.getFullYear(), fecha.fecha.getMonth() + 1, fecha.fecha.getDate());
    return new Date(dia.getTime() + this.horaSalidaMinutos * 60_000 + OFFSET_BOGOTA_MS);
  }

  /** La salida de [fecha] ya ocurrió (o es justo ahora): ya no se puede reservar ni pagar. */
  yaSalio(fecha: PlanDate, ahora: Date = new Date()): boolean {
    return !(this.salidaDe(fecha).getTime() > ahora.getTime());
  }

  /** Próximas fechas con cupos cuya salida aún no ocurre, de la más cercana a la más lejana (reloj real). */
  get fechasDisponibles(): PlanDate[] {
    return this.fechasDisponiblesA(new Date());
  }

  /** Como [fechasDisponibles] con el reloj en [ahora]. */
  fechasDisponiblesA(ahora: Date): PlanDate[] {
    return this.dates
      .filter((d) => d.tieneCupos && !this.yaSalio(d, ahora))
      .sort((a, b) => a.fecha.getTime() - b.fecha.getTime());
  }

  /** Hay una salida reservable el día [dia] (filtro de fecha del catálogo). */
  tieneSalidaEl(dia: Date, ahora: Date = new Date()): boolean {
    return this.fechasDisponiblesA(ahora).some((d) => mismoDia(d.fecha, dia));
  }

  static fromMap(map: Fila): Plan {
    const agencia = map['agencies'];
    return new Plan({
      id: texto(map['id']),
      agencyId: texto(map['agency_id']),
      titulo: texto(map['titulo']),
      destino: texto(map['destino']),
      categoria:
        enumFromDb(valoresDe(ExperienceCategory), map['categoria'] as string | null) ?? ExperienceCategory.aventura,
      resumen: textoO(map['resumen'], ''),
      descripcion: textoO(map['descripcion'], ''),
      duracionTexto: textoO(map['duracion_texto'], '1 día'),
      duracionHoras: decimalO(map['duracion_horas'], 12),
      puntoEncuentro: textoO(map['punto_encuentro'], ''),
      horaSalidaMinutos: horaDesdePostgres(map['hora_salida'] as string | null | undefined),
      precioCop: decimal(map['precio_cop']),
      incluye: textos(map['incluye']),
      incluyeTransporte: booleanoO(map['incluye_transporte'], false),
      incluyeComida: booleanoO(map['incluye_comida'], false),
      incluyeHospedaje: booleanoO(map['incluye_hospedaje'], false),
      itinerario: listaDe(map['itinerario'], ItinerarioPaso.fromMap),
      politicaCancelacion: textoO(map['politica_cancelacion'], ''),
      fotos: textos(map['fotos']),
      estado: enumFromDb(valoresDe(PlanStatus), map['estado'] as string | null) ?? PlanStatus.borrador,
      ratingPromedio: decimalO(map['rating_promedio'], 0),
      reviewsCount: enteroO(map['reviews_count'], 0),
      agency: esFila(agencia) ? Agency.fromMap(agencia) : null,
      dates: listaDe(map['plan_dates'], PlanDate.fromMap),
    });
  }
}

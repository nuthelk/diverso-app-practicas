import { enumFromDb, ExperienceCategory, PlanStatus, valuesOf } from './enums';
import {
  asBoolOr,
  asDouble,
  asDoubleOr,
  asInt,
  asIntOr,
  isRow,
  type Row,
  listOf,
  asString,
  asStringOr,
  asStrings,
} from './row';
import { Agency } from './profile';
import { fechaToIso, fechaUtc, mismoDia, parsearFecha } from '../utils/fechas';
import { OFFSET_BOGOTA_MS } from '../utils/hora-bogota';

/** Elemento del `jsonb` `plans.itinerario`. */
export class ItineraryStep {
  readonly time: string;
  readonly activity: string;

  constructor(d: { time: string; activity: string }) {
    this.time = d.time;
    this.activity = d.activity;
  }

  static fromMap(map: Row): ItineraryStep {
    return new ItineraryStep({ time: asStringOr(map['hora'], ''), activity: asStringOr(map['actividad'], '') });
  }

  toMap(): { hora: string; actividad: string } {
    return { hora: this.time, actividad: this.activity };
  }
}

/** 06:00, el default de la columna `plans.hora_salida`. */
const DEFAULT_DEPARTURE_MINUTES = 6 * 60;

/** `plans.hora_salida` es un `time` ('06:00:00' o '06:00') → minutos desde la medianoche; si falta, 06:00. */
function departureMinutesFromPostgres(time: string | null | undefined): number {
  const parts = time?.split(':');
  if (parts === undefined || parts.length < 2) return DEFAULT_DEPARTURE_MINUTES;
  return Number.parseInt(parts[0]!, 10) * 60 + Number.parseInt(parts[1]!, 10);
}

export interface PlanDateData {
  id: string;
  planId: string;
  /** Medianoche local del día (`date` de Postgres). */
  date: Date;
  totalSpots: number;
  availableSpots: number;
}

/** Tabla `plan_dates`. */
export class PlanDate {
  readonly id: string;
  readonly planId: string;
  /** Medianoche LOCAL del día de la salida (la `date` sin zona). */
  readonly date: Date;
  readonly totalSpots: number;
  readonly availableSpots: number;

  constructor(d: PlanDateData) {
    this.id = d.id;
    this.planId = d.planId;
    this.date = d.date;
    this.totalSpots = d.totalSpots;
    this.availableSpots = d.availableSpots;
  }

  get hasSpots(): boolean {
    return this.availableSpots > 0;
  }

  static fromMap(map: Row): PlanDate {
    return new PlanDate({
      id: asString(map['id']),
      planId: asString(map['plan_id']),
      date: parsearFecha(asString(map['fecha'])),
      totalSpots: asInt(map['cupo_total']),
      availableSpots: asInt(map['cupo_disponible']),
    });
  }

  /** Resto del panel Flutter antiguo (la app viajero no lo usa). */
  toInsertMap(): Row {
    return {
      plan_id: this.planId,
      fecha: fechaToIso(this.date),
      cupo_total: this.totalSpots,
      cupo_disponible: this.availableSpots,
    };
  }
}

export interface PlanData {
  id: string;
  agencyId: string;
  title: string;
  destination: string;
  category: ExperienceCategory;
  priceCop: number;
  status: PlanStatus;
  summary?: string;
  description?: string;
  durationText?: string;
  durationHours?: number;
  meetingPoint?: string;
  /** Minutos desde la medianoche (hora de Bogotá). 06:00 = 360. */
  departureMinutes?: number;
  includes?: readonly string[];
  includesTransport?: boolean;
  includesFood?: boolean;
  includesLodging?: boolean;
  itinerary?: readonly ItineraryStep[];
  cancellationPolicy?: string;
  photos?: readonly string[];
  averageRating?: number;
  reviewsCount?: number;
  agency?: Agency | null;
  dates?: readonly PlanDate[];
}

/** Tabla `plans` (+ `agencies` y `plan_dates` embebidos). */
export class Plan {
  readonly id: string;
  readonly agencyId: string;
  readonly title: string;
  readonly destination: string;
  readonly category: ExperienceCategory;
  readonly summary: string;
  readonly description: string;
  readonly durationText: string;
  readonly durationHours: number;
  readonly meetingPoint: string;
  /**
   * Hora de salida (hora de Bogotá) de todas las fechas del plan, `plans.hora_salida`, en minutos
   * desde la medianoche (en Dart era un `Duration`).
   */
  readonly departureMinutes: number;
  readonly priceCop: number;
  readonly includes: readonly string[];
  readonly includesTransport: boolean;
  readonly includesFood: boolean;
  readonly includesLodging: boolean;
  readonly itinerary: readonly ItineraryStep[];
  readonly cancellationPolicy: string;
  readonly photos: readonly string[];
  readonly status: PlanStatus;
  readonly averageRating: number;
  readonly reviewsCount: number;
  readonly agency: Agency | null;
  readonly dates: readonly PlanDate[];

  constructor(d: PlanData) {
    this.id = d.id;
    this.agencyId = d.agencyId;
    this.title = d.title;
    this.destination = d.destination;
    this.category = d.category;
    this.summary = d.summary ?? '';
    this.description = d.description ?? '';
    this.durationText = d.durationText ?? '1 día';
    this.durationHours = d.durationHours ?? 12;
    this.meetingPoint = d.meetingPoint ?? '';
    this.departureMinutes = d.departureMinutes ?? DEFAULT_DEPARTURE_MINUTES;
    this.priceCop = d.priceCop;
    this.includes = d.includes ?? [];
    this.includesTransport = d.includesTransport ?? false;
    this.includesFood = d.includesFood ?? false;
    this.includesLodging = d.includesLodging ?? false;
    this.itinerary = d.itinerary ?? [];
    this.cancellationPolicy = d.cancellationPolicy ?? '';
    this.photos = d.photos ?? [];
    this.status = d.status;
    this.averageRating = d.averageRating ?? 0;
    this.reviewsCount = d.reviewsCount ?? 0;
    this.agency = d.agency ?? null;
    this.dates = d.dates ?? [];
  }

  get mainPhoto(): string | null {
    return this.photos[0] ?? null;
  }

  /** Sin reseñas todavía: se muestra «Nueva» en vez de un 0.0 engañoso. */
  get isNew(): boolean {
    return this.reviewsCount === 0;
  }

  /**
   * Instante (UTC) en que parte [date]: el día de la fecha + hora de salida en hora de Bogotá.
   * Misma cuenta que el servidor (`(fecha + hora_salida) at time zone 'America/Bogota'`).
   */
  departureOf(date: PlanDate): Date {
    const day = fechaUtc(date.date.getFullYear(), date.date.getMonth() + 1, date.date.getDate());
    return new Date(day.getTime() + this.departureMinutes * 60_000 + OFFSET_BOGOTA_MS);
  }

  /** La salida de [date] ya ocurrió (o es justo ahora): ya no se puede reservar ni pagar. */
  hasDeparted(date: PlanDate, now: Date = new Date()): boolean {
    return !(this.departureOf(date).getTime() > now.getTime());
  }

  /** Próximas fechas con cupos cuya salida aún no ocurre, de la más cercana a la más lejana (reloj real). */
  get availableDates(): PlanDate[] {
    return this.availableDatesAt(new Date());
  }

  /** Como [availableDates] con el reloj en [now]. */
  availableDatesAt(now: Date): PlanDate[] {
    return this.dates
      .filter((d) => d.hasSpots && !this.hasDeparted(d, now))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  /** Hay una salida reservable el día [day] (filtro de fecha del catálogo). */
  hasDepartureOn(day: Date, now: Date = new Date()): boolean {
    return this.availableDatesAt(now).some((d) => mismoDia(d.date, day));
  }

  static fromMap(map: Row): Plan {
    const agencyRow = map['agencies'];
    return new Plan({
      id: asString(map['id']),
      agencyId: asString(map['agency_id']),
      title: asString(map['titulo']),
      destination: asString(map['destino']),
      category:
        enumFromDb(valuesOf(ExperienceCategory), map['categoria'] as string | null) ?? ExperienceCategory.adventure,
      summary: asStringOr(map['resumen'], ''),
      description: asStringOr(map['descripcion'], ''),
      durationText: asStringOr(map['duracion_texto'], '1 día'),
      durationHours: asDoubleOr(map['duracion_horas'], 12),
      meetingPoint: asStringOr(map['punto_encuentro'], ''),
      departureMinutes: departureMinutesFromPostgres(map['hora_salida'] as string | null | undefined),
      priceCop: asDouble(map['precio_cop']),
      includes: asStrings(map['incluye']),
      includesTransport: asBoolOr(map['incluye_transporte'], false),
      includesFood: asBoolOr(map['incluye_comida'], false),
      includesLodging: asBoolOr(map['incluye_hospedaje'], false),
      itinerary: listOf(map['itinerario'], ItineraryStep.fromMap),
      cancellationPolicy: asStringOr(map['politica_cancelacion'], ''),
      photos: asStrings(map['fotos']),
      status: enumFromDb(valuesOf(PlanStatus), map['estado'] as string | null) ?? PlanStatus.draft,
      averageRating: asDoubleOr(map['rating_promedio'], 0),
      reviewsCount: asIntOr(map['reviews_count'], 0),
      agency: isRow(agencyRow) ? Agency.fromMap(agencyRow) : null,
      dates: listOf(map['plan_dates'], PlanDate.fromMap),
    });
  }
}

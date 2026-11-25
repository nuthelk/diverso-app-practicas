import { enumFromDb, UserRole, valoresDe, VerificationStatus } from './enums';
import { decimalO, type Fila, texto, textoO, textoONulo } from './fila';
import { intentarParsearFecha } from '../utils/fechas';

export interface DatosProfile {
  id: string;
  rol: UserRole;
  nombre: string;
  telefono?: string | null;
}

/** Tabla `profiles`. */
export class Profile {
  readonly id: string;
  readonly rol: UserRole;
  readonly nombre: string;
  readonly telefono: string | null;

  constructor(d: DatosProfile) {
    this.id = d.id;
    this.rol = d.rol;
    this.nombre = d.nombre;
    this.telefono = d.telefono ?? null;
  }

  static fromMap(map: Fila): Profile {
    return new Profile({
      id: texto(map['id']),
      rol: enumFromDb(valoresDe(UserRole), map['rol'] as string | null) ?? UserRole.viajero,
      nombre: textoO(map['nombre'], ''),
      telefono: textoONulo(map['telefono']),
    });
  }
}

export interface DatosAgency {
  id: string;
  nombre: string;
  numeroRnt: string;
  matriculaCamaraComercio: string;
  estadoVerificacion: VerificationStatus;
  ownerUserId?: string | null;
  descripcion?: string;
  ciudad?: string;
  telefono?: string | null;
  email?: string | null;
  whatsapp?: string | null;
  logoUrl?: string | null;
  comisionPct?: number;
  rntVigenteHasta?: Date | null;
}

/** Tabla `agencies` (llega embebida en `Plan` como `agencies(*)`). */
export class Agency {
  readonly id: string;
  readonly ownerUserId: string | null;
  readonly nombre: string;
  readonly descripcion: string;
  readonly numeroRnt: string;
  readonly matriculaCamaraComercio: string;
  readonly ciudad: string;
  readonly telefono: string | null;
  readonly email: string | null;
  readonly whatsapp: string | null;
  readonly logoUrl: string | null;
  readonly estadoVerificacion: VerificationStatus;
  readonly comisionPct: number;
  /** Fecha (medianoche local) hasta la que el RNT está vigente (renovación anual). */
  readonly rntVigenteHasta: Date | null;

  constructor(d: DatosAgency) {
    this.id = d.id;
    this.ownerUserId = d.ownerUserId ?? null;
    this.nombre = d.nombre;
    this.descripcion = d.descripcion ?? '';
    this.numeroRnt = d.numeroRnt;
    this.matriculaCamaraComercio = d.matriculaCamaraComercio;
    this.ciudad = d.ciudad ?? 'Medellín';
    this.telefono = d.telefono ?? null;
    this.email = d.email ?? null;
    this.whatsapp = d.whatsapp ?? null;
    this.logoUrl = d.logoUrl ?? null;
    this.estadoVerificacion = d.estadoVerificacion;
    this.comisionPct = d.comisionPct ?? 12;
    this.rntVigenteHasta = d.rntVigenteHasta ?? null;
  }

  /**
   * Verificada y con RNT vigente: solo así puede vender en la plataforma. Usa la fecha LOCAL del
   * teléfono (como Dart; el servidor usa `current_date`).
   */
  get verificada(): boolean {
    if (this.estadoVerificacion !== VerificationStatus.verificado) return false;
    const v = this.rntVigenteHasta;
    if (v === null) return false;
    const hoy = new Date();
    const inicioDeHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
    return v.getTime() >= inicioDeHoy.getTime();
  }

  static fromMap(map: Fila): Agency {
    const rnt = map['rnt_vigente_hasta'];
    return new Agency({
      id: texto(map['id']),
      ownerUserId: textoONulo(map['owner_user_id']),
      nombre: texto(map['nombre']),
      descripcion: textoO(map['descripcion'], ''),
      numeroRnt: texto(map['numero_rnt']),
      matriculaCamaraComercio: textoO(map['matricula_camara_comercio'], ''),
      ciudad: textoO(map['ciudad'], 'Medellín'),
      telefono: textoONulo(map['telefono']),
      email: textoONulo(map['email']),
      whatsapp: textoONulo(map['whatsapp']),
      logoUrl: textoONulo(map['logo_url']),
      estadoVerificacion:
        enumFromDb(valoresDe(VerificationStatus), map['estado_verificacion'] as string | null) ??
        VerificationStatus.pendiente,
      comisionPct: decimalO(map['comision_pct'], 12),
      rntVigenteHasta: rnt == null ? null : intentarParsearFecha(String(rnt)),
    });
  }
}

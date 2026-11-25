import { enumFromDb, UserRole, valuesOf, VerificationStatus } from './enums';
import { asDoubleOr, type Row, asString, asStringOr, asStringOrNull } from './row';
import { intentarParsearFecha } from '../utils/fechas';

export interface ProfileData {
  id: string;
  role: UserRole;
  name: string;
  phone?: string | null;
}

/** Tabla `profiles`. */
export class Profile {
  readonly id: string;
  readonly role: UserRole;
  readonly name: string;
  readonly phone: string | null;

  constructor(d: ProfileData) {
    this.id = d.id;
    this.role = d.role;
    this.name = d.name;
    this.phone = d.phone ?? null;
  }

  static fromMap(map: Row): Profile {
    return new Profile({
      id: asString(map['id']),
      role: enumFromDb(valuesOf(UserRole), map['rol'] as string | null) ?? UserRole.traveler,
      name: asStringOr(map['nombre'], ''),
      phone: asStringOrNull(map['telefono']),
    });
  }
}

export interface AgencyData {
  id: string;
  name: string;
  rntNumber: string;
  commercialRegistration: string;
  verificationStatus: VerificationStatus;
  ownerUserId?: string | null;
  description?: string;
  city?: string;
  phone?: string | null;
  email?: string | null;
  whatsapp?: string | null;
  logoUrl?: string | null;
  commissionPct?: number;
  rntValidUntil?: Date | null;
}

/** Tabla `agencies` (llega embebida en `Plan` como `agencies(*)`). */
export class Agency {
  readonly id: string;
  readonly ownerUserId: string | null;
  readonly name: string;
  readonly description: string;
  readonly rntNumber: string;
  readonly commercialRegistration: string;
  readonly city: string;
  readonly phone: string | null;
  readonly email: string | null;
  readonly whatsapp: string | null;
  readonly logoUrl: string | null;
  readonly verificationStatus: VerificationStatus;
  readonly commissionPct: number;
  /** Fecha (medianoche local) hasta la que el RNT está vigente (renovación anual). */
  readonly rntValidUntil: Date | null;

  constructor(d: AgencyData) {
    this.id = d.id;
    this.ownerUserId = d.ownerUserId ?? null;
    this.name = d.name;
    this.description = d.description ?? '';
    this.rntNumber = d.rntNumber;
    this.commercialRegistration = d.commercialRegistration;
    this.city = d.city ?? 'Medellín';
    this.phone = d.phone ?? null;
    this.email = d.email ?? null;
    this.whatsapp = d.whatsapp ?? null;
    this.logoUrl = d.logoUrl ?? null;
    this.verificationStatus = d.verificationStatus;
    this.commissionPct = d.commissionPct ?? 12;
    this.rntValidUntil = d.rntValidUntil ?? null;
  }

  /**
   * Verificada y con RNT vigente: solo así puede vender en la plataforma. Usa la fecha LOCAL del
   * teléfono (como Dart; el servidor usa `current_date`).
   */
  get isVerified(): boolean {
    if (this.verificationStatus !== VerificationStatus.verified) return false;
    const v = this.rntValidUntil;
    if (v === null) return false;
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return v.getTime() >= startOfToday.getTime();
  }

  static fromMap(map: Row): Agency {
    const rnt = map['rnt_vigente_hasta'];
    return new Agency({
      id: asString(map['id']),
      ownerUserId: asStringOrNull(map['owner_user_id']),
      name: asString(map['nombre']),
      description: asStringOr(map['descripcion'], ''),
      rntNumber: asString(map['numero_rnt']),
      commercialRegistration: asStringOr(map['matricula_camara_comercio'], ''),
      city: asStringOr(map['ciudad'], 'Medellín'),
      phone: asStringOrNull(map['telefono']),
      email: asStringOrNull(map['email']),
      whatsapp: asStringOrNull(map['whatsapp']),
      logoUrl: asStringOrNull(map['logo_url']),
      verificationStatus:
        enumFromDb(valuesOf(VerificationStatus), map['estado_verificacion'] as string | null) ??
        VerificationStatus.pending,
      commissionPct: asDoubleOr(map['comision_pct'], 12),
      rntValidUntil: rnt == null ? null : intentarParsearFecha(String(rnt)),
    });
  }
}

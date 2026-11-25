/**
 * Enums de dominio espejo de los tipos PostgreSQL del esquema.
 *
 * Cada enum es un objeto `as const` cuya clave es el nombre de Dart y cuyo VALOR es el texto exacto
 * que guarda la BD (el `.db` de Dart): `BookingStatus.pendingPayment === 'pendiente_pago'`. El tipo
 * homónimo es la unión de esos textos, así que lo que se lee de la BD es lo que se escribe.
 */

/** Valores de un enum en el orden en que se declararon (`Enum.values` de Dart). */
export function valuesOf<T extends Record<string, string>>(e: T): T[keyof T][] {
  return Object.values(e) as T[keyof T][];
}

/** El valor de [values] cuyo texto en la BD es [value], o null si no existe (o es null). */
export function enumFromDb<T extends string>(values: readonly T[], value: string | null | undefined): T | null {
  if (value == null) return null;
  return (values as readonly string[]).includes(value) ? (value as T) : null;
}

export const UserRole = { traveler: 'viajero', agency: 'agencia', admin: 'admin' } as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const VerificationStatus = {
  pending: 'pendiente',
  verified: 'verificado',
  rejected: 'rechazado',
} as const;
export type VerificationStatus = (typeof VerificationStatus)[keyof typeof VerificationStatus];

export const PlanStatus = { draft: 'borrador', published: 'publicado', archived: 'archivado' } as const;
export type PlanStatus = (typeof PlanStatus)[keyof typeof PlanStatus];

export const BookingStatus = {
  pendingPayment: 'pendiente_pago',
  confirmed: 'confirmada',
  cancelled: 'cancelada',
  completed: 'completada',
} as const;
export type BookingStatus = (typeof BookingStatus)[keyof typeof BookingStatus];

export const PaymentMethodOption = {
  pse: 'pse',
  nequi: 'nequi',
  daviplata: 'daviplata',
  card: 'tarjeta',
  bancolombia: 'bancolombia',
  other: 'otro',
} as const;
export type PaymentMethodOption = (typeof PaymentMethodOption)[keyof typeof PaymentMethodOption];

export const PaymentStatus = {
  pending: 'pendiente',
  approved: 'aprobado',
  rejected: 'rechazado',
  refunded: 'reembolsado',
} as const;
export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

export const ExperienceCategory = {
  adventure: 'aventura',
  nature: 'naturaleza',
  culture: 'cultura',
  gastronomy: 'gastronomia',
  relax: 'relax',
  urban: 'urbano',
} as const;
export type ExperienceCategory = (typeof ExperienceCategory)[keyof typeof ExperienceCategory];

/** `ExperienceCategory.label` de Dart. */
export const LABEL_EXPERIENCE_CATEGORY: Record<ExperienceCategory, string> = {
  aventura: 'Aventura',
  naturaleza: 'Naturaleza',
  cultura: 'Cultura',
  gastronomia: 'Gastronomía',
  relax: 'Relax',
  urbano: 'Urbano',
};

/** `ExperienceCategory.emoji` de Dart. */
export const EMOJI_EXPERIENCE_CATEGORY: Record<ExperienceCategory, string> = {
  aventura: '🧭',
  naturaleza: '🌿',
  cultura: '🏘️',
  gastronomia: '🍽️',
  relax: '💤',
  urbano: '🏙️',
};

/** `BookingStatus.label` de Dart. */
export const LABEL_BOOKING_STATUS: Record<BookingStatus, string> = {
  pendiente_pago: 'Pendiente de pago',
  confirmada: 'Confirmada',
  cancelada: 'Cancelada',
  completada: 'Completada',
};

/** `PaymentMethodOption.label` de Dart. */
export const LABEL_PAYMENT_METHOD: Record<PaymentMethodOption, string> = {
  pse: 'PSE',
  nequi: 'Nequi',
  daviplata: 'Daviplata',
  tarjeta: 'Tarjeta',
  bancolombia: 'Bancolombia',
  otro: 'Otro medio',
};

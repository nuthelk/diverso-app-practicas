import { diversoConfig } from '@/core';

/**
 * `Uri.encodeQueryComponent` de Dart: todo lo que no sea `A-Z a-z 0-9 - . _ ~` va en %XX (UTF-8)
 * y el espacio como `+`. (`encodeURIComponent` deja sin codificar `! ' ( ) *`.)
 */
export function encodeQueryComponent(text: string): string {
  return encodeURIComponent(text)
    .replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)
    .replace(/%20/g, '+');
}

/** Lo inverso (`+` = espacio). `null` si la secuencia %XX no es válida. */
export function decodeQueryComponent(text: string): string | null {
  try {
    return decodeURIComponent(text.replace(/\+/g, ' '));
  } catch {
    return null;
  }
}

/** Como mucho estos planes caben en el comparador (`CatalogViewModel.maxComparar`). */
export const MAX_COMPARE = 3;

/**
 * Rutas de la app del viajero (`app_routes.dart`): los patrones de la tabla y los helpers que
 * arman cada ubicación. Ninguna pantalla escribe una ruta a mano: así un cambio de ruta (y los
 * deep links y recargas en web que dependen de ella) se hace en un solo sitio.
 */
export const AppRoutes = {
  // Sin parámetros.
  login: '/login',
  consent: '/consentimiento',
  explore: '/',
  agencies: '/agencias',
  bookings: '/reservas',
  profile: '/perfil',
  paymentResult: diversoConfig.paymentResultPath,
  compare: '/comparar',
  reviewBase: '/resena',

  /** `/consentimiento` recordando a dónde volver al aceptar (`desde`: ubicación original completa). */
  consentFrom: (location: string) => `/consentimiento?desde=${encodeQueryComponent(location)}`,

  /** Los documentos legales se leen antes de crear la cuenta y mientras se pide el consentimiento. */
  legalPrefix: '/legal/',

  // Patrones con parámetros (en Expo Router son los archivos de `src/app`).
  legalPattern: '/legal/:doc',
  agencyPattern: '/agencia/:id',
  planPattern: '/plan/:id',
  checkoutPattern: '/checkout/:planId/:fechaId',
  bookingPattern: '/reserva/:bookingId',
  bookingDetailPattern: '/reservas/:bookingId',
  reviewPattern: '/resena/:bookingId',

  // Ubicaciones concretas.
  legal: (doc: string) => `/legal/${doc}`,
  agency: (id: string) => `/agencia/${id}`,
  plan: (id: string) => `/plan/${id}`,
  checkout: (planId: string, dateId: string) => `/checkout/${planId}/${dateId}`,

  /** Confirmación de una reserva. */
  booking: (bookingId: string) => `/reserva/${bookingId}`,

  /** Detalle de una reserva propia (desde «Mis reservas»). */
  bookingDetail: (bookingId: string) => `/reservas/${bookingId}`,

  /** Reseña de una reserva propia ya viajada. */
  review: (bookingId: string) => `/resena/${bookingId}`,

  /** Vuelta de Wompi: verifica en el servidor el pago de la transacción. */
  paymentForTransaction: (transactionId: string) =>
    `${diversoConfig.paymentResultPath}?id=${encodeQueryComponent(transactionId)}`,

  /** «Ya pagué, verificar»: verifica el pago más reciente de una reserva. */
  paymentForBooking: (bookingId: string) =>
    `${diversoConfig.paymentResultPath}?reserva=${encodeQueryComponent(bookingId)}`,

  /** Comparador de planes: los ids viajan en la URL (`?ids=a,b,c`) y la pantalla carga los planes. */
  comparePlans: (ids: Iterable<string>) => `/comparar?ids=${[...ids].map(encodeQueryComponent).join(',')}`,
} as const;

/**
 * Ids de `?ids=a,b,c` (sin vacíos ni repetidos, como mucho los que caben en el comparador). Acepta
 * el valor tal como lo da `useLocalSearchParams` (string, lista si se repite, o nada).
 */
export function idsToCompare(value: string | string[] | undefined, max = MAX_COMPARE): string[] {
  const raw = (Array.isArray(value) ? value : [value ?? '']).flatMap((v) => v.split(','));
  return [...new Set(raw.filter((id) => id.length > 0))].slice(0, max);
}

/** Un parámetro de ruta como texto (Expo Router da `string | string[]`). */
export function param(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
}

/** Un parámetro de query opcional (`null` si no viene o viene vacío). */
export function optionalParam(value: string | string[] | undefined): string | null {
  const v = param(value);
  return v === '' ? null : v;
}

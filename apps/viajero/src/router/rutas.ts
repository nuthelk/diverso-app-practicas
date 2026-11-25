import { diversoConfig } from '@/core';

/**
 * `Uri.encodeQueryComponent` de Dart: todo lo que no sea `A-Z a-z 0-9 - . _ ~` va en %XX (UTF-8)
 * y el espacio como `+`. (`encodeURIComponent` deja sin codificar `! ' ( ) *`.)
 */
export function codificarComponenteQuery(texto: string): string {
  return encodeURIComponent(texto)
    .replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)
    .replace(/%20/g, '+');
}

/** Lo inverso (`+` = espacio). `null` si la secuencia %XX no es válida. */
export function decodificarComponenteQuery(texto: string): string | null {
  try {
    return decodeURIComponent(texto.replace(/\+/g, ' '));
  } catch {
    return null;
  }
}

/** Como mucho estos planes caben en el comparador (`CatalogViewModel.maxComparar`). */
export const MAX_COMPARAR = 3;

/**
 * Rutas de la app del viajero (`app_routes.dart`): los patrones de la tabla y los helpers que
 * arman cada ubicación. Ninguna pantalla escribe una ruta a mano: así un cambio de ruta (y los
 * deep links y recargas en web que dependen de ella) se hace en un solo sitio.
 */
export const AppRoutes = {
  // Sin parámetros.
  login: '/login',
  consentimiento: '/consentimiento',
  explorar: '/',
  agencias: '/agencias',
  reservas: '/reservas',
  perfil: '/perfil',
  pagoResultado: diversoConfig.paymentResultPath,
  comparar: '/comparar',
  resenaBase: '/resena',

  /** `/consentimiento` recordando a dónde volver al aceptar (`desde`: ubicación original completa). */
  consentimientoDesde: (ubicacion: string) => `/consentimiento?desde=${codificarComponenteQuery(ubicacion)}`,

  /** Los documentos legales se leen antes de crear la cuenta y mientras se pide el consentimiento. */
  legalPrefijo: '/legal/',

  // Patrones con parámetros (en Expo Router son los archivos de `src/app`).
  legalPatron: '/legal/:doc',
  agenciaPatron: '/agencia/:id',
  planPatron: '/plan/:id',
  checkoutPatron: '/checkout/:planId/:fechaId',
  reservaPatron: '/reserva/:bookingId',
  reservaDetallePatron: '/reservas/:bookingId',
  resenaPatron: '/resena/:bookingId',

  // Ubicaciones concretas.
  legal: (doc: string) => `/legal/${doc}`,
  agencia: (id: string) => `/agencia/${id}`,
  plan: (id: string) => `/plan/${id}`,
  checkout: (planId: string, fechaId: string) => `/checkout/${planId}/${fechaId}`,

  /** Confirmación de una reserva. */
  reserva: (bookingId: string) => `/reserva/${bookingId}`,

  /** Detalle de una reserva propia (desde «Mis reservas»). */
  reservaDetalle: (bookingId: string) => `/reservas/${bookingId}`,

  /** Reseña de una reserva propia ya viajada. */
  resena: (bookingId: string) => `/resena/${bookingId}`,

  /** Vuelta de Wompi: verifica en el servidor el pago de la transacción. */
  pagoDeTransaccion: (transactionId: string) =>
    `${diversoConfig.paymentResultPath}?id=${codificarComponenteQuery(transactionId)}`,

  /** «Ya pagué, verificar»: verifica el pago más reciente de una reserva. */
  pagoDeReserva: (bookingId: string) =>
    `${diversoConfig.paymentResultPath}?reserva=${codificarComponenteQuery(bookingId)}`,

  /** Comparador de planes: los ids viajan en la URL (`?ids=a,b,c`) y la pantalla carga los planes. */
  compararPlanes: (ids: Iterable<string>) => `/comparar?ids=${[...ids].map(codificarComponenteQuery).join(',')}`,
} as const;

/**
 * Ids de `?ids=a,b,c` (sin vacíos ni repetidos, como mucho los que caben en el comparador). Acepta
 * el valor tal como lo da `useLocalSearchParams` (string, lista si se repite, o nada).
 */
export function idsAComparar(valor: string | string[] | undefined, max = MAX_COMPARAR): string[] {
  const crudos = (Array.isArray(valor) ? valor : [valor ?? '']).flatMap((v) => v.split(','));
  return [...new Set(crudos.filter((id) => id.length > 0))].slice(0, max);
}

/** Un parámetro de ruta como texto (Expo Router da `string | string[]`). */
export function parametro(valor: string | string[] | undefined): string {
  return Array.isArray(valor) ? (valor[0] ?? '') : (valor ?? '');
}

/** Un parámetro de query opcional (`null` si no viene o viene vacío). */
export function parametroOpcional(valor: string | string[] | undefined): string | null {
  const v = parametro(valor);
  return v === '' ? null : v;
}

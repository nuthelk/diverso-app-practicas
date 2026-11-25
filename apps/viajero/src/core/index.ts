/**
 * Port de `diverso_core` (TypeScript puro, sin React). Punto de entrada único para pantallas,
 * view-models y la composición: `import { Plan, BookingRepository } from '@/core'`.
 *
 * NO reexporta `data/services/supabase-client` (importa AsyncStorage y el polyfill de URL): la raíz
 * de composición lo importa directo, así los tests de pantallas no necesitan mocks nativos.
 */

/**
 * Solo la parte pública de una clase. Las clases con campos `private` son nominales en TS; con
 * `Public<BookingRepository>` un objeto falso cumple el contrato en los tests de view-models.
 */
export type Public<T> = { [K in keyof T]: T[K] };

export * from './config/diverso-config';

export * from './models/enums';
export * from './models/row';
export * from './models/profile';
export * from './models/agency-summary';
export * from './models/plan';
export * from './models/booking';
export * from './models/created-booking';
export * from './models/refund';
export * from './models/payment-checkout';
export * from './models/review';
export * from './models/catalog-filters';

export * from './errors/diverso-error';
export * from './errors/error-funcion';
export * from './errors/errores-programacion';

export * from './utils/fechas';
export * from './utils/hora-bogota';
export * from './utils/formatters';
export * from './utils/busqueda';

export * from './legal/documento-legal';
export * from './comparison/comparison-row';

export * from './data/services/catalog-api';
export * from './data/services/booking-api';
export * from './data/services/edge-functions-api';

export * from './data/repositories/auth-repository';
export * from './data/repositories/booking-repository';
export * from './data/repositories/catalog-repository';
export * from './data/repositories/review-repository';
export * from './data/repositories/payment-gateway';
export * from './data/repositories/llamar-edge-function';

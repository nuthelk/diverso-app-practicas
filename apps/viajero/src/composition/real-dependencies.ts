import type { SupabaseClient } from '@supabase/supabase-js';

import {
  AuthRepository,
  BookingApiSupabase,
  BookingRepository,
  CatalogApiSupabase,
  CatalogRepository,
  EdgeFunctionsApiSupabase,
  ReviewRepository,
  WompiPaymentGateway,
} from '@/core';
import { createSupabaseClient } from '@/core/data/services/supabase-client';

import type { Dependencies } from './DependenciesProvider';

/**
 * Cableado de producción (`main.dart`): el cliente de Supabase se crea una vez y se pasa por
 * constructor a los servicios (Api) y estos a los repositorios; la UI solo ve repositorios.
 *
 * Fuera del barrel `@/composition` a propósito: importa AsyncStorage y el polyfill de URL, y los
 * tests de pantallas no los necesitan.
 */
export function createRealDependencies(client: SupabaseClient = createSupabaseClient()): {
  dependencies: Dependencies;
  client: SupabaseClient;
} {
  const edgeFunctions = new EdgeFunctionsApiSupabase({ client });
  return {
    client,
    dependencies: {
      auth: new AuthRepository({ client }),
      bookings: new BookingRepository({ api: new BookingApiSupabase({ client }), edgeFunctions }),
      catalog: new CatalogRepository({ api: new CatalogApiSupabase({ client }) }),
      reviews: new ReviewRepository({ client }),
      gateway: new WompiPaymentGateway({ edgeFunctions }),
    },
  };
}

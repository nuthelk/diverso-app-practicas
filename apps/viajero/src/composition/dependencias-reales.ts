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

import type { Dependencias } from './DependenciesProvider';

/**
 * Cableado de producción (`main.dart`): el cliente de Supabase se crea una vez y se pasa por
 * constructor a los servicios (Api) y estos a los repositorios; la UI solo ve repositorios.
 *
 * Fuera del barrel `@/composition` a propósito: importa AsyncStorage y el polyfill de URL, y los
 * tests de pantallas no los necesitan.
 */
export function crearDependenciasReales(client: SupabaseClient = createSupabaseClient()): {
  dependencias: Dependencias;
  client: SupabaseClient;
} {
  const edgeFunctions = new EdgeFunctionsApiSupabase({ client });
  return {
    client,
    dependencias: {
      auth: new AuthRepository({ client }),
      reservas: new BookingRepository({ api: new BookingApiSupabase({ client }), edgeFunctions }),
      catalogo: new CatalogRepository({ api: new CatalogApiSupabase({ client }) }),
      resenas: new ReviewRepository({ client }),
      pasarela: new WompiPaymentGateway({ edgeFunctions }),
    },
  };
}

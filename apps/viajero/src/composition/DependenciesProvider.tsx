import { createContext, useContext, type ReactNode } from 'react';

import type {
  AuthRepository,
  BookingRepository,
  CatalogRepository,
  PaymentGateway,
  Public,
  ReviewRepository,
} from '@/core';

/**
 * Todo lo que una pantalla puede pedir a la raíz de composición (`MultiProvider` de
 * `composition_root.dart`). Son contratos (`Publico<…>`): en producción, los repositorios reales
 * sobre Supabase; en pruebas, dobles.
 */
export interface Dependencies {
  auth: Public<AuthRepository>;
  bookings: Public<BookingRepository>;
  catalog: Public<CatalogRepository>;
  reviews: Public<ReviewRepository>;
  gateway: PaymentGateway;
}

const DependenciesContext = createContext<Dependencies | null>(null);

/** Provee los repositorios a todo el árbol. Se crean UNA vez, fuera (ver `createRealDependencies`). */
export function DependenciesProvider({
  dependencies,
  children,
}: {
  dependencies: Dependencies;
  children: ReactNode;
}) {
  return <DependenciesContext.Provider value={dependencies}>{children}</DependenciesContext.Provider>;
}

/**
 * Los repositorios (`context.read<X>()` de Flutter). Sin `DependenciesProvider` arriba falla al
 * montar, como el `ProviderNotFoundException`: `tests/app/startup.test.tsx` recorre las rutas
 * para atraparlo.
 */
export function useDependencies(): Dependencies {
  const dependencies = useContext(DependenciesContext);
  if (!dependencies) {
    throw new Error('useDependencies() necesita un <DependenciesProvider> arriba (raíz de composición).');
  }
  return dependencies;
}

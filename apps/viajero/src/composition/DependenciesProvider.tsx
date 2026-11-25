import { createContext, useContext, type ReactNode } from 'react';

import type {
  AuthRepository,
  BookingRepository,
  CatalogRepository,
  PaymentGateway,
  Publico,
  ReviewRepository,
} from '@/core';

/**
 * Todo lo que una pantalla puede pedir a la raíz de composición (`MultiProvider` de
 * `composition_root.dart`). Son contratos (`Publico<…>`): en producción, los repositorios reales
 * sobre Supabase; en pruebas, dobles.
 */
export interface Dependencias {
  auth: Publico<AuthRepository>;
  reservas: Publico<BookingRepository>;
  catalogo: Publico<CatalogRepository>;
  resenas: Publico<ReviewRepository>;
  pasarela: PaymentGateway;
}

const ContextoDependencias = createContext<Dependencias | null>(null);

/** Provee los repositorios a todo el árbol. Se crean UNA vez, fuera (ver `crearDependenciasReales`). */
export function DependenciesProvider({
  dependencias,
  children,
}: {
  dependencias: Dependencias;
  children: ReactNode;
}) {
  return <ContextoDependencias.Provider value={dependencias}>{children}</ContextoDependencias.Provider>;
}

/**
 * Los repositorios (`context.read<X>()` de Flutter). Sin `DependenciesProvider` arriba falla al
 * montar, como el `ProviderNotFoundException`: `tests/app/arranque.test.tsx` recorre las rutas
 * para atraparlo.
 */
export function useDependencies(): Dependencias {
  const dependencias = useContext(ContextoDependencias);
  if (!dependencias) {
    throw new Error('useDependencies() necesita un <DependenciesProvider> arriba (raíz de composición).');
  }
  return dependencias;
}

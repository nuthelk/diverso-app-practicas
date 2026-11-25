/**
 * Raíz de composición: `DependenciesProvider` + `useDependencies()` y el refresco de sesión según
 * `AppState`. `crearDependenciasReales` NO va en el barrel (importa supabase-client): se importa de
 * `@/composition/dependencias-reales` solo desde `src/app/_layout.tsx`.
 */
export { DependenciesProvider, useDependencies, type Dependencias } from './DependenciesProvider';
export { vincularAutoRefresh, type ClienteConAutoRefresh } from './auto-refresh';

/**
 * Raíz de composición: `DependenciesProvider` + `useDependencies()` y el refresco de sesión según
 * `AppState`. `createRealDependencies` NO va en el barrel (importa supabase-client): se importa de
 * `@/composition/real-dependencies` solo desde `src/app/_layout.tsx`.
 */
export { DependenciesProvider, useDependencies, type Dependencies } from './DependenciesProvider';
export { bindAutoRefresh, type AutoRefreshClient } from './auto-refresh';

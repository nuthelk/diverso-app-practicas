/** Mini router por hash (#/ruta) — el estático no sirve fallback de paths. */

export const router = $state({ path: location.hash.slice(1) || '/' });

addEventListener('hashchange', () => {
  router.path = location.hash.slice(1) || '/';
});

export function go(path: string): void {
  location.hash = '#' + path;
}

/** Partes de la ruta actual: #/planes/editar/xyz → ['planes','editar','xyz'] */
export function segmentos(path = router.path): string[] {
  return path.replace(/^\/+|\/+$/g, '').split('/').filter(Boolean);
}

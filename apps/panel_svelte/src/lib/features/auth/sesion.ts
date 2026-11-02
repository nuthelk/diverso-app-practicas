/** Guard de sesión (equivale al redirect global de go_router): a dónde mandar, o null si no hace falta. */
export function redireccionSesion(path: string, userId: string | null | undefined): string | null {
  const publica = path === '/login' || path === '/starter' || path.startsWith('/legal/');
  if (!userId && !publica) return '/login';
  if (userId && path === '/login') return '/starter';
  return null;
}

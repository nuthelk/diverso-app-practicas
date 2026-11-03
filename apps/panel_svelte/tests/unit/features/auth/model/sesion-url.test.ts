import { describe, expect, it } from 'vitest';
import { rutaActual } from '$lib/shared/lib/ruta';
import { redireccionSesion } from '$lib/features/auth/model/sesion';

describe('guard desde la URL del router por hash', () => {
  it.each([
    ['http://localhost/', null, '/login'],
    ['http://localhost/#/planes', null, '/login'],
    ['http://localhost/#/legal/privacidad', null, null],
    ['http://localhost/#/legal', null, '/login'],
    ['http://localhost/#/starter', null, null],
    ['http://localhost/#/login?x=1', 'u1', '/starter'],
    ['http://localhost/#/planes/editar/p-1', 'u1', null],
  ])('%s con usuario %s → %s', (url, uid, destino) => {
    expect(redireccionSesion(rutaActual(new URL(url)), uid)).toBe(destino);
  });
});

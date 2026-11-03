import { describe, expect, it } from 'vitest';
import { redireccionSesion } from '$lib/features/auth/model/sesion';

describe('redireccionSesion', () => {
  describe('sin sesión', () => {
    it.each(['/dashboard', '/planes', '/planes/nuevo', '/admin', '/consentimiento', '/', '/loginx', '/legal'])(
      'manda %s a /login',
      (path) => {
        expect(redireccionSesion(path, null)).toBe('/login');
      },
    );

    it('trata el userId vacío como sin sesión', () => {
      expect(redireccionSesion('/dashboard', '')).toBe('/login');
    });

    it.each(['/login', '/starter', '/legal/terminos', '/legal/'])('deja pasar la ruta pública %s', (path) => {
      expect(redireccionSesion(path, null)).toBeNull();
    });
  });

  describe('con sesión', () => {
    it('manda /login a /starter', () => {
      expect(redireccionSesion('/login', 'u-1')).toBe('/starter');
    });

    it.each(['/dashboard', '/starter', '/legal/terminos', '/planes/editar/x', '/', '/login/otro'])(
      'no redirige %s',
      (path) => {
        expect(redireccionSesion(path, 'u-1')).toBeNull();
      },
    );
  });
});

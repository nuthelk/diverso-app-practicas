/**
 * Módulo de auth falso para tests: un store real (para que `useAuth()` dibuje y reaccione) y funciones espía.
 *
 * Uso (el factory de `vi.mock` no puede usar variables del archivo, por eso se importa adentro):
 *   vi.mock('@/features/auth/model/auth', async () => (await import('@tests/auth-falso')).authFalso({ userId: 'u-1' }));
 *   import { auth, signOut } from '@/features/auth/model/auth';   // `auth` es el store falso; `signOut` un vi.fn()
 *   auth.set({ userId: null });                                    // cambia la sesión en mitad de un test
 *
 * Antes de la migración cada test armaba a mano un objeto `auth` falso; aquí es un store de verdad.
 */
import { vi } from 'vitest';
import { crearStore, useStore } from '@/shared/lib/store';

type EstadoAuth = { ready: boolean; userId: string | null; email: string | null };

export function authFalso(inicial: Partial<EstadoAuth> = {}) {
  const auth = crearStore<EstadoAuth>({ ready: true, userId: null, email: null, ...inicial });
  return {
    auth,
    useAuth: () => useStore(auth),
    signIn: vi.fn(),
    signOut: vi.fn(),
    perfilActual: vi.fn(),
  };
}

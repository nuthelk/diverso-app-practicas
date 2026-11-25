import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { agencia, texto } from '@tests/fixtures';
import { renderConRuta } from '@tests/render';

vi.mock('@/features/auth/model/auth', async () => (await import('@tests/auth-falso')).authFalso({ ready: true, userId: 'u-1', email: 'ana@agencia.co' }));
vi.mock('@/features/agencias/api/agencias.api', () => ({ miAgencia: vi.fn() }));
vi.mock('@/features/legal/api/legal.api', () => ({ consentimientosPendientes: vi.fn() }));

import { perfilActual, signOut } from '@/features/auth/model/auth';
import { miAgencia } from '@/features/agencias/api/agencias.api';
import { consentimientosPendientes } from '@/features/legal/api/legal.api';
import StarterPage from '@/features/auth/pages/StarterPage';

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

// La página vive en /starter; `ruta()` dice a dónde navegó (reemplaza a `expect(goto)…`).
const pintar = () => renderConRuta(<StarterPage />, { ruta: '/starter' });

describe('Starter', () => {
  it('mientras decide a dónde ir muestra un estado con texto visible', () => {
    vi.mocked(perfilActual).mockReturnValue(new Promise(() => {}));
    pintar();
    const estado = screen.getByRole('status');
    expect(texto(estado)).toContain('Preparando tu panel');
    expect(screen.getByRole('heading', { level: 1 })).toBeTruthy();
  });

  it.each([
    ['un admin va a /admin', 'admin', agencia(), [], '/admin'],
    ['una agencia sin registro va a /onboarding', 'agencia', null, [], '/onboarding'],
    ['con consentimientos pendientes va a /consentimiento', 'agencia', agencia(), ['tratamiento_datos'], '/consentimiento'],
    ['una agencia al día va al resumen', 'agencia', agencia(), [], '/dashboard'],
  ])('%s', async (_nombre, rol, ag, pendientes, destino) => {
    vi.mocked(perfilActual).mockResolvedValue({ rol } as never);
    vi.mocked(miAgencia).mockResolvedValue(ag);
    vi.mocked(consentimientosPendientes).mockResolvedValue(pendientes as never);
    const { ruta } = pintar();
    await vi.waitFor(() => expect(ruta()).toBe(destino));
  });

  it('si no puede decidir, lo dice, deja reintentar o salir y no rebota a /login', async () => {
    vi.mocked(perfilActual).mockRejectedValueOnce(new Error('Failed to fetch'));
    const { ruta } = pintar();
    const alerta = await screen.findByRole('alert');
    expect(texto(alerta)).toContain('No hay conexión con el servidor');
    expect(ruta()).toBe('/starter');

    await fireEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }));
    expect(signOut).toHaveBeenCalled();
    // En React `signOut` no navega: lo hace `useCerrarSesion` (lleva a /login). La pantalla sigue montada (el helper la
    // dibuja en todas las rutas), así que se sigue probando «Reintentar» como en la versión Svelte, donde `goto` era un mock.
    await vi.waitFor(() => expect(ruta()).toBe('/login'));

    vi.mocked(perfilActual).mockResolvedValue({ rol: 'admin' } as never);
    await fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    await vi.waitFor(() => expect(ruta()).toBe('/admin'));
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';

// Prueba nueva de la migración: el guard vivía en el layout raíz de Svelte sin test propio. Aquí se fija que el layout
// raíz de React lo aplica igual, y que tras cerrar sesión el guard lleva a /login (ya no lo hace `signOut`).
vi.mock('@/features/auth/model/auth', async () => (await import('@tests/auth-falso')).authFalso({ ready: false }));

import { auth } from '@/features/auth/model/auth';
import { avisar } from '@/shared/lib/toast';
import RaizLayout from '@/app/layouts/RaizLayout';

beforeEach(() => auth.set({ ready: false, userId: null }));
afterEach(cleanup);

async function abrir(url: string) {
  const router = createMemoryRouter(
    [{ element: <RaizLayout />, children: [{ path: '*', element: <p>contenido</p> }] }],
    { initialEntries: [url] },
  );
  await act(async () => {
    render(<RouterProvider router={router} />);
  });
  return { ruta: () => router.state.location.pathname };
}

describe('RaizLayout', () => {
  it('mientras no se sabe si hay sesión muestra un estado de carga, no la página', async () => {
    await abrir('/dashboard');
    expect(screen.getByRole('status', { name: 'Cargando' })).toBeTruthy();
    expect(screen.queryByText('contenido')).toBeNull();
  });

  it('sin sesión, una ruta privada va a /login; las públicas se quedan', async () => {
    const { ruta } = await abrir('/planes');
    await act(async () => auth.set({ ready: true }));
    expect(ruta()).toBe('/login');
    cleanup();
    const legal = await abrir('/legal/privacidad');
    await act(async () => auth.set({ ready: true }));
    expect(legal.ruta()).toBe('/legal/privacidad');
    expect(screen.getByText('contenido')).toBeTruthy();
  });

  it('con sesión, /login va a /starter', async () => {
    const { ruta } = await abrir('/login');
    await act(async () => auth.set({ ready: true, userId: 'u-1' }));
    expect(ruta()).toBe('/starter');
  });

  it('al cerrarse la sesión en una ruta privada, el guard lleva a /login', async () => {
    auth.set({ ready: true, userId: 'u-1' });
    const { ruta } = await abrir('/ventas');
    expect(ruta()).toBe('/ventas');
    await act(async () => auth.set({ userId: null }));
    expect(ruta()).toBe('/login');
  });

  it('monta el toast global', async () => {
    auth.set({ ready: true, userId: 'u-1' });
    await abrir('/ventas');
    await act(async () => avisar('Plan guardado.'));
    expect(screen.getByRole('status').textContent).toContain('Plan guardado.');
  });

  it('monta una sola vez el anunciador de rutas, también mientras carga la sesión', async () => {
    await abrir('/ventas');
    expect(document.querySelectorAll('#anunciador-ruta')).toHaveLength(1);
  });
});

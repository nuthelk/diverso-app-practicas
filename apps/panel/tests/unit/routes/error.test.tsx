import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { createMemoryRouter, data, RouterProvider } from 'react-router';
import { texto } from '@tests/fixtures';

vi.mock('@/features/auth/model/auth', async () => (await import('@tests/auth-falso')).authFalso());

import { auth } from '@/features/auth/model/auth';
import ErrorPage, { PantallaError } from '@/app/ErrorPage';

// En Svelte la página leía el estado y el error del router; aquí `PantallaError` los recibe como props
// (el contenedor `ErrorPage` los saca de `useRouteError`). `pagina` conserva la forma de aquel mock.
const pagina = { status: 404, error: { message: 'Not Found' } as { message: string } | null };
const pintar = () => render(<PantallaError status={pagina.status} error={pagina.error} />);

beforeEach(() => {
  pagina.status = 404;
  pagina.error = { message: 'Not Found' };
  auth.set({ userId: null });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('+error', () => {
  it('404 sin sesión: título amable y un solo camino, iniciar sesión', () => {
    pintar();
    expect(screen.getByRole('heading', { level: 1, name: 'No encontramos esta página' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Iniciar sesión' }).getAttribute('href')).toBe('#/login');
    expect(screen.queryByRole('link', { name: 'Ir al resumen' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Reintentar' })).toBeNull();
  });

  it('404 con sesión: vuelve al resumen', () => {
    auth.set({ userId: 'u-1' });
    pintar();
    expect(screen.getByRole('link', { name: 'Ir al resumen' }).getAttribute('href')).toBe('#/dashboard');
    expect(screen.queryByRole('link', { name: 'Iniciar sesión' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Reintentar' })).toBeNull();
  });

  it('otro error: título distinto, mensaje traducido (no el crudo) y además se puede reintentar', () => {
    pagina.status = 500;
    pagina.error = { message: 'Failed to fetch' };
    auth.set({ userId: 'u-1' });
    const { container } = pintar();
    expect(screen.getByRole('heading', { level: 1, name: 'Algo salió mal' })).toBeTruthy();
    expect(texto(container)).toContain('No hay conexión con el servidor');
    expect(texto(container)).not.toContain('Failed to fetch');
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Ir al resumen' })).toBeTruthy();
  });

  it('otro error sin sesión: iniciar sesión y reintentar', () => {
    pagina.status = 500;
    pintar();
    expect(screen.getByRole('link', { name: 'Iniciar sesión' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeTruthy();
  });

  it.each([null, { message: '' }, { message: 'Internal Error' }])('un error sin texto útil (%j) usa un mensaje general', (error) => {
    pagina.status = 500;
    pagina.error = error;
    const { container } = pintar();
    expect(texto(container)).toContain('Ocurrió un error inesperado');
    expect(texto(container)).not.toContain('Internal Error');
  });
});

/** El router, `manejarError` y la página de error juntos: `ErrorPage` como errorElement. */
describe('ErrorPage en el router', () => {
  const abrir = async (rompe: () => never) => {
    const router = createMemoryRouter([{ path: '/', loader: rompe, element: null, errorElement: <ErrorPage /> }]);
    let r!: ReturnType<typeof render>;
    await act(async () => {
      r = render(<RouterProvider router={router} />);
    });
    return r;
  };

  it('una ruta que no existe (404) se explica sin llenar la consola', async () => {
    const consola = vi.spyOn(console, 'error').mockImplementation(() => {});
    await abrir(() => {
      throw data(null, { status: 404, statusText: 'Not Found' });
    });
    expect(screen.getByText('Error 404')).toBeTruthy();
    expect(screen.getByRole('heading', { level: 1, name: 'No encontramos esta página' })).toBeTruthy();
    expect(consola).not.toHaveBeenCalled();
  });

  it('un error inesperado se registra en la consola y la página muestra su texto legible', async () => {
    const consola = vi.spyOn(console, 'error').mockImplementation(() => {});
    const e = new Error('Failed to fetch');
    const { container } = await abrir(() => {
      throw e;
    });
    expect(screen.getByText('Error 500')).toBeTruthy();
    expect(screen.getByRole('heading', { level: 1, name: 'Algo salió mal' })).toBeTruthy();
    expect(texto(container)).toContain('No hay conexión con el servidor');
    expect(consola).toHaveBeenCalledWith(e);
  });
});

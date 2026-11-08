import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/svelte';
import { texto } from '$tests/fixtures';

const pagina = vi.hoisted(() => ({ status: 404, error: { message: 'Not Found' } as { message: string } | null }));
const sesion = vi.hoisted(() => ({ userId: null as string | null }));
vi.mock('$app/state', () => ({ page: pagina }));
vi.mock('$lib/features/auth/model/auth.svelte', () => ({ auth: sesion }));

import ErrorPage from '../../../src/routes/+error.svelte';

beforeEach(() => {
  pagina.status = 404;
  pagina.error = { message: 'Not Found' };
  sesion.userId = null;
});
afterEach(cleanup);

describe('+error', () => {
  it('404 sin sesión: título amable y un solo camino, iniciar sesión', () => {
    render(ErrorPage);
    expect(screen.getByRole('heading', { level: 1, name: 'No encontramos esta página' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Iniciar sesión' }).getAttribute('href')).toBe('#/login');
    expect(screen.queryByRole('link', { name: 'Ir al resumen' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Reintentar' })).toBeNull();
  });

  it('404 con sesión: vuelve al resumen', () => {
    sesion.userId = 'u-1';
    render(ErrorPage);
    expect(screen.getByRole('link', { name: 'Ir al resumen' }).getAttribute('href')).toBe('#/dashboard');
    expect(screen.queryByRole('link', { name: 'Iniciar sesión' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Reintentar' })).toBeNull();
  });

  it('otro error: título distinto, mensaje traducido (no el crudo) y además se puede reintentar', () => {
    pagina.status = 500;
    pagina.error = { message: 'Failed to fetch' };
    sesion.userId = 'u-1';
    const { container } = render(ErrorPage);
    expect(screen.getByRole('heading', { level: 1, name: 'Algo salió mal' })).toBeTruthy();
    expect(texto(container)).toContain('No hay conexión con el servidor');
    expect(texto(container)).not.toContain('Failed to fetch');
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Ir al resumen' })).toBeTruthy();
  });

  it('otro error sin sesión: iniciar sesión y reintentar', () => {
    pagina.status = 500;
    render(ErrorPage);
    expect(screen.getByRole('link', { name: 'Iniciar sesión' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeTruthy();
  });

  it.each([null, { message: '' }, { message: 'Internal Error' }])(
    'un error sin texto útil (%j) usa un mensaje general',
    (error) => {
      pagina.status = 500;
      pagina.error = error;
      const { container } = render(ErrorPage);
      expect(texto(container)).toContain('Ocurrió un error inesperado');
      expect(texto(container)).not.toContain('Internal Error');
    },
  );
});

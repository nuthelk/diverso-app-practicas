import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/svelte';

vi.mock('$app/state', () => import('$tests/pagina-falsa.svelte'));
vi.mock('$lib/features/auth/model/auth.svelte', () => ({
  auth: { userId: 'u-admin', email: 'admin@diverso.app' },
  signOut: vi.fn(),
}));

import { signOut } from '$lib/features/auth/model/auth.svelte';
import { tema } from '$lib/shared/lib/tema.svelte';
import AdminCabecera from '$lib/features/admin/components/AdminCabecera.svelte';

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
  tema.preferencia = 'sistema';
  document.documentElement.classList.remove('dark');
  localStorage.clear();
});

const secciones = () => screen.getByRole('navigation', { name: 'Secciones de administración' });
const cuenta = () => screen.getByRole('button', { name: 'Cuenta de Administración' });
const panel = () => document.getElementById(cuenta().getAttribute('aria-controls')!)!;

describe('AdminCabecera', () => {
  it('ofrece las pestañas Agencias y Dispersiones, sin el enlace cruzado de antes', () => {
    render(AdminCabecera, { activa: 'agencias' });
    const enlaces = within(secciones()).getAllByRole('link');
    expect(enlaces.map((a) => a.textContent?.trim())).toEqual(['Agencias', 'Dispersiones']);
    expect(enlaces.map((a) => a.getAttribute('href'))).toEqual(['#/admin', '#/admin/dispersiones']);
    expect(screen.queryByRole('link', { name: 'Dispersiones de prueba' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Verificación de agencias' })).toBeNull();
  });

  it('marca con aria-current solo la pestaña de la pantalla en que estás', () => {
    const { unmount } = render(AdminCabecera, { activa: 'agencias' });
    expect(within(secciones()).getAllByRole('link', { current: 'page' }).map((a) => a.getAttribute('href'))).toEqual(['#/admin']);
    unmount();

    render(AdminCabecera, { activa: 'dispersiones' });
    expect(within(secciones()).getAllByRole('link', { current: 'page' }).map((a) => a.getAttribute('href'))).toEqual(['#/admin/dispersiones']);
  });

  it('lleva la marca con enlace a Agencias y un solo «Modo de prueba»', () => {
    render(AdminCabecera, { activa: 'agencias' });
    expect(screen.getByRole('link', { name: /^Diverso/ }).getAttribute('href')).toBe('#/admin');
    expect(screen.getAllByText(/Modo de prueba/)).toHaveLength(1);
    expect(screen.getAllByRole('status')).toHaveLength(1);
  });

  it('el menú de cuenta trae el correo del admin y el tema (Sistema / Claro / Oscuro) que antes no tenía', async () => {
    render(AdminCabecera, { activa: 'agencias' });
    expect(cuenta().getAttribute('aria-expanded')).toBe('false');
    await fireEvent.click(cuenta());
    expect(within(panel()).getByText('Administración')).toBeTruthy();
    expect(within(panel()).getByText('admin@diverso.app')).toBeTruthy();
    const grupo = within(panel()).getByRole('radiogroup', { name: 'Tema' });
    expect(within(grupo).getAllByRole('radio').map((r) => r.textContent?.trim())).toEqual(['Sistema', 'Claro', 'Oscuro']);

    await fireEvent.click(within(grupo).getByRole('radio', { name: 'Oscuro' }));
    expect(tema.preferencia).toBe('oscuro');
  });

  it('no deja «Cerrar sesión» suelto en la barra: vive en el menú de cuenta y sale desde ahí', async () => {
    render(AdminCabecera, { activa: 'dispersiones' });
    expect(screen.queryByRole('button', { name: 'Cerrar sesión' })).toBeNull();
    await fireEvent.click(cuenta());
    await fireEvent.click(within(panel()).getByRole('button', { name: 'Cerrar sesión' }));
    expect(signOut).toHaveBeenCalledTimes(1);
  });
});

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import { agencia, texto } from '$tests/fixtures';

vi.mock('$app/navigation', () => ({ goto: vi.fn() }));
vi.mock('$lib/features/auth/model/auth.svelte', () => ({
  auth: { ready: true, userId: 'u-1', email: 'ana@agencia.co' },
  perfilActual: vi.fn(),
  signOut: vi.fn(),
}));
vi.mock('$lib/features/agencias/api/agencias.api', () => ({ miAgencia: vi.fn() }));
vi.mock('$lib/features/legal/api/legal.api', () => ({ consentimientosPendientes: vi.fn() }));

import { goto } from '$app/navigation';
import { perfilActual, signOut } from '$lib/features/auth/model/auth.svelte';
import { miAgencia } from '$lib/features/agencias/api/agencias.api';
import { consentimientosPendientes } from '$lib/features/legal/api/legal.api';
import StarterPage from '$lib/features/auth/pages/StarterPage.svelte';

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

describe('Starter', () => {
  it('mientras decide a dónde ir muestra un estado con texto visible', () => {
    vi.mocked(perfilActual).mockReturnValue(new Promise(() => {}));
    render(StarterPage);
    const estado = screen.getByRole('status');
    expect(texto(estado)).toContain('Preparando tu panel');
    expect(screen.getByRole('heading', { level: 1 })).toBeTruthy();
  });

  it.each([
    ['un admin va a /admin', 'admin', agencia(), [], '#/admin'],
    ['una agencia sin registro va a /onboarding', 'agencia', null, [], '#/onboarding'],
    ['con consentimientos pendientes va a /consentimiento', 'agencia', agencia(), ['tratamiento_datos'], '#/consentimiento'],
    ['una agencia al día va al resumen', 'agencia', agencia(), [], '#/dashboard'],
  ])('%s', async (_nombre, rol, ag, pendientes, destino) => {
    vi.mocked(perfilActual).mockResolvedValue({ rol } as never);
    vi.mocked(miAgencia).mockResolvedValue(ag);
    vi.mocked(consentimientosPendientes).mockResolvedValue(pendientes as never);
    render(StarterPage);
    await vi.waitFor(() => expect(goto).toHaveBeenCalledWith(destino));
  });

  it('si no puede decidir, lo dice, deja reintentar o salir y no rebota a /login', async () => {
    vi.mocked(perfilActual).mockRejectedValueOnce(new Error('Failed to fetch'));
    render(StarterPage);
    const alerta = await screen.findByRole('alert');
    expect(texto(alerta)).toContain('No hay conexión con el servidor');
    expect(goto).not.toHaveBeenCalled();

    await fireEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }));
    expect(signOut).toHaveBeenCalled();

    vi.mocked(perfilActual).mockResolvedValue({ rol: 'admin' } as never);
    await fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    await vi.waitFor(() => expect(goto).toHaveBeenCalledWith('#/admin'));
  });
});

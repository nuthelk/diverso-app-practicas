import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRawSnippet } from 'svelte';
import { cleanup, render, screen } from '@testing-library/svelte';
import { agencia } from '$tests/fixtures';

vi.mock('$app/state', () => import('$tests/pagina-falsa.svelte'));
vi.mock('$lib/features/agencias/api/agencias.api', () => ({
  miAgencia: vi.fn(),
}));
vi.mock('$lib/features/auth/model/auth.svelte', () => ({
  auth: { userId: 'u-1', email: 'agencia@diverso.app' },
  signOut: vi.fn(),
}));

import { irA } from '$tests/pagina-falsa.svelte';
import { miAgencia } from '$lib/features/agencias/api/agencias.api';
import Shell from '$lib/features/agencias/components/Shell.svelte';

const children = createRawSnippet(() => ({ render: () => '<p>contenido de la página</p>' }));

afterEach(() => {
  cleanup(); // desmonta antes de reiniciar los mocks: el efecto de Shell vuelve a llamar a miAgencia
  vi.resetAllMocks();
  irA('/');
});

describe('Shell · navegación', () => {
  it('ofrece Liquidaciones y Cuenta para dispersiones además de Resumen, Planes y Ventas', async () => {
    vi.mocked(miAgencia).mockResolvedValue(agencia());
    render(Shell, { children });
    await screen.findAllByText('Aventuras Antioquia');

    const href = (nombre: string | RegExp) => screen.getAllByRole('link', { name: nombre }).map((a) => a.getAttribute('href'));
    expect(href('Resumen')).toContain('#/dashboard');
    expect(href('Planes')).toContain('#/planes');
    expect(href('Ventas')).toContain('#/ventas');
    expect(href('Liquidaciones')).toEqual(['#/liquidaciones', '#/liquidaciones']); // barra lateral + inferior móvil
    expect(href('Cuenta para dispersiones')).toEqual(['#/cuenta-dispersiones']);
    expect(href('Cuenta')).toContain('#/cuenta-dispersiones'); // etiqueta corta en la barra inferior móvil
  });

  it('marca la sección activa también en el detalle de una liquidación', async () => {
    vi.mocked(miAgencia).mockResolvedValue(agencia());
    irA('/liquidaciones/liq-1');
    render(Shell, { children });
    await screen.findAllByText('Aventuras Antioquia');
    const activos = screen.getAllByRole('link', { current: 'page' }).map((a) => a.getAttribute('href'));
    expect(activos).toEqual(['#/liquidaciones', '#/liquidaciones']);
  });

  it('el aviso del RNT va en todas las secciones menos en el Resumen, que ya lo muestra arriba', async () => {
    vi.mocked(miAgencia).mockResolvedValue(agencia({ rnt_vigente_hasta: '2026-11-10' }));
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 25, 12));
    try {
      irA('/planes');
      render(Shell, { children });
      expect(await screen.findByText(/Tu RNT vence el/)).toBeTruthy();
      cleanup();

      irA('/dashboard');
      render(Shell, { children });
      await screen.findAllByText('Aventuras Antioquia');
      expect(screen.queryByText(/Tu RNT vence el/)).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('renderiza el contenido de la página', async () => {
    vi.mocked(miAgencia).mockResolvedValue(agencia());
    render(Shell, { children });
    expect(await screen.findByText('contenido de la página')).toBeTruthy();
  });
});

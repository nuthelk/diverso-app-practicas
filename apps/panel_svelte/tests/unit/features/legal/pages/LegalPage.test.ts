import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import { texto } from '$tests/fixtures';

vi.mock('$app/navigation', () => ({ goto: vi.fn() }));
const sesion = vi.hoisted(() => ({ userId: null as string | null }));
vi.mock('$lib/features/auth/model/auth.svelte', () => ({ auth: sesion }));

import { goto } from '$app/navigation';
import LegalPage from '$lib/features/legal/pages/LegalPage.svelte';

const fijarHistorial = (n: number) => Object.defineProperty(window.history, 'length', { configurable: true, value: n });
let atras: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  sesion.userId = null;
  atras = vi.spyOn(window.history, 'back').mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  vi.mocked(goto).mockReset();
  delete (window.history as { length?: number }).length;
});

describe('Legal: Volver', () => {
  it('con historial en la pestaña vuelve atrás', async () => {
    fijarHistorial(3);
    render(LegalPage, { doc: 'privacidad' });
    await fireEvent.click(screen.getByRole('button', { name: 'Volver' }));
    expect(atras).toHaveBeenCalledOnce();
    expect(goto).not.toHaveBeenCalled();
  });

  it('abierto en una pestaña nueva y sin sesión, lleva a iniciar sesión', async () => {
    fijarHistorial(1);
    render(LegalPage, { doc: 'privacidad' });
    await fireEvent.click(screen.getByRole('button', { name: 'Volver' }));
    expect(goto).toHaveBeenCalledWith('#/login');
    expect(atras).not.toHaveBeenCalled();
  });

  it('abierto en una pestaña nueva y con sesión, lleva al resumen', async () => {
    fijarHistorial(1);
    sesion.userId = 'u-1';
    render(LegalPage, { doc: 'terminos-agencias' });
    await fireEvent.click(screen.getByRole('button', { name: 'Volver' }));
    expect(goto).toHaveBeenCalledWith('#/dashboard');
    expect(atras).not.toHaveBeenCalled();
  });
});

describe('Legal: contenido', () => {
  it('muestra la versión, el título, el resumen y cada sección del documento', () => {
    const { container } = render(LegalPage, { doc: 'privacidad' });
    expect(screen.getByRole('heading', { level: 1, name: 'Política de tratamiento de datos personales' })).toBeTruthy();
    expect(texto(container)).toContain('VERSIÓN V2-2026-10');
    expect(screen.getByRole('heading', { level: 2, name: '1. Responsable' })).toBeTruthy();
  });

  it('el borrador para el piloto académico solo se muestra en desarrollo', () => {
    vi.stubEnv('DEV', true);
    const dev = render(LegalPage, { doc: 'privacidad' });
    expect(texto(dev.container)).toContain('Borrador para el piloto académico');
    cleanup();
    vi.stubEnv('DEV', false);
    const publicado = render(LegalPage, { doc: 'privacidad' });
    expect(texto(publicado.container)).not.toContain('Borrador');
  });

  it('un documento que no existe lo dice y ofrece los tres que sí', () => {
    render(LegalPage, { doc: 'otro' });
    expect(screen.getByRole('heading', { level: 1, name: 'No encontramos ese documento' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Política de tratamiento de datos personales' }).getAttribute('href')).toBe(
      '#/legal/privacidad',
    );
    expect(screen.getAllByRole('link')).toHaveLength(3);
  });
});

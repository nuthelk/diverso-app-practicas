import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { texto } from '@tests/fixtures';
import { renderConRuta } from '@tests/render';

vi.mock('@/features/auth/model/auth', async () => (await import('@tests/auth-falso')).authFalso({ userId: null }));

import { auth } from '@/features/auth/model/auth';
import LegalPage from '@/features/legal/pages/LegalPage';

const fijarHistorial = (n: number) => Object.defineProperty(window.history, 'length', { configurable: true, value: n });
let atras: ReturnType<typeof vi.spyOn>;

// La página vive en /legal/<doc>; `ruta()` dice a dónde navegó (reemplaza a `expect(goto)…`).
const pintar = (doc: string) => renderConRuta(<LegalPage doc={doc} />, { ruta: `/legal/${doc}` });

beforeEach(() => {
  auth.set({ userId: null });
  atras = vi.spyOn(window.history, 'back').mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  delete (window.history as { length?: number }).length;
});

describe('Legal: Volver', () => {
  it('con historial en la pestaña vuelve atrás', async () => {
    fijarHistorial(3);
    const { ruta } = pintar('privacidad');
    await fireEvent.click(screen.getByRole('button', { name: 'Volver' }));
    expect(atras).toHaveBeenCalledOnce();
    expect(ruta()).toBe('/legal/privacidad');
  });

  it('abierto en una pestaña nueva y sin sesión, lleva a iniciar sesión', async () => {
    fijarHistorial(1);
    const { ruta } = pintar('privacidad');
    await fireEvent.click(screen.getByRole('button', { name: 'Volver' }));
    expect(ruta()).toBe('/login');
    expect(atras).not.toHaveBeenCalled();
  });

  it('abierto en una pestaña nueva y con sesión, lleva al resumen', async () => {
    fijarHistorial(1);
    auth.set({ userId: 'u-1' });
    const { ruta } = pintar('terminos-agencias');
    await fireEvent.click(screen.getByRole('button', { name: 'Volver' }));
    expect(ruta()).toBe('/dashboard');
    expect(atras).not.toHaveBeenCalled();
  });
});

describe('Legal: contenido', () => {
  it('muestra la versión, el título, el resumen y cada sección del documento', () => {
    const { container } = pintar('privacidad');
    expect(screen.getByRole('heading', { level: 1, name: 'Política de tratamiento de datos personales' })).toBeTruthy();
    expect(texto(container)).toContain('VERSIÓN V2-2026-10');
    expect(screen.getByRole('heading', { level: 2, name: '1. Responsable' })).toBeTruthy();
  });

  it('el borrador para el piloto académico solo se muestra en desarrollo', () => {
    vi.stubEnv('DEV', true);
    const dev = pintar('privacidad');
    expect(texto(dev.container)).toContain('Borrador para el piloto académico');
    cleanup();
    vi.stubEnv('DEV', false);
    const publicado = pintar('privacidad');
    expect(texto(publicado.container)).not.toContain('Borrador');
  });

  it('un documento que no existe lo dice y ofrece los tres que sí', () => {
    pintar('otro');
    expect(screen.getByRole('heading', { level: 1, name: 'No encontramos ese documento' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Política de tratamiento de datos personales' }).getAttribute('href')).toBe(
      '#/legal/privacidad',
    );
    expect(screen.getAllByRole('link')).toHaveLength(3);
  });
});

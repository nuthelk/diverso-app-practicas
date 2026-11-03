import { afterEach, describe, expect, it, vi } from 'vitest';
import { tick } from 'svelte';
import { createRawSnippet } from 'svelte';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/svelte';
import { agencia, texto } from '$tests/fixtures';

vi.mock('$app/state', () => import('$tests/pagina-falsa.svelte'));
vi.mock('$lib/features/agencias/api/agencias.api', () => ({
  miAgencia: vi.fn(),
}));
vi.mock('$lib/features/auth/model/auth.svelte', () => ({
  auth: { userId: 'u-1', email: 'agencia@diverso.app' },
  signOut: vi.fn(),
}));

import { irA } from '$tests/pagina-falsa.svelte';
import { signOut } from '$lib/features/auth/model/auth.svelte';
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

describe('Shell · marca, agencia y barra superior', () => {
  it('barra lateral: marca, bloque de la agencia con su verificación, sección GESTIÓN y pie legal', async () => {
    vi.mocked(miAgencia).mockResolvedValue(agencia({ nombre: 'Comuna 13 Graffiti Tours' }));
    render(Shell, { children });
    await screen.findAllByText('Comuna 13 Graffiti Tours');

    expect(screen.getByText('Panel de agencias')).toBeTruthy();
    expect(screen.getByText('GESTIÓN')).toBeTruthy();
    expect(screen.getAllByText('Verificada').length).toBeGreaterThan(0);
    const nav = screen.getByRole('navigation', { name: 'GESTIÓN' });
    expect(within(nav).getAllByRole('link').map((a) => a.textContent?.trim())).toEqual([
      'Resumen',
      'Planes',
      'Ventas',
      'Liquidaciones',
      'Cuenta para dispersiones',
    ]);
    const pie = screen.getAllByRole('link', { name: 'Términos y privacidad' });
    expect(pie[0].getAttribute('href')).toBe('#/legal/terminos-agencias');
  });

  it('la barra superior dice dónde estás y que los pagos son de prueba', async () => {
    vi.mocked(miAgencia).mockResolvedValue(agencia());
    irA('/planes/nuevo');
    const { container } = render(Shell, { children });
    await screen.findAllByText('Aventuras Antioquia');
    expect(texto(container.querySelector('[data-migas]'))).toBe('Panel · Planes');
    expect(screen.getAllByText('Modo de prueba: los pagos no mueven dinero real').length).toBeGreaterThan(0);
  });

  it('fuera del menú (registro de la agencia) la ubicación es solo «Panel»', async () => {
    vi.mocked(miAgencia).mockResolvedValue(agencia());
    irA('/onboarding');
    const { container } = render(Shell, { children });
    await screen.findAllByText('Aventuras Antioquia');
    expect(texto(container.querySelector('[data-migas]'))).toBe('Panel');
  });

  it('«Saltar al contenido» lleva el foco al contenido sin cambiar la ruta', async () => {
    vi.mocked(miAgencia).mockResolvedValue(agencia());
    render(Shell, { children });
    await screen.findAllByText('Aventuras Antioquia');
    await fireEvent.click(screen.getByRole('button', { name: 'Saltar al contenido' }));
    expect(document.activeElement).toBe(screen.getByRole('main'));
    expect(window.location.hash).toBe('');
  });
});

describe('Shell · menú del usuario', () => {
  async function pintar(parcial = {}) {
    vi.mocked(miAgencia).mockResolvedValue(agencia({ nombre: 'Comuna 13 Graffiti Tours', ...parcial }));
    const r = render(Shell, { children });
    await screen.findAllByText('Comuna 13 Graffiti Tours');
    return r;
  }
  const boton = () => screen.getByRole('button', { name: /Comuna 13/ });

  it('arranca cerrado y muestra el nombre corto de la agencia', async () => {
    await pintar();
    expect(boton().textContent).toContain('Comuna 13');
    expect(boton().textContent).not.toContain('Graffiti');
    expect(boton().getAttribute('aria-expanded')).toBe('false');
    expect(boton().getAttribute('aria-haspopup')).toBe('true');
    expect(screen.queryByRole('button', { name: 'Cerrar sesión' })).toBeNull();
  });

  it('se abre con el botón y ofrece Términos y privacidad, tema y Cerrar sesión', async () => {
    await pintar();
    await fireEvent.click(boton());
    expect(boton().getAttribute('aria-expanded')).toBe('true');
    const menu = document.getElementById(boton().getAttribute('aria-controls')!)!;
    expect(menu.hasAttribute('hidden')).toBe(false);
    expect(within(menu).getByRole('link', { name: 'Términos y privacidad' }).getAttribute('href')).toBe(
      '#/legal/terminos-agencias',
    );
    expect(within(menu).getByRole('button', { name: 'Modo oscuro' })).toBeTruthy();
    await fireEvent.click(within(menu).getByRole('button', { name: 'Cerrar sesión' }));
    expect(signOut).toHaveBeenCalledTimes(1);
  });

  it('Escape lo cierra y devuelve el foco al botón', async () => {
    await pintar();
    await fireEvent.click(boton());
    await fireEvent.keyDown(document.body, { key: 'Escape' });
    expect(boton().getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(boton());
  });

  it('un clic dentro del menú lo deja abierto; fuera lo cierra', async () => {
    await pintar();
    await fireEvent.click(boton());
    const menu = document.getElementById(boton().getAttribute('aria-controls')!)!;
    await fireEvent.click(menu);
    expect(boton().getAttribute('aria-expanded')).toBe('true');
    await fireEvent.click(document.body);
    expect(boton().getAttribute('aria-expanded')).toBe('false');
  });

  it('al navegar a otra sección se cierra', async () => {
    await pintar();
    await fireEvent.click(boton());
    irA('/ventas');
    await tick();
    expect(boton().getAttribute('aria-expanded')).toBe('false');
  });
});

describe('Shell · tema', () => {
  afterEach(() => {
    document.documentElement.classList.remove('dark');
    localStorage.clear();
  });

  async function pintar() {
    vi.mocked(miAgencia).mockResolvedValue(agencia());
    render(Shell, { children });
    await screen.findAllByText('Aventuras Antioquia');
  }

  it('el botón de la barra alterna claro/oscuro, lo recuerda y lo anuncia con aria-pressed', async () => {
    document.documentElement.classList.remove('dark');
    await pintar();
    const tema = screen.getByRole('button', { name: 'Modo oscuro', pressed: false });
    await fireEvent.click(tema);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(localStorage.getItem('diverso-panel-theme')).toBe('dark');
    expect(tema.getAttribute('aria-pressed')).toBe('true');
    await fireEvent.click(tema);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(localStorage.getItem('diverso-panel-theme')).toBe('light');
    expect(tema.getAttribute('aria-pressed')).toBe('false');
  });

  it('el ítem del menú de usuario hace lo mismo y cambia su texto a «Modo claro»', async () => {
    document.documentElement.classList.remove('dark');
    await pintar();
    const usuario = screen.getByRole('button', { name: /Aventuras Antioquia/ });
    await fireEvent.click(usuario);
    const menu = document.getElementById(usuario.getAttribute('aria-controls')!)!;
    await fireEvent.click(within(menu).getByRole('button', { name: 'Modo oscuro' }));
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(within(menu).getByRole('button', { name: 'Modo claro' })).toBeTruthy();
  });
});

describe('Shell · móvil', () => {
  it('el botón de menú se abre y se cierra y anuncia su estado', async () => {
    vi.mocked(miAgencia).mockResolvedValue(agencia());
    render(Shell, { children });
    await screen.findAllByText('Aventuras Antioquia');
    const abrir = screen.getByRole('button', { name: 'Abrir menú' });
    expect(abrir.getAttribute('aria-expanded')).toBe('false');
    await fireEvent.click(abrir);
    const cerrar = screen.getByRole('button', { name: 'Cerrar menú' });
    expect(cerrar.getAttribute('aria-expanded')).toBe('true');
    await fireEvent.click(cerrar);
    expect(screen.getByRole('button', { name: 'Abrir menú' })).toBeTruthy();
  });
});

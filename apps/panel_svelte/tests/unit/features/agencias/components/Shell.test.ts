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
import { tema } from '$lib/shared/lib/tema.svelte';
import Shell from '$lib/features/agencias/components/Shell.svelte';
import { avisarCambioAgencia } from '$lib/features/agencias/model/cambios-agencia.svelte';

const children = createRawSnippet(() => ({ render: () => '<p>contenido de la página</p>' }));

afterEach(() => {
  cleanup(); // desmonta antes de reiniciar los mocks: el efecto de Shell vuelve a llamar a miAgencia
  vi.resetAllMocks();
  irA('/');
  tema.preferencia = 'sistema';
  document.documentElement.classList.remove('dark');
  localStorage.clear();
});

const SECCIONES = ['Resumen', 'Planes', 'Ventas', 'Liquidaciones', 'Cuenta para dispersiones'];
const RUTAS = ['#/dashboard', '#/planes', '#/ventas', '#/liquidaciones', '#/cuenta-dispersiones'];

/** Pinta el marco y espera a que cargue la agencia (el botón de la cuenta toma su nombre). */
async function pintar(parcial = {}) {
  vi.mocked(miAgencia).mockResolvedValue(agencia({ nombre: 'Comuna 13 Graffiti Tours', ...parcial }));
  const r = render(Shell, { children });
  await screen.findByRole('button', { name: 'Cuenta de Comuna 13 Graffiti Tours' });
  return r;
}
const seccionesNav = () => screen.getByRole('navigation', { name: 'Secciones del panel' });

describe('Shell · navegación', () => {
  it('ofrece Resumen, Planes, Ventas, Liquidaciones y Cuenta para dispersiones, en ese orden', async () => {
    await pintar();
    const enlaces = within(seccionesNav()).getAllByRole('link');
    expect(enlaces.map((a) => a.getAttribute('aria-label') ?? texto(a))).toEqual(SECCIONES);
    expect(enlaces.map((a) => a.getAttribute('href'))).toEqual(RUTAS);
  });

  it('la etiqueta corta «Cuenta» está en el enlace de Cuenta para dispersiones, que conserva el nombre completo', async () => {
    await pintar();
    const cuenta = within(seccionesNav()).getByRole('link', { name: 'Cuenta para dispersiones' });
    expect(within(cuenta).getByText('Cuenta')).toBeTruthy();
  });

  it('marca la sección activa también en el detalle de una liquidación', async () => {
    irA('/liquidaciones/liq-1');
    await pintar();
    const activos = screen.getAllByRole('link', { current: 'page' }).map((a) => a.getAttribute('href'));
    expect(activos).toEqual(['#/liquidaciones']);
  });

  it('fuera de las secciones (registro de la agencia) ninguna pestaña queda activa', async () => {
    irA('/onboarding');
    await pintar();
    expect(screen.queryAllByRole('link', { current: 'page' })).toEqual([]);
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
      await screen.findByRole('button', { name: 'Cuenta de Aventuras Antioquia' });
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

describe('Shell · barra superior', () => {
  it('lleva el colibrí real con «Diverso / Panel de agencias» y un solo enlace al Resumen desde la marca', async () => {
    const { container } = await pintar();
    expect(screen.getByText('Panel de agencias')).toBeTruthy();
    expect(screen.getAllByRole('link', { name: 'Diverso, panel de agencias, ir al resumen' }).map((a) => a.getAttribute('href'))).toEqual(['#/dashboard']);
    const marca = screen.getByRole('link', { name: 'Diverso, panel de agencias, ir al resumen' });
    expect(marca.querySelector('span[style*="logo_diverso.png"]')).toBeTruthy(); // el componente Logo, no una letra
    expect(texto(marca)).not.toMatch(/^D\b/);
    expect(container.querySelector('header')).toBeTruthy();
  });

  it('no hay migas ni riel lateral: la ubicación la dice la pestaña activa', async () => {
    irA('/planes/nuevo');
    const { container } = await pintar();
    expect(container.querySelector('[data-migas]')).toBeNull();
    expect(screen.queryByText('Panel · Planes')).toBeNull();
    expect(container.querySelector('aside')).toBeNull();
    expect(screen.queryByRole('group', { name: 'Agencia activa' })).toBeNull();
    expect(within(seccionesNav()).getByRole('link', { current: 'page' }).getAttribute('href')).toBe('#/planes');
  });

  it('la barra superior y las pestañas llevan solo decoración aria-hidden: nada de ruido para el lector de pantalla', async () => {
    const { container } = await pintar();
    const svgs = [...container.querySelectorAll('svg')].filter((s) => s.getAttribute('aria-hidden') !== 'true');
    expect(svgs).toEqual([]);
  });

  it('«Saltar al contenido» lleva el foco al contenido sin cambiar la ruta', async () => {
    await pintar();
    await fireEvent.click(screen.getByRole('button', { name: 'Saltar al contenido' }));
    expect(document.activeElement).toBe(screen.getByRole('main'));
    expect(window.location.hash).toBe('');
  });

  it('un solo «Modo de prueba»: ni en la franja ni en el contenido se repite', async () => {
    const { container } = await pintar();
    expect(container.querySelectorAll('.prueba')).toHaveLength(1);
    expect(screen.getAllByText(/Modo de prueba/)).toHaveLength(1);
    expect(texto(container.querySelector('.prueba'))).toBe('Modo de prueba: los pagos no mueven dinero real');
    expect(container.querySelector('.prueba')?.getAttribute('role')).toBe('status');
  });
});

describe('Shell · cuenta', () => {
  const boton = () => screen.getByRole('button', { name: 'Cuenta de Comuna 13 Graffiti Tours' });
  const panel = () => document.getElementById(boton().getAttribute('aria-controls')!)!;

  it('un solo botón de cuenta, cerrado al llegar', async () => {
    await pintar();
    expect(screen.getAllByRole('button', { name: /^Cuenta de / })).toHaveLength(1);
    expect(boton().getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByRole('button', { name: 'Cerrar sesión' })).toBeNull();
  });

  it('abierto: nombre y estado de la agencia (una vez), Términos y privacidad, tema y Cerrar sesión', async () => {
    await pintar();
    await fireEvent.click(boton());
    const menu = panel();
    expect(within(menu).getAllByText('Comuna 13 Graffiti Tours')).toHaveLength(1);
    expect(texto(menu)).toContain('Medellín');
    expect(within(menu).getByText('Verificada')).toBeTruthy();
    expect(within(menu).getByRole('link', { name: 'Términos y privacidad' }).getAttribute('href')).toBe('#/legal/terminos-agencias');
    await fireEvent.click(within(menu).getByRole('button', { name: 'Cerrar sesión' }));
    expect(signOut).toHaveBeenCalledTimes(1);
  });

  it('el estado de la agencia aparece una sola vez en todo el marco', async () => {
    await pintar();
    expect(screen.getAllByText('Verificada')).toHaveLength(1);
    expect(screen.getAllByText('Comuna 13 Graffiti Tours')).toHaveLength(1);
  });

  it('una agencia con la vigencia del RNT por vencer ve las dos píldoras dentro del menú', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 25, 12));
    try {
      await pintar({ rnt_vigente_hasta: '2026-11-10' });
      expect(screen.getByText('RNT por vencer')).toBeTruthy();
      expect(screen.getAllByText('RNT por vencer')).toHaveLength(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('el menú no repite las secciones: es de la cuenta (el perfil de la agencia y los Términos)', async () => {
    await pintar();
    await fireEvent.click(boton());
    expect(within(panel()).getAllByRole('link').map((a) => a.getAttribute('href'))).toEqual(['#/perfil', '#/legal/terminos-agencias']);
  });

  it('ofrece «Perfil de la agencia» (#/perfil) en el menú de cuenta y no como pestaña', async () => {
    const { container } = await pintar();
    await fireEvent.click(boton());
    expect(within(panel()).getByRole('link', { name: 'Perfil de la agencia' }).getAttribute('href')).toBe('#/perfil');
    expect(within(seccionesNav()).queryByRole('link', { name: /Perfil/ })).toBeNull();
    expect(container.querySelectorAll('a[href="#/perfil"]')).toHaveLength(1);
  });

  it('en /perfil el enlace del menú es la página actual y ninguna pestaña queda activa', async () => {
    irA('/perfil');
    await pintar();
    await fireEvent.click(boton());
    expect(within(panel()).getByRole('link', { name: 'Perfil de la agencia' }).getAttribute('aria-current')).toBe('page');
    expect(within(seccionesNav()).queryAllByRole('link', { current: 'page' })).toEqual([]);
  });

  it('con el teclado: se abre, el foco entra, Escape lo cierra y el foco vuelve al botón', async () => {
    await pintar();
    boton().focus();
    await fireEvent.keyDown(boton(), { key: 'ArrowDown' });
    await tick();
    expect(boton().getAttribute('aria-expanded')).toBe('true');
    expect(panel().contains(document.activeElement)).toBe(true);
    await fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
    expect(boton().getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(boton());
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
  it('hay UN solo control de tema (Sistema / Claro / Oscuro) en todo el marco, dentro del menú de cuenta', async () => {
    const { container } = await pintar();
    expect(screen.getAllByRole('radiogroup', { hidden: true })).toHaveLength(1);
    expect(screen.getAllByRole('radio', { hidden: true })).toHaveLength(3);
    expect(screen.queryByRole('button', { name: /modo (oscuro|claro)/i, hidden: true })).toBeNull();
    expect(container.querySelector('[aria-pressed]')).toBeNull(); // el interruptor de la barra de antes
    const boton = screen.getByRole('button', { name: 'Cuenta de Comuna 13 Graffiti Tours' });
    expect(document.getElementById(boton.getAttribute('aria-controls')!)!.contains(screen.getByRole('radiogroup', { hidden: true }))).toBe(true);
  });

  it('elegir «Oscuro» en el menú de cuenta pone la página en oscuro', async () => {
    await pintar();
    await fireEvent.click(screen.getByRole('button', { name: 'Cuenta de Comuna 13 Graffiti Tours' }));
    await fireEvent.click(screen.getByRole('radio', { name: 'Oscuro' }));
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(localStorage.getItem('diverso-panel-theme')).toBe('oscuro');
  });
});

describe('Shell · celular', () => {
  it('sin botón de hamburguesa: las cinco secciones están en una sola barra de navegación', async () => {
    await pintar();
    expect(screen.queryByRole('button', { name: /menú/i })).toBeNull();
    expect(screen.getAllByRole('navigation')).toHaveLength(1);
  });

  it('las secciones no se duplican en el marcado: cada una tiene un solo enlace', async () => {
    const { container } = await pintar();
    for (const ruta of RUTAS.slice(1)) expect(container.querySelectorAll(`a[href="${ruta}"]`)).toHaveLength(1);
    // el Resumen tiene además el enlace de la marca
    expect(container.querySelectorAll('a[href="#/dashboard"]')).toHaveLength(2);
  });

  it('esa barra se fija abajo en pantallas angostas, respeta la zona segura del teléfono y marca la sección actual', async () => {
    irA('/ventas');
    await pintar();
    const nav = seccionesNav();
    expect(nav.getAttribute('class')).toContain('max-lg:fixed');
    expect(nav.getAttribute('class')).toContain('max-lg:pb-[env(safe-area-inset-bottom)]');
    expect(within(nav).getAllByRole('link', { current: 'page' }).map((a) => a.getAttribute('href'))).toEqual(['#/ventas']);
  });

  it('el menú de cuenta se alcanza desde la barra superior, sin pasar por la navegación', async () => {
    const { container } = await pintar();
    const cabecera = container.querySelector('header')!;
    expect(within(cabecera).getByRole('button', { name: 'Cuenta de Comuna 13 Graffiti Tours' })).toBeTruthy();
  });

  it('el contenido deja sitio a la barra inferior', async () => {
    await pintar();
    expect(screen.getByRole('main').getAttribute('class')).toContain('max-lg:pb-[calc(84px+env(safe-area-inset-bottom))]');
  });
});

describe('cuando la agencia cambia dentro de una página', () => {
  it('el marco la vuelve a leer sin navegar: el logo nuevo del perfil se ve en el menú de cuenta', async () => {
    await pintar();
    const antes = vi.mocked(miAgencia).mock.calls.length;
    const logo = 'https://cdn.diverso.app/agency-logos/ag-1/nuevo.png';
    vi.mocked(miAgencia).mockResolvedValue(agencia({ nombre: 'Comuna 13 Graffiti Tours', logo_url: logo }));
    avisarCambioAgencia();
    await vi.waitFor(() => expect(document.querySelector(`img[src="${logo}"]`)).not.toBeNull());
    expect(vi.mocked(miAgencia).mock.calls.length).toBe(antes + 1);
  });
});

describe('lecturas de la agencia que se cruzan', () => {
  it('una respuesta vieja que llega tarde no pisa a la nueva: queda el logo nuevo', async () => {
    await pintar();
    const viejo = 'https://cdn.diverso.app/agency-logos/ag-1/viejo.png';
    const nuevo = 'https://cdn.diverso.app/agency-logos/ag-1/nuevo.png';
    let soltarVieja!: (a: unknown) => void;
    vi.mocked(miAgencia)
      .mockImplementationOnce(() => new Promise((r) => (soltarVieja = r as (a: unknown) => void)) as never)
      .mockResolvedValueOnce(agencia({ nombre: 'Comuna 13 Graffiti Tours', logo_url: nuevo }));
    avisarCambioAgencia(); // primera lectura: queda colgada
    await tick();
    avisarCambioAgencia(); // segunda lectura: responde enseguida con el logo nuevo
    await vi.waitFor(() => expect(document.querySelector(`img[src="${nuevo}"]`)).not.toBeNull());
    soltarVieja(agencia({ nombre: 'Comuna 13 Graffiti Tours', logo_url: viejo }));
    await new Promise((r) => setTimeout(r, 0));
    await tick();
    expect(document.querySelector(`img[src="${viejo}"]`)).toBeNull();
    expect(document.querySelector(`img[src="${nuevo}"]`)).not.toBeNull();
  });
});

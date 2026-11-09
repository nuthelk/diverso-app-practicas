import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRawSnippet, tick } from 'svelte';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/svelte';

vi.mock('$app/state', () => import('$tests/pagina-falsa.svelte'));
vi.mock('$lib/features/auth/model/auth.svelte', () => ({
  auth: { userId: 'u-1', email: 'agencia@diverso.app' },
  signOut: vi.fn(),
}));

import { irA } from '$tests/pagina-falsa.svelte';
import { signOut } from '$lib/features/auth/model/auth.svelte';
import { CLAVE_TEMA, tema } from '$lib/shared/lib/tema.svelte';
import MenuCuenta from '$lib/features/auth/components/MenuCuenta.svelte';

const estado = createRawSnippet(() => ({ render: () => '<span>Medellín · Verificada</span>' }));

beforeEach(() => {
  tema.preferencia = 'sistema';
  document.documentElement.classList.remove('dark');
  localStorage.clear();
});
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
  irA('/');
  document.documentElement.classList.remove('dark');
  localStorage.clear();
});

const pintar = (props: Record<string, unknown> = {}) => render(MenuCuenta, { titulo: 'Comuna 13 Graffiti Tours', estado, ...props });
const boton = () => screen.getByRole('button', { name: 'Cuenta de Comuna 13 Graffiti Tours' });
const panel = () => document.getElementById(boton().getAttribute('aria-controls')!)!;

describe('MenuCuenta', () => {
  it('arranca cerrado; el botón se llama «Cuenta de» + el título y apunta a su panel', () => {
    pintar();
    expect(boton().getAttribute('aria-expanded')).toBe('false');
    expect(panel().hasAttribute('hidden')).toBe(true);
    expect(screen.queryByRole('button', { name: 'Cerrar sesión' })).toBeNull();
  });

  it('sin título se llama solo «Cuenta»', () => {
    pintar({ titulo: '' });
    expect(screen.getByRole('button', { name: 'Cuenta' })).toBeTruthy();
  });

  it('abierto muestra el título una vez, el estado que le pasen, Términos y privacidad, el tema y Cerrar sesión', async () => {
    pintar();
    await fireEvent.click(boton());
    expect(boton().getAttribute('aria-expanded')).toBe('true');
    expect(panel().hasAttribute('hidden')).toBe(false);
    expect(within(panel()).getAllByText('Comuna 13 Graffiti Tours')).toHaveLength(1);
    expect(within(panel()).getByText('Medellín · Verificada')).toBeTruthy();
    expect(within(panel()).getByRole('link', { name: 'Términos y privacidad' }).getAttribute('href')).toBe('#/legal/terminos-agencias');
    expect(within(panel()).getByRole('radiogroup', { name: 'Tema' })).toBeTruthy();
    expect(within(panel()).getByRole('button', { name: 'Cerrar sesión' })).toBeTruthy();
  });

  it('no repite las secciones del panel: el menú es de la cuenta, no una segunda navegación', async () => {
    pintar();
    await fireEvent.click(boton());
    const enlaces = within(panel()).getAllByRole('link').map((a) => a.getAttribute('href'));
    expect(enlaces).toEqual(['#/legal/terminos-agencias']);
  });

  it('al abrir lleva el foco a su primer control', async () => {
    pintar();
    await fireEvent.click(boton());
    await tick();
    expect(document.activeElement).toBe(within(panel()).getByRole('link', { name: 'Términos y privacidad' }));
  });

  it('ArrowDown en el botón lo abre', async () => {
    pintar();
    await fireEvent.keyDown(boton(), { key: 'ArrowDown' });
    expect(boton().getAttribute('aria-expanded')).toBe('true');
  });

  it('Escape lo cierra y devuelve el foco al botón', async () => {
    pintar();
    await fireEvent.click(boton());
    await tick();
    await fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
    expect(boton().getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(boton());
  });

  it('Escape con el menú cerrado no roba el foco', async () => {
    pintar();
    const otro = document.createElement('input');
    document.body.appendChild(otro);
    otro.focus();
    await fireEvent.keyDown(otro, { key: 'Escape' });
    expect(document.activeElement).toBe(otro);
    otro.remove();
  });

  it('un clic dentro lo deja abierto; fuera lo cierra', async () => {
    pintar();
    await fireEvent.click(boton());
    await fireEvent.click(panel());
    expect(boton().getAttribute('aria-expanded')).toBe('true');
    await fireEvent.click(document.body);
    expect(boton().getAttribute('aria-expanded')).toBe('false');
  });

  it('si el foco sale del menú (Tab) se cierra', async () => {
    pintar();
    await fireEvent.click(boton());
    await tick();
    await fireEvent.focusOut(document.activeElement!, { relatedTarget: document.body });
    expect(boton().getAttribute('aria-expanded')).toBe('false');
  });

  it('al navegar a otra ruta se cierra', async () => {
    pintar();
    await fireEvent.click(boton());
    irA('/ventas');
    await tick();
    expect(boton().getAttribute('aria-expanded')).toBe('false');
  });

  it('Cerrar sesión cierra el menú y cierra la sesión', async () => {
    pintar();
    await fireEvent.click(boton());
    await fireEvent.click(within(panel()).getByRole('button', { name: 'Cerrar sesión' }));
    expect(signOut).toHaveBeenCalledTimes(1);
    expect(boton().getAttribute('aria-expanded')).toBe('false');
  });
});

describe('MenuCuenta · enlaces propios', () => {
  const PERFIL = [{ ruta: '/perfil', texto: 'Perfil de la agencia', icono: 'M3 21h18' }];
  const enlaces = () => within(panel()).getAllByRole('link').map((a) => a.getAttribute('href'));

  it('con enlaces los muestra arriba de Términos y privacidad, apuntando a la ruta del panel', async () => {
    pintar({ enlaces: PERFIL });
    await fireEvent.click(boton());
    expect(enlaces()).toEqual(['#/perfil', '#/legal/terminos-agencias']);
    expect(within(panel()).getByRole('link', { name: 'Perfil de la agencia' })).toBeTruthy();
  });

  it('sin enlaces (el admin) no aparece ninguno propio', async () => {
    pintar();
    await fireEvent.click(boton());
    expect(within(panel()).queryByRole('link', { name: 'Perfil de la agencia' })).toBeNull();
    expect(enlaces()).toEqual(['#/legal/terminos-agencias']);
  });

  it('marca aria-current="page" solo en la ruta en la que estás', async () => {
    pintar({ enlaces: PERFIL });
    await fireEvent.click(boton());
    expect(within(panel()).getByRole('link', { name: 'Perfil de la agencia' }).hasAttribute('aria-current')).toBe(false);
    irA('/perfil');
    await tick();
    await fireEvent.click(boton());
    expect(within(panel()).getByRole('link', { name: 'Perfil de la agencia' }).getAttribute('aria-current')).toBe('page');
    expect(within(panel()).getByRole('link', { name: 'Términos y privacidad' }).hasAttribute('aria-current')).toBe(false);
  });

  it('al abrir, el foco entra por el primer enlace propio', async () => {
    pintar({ enlaces: PERFIL });
    await fireEvent.click(boton());
    await tick();
    expect(document.activeElement).toBe(within(panel()).getByRole('link', { name: 'Perfil de la agencia' }));
  });
});

describe('MenuCuenta · tema', () => {
  const radio = (nombre: string) => within(panel()).getByRole('radio', { name: nombre });

  it('ofrece Sistema / Claro / Oscuro como radios y marca la preferencia actual', async () => {
    tema.preferencia = 'oscuro';
    pintar();
    await fireEvent.click(boton());
    expect(within(panel()).getAllByRole('radio').map((r) => r.textContent?.trim())).toEqual(['Sistema', 'Claro', 'Oscuro']);
    expect(radio('Oscuro').getAttribute('aria-checked')).toBe('true');
    expect(radio('Sistema').getAttribute('aria-checked')).toBe('false');
  });

  it('elegir un tema lo aplica a la página, lo guarda y deja el menú abierto', async () => {
    pintar();
    await fireEvent.click(boton());
    await fireEvent.click(radio('Oscuro'));
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(localStorage.getItem(CLAVE_TEMA)).toBe('oscuro');
    expect(radio('Oscuro').getAttribute('aria-checked')).toBe('true');
    expect(boton().getAttribute('aria-expanded')).toBe('true');
    await fireEvent.click(radio('Claro'));
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(localStorage.getItem(CLAVE_TEMA)).toBe('claro');
  });

  it('las flechas sobre el grupo cambian de tema', async () => {
    pintar();
    await fireEvent.click(boton());
    await fireEvent.keyDown(radio('Sistema'), { key: 'ArrowRight' });
    expect(tema.preferencia).toBe('claro');
    expect(radio('Claro').getAttribute('aria-checked')).toBe('true');
  });
});

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup } from '@testing-library/react';
import { renderConRuta } from '@tests/render';
import AnunciadorRuta from '@/app/AnunciadorRuta';

// Prueba nueva de la migración: SvelteKit traía de serie su anunciador de rutas (`#svelte-announcer`) y React Router
// no. Aquí se fija que el reemplazo se comporta igual: callado al cargar y anuncia el título tras cada navegación.
const TITULO = 'Diverso — Panel de Agencias';

beforeEach(() => {
  document.title = TITULO;
});
afterEach(() => {
  cleanup();
  document.title = '';
});

function anunciador() {
  const el = document.getElementById('anunciador-ruta');
  if (!el) throw new Error('No se encontró el anunciador de rutas');
  return el;
}

describe('AnunciadorRuta', () => {
  it('es una región viva asertiva y atómica, oculta a la vista', () => {
    renderConRuta(<AnunciadorRuta />);
    const el = anunciador();
    expect(el.getAttribute('aria-live')).toBe('assertive');
    expect(el.getAttribute('aria-atomic')).toBe('true');
    expect(el.style.position).toBe('absolute');
    expect(el.style.width).toBe('1px');
    expect(el.style.height).toBe('1px');
  });

  it('en la primera carga no anuncia nada', () => {
    renderConRuta(<AnunciadorRuta />, { ruta: '/planes' });
    expect(anunciador().textContent).toBe('');
  });

  it('al navegar a otra ruta anuncia el título del documento', async () => {
    const { irA } = renderConRuta(<AnunciadorRuta />);
    await irA('/otra');
    expect(anunciador().textContent).toBe(TITULO);
  });

  it('sin título anuncia «untitled page», como SvelteKit', async () => {
    document.title = '';
    const { irA } = renderConRuta(<AnunciadorRuta />);
    await irA('/otra');
    expect(anunciador().textContent).toBe('untitled page');
  });
});

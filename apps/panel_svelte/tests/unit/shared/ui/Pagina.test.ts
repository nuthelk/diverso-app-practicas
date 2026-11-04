import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import Pagina, { ANCHO_DATOS } from '$lib/shared/ui/Pagina.svelte';
import EsqueletoPagina from '$lib/shared/ui/EsqueletoPagina.svelte';

const contenido = createRawSnippet(() => ({ render: () => '<p>cuerpo</p>' }));
const tope = (c: HTMLElement) => (c.querySelector('.mx-auto') as HTMLElement).style.maxWidth;

afterEach(cleanup);

describe('Pagina', () => {
  it('las pantallas de datos llenan el ancho: sin tope por debajo de 1920 px', () => {
    expect(ANCHO_DATOS).toBe(1920);
    const { container } = render(Pagina, { children: contenido });
    expect(tope(container)).toBe('1920px');
  });

  it('un formulario o texto de lectura pasa su propio ancho legible', () => {
    const { container } = render(Pagina, { ancho: 760, children: contenido });
    expect(tope(container)).toBe('760px');
  });

  it('el esqueleto de carga ocupa el mismo ancho que la pantalla (no salta al cargar)', () => {
    expect(tope(render(EsqueletoPagina).container)).toBe('1920px');
    cleanup();
    expect(tope(render(EsqueletoPagina, { ancho: 640 }).container)).toBe('640px');
  });
});

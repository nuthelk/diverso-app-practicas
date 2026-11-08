import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/svelte';
import Curvas from '$lib/shared/ui/Curvas.svelte';
import Helecho from '$lib/shared/ui/Helecho.svelte';
import Heliconia from '$lib/shared/ui/Heliconia.svelte';
import Bruma from '$lib/shared/ui/Bruma.svelte';
import MarcaTile from '$lib/shared/ui/MarcaTile.svelte';
import Avatar from '$lib/shared/ui/Avatar.svelte';

// Curvas de nivel, helecho, heliconia y niebla son adorno: ni el lector de pantalla ni el teclado los ven, y no pesan.
const fuentes = import.meta.glob('/src/lib/shared/ui/{Curvas,Helecho,Heliconia,Bruma}.svelte', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

afterEach(cleanup);

describe('decoraciones', () => {
  it.each([
    ['Curvas', Curvas],
    ['Helecho', Helecho],
    ['Heliconia', Heliconia],
    ['Bruma', Bruma],
  ])('%s es decorativa: aria-hidden, sin foco y sin captar el puntero', (_nombre, Componente) => {
    const { container } = render(Componente, { clase: 'extra' });
    const el = container.firstElementChild!;
    expect(el.getAttribute('aria-hidden')).toBe('true');
    expect(el.getAttribute('class')).toContain('pointer-events-none');
    expect(el.getAttribute('class')).toContain('extra');
    if (el.tagName.toLowerCase() === 'svg') {
      expect(el.getAttribute('focusable')).toBe('false');
      expect(el.querySelector('title')).toBeNull();
    }
    expect(container.querySelectorAll('a, button, [tabindex]')).toHaveLength(0);
  });

  it('Curvas dibuja contornos distintos para una cabecera ancha y para una columna alta, teñidos con currentColor', () => {
    const ancho = render(Curvas).container.querySelector('svg')!;
    const alto = render(Curvas, { forma: 'alto' }).container.querySelector('svg')!;
    expect(ancho.getAttribute('viewBox')).toBe('0 0 600 300');
    expect(alto.getAttribute('viewBox')).toBe('0 0 240 300');
    expect(ancho.getAttribute('stroke')).toBe('currentColor');
    expect(ancho.querySelectorAll('path').length).toBeGreaterThanOrEqual(5);
    expect(ancho.querySelector('path')!.getAttribute('d')).not.toBe(alto.querySelector('path')!.getAttribute('d'));
  });

  it('son ligeras: cada una pesa menos de 4 KB de código fuente (las curvas del artboard pesaban 15 KB)', () => {
    expect(Object.keys(fuentes)).toHaveLength(4);
    for (const [ruta, fuente] of Object.entries(fuentes)) expect(fuente.length, ruta).toBeLessThan(4096);
  });
});

describe('MarcaTile y Avatar con la forma «brote» del bosque', () => {
  it('MarcaTile: colibrí sobre el verde del monte, esquina brote', () => {
    const { container } = render(MarcaTile, { tam: 40 });
    const tile = container.firstElementChild as HTMLElement;
    expect(tile.className).toContain('bg-bosque');
    expect(tile.className).toContain('rounded-brote');
    expect(tile.style.width).toBe('40px');
  });

  it('Avatar: iniciales en la sans de la interfaz, helecho de fondo y esquina brote', () => {
    const { container } = render(Avatar, { iniciales: 'Río y Selva Colombia' });
    const av = container.firstElementChild as HTMLElement;
    expect(av.textContent).toBe('RY');
    expect(av.className).not.toContain('font-titulo');
    expect(av.className).toContain('bg-helecho');
    expect(av.className).toContain('rounded-brote');
  });
});

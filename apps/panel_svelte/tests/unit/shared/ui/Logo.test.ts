import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/svelte';
import Logo from '$lib/shared/ui/Logo.svelte';

function logo(props: { size?: number; clase?: string } = {}): HTMLElement {
  const { container } = render(Logo, props);
  return container.firstElementChild as HTMLElement;
}

describe('Logo', () => {
  it('mide 22 px por defecto y es decorativo', () => {
    const el = logo();
    const estilo = el.getAttribute('style') ?? '';
    expect(estilo).toContain('width: 22px');
    expect(estilo).toContain('height: 22px');
    expect(el.getAttribute('aria-hidden')).toBe('true');
  });

  it('respeta el tamaño y la clase del llamador', () => {
    const el = logo({ size: 28, clase: 'text-white' });
    const estilo = el.getAttribute('style') ?? '';
    expect(estilo).toContain('width: 28px');
    expect(estilo).toContain('height: 28px');
    expect(el.className).toContain('text-white');
  });

  it('pinta la máscara del colibrí con el color del texto', () => {
    const estilo = logo().getAttribute('style') ?? '';
    expect(estilo.toLowerCase()).toContain('background-color: currentcolor');
    expect(estilo).toContain('mask: url(/logo_diverso.png)');
  });

  it('la máscara servida es la misma que la de la app Flutter', () => {
    const panel = readFileSync('static/logo_diverso.png');
    const maestra = readFileSync('../../packages/diverso_core/assets/logo_diverso.png');
    expect(panel.equals(maestra)).toBe(true);
  });

  it('ya no dibuja la golondrina en SVG', () => {
    expect(logo().querySelector('svg, path')).toBeNull();
  });
});

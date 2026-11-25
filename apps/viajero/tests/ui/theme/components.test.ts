import { lightTheme, darkTheme, type Theme } from '@/ui/theme';

/** Contraste WCAG entre dos colores opacos (misma fórmula que el test Flutter del bug U). */
function luminance(hex: string): number {
  const n = parseInt(hex.slice(1, 7), 16);
  const channel = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}
function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

const themes: [string, Theme][] = [
  ['claro', lightTheme],
  ['oscuro', darkTheme],
];

describe.each(themes)('componentes del tema (%s)', (_name, theme) => {
  const c = theme.components;
  const cs = theme.colorScheme;

  // Port de cabeceras_test «causa raíz: el AppBar del tema es opaco».
  it('AppBar: fondo sólido del color de la página, sin tinte', () => {
    expect(c.appBar.backgroundColor).toBe(theme.pageBackground);
    expect(c.appBar.backgroundColor).toMatch(/^#[0-9A-F]{6}$/);
    expect(c.appBar.surfaceTintColor).toBe('transparent');
    expect(c.appBar.titleSpacing).toBe(20);
    expect(c.appBar.toolbarHeight).toBe(56);
    expect(c.appBar.title).toEqual({
      fontSize: 15,
      fontWeight: '700',
      letterSpacing: -0.2,
      color: cs.onSurface,
    });
  });

  it('NavigationBar: alto 72, fondo surfaceContainerLowest, indicador primaryContainer, íconos 28', () => {
    expect(c.navigationBar.height).toBe(72);
    expect(c.navigationBar.backgroundColor).toBe(cs.surfaceContainerLowest);
    expect(c.navigationBar.indicatorColor).toBe(cs.primaryContainer);
    expect(c.navigationBar.iconSize).toBe(28);
    expect(c.navigationBar.selectedColor).toBe(cs.primary);
    expect(c.navigationBar.unselectedColor).toBe(cs.onSurfaceVariant);
    expect(c.navigationBar.label).toEqual({ fontSize: 12, selectedWeight: '700', weight: '600' });
  });

  it('Divider: outlineVariant al 50 %, 1 px', () => {
    expect(c.divider.height).toBe(1);
    expect(c.divider.color).toMatch(/^rgba\(\d+, \d+, \d+, 0\.5\)$/);
  });

  it('Input: relleno negro 4 % (claro) / blanco 5 % (oscuro); foco primary 1.6; error 1.2', () => {
    expect(c.input.fillColor).toBe(
      theme.brightness === 'light' ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.05)',
    );
    expect(c.input.focusBorder).toEqual({ color: cs.primary, width: 1.6 });
    expect(c.input.errorBorder).toEqual({ color: cs.error, width: 1.2 });
    expect(c.input.focusErrorBorder).toEqual({ color: cs.error, width: 1.6 });
  });

  // Port de chip_filtro_contraste_test (bug U): el chip de filtro es transparente sobre la página,
  // así que el texto (onSurface) y el ícono de borrar (onSurfaceVariant) se miden contra ella.
  it('chip de filtro activo: texto e ícono de borrar con contraste AA (4.5:1)', () => {
    expect(c.chip.backgroundColor).toBe('transparent');
    expect(c.chip.label.color).toBe(cs.onSurface);
    expect(contrast(c.chip.label.color, theme.pageBackground)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(c.chip.deleteIconColor, theme.pageBackground)).toBeGreaterThanOrEqual(4.5);
  });
});

import { describe, expect, it } from 'vitest';

// Planes usa solo la escala y los radios de app.css: nada de tamaños o radios sueltos, serif, bordes punteados ni emojis.
const fuentes = import.meta.glob('/src/lib/features/planes/**/*.svelte', { query: '?raw', import: 'default', eager: true }) as Record<
  string,
  string
>;

const rutas = Object.keys(fuentes);

describe('Planes · sistema de diseño', () => {
  it('encuentra las pantallas y componentes de la feature', () => {
    expect(rutas.length).toBeGreaterThanOrEqual(12);
  });

  it.each([
    ['tamaños de letra sueltos', /text-\[\d/],
    ['radios sueltos', /rounded-\[|rounded-full|rounded-(sm|md|lg|xl|2xl|3xl)\b/],
    ['la serif de títulos', /font-titulo/],
    ['bordes punteados', /border-dashed/],
    ['emojis', /\p{Extended_Pictographic}/u],
  ])('ningún archivo usa %s', (_nombre, patron) => {
    const infractores = rutas.filter((r) => patron.test(fuentes[r]));
    expect(infractores).toEqual([]);
  });
});

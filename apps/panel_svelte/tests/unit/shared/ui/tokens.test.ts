import { describe, expect, it } from 'vitest';
// @ts-expect-error la app no depende de @types/node; vitest corre en Node y resuelve el módulo igual
import { readFileSync } from 'node:fs';

// (vitest vacía los `?raw` de CSS, así que se leen del disco; las pruebas corren desde la raíz de la app)
const css = readFileSync('src/app.css', 'utf8');
const fuentes = readFileSync('src/fuentes.css', 'utf8');

// `app.css` es la única fuente de los tokens visuales (paleta «Bosque de niebla», claro y oscuro). Aquí se fijan los
// nombres del artboard, que cada tema los defina todos y que los pares de texto/fondo del Shell lleguen a AA.

function bloque(selector: string): Record<string, string> {
  const inicio = css.search(new RegExp(String.raw`^${selector.replace('.', String.raw`\.`)} \{`, 'm'));
  expect(inicio, `bloque ${selector}`).toBeGreaterThanOrEqual(0);
  const cuerpo = css.slice(css.indexOf('{', inicio) + 1, css.indexOf('\n}', inicio));
  return Object.fromEntries([...cuerpo.matchAll(/--([\w-]+):\s*([^;]+);/g)].map((x) => [x[1], x[2].trim()]));
}

const claro = bloque(':root');
const oscuro = bloque('.dark');

const NOMBRES = [
  'niebla', 'niebla-2', 'superficie', 'linea', 'contorno', 'tinta', 'tinta-2', 'tinta-3', 'bosque', 'bosque-2',
  'sobre-bosque', 'sobre-bosque-2', 'helecho', 'sobre-helecho', 'musgo', 'relleno', 'heliconia', 'sobre-heliconia',
  'heliconia-bg', 'pico', 'prueba-bg', 'prueba-ink', 'foco', 'foco-bosque', 'bruma',
];

const luz = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contraste = (a: string, b: string) => {
  const [x, y] = [luz(a), luz(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

describe('tokens de app.css', () => {
  it('claro y oscuro definen cada token del artboard 02', () => {
    for (const n of NOMBRES) {
      expect(claro[n], `claro --${n}`).toBeTruthy();
      expect(oscuro[n], `oscuro --${n}`).toBeTruthy();
    }
  });

  it('los valores son los del bloque «Tokens propuestos» del artboard (muestra en ambos temas)', () => {
    expect([claro.niebla, claro.bosque, claro.helecho, claro.heliconia, claro['prueba-bg']]).toEqual(['#edf0ea', '#1d382a', '#3a6b43', '#b5361e', '#f4e8c6']);
    expect([oscuro.niebla, oscuro.bosque, oscuro.helecho, oscuro.heliconia, oscuro['prueba-bg']]).toEqual(['#0e1612', '#08100c', '#8fcb93', '#ff8f70', '#3a3116']);
  });

  const TEXTO: [string, string][] = [
    ['tinta', 'niebla'], ['tinta', 'superficie'], ['tinta-2', 'niebla'], ['tinta-2', 'niebla-2'], ['tinta-2', 'superficie'],
    ['tinta-3', 'superficie'], ['tinta-3', 'niebla'], ['sobre-bosque', 'bosque'], ['sobre-bosque-2', 'bosque'], ['sobre-bosque', 'bosque-2'],
    ['sobre-bosque-2', 'bosque-2'], ['sobre-helecho', 'helecho'], ['helecho', 'superficie'], ['helecho', 'niebla'], ['sobre-heliconia', 'heliconia'],
    ['heliconia', 'heliconia-bg'], ['heliconia', 'niebla'], ['prueba-ink', 'prueba-bg'], ['pico', 'superficie'], ['tinta', 'relleno'],
  ];
  const CONTROLES: [string, string][] = [['contorno', 'superficie'], ['contorno', 'niebla'], ['foco', 'niebla'], ['foco-bosque', 'bosque']];

  for (const [tema, t] of [['claro', claro], ['oscuro', oscuro]] as const) {
    it(`${tema}: el texto llega a AA (4,5:1) en los pares del Shell y de las tarjetas`, () => {
      const bajos = TEXTO.map(([f, b]) => [f, b, contraste(t[f], t[b])] as const).filter(([, , c]) => c < 4.5);
      expect(bajos).toEqual([]);
    });
    it(`${tema}: bordes de controles y anillo de foco llegan a 3:1`, () => {
      const bajos = CONTROLES.map(([f, b]) => [f, b, contraste(t[f], t[b])] as const).filter(([, , c]) => c < 3);
      expect(bajos).toEqual([]);
    });
  }

  it('los nombres antiguos (suave, hover, ok-ink…) son alias de los tokens, no colores sueltos', () => {
    const alias = [...css.matchAll(/--(suave|hover|pista|barra|acento-ink|ok-ink|alert-ink|error-ink):\s*([^;]+);/g)].map((m) => m[2].trim());
    expect(alias.length).toBe(8);
    expect(alias.every((v) => v.startsWith('var(--'))).toBe(true);
  });
});

describe('tipografías', () => {
  it('títulos en Newsreader y texto en Atkinson Hyperlegible Next, con las pilas de respaldo del artboard', () => {
    expect(css).toMatch(/--font-sans:\s*"Atkinson Hyperlegible Next", Calibri/);
    expect(css).toMatch(/--font-titulo:\s*"Newsreader", Constantia/);
    expect(css).toMatch(/h1,\s*h2,\s*h3,\s*h4 \{\s*font-family: var\(--font-titulo\)/);
    expect(css).toContain('lining-nums');
  });

  it('autoalojadas: solo woff2 de @fontsource, latin y latin-ext, con font-display: swap', () => {
    const caras = fuentes.match(/@font-face \{[\s\S]*?\n\}/g)!;
    expect(caras.length).toBe(10); // Newsreader 700 + 400 cursiva, Atkinson 400/600/700 × latin y latin-ext
    for (const c of caras) {
      expect(c).toContain('font-display: swap');
      expect(c).toMatch(/url\('@fontsource\/(newsreader|atkinson-hyperlegible-next)\/files\/[\w-]+-(latin|latin-ext)-\d+-(normal|italic)\.woff2'\) format\('woff2'\)/);
      expect(c).toContain('unicode-range');
      expect(c).not.toMatch(/\.woff['")]/);
    }
  });
});

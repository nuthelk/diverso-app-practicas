import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  colorDeAgencia,
  inicialesAgencia,
  LOGO_MAX_BYTES,
  rutaDeLogo,
  rutaNuevaLogo,
  validarLogo,
} from '$lib/features/agencias/model/logo';

const MB = 1024 * 1024;

describe('validarLogo', () => {
  it.each(['image/png', 'image/jpeg', 'image/webp'])('acepta %s', (type) => {
    expect(validarLogo({ type, size: 500 * 1024 })).toBeNull();
  });

  it('acepta justo 2 MB y rechaza un byte más', () => {
    expect(LOGO_MAX_BYTES).toBe(2 * MB);
    expect(validarLogo({ type: 'image/png', size: 2 * MB })).toBeNull();
    expect(validarLogo({ type: 'image/png', size: 2 * MB + 1 })).toBe(
      'El logo pesa 2.0 MB y el máximo es 2 MB. Elige una imagen más liviana.',
    );
  });

  it('muestra el peso real con un decimal', () => {
    expect(validarLogo({ type: 'image/jpeg', size: 5.26 * MB })).toBe(
      'El logo pesa 5.3 MB y el máximo es 2 MB. Elige una imagen más liviana.',
    );
  });

  it.each(['image/svg+xml', 'image/gif', 'application/pdf', 'text/html', ''])('rechaza %j', (type) => {
    expect(validarLogo({ type, size: 1000 })).toBe('El logo debe ser una imagen PNG, JPG o WebP.');
  });

  it('rechaza un archivo vacío', () => {
    expect(validarLogo({ type: 'image/png', size: 0 })).toBe('El archivo está vacío. Elige otra imagen.');
  });

  it('el tipo se revisa antes que el peso', () => {
    expect(validarLogo({ type: 'image/gif', size: 10 * MB })).toBe('El logo debe ser una imagen PNG, JPG o WebP.');
  });
});

describe('rutaNuevaLogo', () => {
  afterEach(() => vi.useRealTimers());

  it('va en la carpeta de la agencia con la extensión del tipo', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-25T12:00:00Z'));
    const base = 'ag-1/logo-' + new Date('2026-10-25T12:00:00Z').getTime().toString(36);
    expect(rutaNuevaLogo('ag-1', 'image/png')).toBe(base + '.png');
    expect(rutaNuevaLogo('ag-1', 'image/jpeg')).toBe(base + '.jpg');
    expect(rutaNuevaLogo('ag-1', 'image/webp')).toBe(base + '.webp');
  });

  it('cada subida tiene un nombre distinto (rompe la caché del navegador)', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(1_800_000_000_000);
    const a = rutaNuevaLogo('ag-1', 'image/png');
    vi.setSystemTime(1_800_000_000_001);
    expect(rutaNuevaLogo('ag-1', 'image/png')).not.toBe(a);
  });
});

describe('rutaDeLogo', () => {
  const url = (ruta: string) => `http://127.0.0.1:54331/storage/v1/object/public/agency-logos/${ruta}`;

  it('devuelve la ruta del objeto si está en la carpeta de la agencia', () => {
    expect(rutaDeLogo(url('ag-1/logo-abc.png'), 'ag-1')).toBe('ag-1/logo-abc.png');
  });

  it.each([
    ['sin logo', null],
    ['vacío', ''],
    ['una URL externa', 'https://logos.test/ag-1/logo.png'],
    ['la carpeta de otra agencia', url('ag-2/logo-abc.png')],
    ['otro bucket', 'http://x/storage/v1/object/public/plan-photos/ag-1/logo.png'],
    ['con parámetros', url('ag-1/logo-abc.png?x=1')],
  ])('devuelve null para %s', (_caso, valor) => {
    expect(rutaDeLogo(valor, 'ag-1')).toBeNull();
  });
});

describe('iniciales y color (igual que la app del viajero)', () => {
  it.each([
    ['Aventuras Antioquia', 'AA'],
    ['Rutas de Antioquia Cultural', 'RA'], // sin conectores
    ['Graffiti', 'GR'],
    ['  ', '?'],
    ['x', 'X'],
  ])('%j → %s', (nombre, esperado) => {
    expect(inicialesAgencia(nombre)).toBe(esperado);
  });

  it('el color es estable por id y sale de la paleta de la marca', () => {
    expect(colorDeAgencia('ag-1')).toBe(colorDeAgencia('ag-1'));
    expect(colorDeAgencia('ag-1')).toMatch(/^#[0-9A-F]{6}$/);
    const colores = new Set(Array.from({ length: 40 }, (_, i) => colorDeAgencia('agencia-' + i)));
    expect(colores.size).toBeGreaterThan(3);
    expect(colores.size).toBeLessThanOrEqual(8);
  });

  it('coincide con la paleta FNV-1a de la app (valor conocido)', () => {
    // FNV-1a 32 bits de "a" = 0xE40C292C; 0xE40C292C % 8 = 4 → lago.
    expect(colorDeAgencia('a')).toBe('#1F6F7A');
  });
});

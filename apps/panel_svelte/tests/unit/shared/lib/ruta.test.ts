import { describe, expect, it } from 'vitest';
import { rutaActual } from '$lib/shared/lib/ruta';

describe('rutaActual', () => {
  it.each([
    ['http://localhost/#/planes', '/planes'],
    ['http://localhost/#/planes/editar/p-1', '/planes/editar/p-1'],
    ['http://localhost/#/ventas?mes=10', '/ventas'],
    ['http://localhost/#/legal/privacidad#datos', '/legal/privacidad'],
    ['http://localhost/#/', '/'],
    ['http://localhost/', '/'],
    ['http://localhost/#', '/'],
  ])('%s → %s', (url, ruta) => {
    expect(rutaActual(new URL(url))).toBe(ruta);
  });
});

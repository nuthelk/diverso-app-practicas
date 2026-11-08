import { describe, expect, it } from 'vitest';
import { destinoVolver } from '$lib/features/legal/model/volver';

describe('destinoVolver', () => {
  it('con historial en la pestaña vuelve atrás, haya o no sesión', () => {
    expect(destinoVolver(2, false)).toBe('atras');
    expect(destinoVolver(5, true)).toBe('atras');
  });

  it('en una pestaña nueva (sin historial) sin sesión va a iniciar sesión', () => {
    expect(destinoVolver(1, false)).toBe('/login');
    expect(destinoVolver(0, false)).toBe('/login');
  });

  it('en una pestaña nueva con sesión va al resumen', () => {
    expect(destinoVolver(1, true)).toBe('/dashboard');
  });
});

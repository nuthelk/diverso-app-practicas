import { describe, expect, it } from 'vitest';
import { esActiva, SECCIONES, seccionActual } from '$lib/features/agencias/model/navegacion';

describe('SECCIONES', () => {
  it('Resumen, Planes, Ventas, Liquidaciones y Cuenta para dispersiones, en ese orden', () => {
    expect(SECCIONES.map((s) => [s.etiqueta, s.ruta])).toEqual([
      ['Resumen', '/dashboard'],
      ['Planes', '/planes'],
      ['Ventas', '/ventas'],
      ['Liquidaciones', '/liquidaciones'],
      ['Cuenta para dispersiones', '/cuenta-dispersiones'],
    ]);
    expect(SECCIONES.every((s) => s.icono.length > 0)).toBe(true);
  });
});

describe('esActiva / seccionActual', () => {
  it('una sección está activa en su ruta y en las que cuelgan de ella', () => {
    expect(esActiva('/planes', '/planes')).toBe(true);
    expect(esActiva('/planes/nuevo', '/planes')).toBe(true);
    expect(esActiva('/liquidaciones/liq-1', '/liquidaciones')).toBe(true);
  });

  it('no se confunde por prefijo de texto', () => {
    expect(esActiva('/planes-viejos', '/planes')).toBe(false);
    expect(esActiva('/ventas', '/planes')).toBe(false);
  });

  it('seccionActual devuelve la sección de la ruta, o null fuera del menú', () => {
    expect(seccionActual('/planes/editar/p1')?.etiqueta).toBe('Planes');
    expect(seccionActual('/cuenta-dispersiones')?.etiqueta).toBe('Cuenta para dispersiones');
    expect(seccionActual('/onboarding')).toBeNull();
    expect(seccionActual('/')).toBeNull();
  });
});

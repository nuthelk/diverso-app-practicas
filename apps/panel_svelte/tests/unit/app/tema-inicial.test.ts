import { afterEach, describe, expect, it, vi } from 'vitest';
import html from '../../../src/app.html?raw';

/**
 * El tema se decide en el script de `src/app.html`, antes del primer render (así no hay destello).
 * Se ejecuta ese mismo script contra el documento de jsdom: no hay una copia de la regla que probar.
 */
const script = /<script>([\s\S]*?)<\/script>/.exec(html)![1];
const CLAVE = 'diverso-panel-theme';

function abrirPanel(guardado: string | null): boolean {
  document.documentElement.className = /<html[^>]*class="([^"]*)"/.exec(html)?.[1] ?? '';
  localStorage.clear();
  if (guardado !== null) localStorage.setItem(CLAVE, guardado);
  new Function(script)();
  return document.documentElement.classList.contains('dark');
}

/** El sistema operativo pide oscuro o claro (jsdom no trae matchMedia). */
function sistema(oscuro: boolean): void {
  vi.stubGlobal('matchMedia', (consulta: string) => ({ matches: oscuro && consulta.includes('dark') }));
}

afterEach(() => {
  document.documentElement.className = '';
  localStorage.clear();
  vi.unstubAllGlobals();
});

describe('tema inicial (app.html)', () => {
  it('sin preferencia guardada sigue al sistema operativo', () => {
    sistema(true);
    expect(abrirPanel(null)).toBe(true);
    sistema(false);
    expect(abrirPanel(null)).toBe(false);
  });

  it('«sistema» guardado también sigue al sistema operativo', () => {
    sistema(true);
    expect(abrirPanel('sistema')).toBe(true);
  });

  it('lo que la persona eligió gana sobre el sistema: oscuro/claro y los viejos dark/light', () => {
    sistema(false);
    expect(abrirPanel('oscuro')).toBe(true);
    expect(abrirPanel('dark')).toBe(true);
    sistema(true);
    expect(abrirPanel('claro')).toBe(false);
    expect(abrirPanel('light')).toBe(false);
  });

  it('sin matchMedia y sin preferencia abre en claro', () => {
    expect(abrirPanel(null)).toBe(false);
  });

  it('si el almacenamiento no está disponible no falla y sigue al sistema', () => {
    sistema(true);
    const original = Object.getOwnPropertyDescriptor(Storage.prototype, 'getItem')!;
    Object.defineProperty(Storage.prototype, 'getItem', {
      configurable: true,
      value: () => {
        throw new Error('bloqueado');
      },
    });
    try {
      expect(abrirPanel(null)).toBe(true);
    } finally {
      Object.defineProperty(Storage.prototype, 'getItem', original);
    }
  });

  it('la plantilla no trae el modo oscuro puesto de fábrica', () => {
    expect(/<html[^>]*class="[^"]*\bdark\b/.test(html)).toBe(false);
  });
});

import { afterEach, describe, expect, it } from 'vitest';
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

afterEach(() => {
  document.documentElement.className = '';
  localStorage.clear();
});

describe('tema inicial (app.html)', () => {
  it('sin preferencia guardada abre en claro, la dirección «Claro aireado»', () => {
    expect(abrirPanel(null)).toBe(false);
  });

  it('lo que la persona eligió gana: «dark» abre en oscuro y «light» en claro', () => {
    expect(abrirPanel('dark')).toBe(true);
    expect(abrirPanel('light')).toBe(false);
  });

  it('un valor desconocido se trata como sin preferencia: claro', () => {
    expect(abrirPanel('sistema')).toBe(false);
  });

  it('si el almacenamiento no está disponible no falla y abre en claro', () => {
    const original = Object.getOwnPropertyDescriptor(Storage.prototype, 'getItem')!;
    Object.defineProperty(Storage.prototype, 'getItem', {
      configurable: true,
      value: () => {
        throw new Error('bloqueado');
      },
    });
    try {
      expect(abrirPanel(null)).toBe(false);
    } finally {
      Object.defineProperty(Storage.prototype, 'getItem', original);
    }
  });

  it('la plantilla no trae el modo oscuro puesto de fábrica', () => {
    expect(/<html[^>]*class="[^"]*\bdark\b/.test(html)).toBe(false);
  });
});

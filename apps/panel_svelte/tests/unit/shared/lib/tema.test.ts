import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import html from '../../../../src/app.html?raw';
import { CLAVE_TEMA, elegirTema, iniciarTema, leerPreferencia, tema } from '$lib/shared/lib/tema.svelte';

/** `prefers-color-scheme` falso: `cambiar()` dispara el evento `change` como lo haría el sistema operativo. */
function sistema(oscuro: boolean) {
  const oyentes = new Set<() => void>();
  const mq = {
    matches: oscuro,
    media: '(prefers-color-scheme: dark)',
    addEventListener: (_: string, f: () => void) => oyentes.add(f),
    removeEventListener: (_: string, f: () => void) => oyentes.delete(f),
  };
  vi.stubGlobal('matchMedia', () => mq);
  return {
    oyentes,
    cambiar(nuevo: boolean) {
      mq.matches = nuevo;
      oyentes.forEach((f) => f());
    },
  };
}

const esOscuro = () => document.documentElement.classList.contains('dark');

/** Hace fallar el almacenamiento como en un navegador con las cookies bloqueadas. */
function almacenamientoRoto() {
  const roto = () => {
    throw new Error('bloqueado');
  };
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(roto);
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(roto);
}

let detener: (() => void) | undefined;
beforeEach(() => {
  localStorage.clear();
  document.documentElement.className = '';
});
afterEach(() => {
  detener?.();
  detener = undefined;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  localStorage.clear();
  document.documentElement.className = '';
});

describe('leerPreferencia', () => {
  it.each([
    ['sistema', 'sistema'],
    ['claro', 'claro'],
    ['oscuro', 'oscuro'],
    ['light', 'claro'], // valores de la versión anterior del panel
    ['dark', 'oscuro'],
    [null, 'sistema'],
    ['morado', 'sistema'],
  ] as const)('«%s» es la preferencia «%s»', (guardado, esperada) => {
    expect(leerPreferencia(guardado)).toBe(esperada);
  });
});

describe('modelo del tema', () => {
  it('sin nada guardado sigue al sistema: oscuro si el sistema es oscuro', () => {
    sistema(true);
    detener = iniciarTema();
    expect(tema.preferencia).toBe('sistema');
    expect(tema.oscuro).toBe(true);
    expect(esOscuro()).toBe(true);
  });

  it('sin nada guardado y con sistema claro, la página queda en claro', () => {
    sistema(false);
    detener = iniciarTema();
    expect(tema.oscuro).toBe(false);
    expect(esOscuro()).toBe(false);
  });

  it('«claro» y «oscuro» ganan al sistema y se guardan en diverso-panel-theme', () => {
    sistema(true);
    detener = iniciarTema();
    elegirTema('claro');
    expect(esOscuro()).toBe(false);
    expect(localStorage.getItem(CLAVE_TEMA)).toBe('claro');
    expect(CLAVE_TEMA).toBe('diverso-panel-theme');
    elegirTema('oscuro');
    expect(esOscuro()).toBe(true);
    expect(tema.preferencia).toBe('oscuro');
    expect(localStorage.getItem(CLAVE_TEMA)).toBe('oscuro');
    elegirTema('sistema');
    expect(esOscuro()).toBe(true); // el sistema es oscuro
    expect(localStorage.getItem(CLAVE_TEMA)).toBe('sistema');
  });

  it('lee lo guardado al iniciar, también los valores viejos «dark» y «light»', () => {
    sistema(false);
    localStorage.setItem(CLAVE_TEMA, 'dark');
    detener = iniciarTema();
    expect(tema.preferencia).toBe('oscuro');
    expect(esOscuro()).toBe(true);
    detener();
    localStorage.setItem(CLAVE_TEMA, 'light');
    sistema(true);
    detener = iniciarTema();
    expect(tema.preferencia).toBe('claro');
    expect(esOscuro()).toBe(false);
  });

  it('con «sistema» sigue el cambio del sistema en vivo; con una elección fija lo ignora', () => {
    const so = sistema(false);
    detener = iniciarTema();
    expect(esOscuro()).toBe(false);
    so.cambiar(true);
    expect(esOscuro()).toBe(true);
    expect(tema.oscuro).toBe(true);
    so.cambiar(false);
    expect(esOscuro()).toBe(false);
    elegirTema('claro');
    so.cambiar(true);
    expect(esOscuro()).toBe(false);
    elegirTema('sistema');
    expect(esOscuro()).toBe(true); // vuelve a seguir al sistema ya oscuro
  });

  it('detener quita el oyente del sistema', () => {
    const so = sistema(false);
    detener = iniciarTema();
    expect(so.oyentes.size).toBe(1);
    detener();
    detener = undefined;
    expect(so.oyentes.size).toBe(0);
  });

  it('si el almacenamiento no está disponible no falla: sigue al sistema y la elección dura la sesión', () => {
    sistema(true);
    almacenamientoRoto();
    expect(() => (detener = iniciarTema())).not.toThrow();
    expect(tema.preferencia).toBe('sistema');
    expect(esOscuro()).toBe(true);
    expect(() => elegirTema('claro')).not.toThrow();
    expect(esOscuro()).toBe(false);
    expect(tema.preferencia).toBe('claro');
  });

  it('sin matchMedia (pruebas, navegadores viejos) «sistema» queda en claro', () => {
    vi.stubGlobal('matchMedia', undefined);
    expect(() => (detener = iniciarTema())).not.toThrow();
    expect(esOscuro()).toBe(false);
  });
});

/**
 * El script de `src/app.html` decide el tema antes del primer render para que no haya destello: se ejecuta tal cual
 * contra el documento de jsdom (no hay una copia de la regla que probar).
 */
describe('script inicial de app.html', () => {
  const script = /<script>([\s\S]*?)<\/script>/.exec(html)![1];
  const abrir = (guardado: string | null) => {
    document.documentElement.className = /<html[^>]*class="([^"]*)"/.exec(html)?.[1] ?? '';
    localStorage.clear();
    if (guardado !== null) localStorage.setItem(CLAVE_TEMA, guardado);
    new Function(script)();
    return esOscuro();
  };

  it('la plantilla no trae el modo oscuro puesto de fábrica', () => {
    expect(/<html[^>]*class="[^"]*\bdark\b/.test(html)).toBe(false);
  });

  it('sin preferencia guardada sigue al sistema', () => {
    sistema(true);
    expect(abrir(null)).toBe(true);
    sistema(false);
    expect(abrir(null)).toBe(false);
  });

  it('«sistema» guardado también sigue al sistema', () => {
    sistema(true);
    expect(abrir('sistema')).toBe(true);
    sistema(false);
    expect(abrir('sistema')).toBe(false);
  });

  it('lo elegido gana al sistema, con los valores nuevos y los viejos', () => {
    sistema(true);
    expect(abrir('claro')).toBe(false);
    expect(abrir('light')).toBe(false);
    sistema(false);
    expect(abrir('oscuro')).toBe(true);
    expect(abrir('dark')).toBe(true);
  });

  it('un valor desconocido se trata como sin preferencia', () => {
    sistema(true);
    expect(abrir('morado')).toBe(true);
  });

  it('si el almacenamiento falla no lanza y sigue al sistema', () => {
    sistema(true);
    almacenamientoRoto();
    document.documentElement.className = '';
    expect(() => new Function(script)()).not.toThrow();
    expect(esOscuro()).toBe(true);
  });

  it('sin matchMedia no lanza y abre en claro', () => {
    vi.stubGlobal('matchMedia', undefined);
    expect(abrir(null)).toBe(false);
  });
});

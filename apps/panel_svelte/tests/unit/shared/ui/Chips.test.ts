import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import Chips from '$lib/shared/ui/Chips.svelte';
import Segmentado from '$lib/shared/ui/Segmentado.svelte';

afterEach(cleanup);

const OPCIONES = [
  { valor: 'prox', etiqueta: 'Próximas', cantidad: 12 },
  { valor: 'sal', etiqueta: 'Ya salieron', cantidad: 0 },
  { valor: 'todas', etiqueta: 'Todas' },
];

describe('Chips', () => {
  const pintar = (valor = 'prox') => {
    const onchange = vi.fn();
    render(Chips, { opciones: OPCIONES, valor, onchange, etiqueta: 'Qué salidas ver' });
    return onchange;
  };

  it('es un grupo con nombre y un botón por opción', () => {
    pintar();
    const grupo = screen.getByRole('group', { name: 'Qué salidas ver' });
    expect(grupo.querySelectorAll('button')).toHaveLength(3);
  });

  it('solo la opción elegida tiene aria-pressed="true" y se anuncia con su cantidad', () => {
    pintar('sal');
    const botones = screen.getAllByRole('button');
    expect(botones.map((b) => b.getAttribute('aria-pressed'))).toEqual(['false', 'true', 'false']);
    expect(screen.getByRole('button', { name: 'Próximas 12' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Ya salieron 0' })).toBeTruthy(); // un cero real se muestra
    expect(screen.getByRole('button', { name: 'Todas' })).toBeTruthy(); // sin cantidad no inventa una
  });

  it('el clic avisa el valor elegido y no cambia solo (el padre decide)', async () => {
    const onchange = pintar();
    await fireEvent.click(screen.getByRole('button', { name: 'Todas' }));
    expect(onchange).toHaveBeenCalledExactlyOnceWith('todas');
    expect(screen.getByRole('button', { name: 'Próximas 12' }).getAttribute('aria-pressed')).toBe('true');
  });

  it('usa la clase compartida .chip', () => {
    pintar();
    for (const b of screen.getAllByRole('button')) expect(b.classList.contains('chip')).toBe(true);
  });
});

describe('Segmentado (radio group)', () => {
  const TEMAS = [
    { valor: 'sistema', etiqueta: 'Sistema' },
    { valor: 'claro', etiqueta: 'Claro' },
    { valor: 'oscuro', etiqueta: 'Oscuro' },
  ];
  const pintar = (valor = 'sistema') => {
    const onchange = vi.fn();
    render(Segmentado, { opciones: TEMAS, valor, onchange, etiqueta: 'Tema' });
    return onchange;
  };

  it('es un radiogroup con nombre y tres radios; solo el elegido está marcado y es tabulable', () => {
    pintar('claro');
    expect(screen.getByRole('radiogroup', { name: 'Tema' })).toBeTruthy();
    const radios = screen.getAllByRole('radio');
    expect(radios.map((r) => r.textContent?.trim())).toEqual(['Sistema', 'Claro', 'Oscuro']);
    expect(radios.map((r) => r.getAttribute('aria-checked'))).toEqual(['false', 'true', 'false']);
    expect(radios.map((r) => r.tabIndex)).toEqual([-1, 0, -1]);
  });

  it('el clic elige', async () => {
    const onchange = pintar();
    await fireEvent.click(screen.getByRole('radio', { name: 'Oscuro' }));
    expect(onchange).toHaveBeenCalledExactlyOnceWith('oscuro');
  });

  it('las flechas eligen la vecina, con vuelta al principio y al final, y le pasan el foco', async () => {
    const onchange = pintar('oscuro');
    const [sistema, claro, oscuro] = screen.getAllByRole('radio');
    await fireEvent.keyDown(oscuro, { key: 'ArrowRight' });
    expect(onchange).toHaveBeenLastCalledWith('sistema');
    expect(document.activeElement).toBe(sistema);
    await fireEvent.keyDown(oscuro, { key: 'ArrowUp' });
    expect(onchange).toHaveBeenLastCalledWith('claro');
    expect(document.activeElement).toBe(claro);
    await fireEvent.keyDown(oscuro, { key: 'ArrowLeft' });
    expect(onchange).toHaveBeenLastCalledWith('claro');
    await fireEvent.keyDown(sistema, { key: 'ArrowLeft' });
    expect(onchange).toHaveBeenLastCalledWith('oscuro');
  });
});

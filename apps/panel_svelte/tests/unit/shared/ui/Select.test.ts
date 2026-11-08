import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import { tick } from 'svelte';
import Select from '$lib/shared/ui/Select.svelte';

afterEach(cleanup);

const OPCIONES = [
  { valor: 'ahorros', etiqueta: 'Ahorros' },
  { valor: 'corriente', etiqueta: 'Corriente' },
  { valor: 'nequi', etiqueta: 'Nequi' },
];

function pintar(extra: Record<string, unknown> = {}) {
  const onchange = vi.fn();
  const r = render(Select, { opciones: OPCIONES, valor: 'corriente', onchange, etiqueta: 'Tipo de cuenta', ...extra });
  return { onchange, ...r, boton: () => screen.getByRole('button', { name: /Tipo de cuenta/ }) };
}

describe('Select · nombre accesible', () => {
  it('el botón se llama como la etiqueta y dice el valor elegido', () => {
    const { boton } = pintar();
    expect(boton().textContent).toContain('Corriente');
    expect(screen.getByRole('button', { name: 'Tipo de cuenta Corriente' })).toBeTruthy();
  });

  it('también se nombra con un <label> externo (etiquetadoPor)', () => {
    // el id lo pone la página: se simula el <label id>
    const etiqueta = document.createElement('span');
    etiqueta.id = 'etq-externa';
    etiqueta.textContent = 'Banco';
    document.body.appendChild(etiqueta);
    render(Select, { opciones: OPCIONES, valor: 'nequi', onchange: () => {}, etiquetadoPor: 'etq-externa' });
    expect(screen.getByRole('button', { name: 'Banco Nequi' })).toBeTruthy();
    etiqueta.remove();
  });

  it('la lista desplegada lleva el mismo nombre y las opciones dicen cuál está elegida', async () => {
    const { boton } = pintar();
    await fireEvent.click(boton());
    const lista = screen.getByRole('listbox', { name: 'Tipo de cuenta' });
    expect(lista).toBeTruthy();
    const opciones = screen.getAllByRole('option');
    expect(opciones.map((o) => o.textContent?.trim())).toEqual(['Ahorros', 'Corriente', 'Nequi']);
    expect(opciones.map((o) => o.getAttribute('aria-selected'))).toEqual(['false', 'true', 'false']);
    expect(boton().getAttribute('aria-expanded')).toBe('true');
    expect(boton().getAttribute('aria-haspopup')).toBe('listbox');
  });
});

describe('Select · teclado', () => {
  it('al abrir con el clic el foco va a la opción elegida', async () => {
    const { boton } = pintar();
    await fireEvent.click(boton());
    await tick();
    expect(document.activeElement).toBe(screen.getByRole('option', { name: 'Corriente' }));
  });

  it('ArrowDown y ArrowUp en el botón cerrado abren la lista', async () => {
    const { boton } = pintar();
    await fireEvent.keyDown(boton(), { key: 'ArrowDown' });
    expect(screen.getByRole('listbox')).toBeTruthy();
    cleanup();
    const otro = pintar();
    await fireEvent.keyDown(otro.boton(), { key: 'ArrowUp' });
    expect(screen.getByRole('listbox')).toBeTruthy();
  });

  it('las flechas mueven el foco entre opciones sin pasar de los extremos; Home y End saltan', async () => {
    const { boton } = pintar();
    await fireEvent.click(boton());
    await tick();
    const [ahorros, corriente, nequi] = screen.getAllByRole('option');
    await fireEvent.keyDown(corriente, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(nequi);
    await fireEvent.keyDown(nequi, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(nequi);
    await fireEvent.keyDown(nequi, { key: 'ArrowUp' });
    expect(document.activeElement).toBe(corriente);
    await fireEvent.keyDown(corriente, { key: 'Home' });
    expect(document.activeElement).toBe(ahorros);
    await fireEvent.keyDown(ahorros, { key: 'End' });
    expect(document.activeElement).toBe(nequi);
  });

  it('Enter elige la opción enfocada, cierra y devuelve el foco al botón', async () => {
    const { boton, onchange } = pintar();
    await fireEvent.click(boton());
    await tick();
    const [, , nequi] = screen.getAllByRole('option');
    await fireEvent.keyDown(screen.getAllByRole('option')[1], { key: 'ArrowDown' });
    await fireEvent.keyDown(nequi, { key: 'Enter' });
    expect(onchange).toHaveBeenCalledExactlyOnceWith('nequi');
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(document.activeElement).toBe(boton());
  });

  it('el espacio también elige', async () => {
    const { boton, onchange } = pintar();
    await fireEvent.click(boton());
    await tick();
    await fireEvent.keyDown(screen.getAllByRole('option')[0], { key: ' ' });
    expect(onchange).toHaveBeenCalledExactlyOnceWith('ahorros');
  });

  it('Escape cierra sin cambiar nada y devuelve el foco al botón', async () => {
    const { boton, onchange } = pintar();
    await fireEvent.click(boton());
    await tick();
    await fireEvent.keyDown(screen.getByRole('option', { name: 'Corriente' }), { key: 'Escape' });
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(onchange).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(boton());
  });

  it('el clic en una opción elige y cierra', async () => {
    const { boton, onchange } = pintar();
    await fireEvent.click(boton());
    await fireEvent.click(screen.getByRole('option', { name: 'Ahorros' }));
    expect(onchange).toHaveBeenCalledExactlyOnceWith('ahorros');
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(boton().getAttribute('aria-expanded')).toBe('false');
  });

  it('si el foco sale de la lista (Tab) se cierra', async () => {
    const { boton } = pintar();
    await fireEvent.click(boton());
    await tick();
    await fireEvent.focusOut(screen.getByRole('option', { name: 'Corriente' }), { relatedTarget: document.body });
    expect(screen.queryByRole('listbox')).toBeNull();
  });
});

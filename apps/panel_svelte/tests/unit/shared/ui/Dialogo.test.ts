import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRawSnippet, tick } from 'svelte';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/svelte';
import Dialogo from '$lib/shared/ui/Dialogo.svelte';

const cuerpo = createRawSnippet(() => ({
  render: () => '<div><input aria-label="Cupos" /><button type="button">Guardar</button></div>',
}));
const pie = createRawSnippet(() => ({ render: () => '<button type="button" data-autofocus>Cancelar</button>' }));

let disparador: HTMLButtonElement;
beforeEach(() => {
  disparador = document.createElement('button');
  disparador.textContent = 'Abrir';
  document.body.appendChild(disparador);
  disparador.focus();
});
afterEach(() => {
  cleanup();
  disparador.remove();
});

const props = (extra: Record<string, unknown> = {}) => ({
  abierto: true,
  titulo: 'Fechas y cupos',
  oncerrar: vi.fn(),
  children: cuerpo,
  ...extra,
});

describe('Dialogo', () => {
  it('cerrado no dibuja nada', () => {
    render(Dialogo, props({ abierto: false }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('abierto es un diálogo modal con nombre (su título) y descripción', () => {
    render(Dialogo, props({ descripcion: 'Elige los días de salida' }));
    const dialogo = screen.getByRole('dialog', { name: 'Fechas y cupos' });
    expect(dialogo.getAttribute('aria-modal')).toBe('true');
    expect(dialogo.getAttribute('aria-describedby')).toBeTruthy();
    expect(document.getElementById(dialogo.getAttribute('aria-describedby')!)?.textContent).toBe('Elige los días de salida');
    expect(screen.getByRole('heading', { name: 'Fechas y cupos' })).toBeTruthy();
  });

  it('puede ser alertdialog (confirmaciones)', () => {
    render(Dialogo, props({ rol: 'alertdialog' }));
    expect(screen.getByRole('alertdialog', { name: 'Fechas y cupos' })).toBeTruthy();
  });

  it('al abrir lleva el foco al primer control del contenido, no al botón de cerrar', () => {
    render(Dialogo, props());
    expect(document.activeElement).toBe(screen.getByLabelText('Cupos'));
  });

  it('un control con data-autofocus gana como foco inicial', () => {
    render(Dialogo, props({ pie }));
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Cancelar' }));
  });

  it('sin controles en el contenido el foco inicial cae en el botón de cerrar', () => {
    const texto = createRawSnippet(() => ({ render: () => '<p>Solo texto</p>' }));
    render(Dialogo, props({ children: texto }));
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Cerrar' }));
  });

  it('Tab desde el último control vuelve al primero y Shift+Tab desde el primero va al último (el foco no sale)', async () => {
    render(Dialogo, props());
    const dialogo = screen.getByRole('dialog');
    const controles = within(dialogo).getAllByRole('button').concat(within(dialogo).getAllByRole('textbox'));
    const ordenados = controles.sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
    const primero = ordenados[0];
    const ultimo = ordenados[ordenados.length - 1];

    ultimo.focus();
    await fireEvent.keyDown(ultimo, { key: 'Tab' });
    expect(document.activeElement).toBe(primero);

    await fireEvent.keyDown(primero, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(ultimo);
  });

  it('si el foco se escapó del diálogo, Tab lo trae de vuelta', async () => {
    render(Dialogo, props());
    disparador.focus();
    await fireEvent.keyDown(document.body, { key: 'Tab' });
    expect(screen.getByRole('dialog').contains(document.activeElement)).toBe(true);
  });

  it('Escape pide cerrar', async () => {
    const p = props();
    render(Dialogo, p);
    await fireEvent.keyDown(screen.getByLabelText('Cupos'), { key: 'Escape' });
    expect(p.oncerrar).toHaveBeenCalledTimes(1);
  });

  it('el botón Cerrar y el clic en el fondo piden cerrar; un clic dentro no', async () => {
    const p = props();
    render(Dialogo, p);
    await fireEvent.click(screen.getByLabelText('Cupos'));
    expect(p.oncerrar).not.toHaveBeenCalled();
    await fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }));
    expect(p.oncerrar).toHaveBeenCalledTimes(1);
    await fireEvent.click(document.querySelector('[data-fondo-dialogo]')!);
    expect(p.oncerrar).toHaveBeenCalledTimes(2);
  });

  it('al cerrarse devuelve el foco a quien lo abrió', async () => {
    const { rerender } = render(Dialogo, props({ abierto: false }));
    expect(document.activeElement).toBe(disparador);
    await rerender({ abierto: true });
    expect(screen.getByRole('dialog').contains(document.activeElement)).toBe(true);
    await rerender({ abierto: false });
    await tick();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(disparador);
  });

  it('desmontarlo abierto también devuelve el foco y suelta el desplazamiento de la página', () => {
    const { unmount } = render(Dialogo, props());
    expect(document.documentElement.style.overflow).toBe('hidden');
    unmount();
    expect(document.activeElement).toBe(disparador);
    expect(document.documentElement.style.overflow).toBe('');
  });
});

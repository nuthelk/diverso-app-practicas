import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { tick } from 'svelte';
import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import DialogoConfirmar from '$lib/shared/ui/DialogoConfirmar.svelte';
import { confirmar } from '$lib/shared/lib/confirmar.svelte';

let disparador: HTMLButtonElement;
beforeEach(() => {
  disparador = document.createElement('button');
  disparador.textContent = 'Abrir';
  document.body.appendChild(disparador);
  disparador.focus();
  render(DialogoConfirmar);
});
afterEach(() => {
  cleanup();
  disparador.remove();
});

/** Hace la pregunta y espera a que el diálogo esté en pantalla; `respuesta` se resuelve cuando la persona contesta. */
const preguntar = async (extra = {}) => {
  const respuesta = confirmar({ titulo: '¿Publicar el plan?', mensaje: 'Los viajeros lo verán en la app.', confirmar: 'Publicar', ...extra });
  await tick();
  return { respuesta };
};

describe('confirmar', () => {
  it('sin pregunta pendiente no hay diálogo', () => {
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });

  it('muestra el título, el mensaje y los dos botones, con Cancelar por defecto', async () => {
    await preguntar();
    const dialogo = screen.getByRole('alertdialog', { name: '¿Publicar el plan?' });
    expect(dialogo.textContent).toContain('Los viajeros lo verán en la app.');
    expect(screen.getByRole('button', { name: 'Publicar' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeTruthy();
  });

  it('resuelve true con el botón de confirmar y cierra', async () => {
    const { respuesta } = await preguntar();
    await fireEvent.click(screen.getByRole('button', { name: 'Publicar' }));
    expect(await respuesta).toBe(true);
    await tick();
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });

  it('resuelve false con Cancelar, con Escape y con el clic en el fondo', async () => {
    let { respuesta } = await preguntar();
    await fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(await respuesta).toBe(false);
    await tick();

    ({ respuesta } = await preguntar());
    await fireEvent.keyDown(screen.getByRole('alertdialog'), { key: 'Escape' });
    expect(await respuesta).toBe(false);
    await tick();

    ({ respuesta } = await preguntar());
    await fireEvent.click(document.querySelector('[data-fondo-dialogo]')!);
    expect(await respuesta).toBe(false);
  });

  it('devuelve el foco a quien lo tenía antes de preguntar', async () => {
    const { respuesta } = await preguntar();
    await fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    await respuesta;
    await tick();
    expect(document.activeElement).toBe(disparador);
  });

  it('en una acción que destruye, el foco inicial está en Cancelar y confirmar es el botón urgente', async () => {
    await preguntar({ titulo: '¿Eliminar la fecha?', confirmar: 'Eliminar', peligro: true });
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.getByRole('button', { name: 'Eliminar' }).classList.contains('btn-urgente')).toBe(true);
  });

  it('en una confirmación normal el foco inicial está en el botón de confirmar', async () => {
    await preguntar();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Publicar' }));
  });

  it('el texto de los botones se puede cambiar; sin él son «Confirmar» y «Cancelar»', async () => {
    await preguntar({ confirmar: undefined, cancelar: 'Volver' });
    expect(screen.getByRole('button', { name: 'Confirmar' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Volver' })).toBeTruthy();
  });

  it('una pregunta nueva sobre otra pendiente cancela la primera (false) y muestra la segunda', async () => {
    const { respuesta: primera } = await preguntar({ titulo: 'Primera' });
    const { respuesta: segunda } = await preguntar({ titulo: 'Segunda' });
    expect(await primera).toBe(false);
    expect(screen.getByRole('alertdialog', { name: 'Segunda' })).toBeTruthy();
    await fireEvent.click(screen.getByRole('button', { name: 'Publicar' }));
    expect(await segunda).toBe(true);
  });
});

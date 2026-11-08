import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { tick } from 'svelte';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/svelte';
import { fecha, plan, texto } from '$tests/fixtures';

vi.mock('$lib/features/planes/api/planes.api', () => ({
  agregarFecha: vi.fn(),
  eliminarFecha: vi.fn(),
}));

import { agregarFecha, eliminarFecha } from '$lib/features/planes/api/planes.api';
import DialogoConfirmar from '$lib/shared/ui/DialogoConfirmar.svelte';
import { responder } from '$lib/shared/lib/confirmar.svelte';
import FechasModal from '$lib/features/planes/components/FechasModal.svelte';

const agregarMock = vi.mocked(agregarFecha);
const eliminarMock = vi.mocked(eliminarFecha);

const unPlan = () => ({
  ...plan('Guatapé', [
    fecha({ id: 'f-1', fecha: '2099-01-10', cupo_total: 12, cupo_disponible: 5 }),
    fecha({ id: 'f-2', fecha: '2099-01-17', cupo_total: 10, cupo_disponible: 10 }),
    fecha({ id: 'f-0', fecha: '2020-01-05', cupo_total: 8, cupo_disponible: 0 }),
  ]),
  id: 'p-1',
});

let disparador: HTMLButtonElement;
beforeEach(() => {
  disparador = document.createElement('button');
  disparador.textContent = 'Fechas y cupos';
  document.body.appendChild(disparador);
  disparador.focus();
  render(DialogoConfirmar);
});
afterEach(() => {
  responder(false); // una pregunta sin responder no pasa a la prueba siguiente
  cleanup();
  disparador.remove();
  vi.resetAllMocks();
});

function abrir(p = unPlan()) {
  const oncerrar = vi.fn();
  render(FechasModal, { plan: p, oncerrar });
  return { oncerrar, dialogo: screen.getByRole('dialog', { name: 'Fechas y cupos' }) };
}

describe('FechasModal · diálogo', () => {
  it('es un diálogo modal nombrado «Fechas y cupos» que dice de qué plan es', () => {
    const { dialogo } = abrir();
    expect(dialogo.getAttribute('aria-modal')).toBe('true');
    expect(texto(dialogo)).toContain('Guatapé');
  });

  it('al abrir el foco entra al primer campo del formulario', () => {
    const { dialogo } = abrir();
    expect(dialogo.contains(document.activeElement)).toBe(true);
    expect(document.activeElement).toBe(within(dialogo).getByLabelText('Fecha'));
  });

  it('Tab desde el último control vuelve al primero (el foco no sale del diálogo)', async () => {
    const { dialogo } = abrir();
    const controles = [...dialogo.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled])')];
    const ultimo = controles.at(-1)!;
    ultimo.focus();
    await fireEvent.keyDown(ultimo, { key: 'Tab' });
    expect(document.activeElement).toBe(controles[0]);
  });

  it('Escape cierra desde cualquier lugar, también con el foco fuera', async () => {
    const { oncerrar } = abrir();
    disparador.focus();
    await fireEvent.keyDown(document.body, { key: 'Escape' });
    expect(oncerrar).toHaveBeenCalledTimes(1);
  });

  it('el botón de cerrar, «Listo» y el clic en el fondo piden cerrar', async () => {
    const { oncerrar, dialogo } = abrir();
    await fireEvent.click(within(dialogo).getByRole('button', { name: 'Listo' }));
    await fireEvent.click(within(dialogo).getByRole('button', { name: 'Cerrar' }));
    await fireEvent.click(document.querySelector('[data-fondo-dialogo]')!);
    expect(oncerrar).toHaveBeenCalledTimes(3);
  });

  it('al cerrarse el foco vuelve a quien lo abrió', async () => {
    const { oncerrar } = abrir();
    cleanup();
    await tick();
    expect(oncerrar).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(disparador);
  });
});

describe('FechasModal · lista', () => {
  it('lista las fechas más recientes primero con sus cupos libres y marca las que ya salieron', () => {
    const { dialogo } = abrir();
    const filas = within(dialogo).getAllByRole('listitem');
    expect(filas).toHaveLength(3);
    expect(texto(filas[0])).toContain('10 de 10 cupos libres');
    expect(texto(filas[1])).toContain('5 de 12 cupos libres');
    expect(texto(filas[1])).not.toContain('Ya salió');
    expect(texto(filas[2])).toContain('0 de 8 cupos libres');
    expect(texto(filas[2])).toContain('Ya salió');
  });

  it('sin fechas dice cómo seguir', () => {
    const { dialogo } = abrir({ ...unPlan(), plan_dates: [] });
    expect(texto(dialogo)).toContain('Sin fechas todavía — agrega la primera.');
  });
});

describe('FechasModal · agregar', () => {
  it('agrega la fecha con su cupo y pide cerrar para recargar', async () => {
    agregarMock.mockResolvedValue();
    const { oncerrar, dialogo } = abrir();
    await fireEvent.input(within(dialogo).getByLabelText('Fecha'), { target: { value: '2099-02-01' } });
    await fireEvent.input(within(dialogo).getByLabelText('Cupo'), { target: { value: '20' } });
    await fireEvent.click(within(dialogo).getByRole('button', { name: 'Agregar' }));
    await vi.waitFor(() => expect(agregarMock).toHaveBeenCalledWith('p-1', '2099-02-01', 20));
    await vi.waitFor(() => expect(oncerrar).toHaveBeenCalledTimes(1));
  });

  it('si falla muestra el error en el diálogo y no lo cierra', async () => {
    agregarMock.mockRejectedValue(new Error('Failed to fetch'));
    const { oncerrar, dialogo } = abrir();
    await fireEvent.input(within(dialogo).getByLabelText('Fecha'), { target: { value: '2099-02-01' } });
    await fireEvent.click(within(dialogo).getByRole('button', { name: 'Agregar' }));
    const alerta = await within(dialogo).findByRole('alert');
    expect(texto(alerta)).toContain('No hay conexión con el servidor');
    expect(oncerrar).not.toHaveBeenCalled();
  });
});

describe('FechasModal · eliminar una fecha pide confirmación', () => {
  const eliminar = (dialogo: HTMLElement, nombre: RegExp) => within(dialogo).getByRole('button', { name: nombre });

  it('pregunta con el nombre de la fecha y, si se confirma, elimina y pide cerrar para recargar', async () => {
    eliminarMock.mockResolvedValue();
    const { oncerrar, dialogo } = abrir();
    await fireEvent.click(eliminar(dialogo, /^Eliminar la fecha del .*17/));
    await tick();

    const pregunta = screen.getByRole('alertdialog', { name: /^¿Eliminar la fecha del .*17/ });
    expect(texto(pregunta)).toContain('Se eliminará la fecha con sus cupos');
    expect(texto(pregunta)).toContain('reservas activas');
    expect(eliminarMock).not.toHaveBeenCalled();

    await fireEvent.click(within(pregunta).getByRole('button', { name: 'Eliminar fecha' }));
    await vi.waitFor(() => expect(eliminarMock).toHaveBeenCalledWith('f-2'));
    await vi.waitFor(() => expect(oncerrar).toHaveBeenCalledTimes(1));
  });

  it('cancelar no elimina nada ni cierra el diálogo', async () => {
    const { oncerrar, dialogo } = abrir();
    await fireEvent.click(eliminar(dialogo, /^Eliminar la fecha del .*17/));
    await tick();
    await fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    await tick();
    expect(eliminarMock).not.toHaveBeenCalled();
    expect(oncerrar).not.toHaveBeenCalled();
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });

  it('Escape sobre la pregunta solo cierra la pregunta, no el diálogo de fechas', async () => {
    const { oncerrar, dialogo } = abrir();
    await fireEvent.click(eliminar(dialogo, /^Eliminar la fecha del .*17/));
    await tick();
    await fireEvent.keyDown(screen.getByRole('alertdialog'), { key: 'Escape' });
    await tick();
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(oncerrar).not.toHaveBeenCalled();
    expect(eliminarMock).not.toHaveBeenCalled();
  });

  it('si la API la rechaza (fecha con reservas) el diálogo sigue abierto y el motivo se ve dentro', async () => {
    eliminarMock.mockRejectedValue(new Error('FECHA_CON_RESERVAS'));
    const { oncerrar, dialogo } = abrir();
    await fireEvent.click(eliminar(dialogo, /^Eliminar la fecha del .*10/));
    await tick();
    await fireEvent.click(screen.getByRole('button', { name: 'Eliminar fecha' }));
    const alerta = await within(dialogo).findByRole('alert');
    expect(texto(alerta)).toContain('Esa fecha tiene reservas activas');
    expect(oncerrar).not.toHaveBeenCalled();
  });
});

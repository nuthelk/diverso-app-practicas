import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/svelte';
import { agencia, plan, texto } from '$tests/fixtures';

vi.mock('$app/navigation', () => ({ goto: vi.fn() }));
vi.mock('$lib/features/agencias/api/agencias.api', () => ({
  miAgencia: vi.fn(),
}));
vi.mock('$lib/features/planes/api/planes.api', () => ({
  misPlanes: vi.fn(),
  crearPlan: vi.fn(),
  actualizarPlan: vi.fn(),
}));

import { goto } from '$app/navigation';
import { actualizarPlan, crearPlan, misPlanes } from '$lib/features/planes/api/planes.api';
import { miAgencia } from '$lib/features/agencias/api/agencias.api';
import PlanFormPage from '$lib/features/planes/pages/PlanFormPage.svelte';

const miAgenciaMock = vi.mocked(miAgencia);
const misPlanesMock = vi.mocked(misPlanes);
const crearMock = vi.mocked(crearPlan);
const actualizarMock = vi.mocked(actualizarPlan);

afterEach(() => {
  vi.resetAllMocks();
});

const GRATIS = /^Cancelación gratuita hasta/;
const PARCIAL_H = /^Reembolso parcial hasta/;
const PARCIAL_PCT = /^Porcentaje de reembolso parcial/;

const textoViajero = () => texto(screen.getByTestId('politica-texto'));

async function llenarBasicos(container: HTMLElement) {
  const requeridos = [...container.querySelectorAll('input[required]')] as HTMLInputElement[];
  // orden del formulario: título, destino, precio, duración, hora de salida, horas gratuitas
  await fireEvent.input(requeridos[0], { target: { value: 'Guatapé' } });
  await fireEvent.input(requeridos[1], { target: { value: 'Guatapé' } });
  await fireEvent.input(requeridos[2], { target: { value: '150000' } });
}

describe('PlanForm · política de cancelación', () => {
  it('un plan nuevo arranca con 48 h gratis, sin tramo parcial y salida 06:00', async () => {
    render(PlanFormPage);
    expect((screen.getByLabelText(GRATIS) as HTMLInputElement).value).toBe('48');
    expect((screen.getByLabelText(PARCIAL_H) as HTMLInputElement).value).toBe('');
    expect((screen.getByLabelText(PARCIAL_PCT) as HTMLInputElement).value).toBe('');
    expect((screen.getByLabelText(/^Hora de salida/) as HTMLInputElement).value).toBe('06:00');
    expect(textoViajero()).toBe(
      'Lo que verá el viajero: Cancelación gratuita hasta 48 horas antes. Menos de 48 horas: sin reembolso.',
    );
    expect(screen.queryByLabelText('Política de cancelación', { selector: 'textarea' })).toBeNull(); // ya no se escribe a mano
  });

  it('el texto se regenera al cambiar los números', async () => {
    render(PlanFormPage);
    await fireEvent.input(screen.getByLabelText(PARCIAL_H), { target: { value: '24' } });
    await fireEvent.input(screen.getByLabelText(PARCIAL_PCT), { target: { value: '50' } });
    expect(textoViajero()).toBe(
      'Lo que verá el viajero: Cancelación gratuita hasta 48 horas antes. Entre 48 y 24 horas: reembolso del 50 %. Menos de 24 horas: sin reembolso.',
    );
    await fireEvent.input(screen.getByLabelText(GRATIS), { target: { value: '72' } });
    expect(textoViajero()).toContain('Cancelación gratuita hasta 72 horas antes. Entre 72 y 24 horas');
  });

  it('con una política incompleta el texto pide completarla', async () => {
    render(PlanFormPage);
    await fireEvent.input(screen.getByLabelText(PARCIAL_H), { target: { value: '24' } });
    expect(textoViajero()).toContain('Completa la política de cancelación');
  });

  it('no guarda si la ventana parcial no es menor que la gratuita', async () => {
    miAgenciaMock.mockResolvedValue(agencia());
    const { container } = render(PlanFormPage);
    await fireEvent.input(screen.getByLabelText(PARCIAL_H), { target: { value: '48' } });
    await fireEvent.input(screen.getByLabelText(PARCIAL_PCT), { target: { value: '50' } });
    await fireEvent.submit(container.querySelector('form')!);
    await vi.waitFor(() => expect(texto(container)).toContain('La ventana parcial debe ser menor que la de cancelación gratuita.'));
    expect(crearMock).not.toHaveBeenCalled();
  });

  it('no guarda con un porcentaje fuera de 1–99 ni con la ventana gratuita en 0', async () => {
    const { container } = render(PlanFormPage);
    await fireEvent.input(screen.getByLabelText(PARCIAL_H), { target: { value: '24' } });
    await fireEvent.input(screen.getByLabelText(PARCIAL_PCT), { target: { value: '100' } });
    await fireEvent.submit(container.querySelector('form')!);
    await vi.waitFor(() => expect(texto(container)).toContain('entre 1 y 99'));
    expect(crearMock).not.toHaveBeenCalled();

    await fireEvent.input(screen.getByLabelText(GRATIS), { target: { value: '0' } });
    await fireEvent.submit(container.querySelector('form')!);
    await vi.waitFor(() => expect(texto(container)).toContain('mayor a 0'));
    expect(crearMock).not.toHaveBeenCalled();
  });

  it('no guarda con notas que son una regla de reembolso y muestra el motivo junto al campo', async () => {
    miAgenciaMock.mockResolvedValue(agencia({ id: 'ag-7' }));
    crearMock.mockResolvedValue('plan-1');
    const { container } = render(PlanFormPage);
    await llenarBasicos(container);
    const notas = screen.getByLabelText(/^Notas de la política \(opcional\)/) as HTMLTextAreaElement;
    await fireEvent.input(notas, { target: { value: 'Reembolso del 100 % hasta 1 hora antes.' } });
    expect(notas.getAttribute('aria-invalid')).not.toBe('true'); // el error aparece al intentar guardar, como los demás
    await fireEvent.submit(container.querySelector('form')!);

    const mensaje = 'Las notas no pueden contener reglas de reembolso; usa los campos de horas y porcentaje.';
    await vi.waitFor(() => expect(texto(container)).toContain(mensaje));
    expect(screen.getAllByRole('alert').map((a) => texto(a))).toContain(mensaje);
    expect(notas.getAttribute('aria-invalid')).toBe('true');
    expect(textoViajero()).toContain('Completa la política de cancelación');
    expect(crearMock).not.toHaveBeenCalled();

    // Quitar la regla de las notas desbloquea el guardado
    await fireEvent.input(notas, { target: { value: 'Avisar restricciones alimentarias.' } });
    expect(notas.getAttribute('aria-invalid')).not.toBe('true');
    await fireEvent.submit(container.querySelector('form')!);
    await vi.waitFor(() => expect(crearMock).toHaveBeenCalledTimes(1));
    expect(crearMock.mock.calls[0][1]).toMatchObject({ politicaNotas: 'Avisar restricciones alimentarias.' });
  });

  it('guarda los números y el texto juntos (el texto sale de los números)', async () => {
    miAgenciaMock.mockResolvedValue(agencia({ id: 'ag-7' }));
    crearMock.mockResolvedValue('plan-1');
    const { container } = render(PlanFormPage);
    await llenarBasicos(container);
    await fireEvent.input(screen.getByLabelText(GRATIS), { target: { value: '72' } });
    await fireEvent.input(screen.getByLabelText(PARCIAL_H), { target: { value: '24' } });
    await fireEvent.input(screen.getByLabelText(PARCIAL_PCT), { target: { value: '40' } });
    await fireEvent.input(screen.getByLabelText(/^Hora de salida/), { target: { value: '07:30' } });
    await fireEvent.submit(container.querySelector('form')!);

    await vi.waitFor(() => expect(crearMock).toHaveBeenCalledTimes(1));
    const [agencyId, draft] = crearMock.mock.calls[0];
    expect(agencyId).toBe('ag-7');
    expect(draft).toMatchObject({
      horasCancelacionGratuita: 72,
      horasReembolsoParcial: 24,
      porcentajeReembolsoParcial: 40,
      horaSalida: '07:30',
    });
    await vi.waitFor(() => expect(goto).toHaveBeenCalledWith('#/planes'));
  });

  it('un plan existente carga sus valores actuales y no los pisa si no se tocan', async () => {
    miAgenciaMock.mockResolvedValue(agencia());
    misPlanesMock.mockResolvedValue([
      {
        ...plan('Guatapé', []),
        id: 'p-1',
        politica_cancelacion: 'Cancelación gratuita hasta 72 horas antes. Entre 72 y 24 horas: reembolso del 40 %. Menos de 24 horas: sin reembolso.',
        horas_cancelacion_gratuita: 72,
        horas_reembolso_parcial: 24,
        porcentaje_reembolso_parcial: 40,
        hora_salida: '07:30:00',
      },
    ]);
    actualizarMock.mockResolvedValue();
    const { container } = render(PlanFormPage, { planId: 'p-1' });
    await screen.findByText('Editar plan');
    expect((screen.getByLabelText(GRATIS) as HTMLInputElement).value).toBe('72');
    expect((screen.getByLabelText(PARCIAL_H) as HTMLInputElement).value).toBe('24');
    expect((screen.getByLabelText(PARCIAL_PCT) as HTMLInputElement).value).toBe('40');
    expect((screen.getByLabelText(/^Hora de salida/) as HTMLInputElement).value).toBe('07:30');
    expect(textoViajero()).toContain('Entre 72 y 24 horas: reembolso del 40 %');

    await fireEvent.submit(container.querySelector('form')!);
    await vi.waitFor(() => expect(actualizarMock).toHaveBeenCalledTimes(1));
    expect(actualizarMock.mock.calls[0][0]).toMatchObject({
      id: 'p-1',
      horasCancelacionGratuita: 72,
      horasReembolsoParcial: 24,
      porcentajeReembolsoParcial: 40,
      horaSalida: '07:30',
    });
  });

  it('las notas de la política se escriben aparte y aparecen en la vista previa del viajero', async () => {
    render(PlanFormPage);
    const notas = screen.getByLabelText(/^Notas de la política \(opcional\)/) as HTMLTextAreaElement;
    expect(notas.value).toBe('');
    await fireEvent.input(notas, { target: { value: 'Avisar restricciones alimentarias.' } });
    expect(textoViajero()).toBe(
      'Lo que verá el viajero: Cancelación gratuita hasta 48 horas antes. Menos de 48 horas: sin reembolso. Avisar restricciones alimentarias.',
    );
    await fireEvent.input(notas, { target: { value: '' } });
    expect(textoViajero()).toBe(
      'Lo que verá el viajero: Cancelación gratuita hasta 48 horas antes. Menos de 48 horas: sin reembolso.',
    );
  });

  it('un plan existente carga sus notas y las guarda sin perderlas', async () => {
    miAgenciaMock.mockResolvedValue(agencia());
    misPlanesMock.mockResolvedValue([
      {
        ...plan('Street food', []),
        id: 'p-3',
        horas_cancelacion_gratuita: 24,
        politica_notas: 'Avisar restricciones alimentarias.',
        politica_cancelacion: 'Cancelación gratuita hasta 24 horas antes. Menos de 24 horas: sin reembolso. Avisar restricciones alimentarias.',
      },
    ]);
    actualizarMock.mockResolvedValue();
    const { container } = render(PlanFormPage, { planId: 'p-3' });
    await screen.findByText('Editar plan');
    expect((screen.getByLabelText(/^Notas de la política/) as HTMLTextAreaElement).value).toBe('Avisar restricciones alimentarias.');
    expect(textoViajero()).toContain('Menos de 24 horas: sin reembolso. Avisar restricciones alimentarias.');
    await fireEvent.submit(container.querySelector('form')!);
    await vi.waitFor(() => expect(actualizarMock).toHaveBeenCalledTimes(1));
    expect(actualizarMock.mock.calls[0][0]).toMatchObject({ politicaNotas: 'Avisar restricciones alimentarias.' });
  });

  it('un plan sin tramo parcial puede quitarlo vaciando los dos campos', async () => {
    miAgenciaMock.mockResolvedValue(agencia());
    misPlanesMock.mockResolvedValue([
      { ...plan('Guatapé', []), id: 'p-2', horas_reembolso_parcial: 24, porcentaje_reembolso_parcial: 50 },
    ]);
    actualizarMock.mockResolvedValue();
    const { container } = render(PlanFormPage, { planId: 'p-2' });
    await screen.findByText('Editar plan');
    await fireEvent.input(screen.getByLabelText(PARCIAL_H), { target: { value: '' } });
    await fireEvent.input(screen.getByLabelText(PARCIAL_PCT), { target: { value: '' } });
    expect(textoViajero()).toContain('Menos de 48 horas: sin reembolso.');
    await fireEvent.submit(container.querySelector('form')!);
    await vi.waitFor(() => expect(actualizarMock).toHaveBeenCalledTimes(1));
    const d = actualizarMock.mock.calls[0][0];
    expect(d.horasReembolsoParcial ?? null).toBeNull();
    expect(d.porcentajeReembolsoParcial ?? null).toBeNull();
  });
});

describe('PlanForm · resumen de errores', () => {
  const resumen = () => screen.queryByRole('group', { name: 'Revisa estos puntos para poder guardar' });

  it('antes de intentar guardar no hay resumen de errores', () => {
    render(PlanFormPage);
    expect(resumen()).toBeNull();
  });

  it('al fallar la validación lista cada punto, lleva el foco al resumen y no guarda', async () => {
    const { container } = render(PlanFormPage);
    await fireEvent.input(screen.getByLabelText(PARCIAL_H), { target: { value: '48' } });
    await fireEvent.input(screen.getByLabelText(PARCIAL_PCT), { target: { value: '50' } });
    await fireEvent.submit(container.querySelector('form')!);

    const grupo = await vi.waitFor(() => resumen()!);
    expect(grupo).toBeTruthy();
    await vi.waitFor(() => expect(document.activeElement).toBe(grupo));
    const items = within(grupo).getAllByRole('button').map((b) => texto(b));
    expect(items).toEqual([
      'El precio debe ser mayor a 0.',
      'La ventana parcial debe ser menor que la de cancelación gratuita.',
    ]);
    expect(crearMock).not.toHaveBeenCalled();
  });

  it('cada punto del resumen lleva el foco a su campo', async () => {
    const { container } = render(PlanFormPage);
    await fireEvent.input(screen.getByLabelText(PARCIAL_H), { target: { value: '48' } });
    await fireEvent.input(screen.getByLabelText(PARCIAL_PCT), { target: { value: '50' } });
    await fireEvent.submit(container.querySelector('form')!);
    const grupo = await vi.waitFor(() => resumen()!);

    await fireEvent.click(within(grupo).getByRole('button', { name: 'El precio debe ser mayor a 0.' }));
    expect(document.activeElement).toBe(screen.getByLabelText(/^Precio final/));

    await fireEvent.click(within(grupo).getByRole('button', { name: /^La ventana parcial/ }));
    expect(document.activeElement).toBe(screen.getByLabelText(PARCIAL_H));
  });

  it('el campo con error también lo muestra junto a sí, lo marca inválido y lo conecta con su mensaje', async () => {
    const { container } = render(PlanFormPage);
    await fireEvent.submit(container.querySelector('form')!);
    await vi.waitFor(() => expect(resumen()).toBeTruthy());
    const precio = screen.getByLabelText(/^Precio final/);
    expect(precio.getAttribute('aria-invalid')).toBe('true');
    const mensaje = document.getElementById(precio.getAttribute('aria-describedby')!.split(' ').at(-1)!)!;
    expect(texto(mensaje)).toBe('El precio debe ser mayor a 0.');
    expect(mensaje.getAttribute('role')).toBe('alert');
  });

  it('el resumen se vacía solo cuando se corrigen los puntos', async () => {
    const { container } = render(PlanFormPage);
    await fireEvent.submit(container.querySelector('form')!);
    await vi.waitFor(() => expect(resumen()).toBeTruthy());
    await fireEvent.input(screen.getByLabelText(/^Precio final/), { target: { value: '150000' } });
    await vi.waitFor(() => expect(resumen()).toBeNull());
  });

  it('un error del servidor al guardar se ve arriba, en el resumen, y conserva lo escrito', async () => {
    miAgenciaMock.mockResolvedValue(agencia());
    crearMock.mockRejectedValue(new Error('Failed to fetch'));
    const { container } = render(PlanFormPage);
    await llenarBasicos(container);
    await fireEvent.submit(container.querySelector('form')!);
    const grupo = await screen.findByRole('group', { name: 'No pudimos guardar el plan' });
    expect(texto(grupo)).toContain('No hay conexión con el servidor');
    expect(texto(grupo)).toContain('Lo que escribiste sigue aquí');
    await vi.waitFor(() => expect(document.activeElement).toBe(grupo));
    expect((screen.getByLabelText(/^Precio final/) as HTMLInputElement).value).toBe('150000');
    expect(goto).not.toHaveBeenCalled();
  });
});

describe('PlanForm · lenguaje y accesibilidad de los campos', () => {
  it('el precio se explica en lenguaje llano, sin remitir al «Anexo 4»', () => {
    const { container } = render(PlanFormPage);
    const t = texto(container);
    expect(t).not.toContain('Anexo');
    const precio = screen.getByLabelText(/^Precio final/);
    const ayuda = document.getElementById(precio.getAttribute('aria-describedby')!)!;
    expect(texto(ayuda)).toBe('Es el precio final: lo que ve el viajero es lo que paga, sin cargos ocultos.');
  });

  it('las categorías se eligen por su nombre, sin emojis, y el selector tiene nombre accesible', async () => {
    render(PlanFormPage);
    const boton = screen.getByRole('button', { name: /^Categoría/ });
    expect(texto(boton)).toContain('Aventura');
    await fireEvent.click(boton);
    const opciones = screen.getAllByRole('option').map((o) => texto(o));
    expect(opciones).toEqual(['Aventura', 'Naturaleza', 'Cultura', 'Gastronomía', 'Relax', 'Urbano']);
  });

  it('la duración tiene cantidad y unidad con nombre accesible', () => {
    render(PlanFormPage);
    expect(screen.getByLabelText('Cantidad de la duración')).toBeTruthy();
    expect(screen.getByRole('button', { name: /^Unidad de la duración/ })).toBeTruthy();
  });

  it('los pasos del itinerario tienen nombre accesible', async () => {
    render(PlanFormPage);
    await fireEvent.click(screen.getByRole('button', { name: 'Agregar paso' }));
    expect(screen.getByLabelText('Hora del paso 1')).toBeTruthy();
    expect(screen.getByLabelText('Actividad del paso 1')).toBeTruthy();
  });

  it('un plan nuevo avisa que se guarda como borrador y volver dice a dónde', () => {
    render(PlanFormPage);
    expect(texto(document.body)).toContain('Se guarda como borrador');
    expect(screen.getByRole('link', { name: 'Volver a planes' }).getAttribute('href')).toBe('#/planes');
  });

  it('mientras carga el plan a editar muestra marcadores de carga', () => {
    miAgenciaMock.mockReturnValue(new Promise(() => {}));
    render(PlanFormPage, { planId: 'p-1' });
    expect(screen.getByRole('status', { name: 'Cargando' })).toBeTruthy();
  });

  it('si el plan a editar no se puede cargar no abre un formulario vacío que crearía otro plan', async () => {
    miAgenciaMock.mockRejectedValue(new Error('Failed to fetch'));
    const { container } = render(PlanFormPage, { planId: 'p-1' });
    await screen.findByText('No pudimos abrir el plan');
    expect(texto(container)).toContain('No hay conexión con el servidor');
    expect(container.querySelector('form')).toBeNull();
    expect(screen.getByRole('link', { name: 'Volver a planes' }).getAttribute('href')).toBe('#/planes');
  });

  it('si el plan a editar ya no existe lo dice en vez de abrir un formulario vacío', async () => {
    miAgenciaMock.mockResolvedValue(agencia());
    misPlanesMock.mockResolvedValue([]);
    const { container } = render(PlanFormPage, { planId: 'p-9' });
    await screen.findByText('No pudimos abrir el plan');
    expect(texto(container)).toContain('No encontramos este plan');
    expect(container.querySelector('form')).toBeNull();
  });
});

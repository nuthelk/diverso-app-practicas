import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { tick } from 'svelte';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/svelte';
import { fecha, plan, texto } from '$tests/fixtures';

vi.mock('$lib/features/ventas/api/ventas.api', () => ({ misVentas: vi.fn() }));
vi.mock('$lib/features/planes/api/planes.api', () => ({
  publicarPlan: vi.fn(),
  agregarFecha: vi.fn(),
  eliminarFecha: vi.fn(),
}));

import { misVentas } from '$lib/features/ventas/api/ventas.api';
import { publicarPlan } from '$lib/features/planes/api/planes.api';
import DialogoConfirmar from '$lib/shared/ui/DialogoConfirmar.svelte';
import { responder } from '$lib/shared/lib/confirmar.svelte';
import PlanesPage from '$lib/features/planes/pages/PlanesPage.svelte';
import type { Plan } from '$lib/features/planes/model/plan';

const misVentasMock = vi.mocked(misVentas);
const publicarMock = vi.mocked(publicarPlan);

const respuesta = (planes: Plan[]) => ({ agencia: null, planes, ventas: [] });
const conPlanes = (...planes: Plan[]) => misVentasMock.mockResolvedValue(respuesta(planes));

/** Un plan con salidas lejos en el futuro (nunca vencen en la prueba). */
const guatape = (extra: Partial<Plan> = {}): Plan => ({
  ...plan('Guatapé', [
    fecha({ fecha: '2099-01-10', cupo_total: 12, cupo_disponible: 5 }),
    fecha({ fecha: '2099-01-17', cupo_total: 10, cupo_disponible: 10 }),
  ]),
  id: 'p-1',
  categoria: 'naturaleza',
  precio_cop: 150000,
  estado: 'borrador',
  ...extra,
});

let disparador: HTMLElement;
beforeEach(() => {
  render(DialogoConfirmar);
});
afterEach(() => {
  responder(false); // una pregunta sin responder no pasa a la prueba siguiente
  cleanup();
  vi.resetAllMocks();
});

async function montar(...planes: Plan[]) {
  conPlanes(...planes);
  const r = render(PlanesPage);
  await screen.findByRole('heading', { level: 1, name: 'Planes' });
  return r;
}

const tarjeta = (titulo: string) => screen.getByRole('heading', { level: 2, name: titulo }).closest('li') as HTMLElement;

describe('Planes · lista', () => {
  it('mientras carga muestra marcadores de carga, no una pantalla en blanco', async () => {
    misVentasMock.mockReturnValue(new Promise(() => {}));
    render(PlanesPage);
    expect(screen.getByRole('status', { name: 'Cargando' })).toBeTruthy();
    expect(screen.queryByRole('heading', { level: 1 })).toBeNull();
  });

  it('un título, el resumen y una sola acción principal: Nuevo plan', async () => {
    await montar(guatape(), { ...guatape(), id: 'p-2', titulo: 'Jardín', estado: 'publicado' });
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(texto(document.body)).toContain('2 planes · 1 publicado');
    const nuevo = screen.getByRole('link', { name: 'Nuevo plan' });
    expect(nuevo.getAttribute('href')).toBe('#/planes/nuevo');
    expect(nuevo.classList.contains('btn-primario')).toBe(true);
  });

  it('cada plan muestra estado, destino, categoría en texto, duración, precio y reseñas', async () => {
    await montar(guatape({ rating_promedio: 4.5, reviews_count: 3 }));
    const t = texto(tarjeta('Guatapé'));
    expect(t).toContain('Borrador');
    expect(t).toContain('Antioquia · Naturaleza · 1 día');
    expect(t).toMatch(/\$\s?150\.000/);
    expect(t).toContain('4,5 de 5 · 3 reseñas');
  });

  it('un plan sin reseñas lo dice en vez de mostrar un 0,0', async () => {
    await montar(guatape({ rating_promedio: 0, reviews_count: 0 }));
    expect(texto(tarjeta('Guatapé'))).toContain('Sin reseñas todavía');
  });

  it('muestra las próximas salidas con su ocupación', async () => {
    await montar(guatape());
    const t = texto(tarjeta('Guatapé'));
    expect(t).toContain('Próximas salidas');
    expect(t).toContain('5 libres de 12');
    expect(t).toContain('10 libres de 10');
  });

  it('sin fechas con cupos lo avisa y dice qué hacer', async () => {
    await montar(guatape({ plan_dates: [] }));
    expect(texto(tarjeta('Guatapé'))).toContain('Sin fechas con cupos — agrega fechas para vender');
  });

  it('no usa emojis ni símbolos decorativos', async () => {
    await montar(guatape({ fotos: [] }));
    expect(texto(document.body)).not.toMatch(/\p{Extended_Pictographic}|★/u);
  });

  it('un borrador tiene Publicar como acción principal; Editar y Fechas y cupos quedan en estilo discreto', async () => {
    await montar(guatape());
    const c = within(tarjeta('Guatapé'));
    expect(c.getByRole('button', { name: 'Publicar' }).classList.contains('btn-primario')).toBe(true);
    expect(c.getByRole('link', { name: 'Editar' }).classList.contains('btn-texto')).toBe(true);
    expect(c.getByRole('link', { name: 'Editar' }).getAttribute('href')).toBe('#/planes/editar/p-1');
    expect(c.getByRole('button', { name: 'Fechas y cupos' }).classList.contains('btn-texto')).toBe(true);
    expect(c.getAllByRole('button').filter((b) => b.classList.contains('btn-primario'))).toHaveLength(1);
  });

  it('un plan publicado tiene Fechas y cupos como acción principal y Despublicar discreto', async () => {
    await montar(guatape({ estado: 'publicado' }));
    const c = within(tarjeta('Guatapé'));
    expect(c.getByRole('button', { name: 'Fechas y cupos' }).classList.contains('btn-primario')).toBe(true);
    expect(c.getByRole('button', { name: 'Despublicar' }).classList.contains('btn-texto')).toBe(true);
    expect(c.getAllByRole('button').filter((b) => b.classList.contains('btn-primario'))).toHaveLength(1);
  });
});

describe('Planes · estados', () => {
  it('sin planes explica qué hacer y ofrece crear el primero', async () => {
    conPlanes();
    render(PlanesPage);
    await screen.findByText('Aún no tienes planes');
    expect(screen.getByRole('link', { name: 'Nuevo plan' }).getAttribute('href')).toBe('#/planes/nuevo');
  });

  it('si falla la carga dice qué pasó y permite reintentar', async () => {
    misVentasMock.mockRejectedValueOnce(new Error('Failed to fetch'));
    render(PlanesPage);
    await screen.findByText(/No hay conexión con el servidor/);
    conPlanes(guatape());
    await fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    await screen.findByRole('heading', { level: 2, name: 'Guatapé' });
    expect(misVentasMock).toHaveBeenCalledTimes(2);
  });
});

describe('Planes · publicar y despublicar piden confirmación', () => {
  it('Publicar pregunta y dice que los viajeros lo verán; confirmar llama a la API y recarga', async () => {
    await montar(guatape());
    publicarMock.mockResolvedValue();
    await fireEvent.click(within(tarjeta('Guatapé')).getByRole('button', { name: 'Publicar' }));
    await tick();

    const dialogo = screen.getByRole('alertdialog', { name: '¿Publicar «Guatapé»?' });
    expect(texto(dialogo)).toContain('Los viajeros lo verán en la app y podrán reservar');
    expect(publicarMock).not.toHaveBeenCalled();

    await fireEvent.click(within(dialogo).getByRole('button', { name: 'Publicar' }));
    await vi.waitFor(() => expect(publicarMock).toHaveBeenCalledWith('p-1', true));
    await vi.waitFor(() => expect(misVentasMock).toHaveBeenCalledTimes(2));
  });

  it('cancelar la pregunta no llama a la API ni recarga', async () => {
    await montar(guatape());
    await fireEvent.click(within(tarjeta('Guatapé')).getByRole('button', { name: 'Publicar' }));
    await tick();
    await fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    await tick();
    expect(publicarMock).not.toHaveBeenCalled();
    expect(misVentasMock).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });

  it('publicar un plan sin fechas con cupos avisa que nadie podrá reservar todavía', async () => {
    await montar(guatape({ plan_dates: [] }));
    await fireEvent.click(within(tarjeta('Guatapé')).getByRole('button', { name: 'Publicar' }));
    await tick();
    expect(texto(screen.getByRole('alertdialog'))).toContain('no tiene fechas con cupos');
  });

  it('Despublicar pregunta y dice que dejarán de verlo; confirmar llama a la API con false', async () => {
    await montar(guatape({ estado: 'publicado' }));
    publicarMock.mockResolvedValue();
    await fireEvent.click(within(tarjeta('Guatapé')).getByRole('button', { name: 'Despublicar' }));
    await tick();

    const dialogo = screen.getByRole('alertdialog', { name: '¿Despublicar «Guatapé»?' });
    expect(texto(dialogo)).toContain('Los viajeros dejarán de verlo en la app');
    expect(publicarMock).not.toHaveBeenCalled();

    await fireEvent.click(within(dialogo).getByRole('button', { name: 'Despublicar' }));
    await vi.waitFor(() => expect(publicarMock).toHaveBeenCalledWith('p-1', false));
  });

  it('cancelar con Escape tampoco despublica', async () => {
    await montar(guatape({ estado: 'publicado' }));
    await fireEvent.click(within(tarjeta('Guatapé')).getByRole('button', { name: 'Despublicar' }));
    await tick();
    await fireEvent.keyDown(screen.getByRole('alertdialog'), { key: 'Escape' });
    await tick();
    expect(publicarMock).not.toHaveBeenCalled();
  });
});

describe('Planes · fechas y cupos', () => {
  it('el botón abre el diálogo con el foco dentro; Escape lo cierra y el foco vuelve al botón', async () => {
    await montar(guatape());
    disparador = within(tarjeta('Guatapé')).getByRole('button', { name: 'Fechas y cupos' });
    disparador.focus();
    await fireEvent.click(disparador);

    const dialogo = await screen.findByRole('dialog', { name: 'Fechas y cupos' });
    expect(dialogo.contains(document.activeElement)).toBe(true);

    await fireEvent.keyDown(document.body, { key: 'Escape' });
    await tick();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(disparador);
  });

  it('al cerrar el diálogo recarga la lista sin volver a los marcadores de carga', async () => {
    await montar(guatape());
    await fireEvent.click(within(tarjeta('Guatapé')).getByRole('button', { name: 'Fechas y cupos' }));
    await screen.findByRole('dialog');
    await fireEvent.keyDown(document.body, { key: 'Escape' });
    await vi.waitFor(() => expect(misVentasMock).toHaveBeenCalledTimes(2));
    expect(screen.queryByRole('status', { name: 'Cargando' })).toBeNull();
    expect(screen.getByRole('heading', { level: 2, name: 'Guatapé' })).toBeTruthy();
  });
});

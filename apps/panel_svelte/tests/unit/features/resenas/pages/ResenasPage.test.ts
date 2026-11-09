import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/svelte';
import { texto } from '$tests/fixtures';

vi.mock('$lib/features/resenas/api/resenas.api', () => ({ resenasAgencia: vi.fn() }));

import { resenasAgencia } from '$lib/features/resenas/api/resenas.api';
import ResenasPage from '$lib/features/resenas/pages/ResenasPage.svelte';
import type { ResenaAgencia } from '$lib/features/resenas/model/resenas';

const mock = vi.mocked(resenasAgencia);

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

/** `n` reseñas, de la más nueva a la más antigua, con ids desde `desde`. */
const pagina = (n: number, desde = 0): ResenaAgencia[] =>
  Array.from({ length: n }, (_, i) => ({
    id: `r-${desde + i}`,
    calificacion: 5 - ((desde + i) % 5),
    comentario: `Comentario ${desde + i}`,
    nombre_corto: 'Laura V.',
    plan_titulo: 'Río Claro 2 días con hospedaje',
    created_at: '2026-10-01T20:00:00Z',
  }));

const items = (c: ParentNode) => [...c.querySelectorAll('[data-resena]')];
const masBoton = () => screen.queryByRole('button', { name: 'Cargar más' });

async function pintar() {
  const r = render(ResenasPage);
  await screen.findByRole('heading', { level: 1, name: 'Reseñas' });
  return r;
}

describe('ResenasPage · primera página', () => {
  it('muestra el título, el esqueleto mientras carga y pide 20 desde 0', async () => {
    let entregar!: (r: ResenaAgencia[]) => void;
    mock.mockReturnValue(new Promise((res) => (entregar = res)));
    render(ResenasPage);
    expect(screen.getByRole('status', { name: 'Cargando' })).toBeTruthy();
    expect(mock).toHaveBeenCalledWith({ limite: 20, desde: 0 });
    entregar(pagina(2));
    expect(await screen.findByRole('heading', { level: 1, name: 'Reseñas' })).toBeTruthy();
    expect(screen.queryByRole('status', { name: 'Cargando' })).toBeNull();
  });

  it('cada reseña lleva estrellas, comentario, nombre corto, plan y fecha', async () => {
    mock.mockResolvedValue([
      { ...pagina(1)[0], calificacion: 4, comentario: 'Paisajes de postal.', created_at: '2026-10-31T20:00:00Z' },
      { ...pagina(1, 1)[0], calificacion: 5, comentario: null, nombre_corto: 'Daniela C.', plan_titulo: 'Cascadas' },
    ]);
    const { container } = await pintar();
    const lista = items(container);
    expect(lista).toHaveLength(2);
    expect(within(lista[0] as HTMLElement).getByRole('img', { name: '4 de 5 estrellas' })).toBeTruthy();
    expect(texto(lista[0].querySelector('blockquote'))).toBe('Paisajes de postal.');
    expect(texto(lista[0].querySelector('figcaption'))).toMatch(/^Laura V\. · Río Claro 2 días con hospedaje · /);
    expect(lista[0].querySelector('time')!.getAttribute('title')).toBe('31 de octubre de 2026');
    expect(lista[1].querySelector('blockquote')).toBeNull(); // solo estrellas
    expect(texto(lista[1].querySelector('figcaption'))).toMatch(/^Daniela C\. · Cascadas · /);
  });

  it('con menos de 20 no ofrece «Cargar más»', async () => {
    mock.mockResolvedValue(pagina(7));
    const { container } = await pintar();
    expect(items(container)).toHaveLength(7);
    expect(masBoton()).toBeNull();
  });

  it('sin reseñas lo dice simple', async () => {
    mock.mockResolvedValue([]);
    const { container } = await pintar();
    expect(items(container)).toHaveLength(0);
    expect(screen.getByText('Aún no tienes reseñas')).toBeTruthy();
    expect(masBoton()).toBeNull();
  });

  it('si falla, avisa con el error y «Reintentar» vuelve a pedir la primera página', async () => {
    mock.mockRejectedValueOnce(new Error('sin red')).mockResolvedValueOnce(pagina(3));
    const { container } = await pintar();
    expect(screen.getByRole('alert')).toBeTruthy();
    expect(items(container)).toHaveLength(0);
    await fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    await waitFor(() => expect(items(container)).toHaveLength(3));
    expect(screen.queryByRole('alert')).toBeNull();
    expect(mock).toHaveBeenNthCalledWith(2, { limite: 20, desde: 0 });
  });
});

describe('ResenasPage · cargar más', () => {
  it('con 20 ofrece «Cargar más»: pide desde 20, agrega las siguientes y lo oculta si la página viene corta', async () => {
    mock.mockResolvedValueOnce(pagina(20)).mockResolvedValueOnce(pagina(5, 20));
    const { container } = await pintar();
    expect(items(container)).toHaveLength(20);
    await fireEvent.click(masBoton()!);
    await waitFor(() => expect(items(container)).toHaveLength(25));
    expect(mock).toHaveBeenNthCalledWith(2, { limite: 20, desde: 20 });
    expect(items(container).map((i) => texto(i.querySelector('blockquote'))).slice(19, 22)).toEqual([
      'Comentario 19',
      'Comentario 20',
      'Comentario 21',
    ]);
    expect(masBoton()).toBeNull();
  });

  it('una página completa de repetidas sigue ofreciendo «Cargar más» y la siguiente pide desde 40', async () => {
    mock.mockResolvedValueOnce(pagina(20)).mockResolvedValueOnce(pagina(20)).mockResolvedValueOnce(pagina(1, 20));
    const { container } = await pintar();
    await fireEvent.click(masBoton()!);
    await waitFor(() => expect(mock).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(masBoton()).toBeTruthy());
    expect(items(container)).toHaveLength(20);
    await fireEvent.click(masBoton()!);
    await waitFor(() => expect(items(container)).toHaveLength(21));
    expect(mock).toHaveBeenNthCalledWith(3, { limite: 20, desde: 40 });
  });

  it('tras «Cargar más» el foco va a la primera reseña nueva, aunque el botón desaparezca', async () => {
    mock.mockResolvedValueOnce(pagina(20)).mockResolvedValueOnce(pagina(5, 20));
    const { container } = await pintar();
    masBoton()!.focus();
    await fireEvent.click(masBoton()!);
    await waitFor(() => expect(items(container)).toHaveLength(25));
    await waitFor(() => expect(document.activeElement).toBe(items(container)[20].closest('li')));
    expect(masBoton()).toBeNull();
  });

  it('con otra página completa sigue ofreciéndolo y pide desde 40', async () => {
    mock.mockResolvedValueOnce(pagina(20)).mockResolvedValueOnce(pagina(20, 20)).mockResolvedValueOnce([]);
    const { container } = await pintar();
    await fireEvent.click(masBoton()!);
    await waitFor(() => expect(items(container)).toHaveLength(40));
    expect(masBoton()).toBeTruthy();
    await fireEvent.click(masBoton()!);
    await waitFor(() => expect(masBoton()).toBeNull());
    expect(mock).toHaveBeenNthCalledWith(3, { limite: 20, desde: 40 });
    expect(items(container)).toHaveLength(40);
  });

  it('mientras llega la página el botón queda deshabilitado: un segundo clic no repite la petición', async () => {
    let entregar!: (r: ResenaAgencia[]) => void;
    mock.mockResolvedValueOnce(pagina(20)).mockReturnValueOnce(new Promise((res) => (entregar = res)));
    const { container } = await pintar();
    await fireEvent.click(masBoton()!);
    const boton = screen.getByRole('button', { name: /Cargando/ }) as HTMLButtonElement;
    expect(boton.disabled).toBe(true);
    await fireEvent.click(boton);
    expect(mock).toHaveBeenCalledTimes(2);
    entregar(pagina(1, 20));
    await waitFor(() => expect(items(container)).toHaveLength(21));
  });

  it('una reseña que se repite entre páginas (llegó una nueva en medio) no sale dos veces', async () => {
    mock.mockResolvedValueOnce(pagina(20)).mockResolvedValueOnce([pagina(1, 19)[0], ...pagina(3, 20)]);
    const { container } = await pintar();
    await fireEvent.click(masBoton()!);
    await waitFor(() => expect(items(container)).toHaveLength(23));
    expect(masBoton()).toBeNull(); // la página trajo menos de 20
  });

  it('si falla conserva lo cargado, avisa y «Reintentar» pide la misma página', async () => {
    mock.mockResolvedValueOnce(pagina(20)).mockRejectedValueOnce(new Error('sin red')).mockResolvedValueOnce(pagina(2, 20));
    const { container } = await pintar();
    await fireEvent.click(masBoton()!);
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(items(container)).toHaveLength(20);
    expect(screen.getByRole('heading', { level: 1, name: 'Reseñas' })).toBeTruthy();
    await fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    await waitFor(() => expect(items(container)).toHaveLength(22));
    expect(screen.queryByRole('alert')).toBeNull();
    expect(mock).toHaveBeenNthCalledWith(3, { limite: 20, desde: 20 });
    expect(masBoton()).toBeNull();
  });
});


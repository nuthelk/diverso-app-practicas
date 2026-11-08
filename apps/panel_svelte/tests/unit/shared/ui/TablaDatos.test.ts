import { afterEach, describe, expect, it } from 'vitest';
import { createRawSnippet, type Component } from 'svelte';
import { cleanup, render, screen, within } from '@testing-library/svelte';
import TablaDatosGenerica from '$lib/shared/ui/TablaDatos.svelte';
import type { Columna } from '$lib/shared/ui/TablaDatos.svelte';
import Metrica from '$lib/shared/ui/Metrica.svelte';
import FranjaMetricas from '$lib/shared/ui/FranjaMetricas.svelte';

// El componente es genérico en la fila; aquí las filas son `Fila`.
const TablaDatos = TablaDatosGenerica as unknown as Component<Record<string, unknown>>;

afterEach(cleanup);

type Fila = { id: string; plan: string; viajeros: number; vendido: string };
const FILAS: Fila[] = [
  { id: 'a', plan: 'Guatapé', viajeros: 14, vendido: '$ 2.310.000' },
  { id: 'b', plan: 'Río Claro', viajeros: 0, vendido: '$ 0' },
];
const COLUMNAS = [
  { clave: 'plan', titulo: 'Plan', principal: true },
  { clave: 'viajeros', titulo: 'Viajeros', num: true },
  { clave: 'vendido', titulo: 'Vendido', num: true },
];

const base = { caption: 'Salidas del período', columnas: COLUMNAS, filas: FILAS, clave: (f: Fila) => f.id };

describe('TablaDatos', () => {
  it('es una tabla con título accesible, cabeceras de columna y una fila por registro', () => {
    render(TablaDatos, base);
    const tabla = screen.getByRole('table', { name: 'Salidas del período' });
    expect(within(tabla).getAllByRole('columnheader').map((h) => h.textContent?.trim())).toEqual(['Plan', 'Viajeros', 'Vendido']);
    expect(within(tabla).getAllByRole('row')).toHaveLength(3); // cabecera + 2
    expect(within(tabla).getByRole('cell', { name: 'Guatapé' })).toBeTruthy();
  });

  it('muestra los valores tal cual, también el cero', () => {
    render(TablaDatos, base);
    expect(screen.getAllByRole('cell').map((c) => c.textContent?.trim())).toEqual(['Guatapé', '14', '$ 2.310.000', 'Río Claro', '0', '$ 0']);
  });

  it('cada celda lleva su título en data-th (así se arma la tarjeta en pantallas angostas) y la principal se marca', () => {
    render(TablaDatos, base);
    const celdas = screen.getAllByRole('cell');
    expect(celdas.slice(0, 3).map((c) => c.getAttribute('data-th'))).toEqual(['Plan', 'Viajeros', 'Vendido']);
    expect(celdas.map((c) => c.hasAttribute('data-principal'))).toEqual([true, false, false, true, false, false]);
  });

  it('las columnas numéricas se alinean con la clase num', () => {
    render(TablaDatos, base);
    expect(screen.getByRole('columnheader', { name: 'Vendido' }).classList.contains('num')).toBe(true);
    expect(screen.getByRole('cell', { name: '14' }).classList.contains('num')).toBe(true);
    expect(screen.getByRole('columnheader', { name: 'Plan' }).classList.contains('num')).toBe(false);
  });

  it('una celda se puede dibujar a medida', () => {
    const celda = createRawSnippet<[Fila, Columna]>((fila, col) => ({
      render: () => (col().clave === 'plan' ? `<button type="button">Ver ${fila().plan}</button>` : `<span>${(fila() as never)[col().clave]}</span>`),
    }));
    render(TablaDatos, { ...base, celda });
    expect(screen.getByRole('button', { name: 'Ver Guatapé' })).toBeTruthy();
  });

  it('sin filas muestra el estado vacío que entregue la pantalla, ocupando todas las columnas', () => {
    const vacio = createRawSnippet(() => ({ render: () => '<span>No hay salidas en este período</span>' }));
    const { container } = render(TablaDatos, { ...base, filas: [], vacio });
    expect(screen.getByText('No hay salidas en este período')).toBeTruthy();
    expect(container.querySelector('td[colspan="3"]')).toBeTruthy();
  });

  it('el pie (totales) va dentro de un tfoot', () => {
    const pie = createRawSnippet(() => ({ render: () => '<tr><th scope="row">Total</th><td>14</td><td>$ 2.310.000</td></tr>' }));
    const { container } = render(TablaDatos, { ...base, pie });
    expect(container.querySelector('tfoot')?.textContent).toContain('Total');
  });

  it('su envoltura lleva .tabla-datos, la que activa la vista de tarjetas', () => {
    const { container } = render(TablaDatos, base);
    expect(container.querySelector('.tabla-datos table.tabla')).toBeTruthy();
  });
});

describe('Metrica y FranjaMetricas', () => {
  const pintar = (props: Record<string, unknown>) => render(Metrica, { etiqueta: 'Vendido', valor: '$ 2.310.000', ...props });

  it('muestra etiqueta (dt) y valor (dd); la nota de apoyo solo si hay', () => {
    const { container } = pintar({});
    expect(container.querySelector('dt')?.textContent).toBe('Vendido');
    expect(container.querySelector('dd')?.textContent).toContain('$ 2.310.000');
    expect(container.querySelector('dd')?.textContent).not.toContain('Comisión');
    cleanup();
    const con = pintar({ sub: 'Comisión incluida' });
    expect(con.container.querySelector('dd')?.textContent).toContain('Comisión incluida');
  });

  it('un cero real se muestra', () => {
    const { container } = pintar({ valor: '0' });
    expect(container.querySelector('dd')?.textContent).toContain('0');
  });

  it('la principal va sobre el monte oscuro', () => {
    const { container } = pintar({ principal: true });
    const raiz = container.firstElementChild!;
    expect(raiz.classList.contains('monte')).toBe(true);
    expect(raiz.className).toContain('bg-bosque');
  });

  it('FranjaMetricas es una lista de definiciones que envuelve sus cifras', () => {
    const hijos = createRawSnippet(() => ({
      render: () => '<div class="tarjeta"><dt>Salidas</dt><dd>9</dd></div>',
    }));
    const { container } = render(FranjaMetricas, { children: hijos });
    const dl = container.querySelector('dl.franja')!;
    expect(dl).toBeTruthy();
    expect(dl.textContent).toContain('Salidas');
  });

  it('FranjaMetricas acepta el número de columnas de escritorio', () => {
    const hijos = createRawSnippet(() => ({ render: () => '<div class="tarjeta"></div>' }));
    const { container } = render(FranjaMetricas, { columnas: 4, children: hijos });
    expect((container.querySelector('dl') as HTMLElement).style.getPropertyValue('--franja-columnas')).toBe('4');
  });
});

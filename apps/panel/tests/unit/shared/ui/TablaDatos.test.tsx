import { afterEach, describe, expect, it } from 'vitest';
import type { ComponentProps } from 'react';
import { cleanup, render, screen, within } from '@testing-library/react';
import TablaDatos, { type Columna } from '@/shared/ui/TablaDatos';
import Metrica from '@/shared/ui/Metrica';
import FranjaMetricas from '@/shared/ui/FranjaMetricas';

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

// El componente es genérico en la fila; aquí las filas son `Fila`.
const base = { caption: 'Salidas del período', columnas: COLUMNAS, filas: FILAS, clave: (f: Fila) => f.id };
const tabla = (extra: Partial<ComponentProps<typeof TablaDatos<Fila>>> = {}) => <TablaDatos<Fila> {...base} {...extra} />;

describe('TablaDatos', () => {
  it('es una tabla con título accesible, cabeceras de columna y una fila por registro', () => {
    render(tabla());
    const t = screen.getByRole('table', { name: 'Salidas del período' });
    expect(within(t).getAllByRole('columnheader').map((h) => h.textContent?.trim())).toEqual(['Plan', 'Viajeros', 'Vendido']);
    expect(within(t).getAllByRole('row')).toHaveLength(3); // cabecera + 2
    expect(within(t).getByRole('cell', { name: 'Guatapé' })).toBeTruthy();
  });

  it('muestra los valores tal cual, también el cero', () => {
    render(tabla());
    expect(screen.getAllByRole('cell').map((c) => c.textContent?.trim())).toEqual(['Guatapé', '14', '$ 2.310.000', 'Río Claro', '0', '$ 0']);
  });

  it('cada celda lleva su título en data-th (así se arma la tarjeta en pantallas angostas) y la principal se marca', () => {
    render(tabla());
    const celdas = screen.getAllByRole('cell');
    expect(celdas.slice(0, 3).map((c) => c.getAttribute('data-th'))).toEqual(['Plan', 'Viajeros', 'Vendido']);
    expect(celdas.map((c) => c.hasAttribute('data-principal'))).toEqual([true, false, false, true, false, false]);
  });

  it('las columnas numéricas se alinean con la clase num', () => {
    render(tabla());
    expect(screen.getByRole('columnheader', { name: 'Vendido' }).classList.contains('num')).toBe(true);
    expect(screen.getByRole('cell', { name: '14' }).classList.contains('num')).toBe(true);
    expect(screen.getByRole('columnheader', { name: 'Plan' }).classList.contains('num')).toBe(false);
  });

  it('una celda se puede dibujar a medida', () => {
    const celda = (fila: Fila, col: Columna) =>
      col.clave === 'plan' ? <button type="button">Ver {fila.plan}</button> : <span>{String(fila[col.clave as keyof Fila])}</span>;
    render(tabla({ celda }));
    expect(screen.getByRole('button', { name: 'Ver Guatapé' })).toBeTruthy();
  });

  it('sin filas muestra el estado vacío que entregue la pantalla, ocupando todas las columnas', () => {
    const { container } = render(tabla({ filas: [], vacio: <span>No hay salidas en este período</span> }));
    expect(screen.getByText('No hay salidas en este período')).toBeTruthy();
    expect(container.querySelector('td[colspan="3"]')).toBeTruthy();
  });

  it('el pie (totales) va dentro de un tfoot', () => {
    const pie = (
      <tr>
        <th scope="row">Total</th>
        <td>14</td>
        <td>$ 2.310.000</td>
      </tr>
    );
    const { container } = render(tabla({ pie }));
    expect(container.querySelector('tfoot')?.textContent).toContain('Total');
  });

  it('su envoltura lleva .tabla-datos, la que activa la vista de tarjetas', () => {
    const { container } = render(tabla());
    expect(container.querySelector('.tabla-datos table.tabla')).toBeTruthy();
  });
});

describe('Metrica y FranjaMetricas', () => {
  const pintar = (props: Partial<ComponentProps<typeof Metrica>>) =>
    render(<Metrica etiqueta="Vendido" valor="$ 2.310.000" {...props} />);

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
    const { container } = render(
      <FranjaMetricas>
        <div className="tarjeta">
          <dt>Salidas</dt>
          <dd>9</dd>
        </div>
      </FranjaMetricas>,
    );
    const dl = container.querySelector('dl.franja')!;
    expect(dl).toBeTruthy();
    expect(dl.textContent).toContain('Salidas');
  });

  it('FranjaMetricas acepta el número de columnas de escritorio', () => {
    const { container } = render(
      <FranjaMetricas columnas={4}>
        <div className="tarjeta"></div>
      </FranjaMetricas>,
    );
    expect((container.querySelector('dl') as HTMLElement).style.getPropertyValue('--franja-columnas')).toBe('4');
  });
});

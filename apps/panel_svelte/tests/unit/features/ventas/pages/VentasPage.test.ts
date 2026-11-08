import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/svelte';
import { agencia, texto, venta } from '$tests/fixtures';

vi.mock('$lib/features/ventas/api/ventas.api', () => ({
  misVentas: vi.fn(),
}));

import { misVentas } from '$lib/features/ventas/api/ventas.api';
import VentasPage from '$lib/features/ventas/pages/VentasPage.svelte';

const misVentasMock = vi.mocked(misVentas);

afterEach(() => {
  vi.resetAllMocks();
});

const ventas = [
  venta({ booking_id: 'a', monto_total: 200000, comision: 24000, saldo_agencia: 176000 }),
  venta({
    booking_id: 'b',
    booking_estado: 'completada',
    monto_total: 100000,
    comision: 12000,
    saldo_agencia: 88000,
  }),
  venta({
    booking_id: 'c',
    booking_estado: 'pendiente_pago',
    pago_estado: null,
    monto_total: 50000,
    comision: 6000,
    saldo_agencia: 44000,
  }),
  venta({
    booking_id: 'd',
    booking_estado: 'cancelada',
    monto_total: 70000,
    comision: 8400,
    saldo_agencia: 61600,
  }),
];

/** Códigos de las filas visibles en la tabla (primera columna). */
function codigos(): string[] {
  return screen
    .getAllByRole('row')
    .slice(1)
    .map((fila) => texto(fila.querySelector('td')));
}

describe('Ventas', () => {
  it('resume solo las reservas pagadas y lista todas por defecto', async () => {
    misVentasMock.mockResolvedValue({ agencia: agencia({ comision_pct: 15 }), planes: [], ventas });
    const { container } = render(VentasPage);
    await screen.findByRole('heading', { name: 'Ventas' });
    const t = texto(container);

    expect(t).toContain('Ventas pagadas $ 300.000');
    expect(t).toContain('Comisión (15%) - $ 36.000');
    expect(t).toContain('Saldo a recibir $ 264.000');
    expect(codigos()).toEqual(['DV-a', 'DV-b', 'DV-c', 'DV-d']);
  });

  it('las cifras van en una franja y la tabla trae cabeceras en español corriente, no en mayúsculas ni siglas', async () => {
    misVentasMock.mockResolvedValue({ agencia: agencia(), planes: [], ventas });
    const { container } = render(VentasPage);
    await screen.findByRole('heading', { name: 'Ventas' });
    expect(container.querySelector('dl.franja')).toBeTruthy();
    expect(screen.getAllByRole('columnheader').map((h) => texto(h))).toEqual([
      'Código', 'Plan', 'Fecha', 'Viajeros', 'Monto', 'Comisión', 'Saldo', 'Estado',
    ]);
  });

  it('cada celda lleva su título y el código es la principal: en celular la fila pasa a tarjeta sin perder datos', async () => {
    misVentasMock.mockResolvedValue({ agencia: agencia(), planes: [], ventas });
    render(VentasPage);
    await screen.findByRole('heading', { name: 'Ventas' });
    const celdas = [...screen.getAllByRole('row')[1].querySelectorAll('td')];
    expect(celdas.map((td) => td.getAttribute('data-th'))).toEqual([
      'Código', 'Plan', 'Fecha', 'Viajeros', 'Monto', 'Comisión', 'Saldo', 'Estado',
    ]);
    expect(celdas.map((td) => td.hasAttribute('data-principal'))).toEqual([true, false, false, false, false, false, false, false]);
    expect(screen.queryByRole('list', { name: 'Ventas' })).toBeNull();
  });

  it('los filtros muestran cuántas ventas tiene cada uno y marcan el elegido con aria-pressed', async () => {
    misVentasMock.mockResolvedValue({ agencia: agencia(), planes: [], ventas });
    render(VentasPage);
    await screen.findByRole('heading', { name: 'Ventas' });
    const grupo = screen.getByRole('group', { name: 'Filtrar ventas' });
    const chips = within(grupo).getAllByRole('button');
    expect(chips.map((c) => texto(c))).toEqual(['Todas 4', 'Pagadas 2', 'Pendientes de pago 1']);
    expect(chips.map((c) => c.getAttribute('aria-pressed'))).toEqual(['true', 'false', 'false']);

    await fireEvent.click(screen.getByRole('button', { name: 'Pagadas 2' }));
    expect(chips.map((c) => c.getAttribute('aria-pressed'))).toEqual(['false', 'true', 'false']);
  });

  it('el filtro «Pagadas» deja confirmadas y completadas', async () => {
    misVentasMock.mockResolvedValue({ agencia: agencia(), planes: [], ventas });
    render(VentasPage);
    await screen.findByRole('heading', { name: 'Ventas' });
    await fireEvent.click(screen.getByRole('button', { name: 'Pagadas 2' }));
    expect(codigos()).toEqual(['DV-a', 'DV-b']);
  });

  it('el filtro «Pendientes de pago» deja solo pendiente_pago', async () => {
    misVentasMock.mockResolvedValue({ agencia: agencia(), planes: [], ventas });
    render(VentasPage);
    await screen.findByRole('heading', { name: 'Ventas' });
    await fireEvent.click(screen.getByRole('button', { name: 'Pendientes de pago 1' }));
    expect(codigos()).toEqual(['DV-c']);
  });

  it('un filtro sin resultados no finge que no hay ventas: lo dice y deja volver a ver todas', async () => {
    misVentasMock.mockResolvedValue({ agencia: agencia(), planes: [], ventas: [ventas[0]] });
    render(VentasPage);
    await screen.findByRole('heading', { name: 'Ventas' });
    await fireEvent.click(screen.getByRole('button', { name: 'Pendientes de pago 0' }));
    expect(screen.getByText('Ninguna venta pendiente de pago')).toBeTruthy();
    expect(screen.queryByText('Sin ventas aquí')).toBeNull();
    expect(screen.getByRole('button', { name: 'Pendientes de pago 0' }).getAttribute('aria-pressed')).toBe('true');

    await fireEvent.click(screen.getByRole('button', { name: 'Ver todas' }));
    expect(codigos()).toEqual(['DV-a']);
  });

  it('sin agencia usa la comisión por defecto del 12 %', async () => {
    misVentasMock.mockResolvedValue({ agencia: null, planes: [], ventas: [] });
    const { container } = render(VentasPage);
    await screen.findByRole('heading', { name: 'Ventas' });
    expect(texto(container)).toContain('Comisión (12%) - $ 0');
    expect(screen.getByText('Sin ventas aquí')).toBeTruthy();
  });

  it('no repite el aviso de «Modo de prueba» del marco y enlaza la conciliación con Liquidaciones', async () => {
    misVentasMock.mockResolvedValue({ agencia: agencia(), planes: [], ventas });
    const { container } = render(VentasPage);
    await screen.findByRole('heading', { name: 'Ventas' });
    const t = texto(container);
    expect(t).not.toContain('Modo de prueba');
    expect(t).not.toContain('Wompi');
    expect(t).not.toContain('no se mueve dinero real');
    expect(screen.getByRole('link', { name: 'Liquidaciones' }).getAttribute('href')).toBe('#/liquidaciones');
  });

  it('si falla la carga muestra el error', async () => {
    misVentasMock.mockRejectedValue(new Error('sin red'));
    render(VentasPage);
    expect(await screen.findByText('Sin conexión')).toBeTruthy();
  });
});

import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/svelte';
import { agencia, texto, venta } from '$tests/fixtures';

vi.mock('./ventas.api', () => ({
  misVentas: vi.fn(),
}));

import { misVentas } from './ventas.api';
import VentasPage from './VentasPage.svelte';

const misVentasMock = vi.mocked(misVentas);

afterEach(() => vi.resetAllMocks());

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
    await screen.findByText('Ventas y conciliación');
    const t = texto(container);

    expect(t).toContain('Ventas pagadas $ 300.000');
    expect(t).toContain('Comisión (15%) - $ 36.000');
    expect(t).toContain('Saldo a recibir $ 264.000');
    expect(codigos()).toEqual(['DV-a', 'DV-b', 'DV-c', 'DV-d']);
  });

  it('el filtro «Pagadas» deja confirmadas y completadas', async () => {
    misVentasMock.mockResolvedValue({ agencia: agencia(), planes: [], ventas });
    render(VentasPage);
    await screen.findByText('Ventas y conciliación');
    await fireEvent.click(screen.getByRole('button', { name: 'Pagadas' }));
    expect(codigos()).toEqual(['DV-a', 'DV-b']);
  });

  it('el filtro «Pendientes de pago» deja solo pendiente_pago', async () => {
    misVentasMock.mockResolvedValue({ agencia: agencia(), planes: [], ventas });
    render(VentasPage);
    await screen.findByText('Ventas y conciliación');
    await fireEvent.click(screen.getByRole('button', { name: 'Pendientes de pago' }));
    expect(codigos()).toEqual(['DV-c']);
  });

  it('sin agencia usa la comisión por defecto del 12 %', async () => {
    misVentasMock.mockResolvedValue({ agencia: null, planes: [], ventas: [] });
    const { container } = render(VentasPage);
    await screen.findByText('Ventas y conciliación');
    expect(texto(container)).toContain('Comisión (12%) - $ 0');
    expect(screen.getByText('Sin ventas aquí')).toBeTruthy();
  });

  it('refleja el modo de prueba de Wompi y enlaza la conciliación con Liquidaciones', async () => {
    misVentasMock.mockResolvedValue({ agencia: agencia(), planes: [], ventas });
    const { container } = render(VentasPage);
    await screen.findByText('Ventas y conciliación');
    const t = texto(container);
    expect(t).toContain('Modo de prueba (Wompi sandbox)');
    expect(t).toContain('no se mueve dinero real');
    expect(t).not.toContain('pagos simulados');
    expect(screen.getByRole('link', { name: 'Liquidaciones' }).getAttribute('href')).toBe('#/liquidaciones');
  });

  it('si falla la carga muestra el error', async () => {
    misVentasMock.mockRejectedValue(new Error('sin red'));
    render(VentasPage);
    expect(await screen.findByText('Sin conexión')).toBeTruthy();
  });
});

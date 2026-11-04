import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/svelte';
import { agencia, simularPantalla, texto, venta } from '$tests/fixtures';
import { cop, fechaCorta } from '$lib/shared/lib/format';

vi.mock('$lib/features/ventas/api/ventas.api', () => ({
  misVentas: vi.fn(),
}));

import { misVentas } from '$lib/features/ventas/api/ventas.api';
import VentasPage from '$lib/features/ventas/pages/VentasPage.svelte';

const misVentasMock = vi.mocked(misVentas);

afterEach(() => {
  vi.resetAllMocks();
  vi.unstubAllGlobals();
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

describe('Ventas · celular (lista de tarjetas)', () => {
  const sinNbsp = (s: string) => s.replace(/ /g, ' ');
  /** Etiqueta → valor de cada dato de una tarjeta. */
  const datos = (li: Element) =>
    Object.fromEntries([...li.querySelectorAll('dl > div')].map((d) => [texto(d.querySelector('dt')), texto(d.querySelector('dd'))]));
  const ids = (c: HTMLElement) => [...c.querySelectorAll('[data-lista-tarjetas] > li')].map((li) => li.getAttribute('data-venta'));

  it('en pantalla ancha sigue la tabla y no hay lista de tarjetas', async () => {
    simularPantalla(false);
    misVentasMock.mockResolvedValue({ agencia: agencia(), planes: [], ventas });
    const { container } = render(VentasPage);
    await screen.findByText('Ventas y conciliación');
    expect(container.querySelector('table')).toBeTruthy();
    expect(container.querySelector('[data-lista-tarjetas]')).toBeNull();
  });

  it('por debajo de sm la tabla pasa a tarjetas con los mismos datos, sin ocultar ninguno', async () => {
    simularPantalla(true);
    misVentasMock.mockResolvedValue({ agencia: agencia(), planes: [], ventas });
    const { container } = render(VentasPage);
    await screen.findByText('Ventas y conciliación');
    expect(container.querySelector('table')).toBeNull();
    const tarjetas = [...container.querySelectorAll('[data-lista-tarjetas] > li')];
    expect(tarjetas).toHaveLength(4);

    const v = ventas[0];
    expect(texto(tarjetas[0])).toContain(v.codigo);
    expect(texto(tarjetas[0])).toContain(v.plan_titulo);
    expect(texto(tarjetas[0])).toContain('Confirmada');
    expect(datos(tarjetas[0])).toEqual({
      Fecha: fechaCorta(v.fecha),
      Pax: String(v.pax),
      Monto: sinNbsp(cop(v.monto_total)),
      Comisión: `- ${sinNbsp(cop(v.comision))}`,
      Saldo: sinNbsp(cop(v.saldo_agencia)),
    });
    expect(texto(tarjetas[2])).toContain('Pendiente');
    expect(texto(tarjetas[3])).toContain('Cancelada');
  });

  it('los filtros y los totales funcionan igual con tarjetas', async () => {
    simularPantalla(true);
    misVentasMock.mockResolvedValue({ agencia: agencia({ comision_pct: 15 }), planes: [], ventas });
    const { container } = render(VentasPage);
    await screen.findByText('Ventas y conciliación');
    expect(texto(container)).toContain('Ventas pagadas $ 300.000');
    await fireEvent.click(screen.getByRole('button', { name: 'Pagadas' }));
    expect(ids(container)).toEqual(['a', 'b']);
    await fireEvent.click(screen.getByRole('button', { name: 'Pendientes de pago' }));
    expect(ids(container)).toEqual(['c']);
  });

  it('sin ventas muestra el mismo vacío, no una lista', async () => {
    simularPantalla(true);
    misVentasMock.mockResolvedValue({ agencia: null, planes: [], ventas: [] });
    const { container } = render(VentasPage);
    expect(await screen.findByText('Sin ventas aquí')).toBeTruthy();
    expect(container.querySelector('[data-lista-tarjetas]')).toBeNull();
  });
});

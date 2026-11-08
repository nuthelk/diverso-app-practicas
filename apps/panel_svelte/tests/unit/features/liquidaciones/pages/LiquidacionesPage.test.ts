import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import { agencia, cuentaResumen, itemLiquidacion, liquidacion, texto } from '$tests/fixtures';

vi.mock('$lib/features/agencias/api/agencias.api', () => ({
  miAgencia: vi.fn(),
}));
vi.mock('$lib/features/liquidaciones/api/liquidaciones.api', () => ({
  misLiquidaciones: vi.fn(),
  cuentasResumen: vi.fn(),
  serviciosPrestados: vi.fn(),
  liquidacionDetalle: vi.fn(),
}));

import {
  cuentasResumen,
  liquidacionDetalle,
  misLiquidaciones,
  serviciosPrestados,
} from '$lib/features/liquidaciones/api/liquidaciones.api';
import { miAgencia } from '$lib/features/agencias/api/agencias.api';
import LiquidacionesPage from '$lib/features/liquidaciones/pages/LiquidacionesPage.svelte';
import LiquidacionDetallePage from '$lib/features/liquidaciones/pages/LiquidacionDetallePage.svelte';

const miAgenciaMock = vi.mocked(miAgencia);
const misLiquidacionesMock = vi.mocked(misLiquidaciones);
const cuentasMock = vi.mocked(cuentasResumen);
const serviciosMock = vi.mocked(serviciosPrestados);
const detalleMock = vi.mocked(liquidacionDetalle);

afterEach(() => {
  vi.resetAllMocks();
});

/** Texto de cada celda de una fila de la tabla. */
const celdas = (fila: Element) => [...fila.querySelectorAll('td')].map((td) => texto(td));

const semanal = liquidacion({ id: 'liq-s' });
const anticipo = liquidacion({
  id: 'liq-a',
  tipo: 'anticipo',
  periodo_inicio: '2026-02-04',
  periodo_fin: '2026-02-05',
  monto_bruto: 90000,
  comision: 10800,
  monto_neto: 79200,
  anticipos_descontados: 0,
  monto_a_pagar: 79200,
  estado: 'pagada_prueba',
  referencia_prueba: 'PRUEBA-20260203-ABC123DEF4',
});

function preparar(parcial: { agencia?: ReturnType<typeof agencia> | null; cuentas?: ReturnType<typeof cuentaResumen>[]; servicios?: number } = {}) {
  miAgenciaMock.mockResolvedValue(parcial.agencia === undefined ? agencia() : parcial.agencia);
  misLiquidacionesMock.mockResolvedValue([semanal, anticipo]);
  cuentasMock.mockResolvedValue(parcial.cuentas ?? [cuentaResumen()]);
  serviciosMock.mockResolvedValue(parcial.servicios ?? 12);
}

describe('Liquidaciones', () => {
  it('lista periodo, tipo, bruto, comisión, neto, anticipos descontados, a pagar y estado', async () => {
    preparar();
    const { container } = render(LiquidacionesPage);
    await screen.findByRole('heading', { name: 'Liquidaciones' });
    await screen.findByText('2 feb – 8 feb 2026');

    const filas = screen.getAllByRole('row').slice(1);
    expect(filas).toHaveLength(2);
    expect(celdas(filas[0])).toEqual([
      '2 feb – 8 feb 2026', 'Semanal', '$ 400.000', '- $ 48.000', '$ 352.000', '$ 79.200', '$ 272.800', 'Pendiente',
    ]);
    expect(celdas(filas[1])).toEqual([
      '4 feb – 5 feb 2026', 'Anticipo', '$ 90.000', '- $ 10.800', '$ 79.200', '$ 0', '$ 79.200',
      'Pagada (prueba) PRUEBA-20260203-ABC123DEF4',
    ]);
    const cabecera = [...container.querySelectorAll('th')].map((th) => texto(th));
    expect(cabecera).toEqual([
      'Periodo', 'Tipo', 'Bruto', 'Comisión', 'Neto', 'Anticipos ya entregados', 'A pagar', 'Estado',
    ]);
  });

  it('no repite el aviso de «Modo de prueba» del marco y enlaza la conciliación con Ventas', async () => {
    preparar();
    const { container } = render(LiquidacionesPage);
    await screen.findByText('2 feb – 8 feb 2026');
    expect(texto(container)).not.toContain('Dispersión de prueba');
    expect(texto(container)).not.toContain('Modo de prueba');
    const ventas = screen.getByRole('link', { name: 'Ventas' });
    expect(ventas.getAttribute('href')).toBe('#/ventas');
  });

  it('el detalle de cada periodo enlaza a su liquidación', async () => {
    preparar();
    render(LiquidacionesPage);
    const enlace = await screen.findByRole('link', { name: '2 feb – 8 feb 2026' });
    expect(enlace.getAttribute('href')).toBe('#/liquidaciones/liq-s');
  });

  it('resume lo pendiente y lo dispersado en prueba en una franja de cifras', async () => {
    preparar();
    const { container } = render(LiquidacionesPage);
    await screen.findByText('2 feb – 8 feb 2026');
    const t = texto(container);
    expect(t).toContain('Pendiente de dispersar $ 272.800');
    expect(t).toContain('Dispersado (prueba) $ 79.200');
    expect(container.querySelector('dl.franja')).toBeTruthy();
  });

  it('cada celda lleva su título y el periodo es la principal: en celular la fila pasa a tarjeta sin perder datos', async () => {
    preparar();
    render(LiquidacionesPage);
    await screen.findByText('2 feb – 8 feb 2026');
    const celdasFila = [...screen.getAllByRole('row')[1].querySelectorAll('td')];
    expect(celdasFila.map((td) => td.getAttribute('data-th'))).toEqual([
      'Periodo', 'Tipo', 'Bruto', 'Comisión', 'Neto', 'Anticipos ya entregados', 'A pagar', 'Estado',
    ]);
    expect(celdasFila.map((td) => td.hasAttribute('data-principal'))).toEqual([true, false, false, false, false, false, false, false]);
    expect(celdasFila[0].querySelector('a')!.getAttribute('href')).toBe('#/liquidaciones/liq-s');
  });

  it('muestra la cuenta solo con los 4 últimos dígitos', async () => {
    preparar();
    const { container } = render(LiquidacionesPage);
    await screen.findByText('2 feb – 8 feb 2026');
    const t = texto(container);
    expect(t).toContain('Cuenta para dispersiones: Bancolombia · Ahorros •••• 4321');
    expect(screen.getByRole('link', { name: 'Cambiar' }).getAttribute('href')).toBe('#/cuenta-dispersiones');
  });

  it('sin cuenta registrada invita a registrarla', async () => {
    preparar({ cuentas: [] });
    const { container } = render(LiquidacionesPage);
    await screen.findByText('2 feb – 8 feb 2026');
    expect(texto(container)).toContain('Aún no registras tu cuenta para dispersiones');
    expect(screen.getByRole('link', { name: 'Registrarla' }).getAttribute('href')).toBe('#/cuenta-dispersiones');
  });

  it('explica el anticipo según los servicios prestados y el bloqueo', async () => {
    preparar({ servicios: 7 });
    const a = render(LiquidacionesPage);
    await screen.findByText('2 feb – 8 feb 2026');
    expect(texto(a.container)).toContain('se habilita con 10 servicios prestados; llevas 7');
    a.unmount();

    preparar({ servicios: 12 });
    const b = render(LiquidacionesPage);
    await screen.findByText('2 feb – 8 feb 2026');
    expect(texto(b.container)).toContain('Recibes un anticipo del 30 % del neto 48 horas antes de cada salida (12 servicios prestados)');
    b.unmount();

    preparar({ agencia: agencia({ anticipo_bloqueado: true }) });
    const c = render(LiquidacionesPage);
    await screen.findByText('2 feb – 8 feb 2026');
    expect(texto(c.container)).toContain('Tus anticipos están bloqueados');
  });

  it('en la lista, una negativa pendiente y una compensada se leen sin ambigüedad', async () => {
    preparar();
    misLiquidacionesMock.mockResolvedValue([
      liquidacion({ id: 'neg', periodo_inicio: '2026-02-09', periodo_fin: '2026-02-15', monto_a_pagar: -8800 }),
      liquidacion({ id: 'comp', estado: 'compensada', compensada_en: 'neg', monto_a_pagar: -1000 }),
      liquidacion({ id: 'cero', estado: 'sin_saldo', monto_a_pagar: 0, periodo_inicio: '2026-01-26', periodo_fin: '2026-02-01' }),
    ]);
    const { container } = render(LiquidacionesPage);
    await screen.findByText('9 feb – 15 feb 2026');
    const estados = screen.getAllByRole('row').slice(1).map((f) => celdas(f).at(-1));
    expect(estados).toEqual([
      'Pendiente Se descontará de la próxima semanal',
      'Compensada',
      'Sin saldo',
    ]);
    // el total pendiente es neto: la negativa resta; compensada y sin saldo no cuentan
    expect(texto(container)).toContain('Pendiente de dispersar -$ 8.800');
  });

  it('sin liquidaciones muestra el estado vacío', async () => {
    preparar();
    misLiquidacionesMock.mockResolvedValue([]);
    render(LiquidacionesPage);
    expect(await screen.findByText('Aún no hay liquidaciones')).toBeTruthy();
  });

  it('sin agencia lo dice', async () => {
    preparar({ agencia: null });
    render(LiquidacionesPage);
    expect(await screen.findByText('Aún no tienes agencia')).toBeTruthy();
    expect(misLiquidacionesMock).not.toHaveBeenCalled();
  });

  it('si falla la carga muestra el error', async () => {
    miAgenciaMock.mockRejectedValue(new Error('sin red'));
    render(LiquidacionesPage);
    expect(await screen.findByText('Sin conexión')).toBeTruthy();
    expect(screen.getByText('sin red')).toBeTruthy();
  });
});

describe('LiquidacionDetalle', () => {
  const detalle = {
    ...semanal,
    liquidacion_items: [
      itemLiquidacion({ id: 'i1' }),
      itemLiquidacion({
        id: 'i2',
        booking_id: 'bk-2',
        tipo: 'ajuste',
        monto_bruto: -24000,
        comision: -2880,
        monto_neto: -21120,
        bookings: { codigo: 'DV-BBBB', pax: 1, plan_dates: { fecha: '2026-02-04', plans: { titulo: 'Jardín' } } },
      }),
    ],
  };

  it('muestra las cifras de la liquidación y los items con su concepto', async () => {
    detalleMock.mockResolvedValue(detalle);
    const { container } = render(LiquidacionDetallePage, { id: 'liq-s' });
    await screen.findByText('DV-AAAA');
    const t = texto(container);
    expect(detalleMock).toHaveBeenCalledWith('liq-s');
    expect(t).toContain('Liquidación semanal · 2 feb – 8 feb 2026');
    expect(t).not.toContain('Dispersión de prueba');
    expect(t).not.toContain('Modo de prueba');
    expect(container.querySelector('dl.franja')).toBeTruthy();
    expect(t).toContain('Bruto $ 400.000');
    expect(t).toContain('Comisión $ 48.000');
    expect(t).toContain('Neto $ 352.000');
    expect(t).toContain('Anticipos ya entregados $ 79.200');
    expect(t).toContain('A pagar $ 272.800');
    expect(t).not.toContain('descontados');

    const filas = screen.getAllByRole('row').slice(1);
    const [a, b] = filas.map(celdas);
    expect([a[0], a[1], ...a.slice(3)]).toEqual(['DV-AAAA', 'Guatapé', 'Servicio', '$ 100.000', '$ 12.000', '$ 88.000']);
    expect([b[0], b[1], ...b.slice(3)]).toEqual(['DV-BBBB', 'Jardín', 'Ajuste por reembolso', '-$ 24.000', '-$ 2.880', '-$ 21.120']);
  });

  it('explica en una línea cada concepto especial, y solo los que aparecen en la liquidación', async () => {
    detalleMock.mockResolvedValue(detalle);
    const a = render(LiquidacionDetallePage, { id: 'liq-s' });
    await screen.findByText('DV-AAAA');
    const t = texto(a.container);
    expect(t).toContain('Ajuste por reembolso: devuelve un anticipo que el reembolso dejó sin respaldo.');
    expect(t).not.toContain('Retención por cancelación:');
    expect(t).not.toContain('Saldo de liquidación anterior:');
    expect(t).not.toContain('Bruto − comisión = neto');
    a.unmount();

    detalleMock.mockResolvedValue({
      ...semanal,
      liquidacion_items: [
        itemLiquidacion({ id: 'r1', tipo: 'retencion' }),
        itemLiquidacion({ id: 's1', booking_id: null as unknown as string, tipo: 'saldo_anterior', bookings: null }),
      ],
    });
    const b = render(LiquidacionDetallePage, { id: 'liq-s' });
    await screen.findByText('DV-AAAA');
    const u = texto(b.container);
    expect(u).toContain('Retención por cancelación: lo que no se reembolsó al viajero por la cancelación, menos la comisión.');
    expect(u).toContain('Saldo de liquidación anterior: absorbe una liquidación que quedó en cero o negativa.');
    expect(u).not.toContain('Ajuste por reembolso:');
  });

  it('una liquidación ya ejecutada muestra su referencia', async () => {
    detalleMock.mockResolvedValue({ ...detalle, estado: 'pagada_prueba', referencia_prueba: 'PRUEBA-20260209-XYZ' });
    const { container } = render(LiquidacionDetallePage, { id: 'liq-s' });
    await screen.findByText('DV-AAAA');
    expect(texto(container)).toContain('Referencia: PRUEBA-20260209-XYZ');
    expect(texto(container)).toContain('Pagada (prueba)');
  });

  it('muestra la retención por cancelación y el saldo de la liquidación anterior', async () => {
    detalleMock.mockResolvedValue({
      ...semanal,
      monto_neto: 79200,
      anticipos_descontados: 0,
      monto_a_pagar: 79200,
      liquidacion_items: [
        itemLiquidacion({
          id: 'r1',
          tipo: 'retencion',
          monto_bruto: 50000,
          comision: 6000,
          monto_neto: 44000,
          bookings: { codigo: 'DV-CCCC', pax: 2, plan_dates: { fecha: '2026-02-04', plans: { titulo: 'Jardín' } } },
        }),
        itemLiquidacion({
          id: 's1',
          booking_id: null as unknown as string,
          tipo: 'saldo_anterior',
          monto_bruto: -8800,
          comision: 0,
          monto_neto: -8800,
          bookings: null,
        }),
      ],
    });
    render(LiquidacionDetallePage, { id: 'liq-s' });
    await screen.findByText('DV-CCCC');
    const [ret, saldo] = screen.getAllByRole('row').slice(1).map(celdas);
    expect([ret[0], ret[1], ...ret.slice(3)]).toEqual(['DV-CCCC', 'Jardín', 'Retención por cancelación', '$ 50.000', '$ 6.000', '$ 44.000']);
    expect([saldo[0], saldo[1], ...saldo.slice(3)]).toEqual(['—', '—', 'Saldo de liquidación anterior', '-$ 8.800', '$ 0', '-$ 8.800']);
  });

  it('una liquidación compensada enlaza con la que absorbió su saldo', async () => {
    detalleMock.mockResolvedValue({
      ...semanal,
      estado: 'compensada',
      compensada_en: 'liq-nueva',
      monto_a_pagar: -8800,
      liquidacion_items: [itemLiquidacion()],
    });
    const { container } = render(LiquidacionDetallePage, { id: 'liq-s' });
    await screen.findByText('DV-AAAA');
    expect(texto(container)).toContain('Compensada: su saldo se descontó en otra liquidación.');
    expect(texto(container)).toContain('Compensada');
    const enlace = screen.getByRole('link', { name: 'Ver la liquidación que la absorbió' });
    expect(enlace.getAttribute('href')).toBe('#/liquidaciones/liq-nueva');
  });

  it('una liquidación pendiente con saldo negativo avisa que se descontará de la próxima', async () => {
    detalleMock.mockResolvedValue({ ...semanal, monto_a_pagar: -8800, liquidacion_items: [itemLiquidacion()] });
    const { container } = render(LiquidacionDetallePage, { id: 'liq-s' });
    await screen.findByText('DV-AAAA');
    expect(texto(container)).toContain('Saldo negativo: se descontará automáticamente de la próxima liquidación semanal.');
  });

  it('una liquidación sin saldo lo explica', async () => {
    detalleMock.mockResolvedValue({ ...semanal, estado: 'sin_saldo', monto_a_pagar: 0, liquidacion_items: [itemLiquidacion()] });
    const { container } = render(LiquidacionDetallePage, { id: 'liq-s' });
    await screen.findByText('DV-AAAA');
    expect(texto(container)).toContain('Sin saldo por dispersar: los anticipos ya cubrieron este periodo.');
    expect(texto(container)).toContain('Sin saldo');
  });

  it('una liquidación normal no muestra notas de saldo', async () => {
    detalleMock.mockResolvedValue({ ...semanal, liquidacion_items: [itemLiquidacion()] });
    const { container } = render(LiquidacionDetallePage, { id: 'liq-s' });
    await screen.findByText('DV-AAAA');
    expect(texto(container)).not.toContain('Saldo negativo');
    expect(texto(container)).not.toContain('Sin saldo por dispersar');
    expect(screen.queryByRole('link', { name: 'Ver la liquidación que la absorbió' })).toBeNull();
  });

  it('si no existe (o no es de la agencia) lo dice', async () => {
    detalleMock.mockResolvedValue(null);
    render(LiquidacionDetallePage, { id: 'otra' });
    expect(await screen.findByText('No encontramos esta liquidación')).toBeTruthy();
  });

  it('si falla la carga muestra el error', async () => {
    detalleMock.mockRejectedValue(new Error('sin permisos'));
    render(LiquidacionDetallePage, { id: 'x' });
    expect(await screen.findByText('sin permisos')).toBeTruthy();
  });
});

describe('Detalle · reservas de la liquidación', () => {
  it('las reservas van en una tabla con cabeceras en español corriente y cada celda con su título (en celular, tarjeta)', async () => {
    detalleMock.mockResolvedValue({ ...semanal, liquidacion_items: [itemLiquidacion({ id: 'a' })] });
    const { container } = render(LiquidacionDetallePage, { id: 'liq-s' });
    await screen.findByText('DV-AAAA');
    expect([...container.querySelectorAll('th')].map((th) => texto(th))).toEqual([
      'Reserva', 'Plan', 'Fecha', 'Concepto', 'Bruto', 'Comisión', 'Neto',
    ]);
    const celdasFila = [...screen.getAllByRole('row')[1].querySelectorAll('td')];
    expect(celdasFila.map((td) => td.getAttribute('data-th'))).toEqual([
      'Reserva', 'Plan', 'Fecha', 'Concepto', 'Bruto', 'Comisión', 'Neto',
    ]);
    expect(celdasFila[0].hasAttribute('data-principal')).toBe(true);
  });

  it('un ajuste o un neto negativo se marca en la tinta de urgencia', async () => {
    detalleMock.mockResolvedValue({
      ...semanal,
      liquidacion_items: [
        itemLiquidacion({ id: 'a' }),
        itemLiquidacion({
          id: 'b',
          tipo: 'ajuste',
          monto_bruto: -24000,
          comision: -2880,
          monto_neto: -21120,
          bookings: { codigo: 'DV-BBBB', pax: 1, plan_dates: { fecha: '2026-02-05', plans: { titulo: 'Jardín' } } },
        }),
      ],
    });
    render(LiquidacionDetallePage, { id: 'liq-s' });
    await screen.findByText('DV-AAAA');
    const [a, b] = screen.getAllByRole('row').slice(1);
    expect(a.innerHTML).not.toContain('text-heliconia');
    expect(b.innerHTML).toContain('text-heliconia');
  });

  it('sin reservas lo dice con palabras corrientes', async () => {
    detalleMock.mockResolvedValue({ ...semanal, liquidacion_items: [] });
    render(LiquidacionDetallePage, { id: 'liq-s' });
    expect(await screen.findByText('Sin reservas')).toBeTruthy();
  });
});

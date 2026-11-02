import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/svelte';
import { agencia, cuentaResumen, fecha, HOY, liquidacion, plan, texto, venta } from '@/test/fixtures';

vi.mock('@/features/ventas/ventas.api', () => ({
  misVentas: vi.fn(),
}));
vi.mock('@/features/liquidaciones/liquidaciones.api', () => ({
  misLiquidaciones: vi.fn(),
  cuentasResumen: vi.fn(),
}));
vi.mock('@/features/agencias/agencias.api', () => ({
  subirLogo: vi.fn(),
  quitarLogo: vi.fn(),
}));

import { cuentasResumen, misLiquidaciones } from '@/features/liquidaciones/liquidaciones.api';
import { misVentas } from '@/features/ventas/ventas.api';
import { quitarLogo, subirLogo } from '@/features/agencias/agencias.api';
import ResumenPage from './ResumenPage.svelte';

const misVentasMock = vi.mocked(misVentas);
const misLiquidacionesMock = vi.mocked(misLiquidaciones);
const cuentasMock = vi.mocked(cuentasResumen);

type Datos = Awaited<ReturnType<typeof misVentas>>;

/** Agencia al día (RNT vigente, cuenta registrada) salvo lo que se indique. */
function cargar(parcial: Partial<Datos> = {}, liquidaciones = [liquidacion()], cuentas = [cuentaResumen()]) {
  misVentasMock.mockResolvedValue({ agencia: agencia(), planes: [], ventas: [], ...parcial });
  misLiquidacionesMock.mockResolvedValue(liquidaciones);
  cuentasMock.mockResolvedValue(cuentas);
}

async function pintar() {
  const r = render(ResumenPage);
  await screen.findByRole('heading', { level: 1 });
  return r;
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(HOY); // domingo 25-oct-2026
});

afterEach(() => {
  vi.useRealTimers();
  vi.resetAllMocks();
  location.hash = '';
});

describe('ResumenPage', () => {
  it('lo urgente arriba, la plata abajo: avisos, próximas salidas por fecha y el mes', async () => {
    cargar(
      {
        agencia: agencia({ rnt_vigente_hasta: '2026-11-14' }),
        planes: [
          plan('Jardín', [
            fecha({ fecha: '2026-11-01', cupo_total: 20, cupo_disponible: 10 }),
            fecha({ fecha: '2027-03-01', cupo_total: 10, cupo_disponible: 5 }),
          ]),
          plan('Guatapé', [
            fecha({ fecha: '2025-01-01', cupo_total: 10, cupo_disponible: 0 }), // pasada
            fecha({ fecha: '2026-10-26', cupo_total: 10, cupo_disponible: 4 }),
            fecha({ fecha: '2026-11-10', cupo_total: 10, cupo_disponible: 10 }),
          ]),
        ],
        ventas: [
          venta({ booking_id: 'a', pax: 5, monto_total: 200000, comision: 24000, saldo_agencia: 176000 }),
          venta({
            booking_id: 'b',
            pax: 1,
            fecha: '2026-10-26',
            booking_estado: 'completada',
            monto_total: 100000,
            comision: 12000,
            saldo_agencia: 88000,
          }),
          venta({ booking_id: 'c', pax: 6, fecha: '2026-10-26', booking_estado: 'pendiente_pago', pago_estado: null }),
          venta({ booking_id: 'd', pax: 6, fecha: '2026-11-01', plan_titulo: 'Jardín' }), // viaja en noviembre
        ],
      },
      [liquidacion({ monto_a_pagar: 272800 }), liquidacion({ id: 'l2', monto_a_pagar: 100000 })],
    );

    const { container } = await pintar();
    const t = texto(container);

    expect(t).toContain('Hola, Aventuras Antioquia');
    expect(t).toContain('Verificada');
    expect(t).not.toContain('Comisión Diverso');

    // Avisos primero, luego salidas, luego la plata.
    expect(t).toMatch(/1 aviso.*Tu RNT vence el 14 de noviembre de 2026 \(en 20 días\).*PRÓXIMAS SALIDAS.*ESTE MES \(octubre\)/);

    // Salidas en orden de fecha (no de ocupación), con día relativo, personas pagadas y cupos libres.
    expect(t).toMatch(
      /Mañana Guatapé 1 persona · 4 cupos libres.*Dom 1 nov Jardín 6 personas · 10 cupos libres.*Mar 10 nov Guatapé 0 personas · 10 cupos libres/,
    );
    expect(t).not.toContain('2025');
    expect(t).not.toContain('2027');

    // Este mes: por fecha del viaje, comisión de la agencia, sin jerga.
    expect(t).toContain('viajes de octubre');
    expect(t).toContain('Vendiste $ 300.000');
    expect(t).toContain('Comisión 12% − $ 36.000');
    expect(t).toContain('Te corresponde $ 264.000');
    expect(t).toContain('Próximo pago: lun 26 oct · $ 372.800');
    expect(t).toContain('no se mueve dinero real');
    expect(t).not.toMatch(/\bpax\b|saldo|DV-/);
  });

  it('la comisión sale de la agencia, no de un 12 fijo', async () => {
    cargar({ agencia: agencia({ comision_pct: 15 }), ventas: [venta({ booking_id: 'a', comision: 30000 })] });
    const { container } = await pintar();
    expect(texto(container)).toContain('Comisión 15% − $ 30.000');
  });

  it('muestra hasta 5 salidas y «Ver todas» lleva a Planes', async () => {
    const fechas = ['01', '02', '03', '04', '05', '06', '07'].map((d) => fecha({ fecha: `2026-11-${d}` }));
    cargar({ planes: [plan('Guatapé', fechas)] });
    const { container } = await pintar();
    expect(container.querySelectorAll('[data-salida]')).toHaveLength(5);
    expect(container.querySelector('[data-salida]')?.textContent).toContain('Dom 1 nov');
    expect(screen.getByRole('link', { name: 'Ver todas' }).getAttribute('href')).toBe('#/planes');
  });

  it('marca con texto las salidas llenas, casi llenas y sin reservas', async () => {
    cargar({
      planes: [
        plan('Guatapé', [
          fecha({ fecha: '2026-10-26', cupo_total: 10, cupo_disponible: 0 }),
          fecha({ fecha: '2026-10-27', cupo_total: 10, cupo_disponible: 1 }),
          fecha({ fecha: '2026-10-28', cupo_total: 10, cupo_disponible: 10 }),
          fecha({ fecha: '2026-10-29', cupo_total: 10, cupo_disponible: 6 }),
        ]),
      ],
      ventas: [
        venta({ booking_id: 'a', fecha: '2026-10-26', pax: 10 }),
        venta({ booking_id: 'b', fecha: '2026-10-27', pax: 9 }),
        venta({ booking_id: 'c', fecha: '2026-10-29', pax: 4 }),
      ],
    });
    const { container } = await pintar();
    const filas = [...container.querySelectorAll('[data-salida]')].map((f) => texto(f));
    expect(filas[0]).toContain('Llena');
    expect(filas[1]).toContain('Casi llena');
    expect(filas[2]).toContain('Sin reservas');
    expect(filas[3]).not.toMatch(/Llena|Casi llena|Sin reservas/);
  });

  it.each([
    [{ estado_verificacion: 'rechazado' as const }, 'Verificación rechazada'],
    [{ estado_verificacion: 'pendiente' as const }, 'En verificación'],
    [{ rnt_vigente_hasta: '2026-01-01' }, 'Verificada · RNT vencido'],
    [{ rnt_vigente_hasta: null }, 'Verificada · RNT vencido'],
    [{ rnt_vigente_hasta: '2027-03-31' }, 'Verificada ✓ · RNT vigente hasta el 31 de marzo de 2027'],
  ])('línea de estado de la agencia %j', async (parcial, esperado) => {
    cargar({ agencia: agencia(parcial) });
    const { container } = await pintar();
    expect(texto(container.querySelector('header'))).toContain(esperado);
  });

  it('sin nada que hacer no hay bloque de avisos', async () => {
    cargar({ planes: [plan('Guatapé', [fecha({ fecha: '2026-11-01' })])] });
    const { container } = await pintar();
    expect(texto(container)).not.toMatch(/\d aviso/);
    expect(screen.queryByRole('region', { name: /aviso/i })).toBeNull();
  });

  it('cada aviso trae su acción: agregar fechas y registrar la cuenta', async () => {
    cargar({ planes: [plan('Guatapé', [fecha({ fecha: '2025-01-01' })])] }, [], []);
    const { container } = await pintar();
    expect(texto(container)).toContain('2 avisos');
    expect(screen.getByRole('link', { name: 'Agregar fechas' }).getAttribute('href')).toBe('#/planes');
    expect(screen.getByRole('link', { name: 'Registrar cuenta' }).getAttribute('href')).toBe('#/cuenta-dispersiones');
  });

  it('agencia en verificación: avisa y ofrece crear un plan', async () => {
    cargar({ agencia: agencia({ estado_verificacion: 'pendiente', rnt_vigente_hasta: null }) });
    const { container } = await pintar();
    expect(texto(container)).toContain('1 aviso');
    expect(texto(container)).toContain('Tu agencia está en verificación');
    expect(screen.getByRole('link', { name: 'Crear un plan' }).getAttribute('href')).toBe('#/planes/nuevo');
  });

  it('pide las ventas de viajes desde el primer día del mes, sin el tope de las últimas 200', async () => {
    cargar();
    await pintar();
    expect(misVentasMock).toHaveBeenCalledWith({ desde: '2026-10-01' });
  });

  it('sin salidas, sin pagos y sin ventas lo dice en lenguaje simple', async () => {
    cargar({}, []);
    const { container } = await pintar();
    const t = texto(container);
    expect(t).toContain('No tienes salidas próximas.');
    expect(t).toContain('Vendiste $ 0');
    expect(t).toContain('Te corresponde $ 0');
    expect(t).toContain('Próximo pago: no tienes pagos pendientes por ahora.');
  });

  it('si fallan los pagos, el resto del resumen sigue y lo avisa sin inventar nada', async () => {
    misVentasMock.mockResolvedValue({ agencia: agencia(), planes: [], ventas: [] });
    misLiquidacionesMock.mockRejectedValue(new Error('sin red'));
    cuentasMock.mockRejectedValue(new Error('sin red'));
    const { container } = await pintar();
    const t = texto(container);
    expect(t).toContain('ESTE MES (octubre)');
    expect(t).toContain('Próximo pago: no pudimos consultarlo ahora.');
    expect(t).not.toContain('Registrar cuenta');
  });

  it('«+ Nuevo plan» lleva al formulario y «Ver ventas» a Ventas', async () => {
    cargar();
    await pintar();
    expect(screen.getByRole('link', { name: 'Ver ventas' }).getAttribute('href')).toBe('#/ventas');
    await fireEvent.click(screen.getByRole('button', { name: '+ Nuevo plan' }));
    expect(location.hash).toBe('#/planes/nuevo');
  });

  it('el logo ya no está en medio: «Cambiar logo» lo abre y la subida y el quitado siguen funcionando', async () => {
    const url = 'http://127.0.0.1:54331/storage/v1/object/public/agency-logos/ag-1/logo-abc.png';
    cargar({ agencia: agencia({ id: 'ag-1' }) });
    vi.mocked(subirLogo).mockResolvedValue(url);
    vi.mocked(quitarLogo).mockResolvedValue();
    await pintar();
    expect(screen.queryByRole('heading', { name: 'Logo' })).toBeNull();
    expect(screen.queryByLabelText('Archivo del logo')).toBeNull();

    const abrir = screen.getByRole('button', { name: 'Cambiar logo' });
    expect(abrir.getAttribute('aria-expanded')).toBe('false');
    await fireEvent.click(abrir);
    expect(abrir.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByRole('heading', { name: 'Logo' })).toBeTruthy();
    expect(screen.getByRole('img', { name: 'Iniciales de Aventuras Antioquia' })).toBeTruthy();

    const archivo = new File([new Uint8Array(1000)], 'logo.png', { type: 'image/png' });
    await fireEvent.change(screen.getByLabelText('Archivo del logo'), { target: { files: [archivo] } });
    const img = (await screen.findByRole('img', { name: 'Logo de Aventuras Antioquia' })) as HTMLImageElement;
    expect(img.getAttribute('src')).toBe(url);
    expect(vi.mocked(subirLogo)).toHaveBeenCalledWith(expect.objectContaining({ id: 'ag-1' }), archivo);

    await fireEvent.click(screen.getByRole('button', { name: 'Quitar logo' }));
    await screen.findByRole('img', { name: 'Iniciales de Aventuras Antioquia' });
    expect(vi.mocked(quitarLogo)).toHaveBeenCalledWith(expect.objectContaining({ logo_url: url }));

    await fireEvent.click(abrir); // se vuelve a cerrar
    expect(screen.queryByRole('heading', { name: 'Logo' })).toBeNull();
  });

  it('junto al saludo hay un avatar pequeño con el logo de la agencia', async () => {
    const url = 'http://127.0.0.1:54331/storage/v1/object/public/agency-logos/ag-1/logo-abc.png';
    cargar({ agencia: agencia({ id: 'ag-1', logo_url: url }) });
    const { container } = await pintar();
    const img = container.querySelector('header img') as HTMLImageElement;
    expect(img.getAttribute('src')).toBe(url);
    expect(img.getAttribute('alt')).toBe(''); // decorativo: el nombre ya está en el saludo
  });

  it('sin agencia invita a registrarla', async () => {
    misVentasMock.mockResolvedValue({ agencia: null, planes: [], ventas: [] });
    render(ResumenPage);
    expect(await screen.findByText('Aún no tienes agencia')).toBeTruthy();
    expect(misLiquidacionesMock).not.toHaveBeenCalled();
  });

  it('si falla la carga muestra el error', async () => {
    misVentasMock.mockRejectedValue(new Error('sin red'));
    render(ResumenPage);
    expect(await screen.findByText('Sin conexión')).toBeTruthy();
    expect(screen.getByText('sin red')).toBeTruthy();
  });
});

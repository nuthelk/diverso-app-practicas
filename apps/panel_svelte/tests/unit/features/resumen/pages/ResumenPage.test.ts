import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/svelte';
import { agencia, cuentaResumen, fecha, HOY, liquidacion, plan, texto, venta } from '$tests/fixtures';

vi.mock('$lib/features/ventas/api/ventas.api', () => ({
  misVentas: vi.fn(),
}));
vi.mock('$lib/features/liquidaciones/api/liquidaciones.api', () => ({
  misLiquidaciones: vi.fn(),
  cuentasResumen: vi.fn(),
}));
vi.mock('$lib/features/agencias/api/agencias.api', () => ({
  subirLogo: vi.fn(),
  quitarLogo: vi.fn(),
}));

import { cuentasResumen, misLiquidaciones } from '$lib/features/liquidaciones/api/liquidaciones.api';
import { misVentas } from '$lib/features/ventas/api/ventas.api';
import { quitarLogo, subirLogo } from '$lib/features/agencias/api/agencias.api';
import ResumenPage from '$lib/features/resumen/pages/ResumenPage.svelte';

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

const kpi = (c: HTMLElement, clave: string) => c.querySelector(`[data-kpi="${clave}"]`) as HTMLElement;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(HOY); // domingo 25-oct-2026
});

afterEach(() => {
  vi.useRealTimers();
  vi.resetAllMocks();
});

describe('ResumenPage · encabezado', () => {
  it('saludo con el nombre, fecha de hoy en español, estado del RNT y «Nuevo plan»', async () => {
    cargar();
    const { container } = await pintar();
    const cabecera = container.querySelector('header') as HTMLElement;
    expect(texto(cabecera.querySelector('h1'))).toBe('Buen día, Aventuras Antioquia');
    expect(texto(cabecera)).toContain('Domingo 25 de octubre');
    expect(texto(cabecera)).toContain('RNT vigente hasta el 31 mar 2027');
    expect(screen.getByRole('link', { name: 'Nuevo plan' }).getAttribute('href')).toBe('#/planes/nuevo');
  });

  it.each([
    [{ estado_verificacion: 'rechazado' as const }, 'Rechazada'],
    [{ estado_verificacion: 'pendiente' as const }, 'En verificación'],
    [{ rnt_vigente_hasta: '2026-01-01' }, 'RNT vencido venció el 1 ene 2026'],
    [{ rnt_vigente_hasta: null }, 'Sin vigencia'],
    [{ rnt_vigente_hasta: '2026-11-14' }, 'RNT por vencer hasta el 14 nov 2026'],
    [{ rnt_vigente_hasta: '2027-03-31' }, 'RNT vigente hasta el 31 mar 2027'],
  ])('estado de la agencia %j', async (parcial, esperado) => {
    cargar({ agencia: agencia(parcial) });
    const { container } = await pintar();
    expect(texto(container.querySelector('header'))).toContain(esperado);
  });

  it('el logo no va en medio: «Cambiar logo» lo abre y la subida y el quitado siguen funcionando', async () => {
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
});

describe('ResumenPage · estructura', () => {
  it('lo urgente arriba, la plata abajo: avisos, indicadores, próximas salidas y el mes', async () => {
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

    expect(t).toMatch(
      /Buen día, Aventuras Antioquia.*Tu RNT vence el 14 de noviembre de 2026 \(en 20 días\).*Te corresponde este mes.*Próximas salidas.*Este mes · octubre/,
    );
    expect(t).not.toContain('Comisión Diverso');
    expect(t).not.toContain('2025');
    expect(t).not.toMatch(/\bpax\b|saldo|DV-/);
  });

  it('pide las ventas de los viajes que cubren el mes anterior y las series semanales', async () => {
    cargar();
    await pintar();
    expect(misVentasMock).toHaveBeenCalledWith({ desde: '2026-08-31' });
  });
});

describe('ResumenPage · avisos', () => {
  it('sin nada que hacer no hay bloque de avisos', async () => {
    cargar({ planes: [plan('Guatapé', [fecha({ fecha: '2026-11-01' })])] });
    await pintar();
    expect(screen.queryByRole('region', { name: 'Avisos' })).toBeNull();
  });

  it('cada aviso trae su acción: agregar fechas y registrar la cuenta', async () => {
    cargar({ planes: [plan('Guatapé', [fecha({ fecha: '2025-01-01' })])] }, [], []);
    await pintar();
    const avisos = screen.getByRole('region', { name: 'Avisos' });
    expect(within(avisos).getAllByRole('listitem')).toHaveLength(2);
    expect(within(avisos).getByRole('link', { name: 'Agregar fechas' }).getAttribute('href')).toBe('#/planes');
    expect(within(avisos).getByRole('link', { name: 'Registrar cuenta' }).getAttribute('href')).toBe(
      '#/cuenta-dispersiones',
    );
  });

  it('agencia en verificación: avisa y ofrece crear un plan', async () => {
    cargar({ agencia: agencia({ estado_verificacion: 'pendiente', rnt_vigente_hasta: null }) });
    await pintar();
    const avisos = screen.getByRole('region', { name: 'Avisos' });
    expect(texto(avisos)).toContain('Tu agencia está en verificación');
    expect(within(avisos).getByRole('link', { name: 'Crear un plan' }).getAttribute('href')).toBe('#/planes/nuevo');
  });
});

describe('ResumenPage · indicadores', () => {
  const planes = [
    plan('Guatapé', [
      fecha({ fecha: '2026-10-26', cupo_total: 10, cupo_disponible: 6 }),
      fecha({ fecha: '2026-10-28', cupo_total: 10, cupo_disponible: 5 }),
    ]),
  ];
  const ventas = [
    venta({ booking_id: 'a', fecha: '2026-10-26', pax: 4, monto_total: 200000, comision: 24000, saldo_agencia: 176000 }),
    venta({ booking_id: 'b', fecha: '2026-10-28', pax: 5, monto_total: 300000, comision: 36000, saldo_agencia: 264000 }),
    venta({ booking_id: 'c', fecha: '2026-10-08', pax: 1, monto_total: 100000, comision: 12000, saldo_agencia: 88000 }),
    venta({ booking_id: 'd', fecha: '2026-10-21', pax: 1, monto_total: 100000, comision: 12000, saldo_agencia: 88000 }),
  ];

  it('cuatro tarjetas con su valor y su nota, todo de datos reales', async () => {
    cargar({ planes, ventas }, [liquidacion({ monto_a_pagar: 372800 })]);
    const { container } = await pintar();
    expect(container.querySelectorAll('[data-kpi]')).toHaveLength(4);
    expect(texto(kpi(container, 'corresponde'))).toBe(
      'Te corresponde este mes $ 616.000 de $ 700.000 vendidos en octubre',
    );
    expect(texto(kpi(container, 'personas'))).toBe('Personas por viajar 9 repartidas en 2 salidas');
    expect(texto(kpi(container, 'pago'))).toBe('Próximo pago $ 372.800 Lunes 26 de oct · liquidación semanal');
    expect(texto(kpi(container, 'calificacion'))).toBe('Calificación de tus planes 4,5 3 reseñas en 1 plan');
  });

  it('las estrellas llenas son el promedio redondeado y no se leen como contenido', async () => {
    cargar({ planes });
    const { container } = await pintar();
    const estrellas = kpi(container, 'calificacion').querySelector('[data-estrellas]') as HTMLElement;
    expect(estrellas.getAttribute('aria-hidden')).toBe('true');
    expect(estrellas.querySelectorAll('svg')).toHaveLength(5);
    expect(estrellas.querySelectorAll('svg[data-vacia]')).toHaveLength(0); // 4,5 → 5 estrellas
  });

  it('las líneas aparecen solo cuando hay una serie real de al menos dos puntos', async () => {
    cargar({ planes, ventas }, [
      liquidacion({ periodo_inicio: '2026-10-05' }),
      liquidacion({ id: 'l2', periodo_inicio: '2026-10-12' }),
    ]);
    const { container } = await pintar();
    expect(kpi(container, 'corresponde').querySelector('svg[data-spark]')).not.toBeNull(); // semanas del 5 y del 19-oct
    expect(kpi(container, 'personas').querySelector('svg[data-spark]')).not.toBeNull(); // dos días con salidas
    expect(kpi(container, 'pago').querySelector('svg[data-spark]')).not.toBeNull(); // dos liquidaciones semanales
    expect(kpi(container, 'calificacion').querySelector('svg[data-spark]')).toBeNull(); // lleva estrellas
  });

  it('sin datos suficientes no se dibuja ninguna línea ni se inventa una', async () => {
    cargar({ planes: [plan('Guatapé', [fecha({ fecha: '2026-10-26' })])] }, [liquidacion()]);
    const { container } = await pintar();
    expect(container.querySelectorAll('svg[data-spark]')).toHaveLength(0);
  });

  it('sin salidas, ventas, pagos ni reseñas cada tarjeta lo dice en lenguaje simple', async () => {
    cargar({ planes: [{ ...plan('Guatapé', []), reviews_count: 0 }] }, []);
    const { container } = await pintar();
    expect(texto(kpi(container, 'corresponde'))).toContain('Sin ventas pagadas en octubre');
    expect(texto(kpi(container, 'personas'))).toContain('No tienes salidas próximas');
    expect(texto(kpi(container, 'pago'))).toContain('No tienes pagos pendientes por ahora');
    expect(texto(kpi(container, 'calificacion'))).toContain('Aún no tienes reseñas');
    expect(kpi(container, 'calificacion').querySelector('[data-estrellas]')).toBeNull();
  });

  it('si fallan los pagos, el resto sigue y la tarjeta lo avisa sin inventar nada', async () => {
    misVentasMock.mockResolvedValue({ agencia: agencia(), planes: [], ventas: [] });
    misLiquidacionesMock.mockRejectedValue(new Error('sin red'));
    cuentasMock.mockRejectedValue(new Error('sin red'));
    const { container } = await pintar();
    expect(texto(kpi(container, 'pago'))).toBe('Próximo pago — No pudimos consultarlo ahora');
    expect(texto(container)).toContain('Este mes · octubre');
    expect(texto(container)).toContain('No pudimos consultar tus pagos ahora.');
    expect(texto(container)).not.toContain('Registrar cuenta');
  });
});

describe('ResumenPage · próximas salidas', () => {
  it('línea de tiempo por día con día relativo, hora, personas, cupos y ocupación, en orden de fecha', async () => {
    cargar({
      planes: [
        {
          ...plan('Jardín', [fecha({ fecha: '2026-11-01', cupo_total: 20, cupo_disponible: 10 })]),
          hora_salida: '09:30:00',
        },
        plan('Guatapé', [
          fecha({ fecha: '2026-10-26', cupo_total: 10, cupo_disponible: 4 }),
          fecha({ fecha: '2026-11-01', cupo_total: 12, cupo_disponible: 9 }),
        ]),
      ],
      ventas: [
        venta({ booking_id: 'a', fecha: '2026-10-26', pax: 6 }),
        venta({ booking_id: 'b', fecha: '2026-11-01', pax: 3 }),
        venta({ booking_id: 'c', fecha: '2026-11-01', plan_titulo: 'Jardín', pax: 10 }),
      ],
    });
    const { container } = await pintar();
    const dias = [...container.querySelectorAll('[data-dia]')];
    expect(dias.map((d) => texto(d.querySelector('[data-dia-titulo]')))).toEqual([
      'Lunes 26 de octubre mañana',
      'Domingo 1 de noviembre en 7 días',
    ]);
    const filas = [...container.querySelectorAll('[data-salida]')].map((f) => texto(f));
    expect(filas).toEqual([
      '06:00 Guatapé 6 personas · 4 cupos libres 6 de 10',
      '06:00 Guatapé 3 personas · 9 cupos libres 3 de 12',
      '09:30 Jardín 10 personas · 10 cupos libres 10 de 20',
    ]);
    const barra = container.querySelector('[data-salida] [data-ocupacion]') as HTMLElement;
    expect(barra.style.width).toBe('60%');
  });

  it('muestra hasta 6 salidas y «Ver todas» lleva a Planes', async () => {
    const fechas = ['01', '02', '03', '04', '05', '06', '07', '08'].map((d) => fecha({ fecha: `2026-11-${d}` }));
    cargar({ planes: [plan('Guatapé', fechas)] });
    const { container } = await pintar();
    expect(container.querySelectorAll('[data-salida]')).toHaveLength(6);
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

  it('sin salidas lo dice y manda a Planes', async () => {
    cargar();
    const { container } = await pintar();
    expect(texto(container)).toContain('No tienes salidas próximas. Agrega fechas en la sección Planes.');
    expect(container.querySelectorAll('[data-salida]')).toHaveLength(0);
  });
});

describe('ResumenPage · este mes', () => {
  const tarjeta = (c: HTMLElement) => c.querySelector('[data-mes]') as HTMLElement;

  it('«Te corresponde» grande, lo vendido, la comisión de la agencia, el mes anterior y el próximo pago', async () => {
    cargar(
      {
        ventas: [
          venta({ booking_id: 'a', fecha: '2026-10-30', monto_total: 200000, comision: 24000, saldo_agencia: 176000 }),
          venta({
            booking_id: 'b',
            fecha: '2026-10-02',
            booking_estado: 'completada',
            monto_total: 100000,
            comision: 12000,
            saldo_agencia: 88000,
          }),
          venta({ booking_id: 'c', fecha: '2026-09-10', monto_total: 500000 }),
          venta({ booking_id: 'd', fecha: '2026-09-11', monto_total: 250000 }),
        ],
      },
      [liquidacion({ monto_a_pagar: 272800 }), liquidacion({ id: 'l2', monto_a_pagar: 100000 })],
    );
    const { container } = await pintar();
    const t = texto(tarjeta(container));
    expect(t).toContain('Este mes · octubre');
    expect(t).toContain('Reservas pagadas de los viajes de octubre.');
    expect(t).toContain('Te corresponde $ 264.000');
    expect(t).toContain('Vendiste $ 300.000');
    expect(t).toContain('Comisión 12 % − $ 36.000');
    expect(t).toContain('En septiembre: 2 reservas por $ 750.000.');
    expect(t).toContain('Próximo pago Lunes 26 de octubre $ 372.800');
    expect(within(tarjeta(container)).getByRole('link', { name: 'Ver ventas' }).getAttribute('href')).toBe('#/ventas');
  });

  it('la barra reparte lo que recibe y la comisión según lo vendido', async () => {
    cargar({
      ventas: [venta({ booking_id: 'a', fecha: '2026-10-30', monto_total: 200000, comision: 24000, saldo_agencia: 176000 })],
    });
    const { container } = await pintar();
    const partes = tarjeta(container).querySelectorAll('[data-reparto] > i');
    expect([...partes].map((p) => p.getAttribute('style'))).toEqual([
      expect.stringMatching(/flex-grow: ?88/),
      expect.stringMatching(/flex-grow: ?12/),
    ]);
  });

  it('la comisión sale de la agencia, no de un 12 fijo', async () => {
    cargar({
      agencia: agencia({ comision_pct: 15 }),
      ventas: [venta({ booking_id: 'a', fecha: '2026-10-30', comision: 30000 })],
    });
    const { container } = await pintar();
    expect(texto(tarjeta(container))).toContain('Comisión 15 % − $ 30.000');
  });

  it('sin ventas, sin mes anterior y sin pagos lo dice en lenguaje simple y no dibuja la barra', async () => {
    cargar({}, []);
    const { container } = await pintar();
    const t = texto(tarjeta(container));
    expect(t).toContain('Te corresponde $ 0');
    expect(t).toContain('Todavía no hay reservas pagadas en los viajes de octubre.');
    expect(t).toContain('En septiembre no hubo reservas pagadas.');
    expect(t).toContain('Próximo pago No tienes pagos pendientes por ahora.');
    expect(tarjeta(container).querySelector('[data-reparto]')).toBeNull();
  });
});

describe('ResumenPage · estados de carga', () => {
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

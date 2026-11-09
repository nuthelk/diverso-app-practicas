import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/svelte';
import { agencia, cuentaResumen, fecha, liquidacion, plan, texto, venta } from '$tests/fixtures';

vi.mock('$lib/features/ventas/api/ventas.api', () => ({
  misVentas: vi.fn(),
  ventas: vi.fn(),
}));
vi.mock('$lib/features/liquidaciones/api/liquidaciones.api', () => ({
  misLiquidaciones: vi.fn(),
  cuentasResumen: vi.fn(),
}));
vi.mock('$lib/features/resumen/api/resumen.api', () => ({
  quienesVan: vi.fn(),
  resenasRecientes: vi.fn(),
}));

import { cuentasResumen, misLiquidaciones } from '$lib/features/liquidaciones/api/liquidaciones.api';
import { misVentas, ventas } from '$lib/features/ventas/api/ventas.api';
import { quienesVan, resenasRecientes } from '$lib/features/resumen/api/resumen.api';
import ResumenPage from '$lib/features/resumen/pages/ResumenPage.svelte';
import { URL_RENOVAR_RNT } from '$lib/features/resumen/model/resumen';
import type { QuienViaja, ResenaReciente } from '$lib/features/resumen/model/quienes-van';
import type { VentaRow } from '$lib/features/ventas/model/ventas';
import { cop } from '$lib/shared/lib/format';

/** El tsconfig del panel no trae los tipos de Node: solo se usa `process.env.TZ`. */
declare const process: { env: Record<string, string | undefined> };

const misVentasMock = vi.mocked(misVentas);
const ventasMock = vi.mocked(ventas);
const misLiquidacionesMock = vi.mocked(misLiquidaciones);
const cuentasMock = vi.mocked(cuentasResumen);
const quienesMock = vi.mocked(quienesVan);
const resenasMock = vi.mocked(resenasRecientes);

type Datos = Awaited<ReturnType<typeof misVentas>>;

/** Martes 3-nov-2026, 12:00 en Bogotá: el período por defecto es noviembre (1–30) y la semana, del 2 al 8. */
const MARTES = new Date(Date.UTC(2026, 10, 3, 17, 0, 0));

/** Río Claro (06:30) y San Rafael (06:00), 24 cupos por salida; una fecha de diciembre solo para el calendario. */
const rio = {
  ...plan('Río Claro 2 días con hospedaje', [
    fecha({ id: 'rc5', fecha: '2026-11-05', cupo_total: 24, cupo_disponible: 19 }),
    fecha({ id: 'rc8', fecha: '2026-11-08', cupo_total: 24, cupo_disponible: 21 }),
    fecha({ id: 'rc11', fecha: '2026-11-11', cupo_total: 24, cupo_disponible: 20 }),
    fecha({ id: 'rc-dic', fecha: '2026-12-08', cupo_total: 24, cupo_disponible: 10 }),
  ]),
  id: 'rc',
  hora_salida: '06:30:00',
};
const san = {
  ...plan('Cascadas de San Rafael', [
    fecha({ id: 'sr8', fecha: '2026-11-08', cupo_total: 24, cupo_disponible: 22 }),
    fecha({ id: 'sr11', fecha: '2026-11-11', cupo_total: 24, cupo_disponible: 19 }),
  ]),
  id: 'sr',
  hora_salida: '06:00:00',
};

const fila = (plan_date_id: string, booking_id: string, nombre_corto: string, pax: number, estado: QuienViaja['estado'] = 'confirmada'): QuienViaja => ({
  plan_date_id,
  booking_id,
  codigo: `DV-${booking_id}`,
  nombre_corto,
  pax,
  estado,
});

const resena = (parcial: Partial<ResenaReciente> = {}): ResenaReciente => ({
  calificacion: 5,
  comentario: 'Plan muy bien armado',
  nombre_corto: 'Juan David Z.',
  plan_titulo: 'Río Claro 2 días con hospedaje',
  created_at: '2026-11-02T20:00:00Z',
  ...parcial,
});

/** Una venta de «Río Claro 2 días con hospedaje» (el título que cruza con la salida). */
const ventaRio = (parcial: Partial<VentaRow> & Pick<VentaRow, 'booking_id'>) => venta({ plan_titulo: 'Río Claro 2 días con hospedaje', fecha: '2026-11-05', ...parcial });

/** Agencia al día (RNT vigente, cuenta registrada) salvo lo que se indique. */
function cargar(
  parcial: Partial<Datos> = {},
  extras: { liquidaciones?: ReturnType<typeof liquidacion>[]; cuentas?: ReturnType<typeof cuentaResumen>[]; resenas?: ResenaReciente[]; reservas?: QuienViaja[]; porPeriodo?: VentaRow[] } = {},
) {
  misVentasMock.mockResolvedValue({ agencia: agencia(), planes: [rio, san], ventas: [], ...parcial });
  ventasMock.mockResolvedValue(extras.porPeriodo ?? []);
  misLiquidacionesMock.mockResolvedValue(extras.liquidaciones ?? [liquidacion()]);
  cuentasMock.mockResolvedValue(extras.cuentas ?? [cuentaResumen()]);
  resenasMock.mockResolvedValue(extras.resenas ?? []);
  quienesMock.mockResolvedValue(extras.reservas ?? []);
}

async function pintar() {
  const r = render(ResumenPage);
  await screen.findByRole('heading', { level: 1 });
  return r;
}

const filas = (c: HTMLElement) => [...c.querySelectorAll<HTMLElement>('tbody tr[data-salida-id]')];
const ids = (c: HTMLElement) => filas(c).map((f) => f.getAttribute('data-salida-id'));
const fila$ = (c: HTMLElement, id: string) => c.querySelector<HTMLElement>(`tr[data-salida-id="${id}"]`)!;
const planBtn = (c: HTMLElement, id: string) => fila$(c, id).querySelector<HTMLButtonElement>('[data-plan-btn]')!;
const detalle = (c: HTMLElement) => c.querySelector<HTMLElement>('[data-detalle]');
const norm = (s: string) => s.replace(/[\s\u00a0]+/g, ' ');
/** Un monto como lo lee `texto()` (los espacios de `cop` no son separables). */
const pesos = (n: number) => norm(cop(n));

/** Una cifra de la franja: su valor y su aclaración. */
function cifra(c: HTMLElement, etiqueta: string) {
  const dt = [...c.querySelectorAll('[data-cifras] dt')].find((x) => texto(x) === etiqueta);
  expect(dt, `cifra «${etiqueta}»`).toBeTruthy();
  const spans = dt!.parentElement!.querySelectorAll('dd > span');
  return { valor: texto(spans[0]), sub: texto(spans[1]) };
}

const disparador = () => screen.getByRole('button', { name: /^Filtrar por fecha/ });
const dialogo = () => screen.getByRole('dialog', { name: 'Filtrar por fecha' });
const diaCal = (iso: string) => document.querySelector<HTMLButtonElement>(`[data-dia="${iso}"]`)!;

async function abrirCalendario() {
  await fireEvent.click(disparador());
  return screen.findByRole('dialog', { name: 'Filtrar por fecha' });
}

/** Abre el calendario y elige un atajo; espera a que se cierre. */
async function elegirAtajo(nombre: string) {
  const d = await abrirCalendario();
  await fireEvent.click(within(d).getByRole('button', { name: nombre }));
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(MARTES);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.resetAllMocks();
});

describe('ResumenPage · encabezado', () => {
  it('título «Resumen», la fecha de hoy y «Nuevo plan»; el nombre y el estado de la agencia ya no se repiten aquí', async () => {
    cargar();
    const { container } = await pintar();
    const cabecera = container.querySelector('header') as HTMLElement;
    expect(texto(cabecera.querySelector('h1'))).toBe('Resumen');
    expect(texto(cabecera.querySelector('time'))).toBe('Martes 3 de noviembre de 2026');
    expect(cabecera.querySelector('time')!.getAttribute('datetime')).toBe('2026-11-03');
    expect(texto(cabecera)).not.toMatch(/Aventuras Antioquia|RNT|Verificada|Buen día/);
    expect(screen.getByRole('link', { name: 'Nuevo plan' }).getAttribute('href')).toBe('#/planes/nuevo');
  });

  it('«Cambiar logo» ya no está aquí: el logo se cambia en el perfil de la agencia', async () => {
    cargar({ agencia: agencia({ id: 'ag-1' }) });
    const { container } = await pintar();
    expect(screen.queryByRole('button', { name: 'Cambiar logo' })).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Logo' })).toBeNull();
    expect(screen.queryByLabelText('Archivo del logo')).toBeNull();
    expect(texto(container)).not.toMatch(/logo/i);
    // el resto del encabezado sigue igual: la fecha de hoy va sin el enlace que había detrás
    expect(texto(container.querySelector('header p'))).toBe('Martes 3 de noviembre de 2026');
  });

  it('pide las ventas de los viajes del mes en curso (Bogotá), de su primer a su último día', async () => {
    cargar();
    await pintar();
    expect(misVentasMock).toHaveBeenCalledWith({ desde: '2026-11-01', hasta: '2026-11-30' });
    expect(ventasMock).not.toHaveBeenCalled();
  });
});

describe('ResumenPage · estructura', () => {
  it('el orden: por resolver, cifras del período, salidas del período, tus planes y reseñas', async () => {
    cargar({ agencia: agencia({ rnt_vigente_hasta: '2026-11-14' }) }, { cuentas: [] });
    const { container } = await pintar();
    const titulos = [...container.querySelectorAll('h2')].map((h) => texto(h));
    expect(titulos).toEqual([
      expect.stringMatching(/^Por resolver/),
      'Cifras del período seleccionado',
      'Salidas del período',
      'Tus planes',
      'Reseñas recientes',
    ]);
  });

  it('ya no hay tarjetas de indicadores, líneas de tendencia, agenda semanal, panel lateral ni «Este mes te corresponde»', async () => {
    cargar({ ventas: [venta({ booking_id: 'a', fecha: '2026-11-05' })] });
    const { container } = await pintar();
    expect(container.querySelectorAll('[data-kpi], svg[data-spark], [data-mes], [data-semana], [data-quienes], [data-dinero]')).toHaveLength(0);
    const t = texto(container);
    expect(t).not.toMatch(/Próximas salidas|Personas por viajar|Calificación de tus planes|Salidas de la semana|Este mes te corresponde/);
  });

  it('la pantalla no tiene tope de ancho por debajo de 1920 px', async () => {
    cargar();
    const { container } = await pintar();
    expect((container.querySelector('.mx-auto') as HTMLElement).style.maxWidth).toBe('1920px');
  });

  it('en una sola fuente: nada de la serif de títulos, tamaños sueltos ni radios sueltos (con el calendario abierto también)', async () => {
    cargar({ ventas: [venta({ booking_id: 'a', fecha: '2026-11-05' })] });
    const { container } = await pintar();
    await abrirCalendario();
    for (const html of [container.innerHTML, document.body.innerHTML]) {
      expect(html).not.toContain('font-titulo');
      expect(html).not.toMatch(/text-\[|rounded-\[/);
    }
    const valor = (etiqueta: string) => [...container.querySelectorAll('[data-cifras] dt')].find((x) => texto(x) === etiqueta)!.parentElement!.querySelector('dd > span')!;
    expect(valor('Salidas').className).toContain('cifra');
    expect(valor('Te corresponde').className).toContain('cifra');
  });
});

describe('ResumenPage · por resolver', () => {
  it('lo urgente primero: renovar el RNT y luego registrar la cuenta, con el número de pendientes', async () => {
    cargar({ agencia: agencia({ rnt_vigente_hasta: '2026-11-03' }) }, { cuentas: [] });
    await pintar();
    const region = screen.getByRole('region', { name: /Por resolver/ });
    const items = within(region).getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(texto(items[0])).toContain('Urgente · hoy');
    expect(texto(items[0])).toContain('Tu RNT vence hoy.');
    expect(within(items[0]).getByRole('link', { name: 'Renovar RNT' }).getAttribute('href')).toBe(URL_RENOVAR_RNT);
    expect(texto(items[1])).toContain('Pendiente');
    expect(within(items[1]).getByRole('link', { name: 'Registrar cuenta' }).getAttribute('href')).toBe('#/cuenta-dispersiones');
    expect(texto(region.querySelector('[data-cuenta]'))).toBe('2');
    expect(texto(region.querySelector('h2'))).toBe('Por resolver 2 (2 avisos)');
  });

  it('el aviso de RNT urgente se pinta distinto del pendiente', async () => {
    cargar({ agencia: agencia({ rnt_vigente_hasta: '2026-11-03' }) }, { cuentas: [] });
    const { container } = await pintar();
    expect(container.querySelector('[data-aviso="rnt"]')!.className).toContain('bg-heliconia-bg');
    expect(container.querySelector('[data-aviso="cuenta"]')!.className).not.toContain('bg-heliconia-bg');
  });

  it('sin nada pendiente: una línea tranquila «Todo al día», sin lista ni contador', async () => {
    cargar();
    const { container } = await pintar();
    const region = screen.getByRole('region', { name: 'Por resolver' });
    expect(texto(region.querySelector('[data-al-dia]'))).toBe('Todo al día');
    expect(within(region).queryAllByRole('listitem')).toHaveLength(0);
    expect(container.querySelector('[data-cuenta]')).toBeNull();
  });

  it('agregar fechas cuando no queda ninguna salida próxima', async () => {
    cargar({ planes: [plan('Guatapé', [fecha({ id: 'x', fecha: '2025-01-01' })])] });
    await pintar();
    const region = screen.getByRole('region', { name: /Por resolver/ });
    expect(within(region).getByRole('link', { name: 'Agregar fechas' }).getAttribute('href')).toBe('#/planes');
  });

  it('agencia en verificación: avisa y ofrece crear un plan', async () => {
    cargar({ agencia: agencia({ estado_verificacion: 'pendiente', rnt_vigente_hasta: null }) });
    await pintar();
    const region = screen.getByRole('region', { name: /Por resolver/ });
    expect(texto(region)).toContain('Tu agencia está en verificación');
    expect(within(region).getByRole('link', { name: 'Crear un plan' }).getAttribute('href')).toBe('#/planes/nuevo');
  });
});

describe('ResumenPage · cifras del período', () => {
  const pagadas = [
    ventaRio({ booking_id: 'a', pax: 2, monto_total: 200000, comision: 24000, saldo_agencia: 176000 }),
    ventaRio({ booking_id: 'b', pax: 3, monto_total: 300000, booking_estado: 'pendiente_pago' }),
  ];

  it('cinco cifras: salidas, viajeros, pagos pendientes, lo que te corresponde y el próximo pago', async () => {
    cargar({ ventas: pagadas }, { liquidaciones: [liquidacion({ monto_a_pagar: 2151600 })] });
    const { container } = await pintar();
    expect([...container.querySelectorAll('[data-cifras] dt')].map((x) => texto(x))).toEqual([
      'Salidas',
      'Viajeros',
      'Pagos pendientes',
      'Te corresponde',
      'Próximo pago',
    ]);
    expect(cifra(container, 'Salidas')).toEqual({ valor: '5', sub: '0 ya salieron · 5 próximas' });
    expect(cifra(container, 'Viajeros')).toEqual({ valor: '19', sub: '16 % de 120 cupos' });
    expect(cifra(container, 'Pagos pendientes')).toEqual({ valor: '3 personas', sub: `${pesos(300000)} por cobrar` });
    expect(cifra(container, 'Te corresponde')).toEqual({ valor: pesos(176000), sub: `Vendido ${pesos(200000)} · comisión 12 %` });
  });

  it('el próximo pago: el día, el monto y el enlace a las liquidaciones', async () => {
    cargar({}, { liquidaciones: [liquidacion({ monto_a_pagar: 2151600 })] });
    const { container } = await pintar();
    const c = cifra(container, 'Próximo pago');
    expect(c.valor).toBe('lun 9 nov');
    expect(norm(c.sub)).toBe(`${norm(cop(2151600))} · Ver liquidaciones`);
    expect(screen.getByRole('link', { name: 'Ver liquidaciones' }).getAttribute('href')).toBe('#/liquidaciones');
  });

  it('la comisión sale de la agencia', async () => {
    cargar({ agencia: agencia({ comision_pct: 15 }), ventas: pagadas });
    const { container } = await pintar();
    expect(cifra(container, 'Te corresponde').sub).toContain('comisión 15 %');
  });

  it('sin ventas ni pagos lo dice en lenguaje simple', async () => {
    cargar({}, { liquidaciones: [] });
    const { container } = await pintar();
    expect(cifra(container, 'Pagos pendientes')).toEqual({ valor: '0 personas', sub: 'Todo pagado' });
    expect(cifra(container, 'Te corresponde')).toEqual({ valor: pesos(0), sub: 'Aún sin reservas pagadas' });
    expect(cifra(container, 'Próximo pago')).toMatchObject({ valor: 'Sin pagos' });
    expect(container.querySelector('[data-cifras]')!.textContent).toContain('No tienes pagos pendientes por ahora.');
  });

  it('si fallan los pagos, el resto sigue y lo avisa sin inventar nada', async () => {
    misVentasMock.mockResolvedValue({ agencia: agencia(), planes: [rio, san], ventas: pagadas });
    misLiquidacionesMock.mockRejectedValue(new Error('sin red'));
    cuentasMock.mockRejectedValue(new Error('sin red'));
    resenasMock.mockResolvedValue([]);
    const { container } = await pintar();
    expect(cifra(container, 'Próximo pago')).toMatchObject({ valor: '—' });
    expect(container.querySelector('[data-cifras]')!.textContent).toContain('No pudimos consultar tus pagos ahora.');
    expect(cifra(container, 'Te corresponde').valor).toBe(pesos(176000));
    expect(texto(container)).not.toContain('Registrar cuenta');
  });
});

describe('ResumenPage · salidas del período', () => {
  it('por fecha y hora, con ocupación, viajeros, pendientes y vendido de cada una', async () => {
    cargar({ ventas: [ventaRio({ booking_id: 'a', monto_total: 200000 }), ventaRio({ booking_id: 'b', pax: 3, monto_total: 300000, booking_estado: 'pendiente_pago' })] });
    const { container } = await pintar();
    expect(ids(container)).toEqual(['rc5', 'sr8', 'rc8', 'sr11', 'rc11']); // el 8 y el 11: San Rafael (06:00) antes que Río Claro (06:30)
    const celdas = (id: string) => [...fila$(container, id).querySelectorAll('td')];
    const [fh, plan_, oc, via, pen, ven] = celdas('rc5');
    expect(texto(fh.querySelector('b'))).toBe('jue 5 nov');
    expect(texto(fh.querySelector('.cifra'))).toBe('06:30');
    expect(texto(plan_)).toBe('Río Claro 2 días con hospedaje');
    expect(texto(oc)).toBe('5/24 cupos ocupados');
    expect((oc.querySelector('i') as HTMLElement).style.width).toBe('21%');
    expect(texto(via)).toBe('5');
    expect(texto(pen)).toBe('3');
    expect(texto(ven)).toBe(pesos(200000));
    const [, , , via2, pen2, ven2] = celdas('sr8');
    expect([texto(via2), texto(pen2), texto(ven2)]).toEqual(['2', '0', pesos(0)]);
  });

  it('el encabezado dice el período y la tabla tiene su título para el lector de pantalla', async () => {
    cargar();
    const { container } = await pintar();
    expect(screen.getByRole('heading', { name: 'Salidas del período' })).toBeTruthy();
    expect(texto(container.querySelector('#h-salidas')!.nextElementSibling)).toBe('Ordenadas por fecha · Noviembre de 2026');
    expect(screen.getByRole('table', { name: 'Salidas del período seleccionado, ordenadas por fecha' })).toBeTruthy();
    expect(within(screen.getByRole('table')).getAllByRole('columnheader').map((c) => texto(c))).toEqual([
      'Fecha y hora',
      'Plan',
      'Ocupación',
      'Viajeros',
      'Pendientes',
      'Vendido',
    ]);
  });

  it('el pie suma las salidas, los viajeros, los pendientes y lo vendido de lo que se ve', async () => {
    cargar({ ventas: [ventaRio({ booking_id: 'a', monto_total: 200000 }), ventaRio({ booking_id: 'b', pax: 3, booking_estado: 'pendiente_pago' })] });
    const { container } = await pintar();
    const pie = [...container.querySelectorAll('tfoot td, tfoot th')].map((x) => texto(x));
    // En el celular cada total lleva su nombre delante (la cabecera de la tabla no se ve).
    expect(pie.map((t) => t.replace(/^(Viajeros|Pendientes|Vendido) /, ''))).toEqual(['Total · 5 salidas', '19', '3', pesos(200000)]);
  });

  it('«Qué salidas ver»: próximas, ya salieron y todas, cada una con su cuenta; arranca en las próximas', async () => {
    const hoyTemprano = plan('Hoy temprano', [fecha({ id: 'h', fecha: '2026-11-03', cupo_total: 10, cupo_disponible: 6 })]); // 06:00: ya salió
    cargar({ planes: [hoyTemprano, rio, san] });
    const { container } = await pintar();
    const grupo = screen.getByRole('group', { name: 'Qué salidas ver' });
    expect(within(grupo).getAllByRole('button').map((b) => [texto(b), b.getAttribute('aria-pressed')])).toEqual([
      ['Próximas 5', 'true'],
      ['Ya salieron 1', 'false'],
      ['Todas 6', 'false'],
    ]);
    expect(ids(container)).toEqual(['rc5', 'sr8', 'rc8', 'sr11', 'rc11']);

    await fireEvent.click(within(grupo).getByRole('button', { name: /Ya salieron/ }));
    expect(ids(container)).toEqual(['h']);
    expect(texto(fila$(container, 'h').querySelector('.pildora-neutra'))).toBe('Salió');
    expect(texto(fila$(container, 'h').querySelector('.pildora-hoy'))).toBe('Hoy');
    await fireEvent.click(within(grupo).getByRole('button', { name: /Todas/ }));
    expect(ids(container)).toEqual(['h', 'rc5', 'sr8', 'rc8', 'sr11', 'rc11']);
  });

  it('si en el período ya salió todo, arranca en «Ya salieron»', async () => {
    cargar({ planes: [plan('Pasado', [fecha({ id: 'p', fecha: '2026-11-02', cupo_total: 10, cupo_disponible: 5 })])] });
    const { container } = await pintar();
    expect(ids(container)).toEqual(['p']);
    expect(within(screen.getByRole('group', { name: 'Qué salidas ver' })).getByRole('button', { name: /Ya salieron/ }).getAttribute('aria-pressed')).toBe('true');
  });

  it('una salida llena lo dice', async () => {
    cargar({ planes: [plan('Lleno', [fecha({ id: 'l', fecha: '2026-11-10', cupo_total: 10, cupo_disponible: 0 })])] });
    const { container } = await pintar();
    expect(texto(fila$(container, 'l').querySelector('.pildora-ok'))).toBe('Lleno');
    expect(texto(fila$(container, 'l').querySelectorAll('td')[2])).toContain('10/10');
  });

  it('muestra 12 a la vez: «Mostrando 12 de 15», «Mostrar más» y el foco en la primera fila nueva', async () => {
    const muchas = plan(
      'Muchas',
      Array.from({ length: 15 }, (_, i) => fecha({ id: `m${i}`, fecha: `2026-11-${String(10 + i).padStart(2, '0')}`, cupo_total: 10, cupo_disponible: 5 })),
    );
    cargar({ planes: [muchas] });
    const { container } = await pintar();
    expect(filas(container)).toHaveLength(12);
    expect(texto(container.querySelector('[data-mostrando]'))).toBe('Mostrando 12 de 15 salidas');
    await fireEvent.click(screen.getByRole('button', { name: 'Mostrar más (3)' }));
    expect(filas(container)).toHaveLength(15);
    expect(texto(container.querySelector('[data-mostrando]'))).toBe('Mostrando las 15 salidas de esta vista.');
    expect(screen.queryByRole('button', { name: /Mostrar más/ })).toBeNull();
    await waitFor(() => expect(document.activeElement).toBe(planBtn(container, 'm12')));
    // El pie suma las 15, no solo las 12 primeras.
    expect(container.querySelector('tfoot th')!.textContent).toBe('Total · 15 salidas');
  });

  it('sin salidas en el período lo dice, con el motivo, y ofrece agregar fechas', async () => {
    cargar({ planes: [] });
    const { container } = await pintar();
    expect(container.querySelector('table')).toBeNull();
    expect(texto(container.querySelector('[data-vacio]'))).toContain('No hay salidas de noviembre de 2026.');
    expect(within(container.querySelector('[data-vacio]') as HTMLElement).getByRole('link', { name: 'Agregar fechas' }).getAttribute('href')).toBe('#/planes');
  });

  it('con salidas, pero ninguna del filtro: lo dice y «Ver todas» las muestra, con el foco en el filtro', async () => {
    cargar({ planes: [plan('Pasado', [fecha({ id: 'p', fecha: '2026-11-02', cupo_total: 10, cupo_disponible: 5 })])] });
    const { container } = await pintar();
    await fireEvent.click(screen.getByRole('button', { name: /Próximas/ }));
    expect(texto(container.querySelector('[data-vacio]'))).toContain('No hay salidas próximas en este período.');
    await fireEvent.click(screen.getByRole('button', { name: 'Ver todas (1)' }));
    expect(ids(container)).toEqual(['p']);
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('button', { name: /Todas/ })));
  });
});

describe('ResumenPage · quiénes van', () => {
  const RESERVAS = [
    fila('rc5', 'b1', 'Laura V.', 2),
    fila('rc5', 'b2', 'Andrés M.', 3, 'pendiente_pago'),
    fila('sr8', 'b3', 'Natalia B.', 2),
  ];

  it('cada fila trae su botón «Ver quiénes van»; no se pide nada hasta abrirla', async () => {
    cargar({}, { reservas: RESERVAS });
    const { container } = await pintar();
    expect(quienesMock).not.toHaveBeenCalled();
    expect(detalle(container)).toBeNull();
    const b = planBtn(container, 'rc5');
    expect(b.getAttribute('aria-label')).toBe('Río Claro 2 días con hospedaje, Jueves 5 de noviembre. Ver quiénes van');
    expect(b.getAttribute('aria-expanded')).toBe('false');
  });

  it('al abrirla pide solo esa salida y muestra plan, día, hora, cupos y las reservas', async () => {
    cargar({}, { reservas: RESERVAS });
    const { container } = await pintar();
    await fireEvent.click(planBtn(container, 'rc5'));
    expect(planBtn(container, 'rc5').getAttribute('aria-expanded')).toBe('true');
    expect(quienesMock).toHaveBeenCalledTimes(1);
    expect(quienesMock).toHaveBeenCalledWith(['rc5']);
    await waitFor(() => expect(within(detalle(container)!).getByText('Laura V.')).toBeTruthy());
    const d = detalle(container)!;
    expect(d.previousElementSibling).toBe(fila$(container, 'rc5')); // justo bajo su fila
    expect(d.id).toBe(planBtn(container, 'rc5').getAttribute('aria-controls'));
    expect(texto(d.querySelector('[data-q-fecha]'))).toBe('Quiénes van · Río Claro 2 días con hospedaje, Jueves 5 de noviembre, sale a las 06:30');
    expect(texto(d.querySelector('[data-q-cupos]'))).toBe('5 de 24 cupos reservados · 19 libres');
  });

  it('lista las reservas con nombre corto y personas; la que no ha pagado lo dice, la confirmada no', async () => {
    cargar({}, { reservas: RESERVAS });
    const { container } = await pintar();
    await fireEvent.click(planBtn(container, 'rc5'));
    await waitFor(() => expect(within(detalle(container)!).getByText('Laura V.')).toBeTruthy());
    expect([...detalle(container)!.querySelectorAll('[data-reserva]')].map((f) => texto(f))).toEqual([
      'Laura V. 2 personas',
      'Andrés M. pendiente de pago 3 personas',
    ]);
    expect(detalle(container)!.querySelectorAll('[data-pendiente]')).toHaveLength(1);
  });

  it('agrupa por fecha: cada salida muestra solo sus reservas, y abrir otra cierra la anterior', async () => {
    cargar({}, { reservas: RESERVAS });
    const { container } = await pintar();
    await fireEvent.click(planBtn(container, 'rc5'));
    await waitFor(() => expect(within(detalle(container)!).getByText('Laura V.')).toBeTruthy());
    await fireEvent.click(planBtn(container, 'sr8'));
    expect(container.querySelectorAll('[data-detalle]')).toHaveLength(1);
    expect(planBtn(container, 'rc5').getAttribute('aria-expanded')).toBe('false');
    await waitFor(() => expect([...detalle(container)!.querySelectorAll('[data-reserva]')].map((f) => texto(f))).toEqual(['Natalia B. 2 personas']));
    expect(quienesMock).toHaveBeenLastCalledWith(['sr8']);
    expect(texto(detalle(container)!.querySelector('[data-q-fecha]'))).toContain('Domingo 8 de noviembre, sale a las 06:00');
    expect(texto(detalle(container)!.querySelector('[data-q-cupos]'))).toBe('2 de 24 cupos reservados · 22 libres');
  });

  it('el mismo botón la cierra', async () => {
    cargar({}, { reservas: RESERVAS });
    const { container } = await pintar();
    await fireEvent.click(planBtn(container, 'rc5'));
    expect(detalle(container)).not.toBeNull();
    await fireEvent.click(planBtn(container, 'rc5'));
    expect(detalle(container)).toBeNull();
    expect(planBtn(container, 'rc5').getAttribute('aria-expanded')).toBe('false');
  });

  it('una persona va en singular', async () => {
    cargar({}, { reservas: [fila('rc5', 'b1', 'Laura V.', 1)] });
    const { container } = await pintar();
    await fireEvent.click(planBtn(container, 'rc5'));
    await waitFor(() => expect(within(detalle(container)!).getByText('Laura V.')).toBeTruthy());
    expect(texto(detalle(container)!.querySelector('[data-pax]'))).toBe('1 persona');
  });

  it('una salida sin reservas dice «Aún nadie reservó esta salida»', async () => {
    cargar({}, { reservas: [] });
    const { container } = await pintar();
    await fireEvent.click(planBtn(container, 'rc5'));
    await waitFor(() => expect(detalle(container)!.querySelector('[data-q-vacio]')).not.toBeNull());
    expect(texto(detalle(container)!.querySelector('[data-q-vacio]'))).toBe('Aún nadie reservó esta salida');
    expect(detalle(container)!.querySelector('[data-reservas]')).toBeNull();
  });

  it('si falla muestra el error con «Reintentar», que vuelve a pedir la misma salida', async () => {
    cargar({}, { reservas: RESERVAS });
    quienesMock.mockRejectedValueOnce(new Error('sin red'));
    const { container } = await pintar();
    await fireEvent.click(planBtn(container, 'rc5'));
    await waitFor(() => expect(detalle(container)!.querySelector('[data-q-error]')).not.toBeNull());
    expect(within(detalle(container)!).getByRole('alert').textContent).toContain('No pudimos cargar quiénes van.');
    await fireEvent.click(within(detalle(container)!).getByRole('button', { name: 'Reintentar' }));
    await waitFor(() => expect(within(detalle(container)!).getByText('Laura V.')).toBeTruthy());
    expect(quienesMock).toHaveBeenCalledTimes(2);
    expect(quienesMock).toHaveBeenLastCalledWith(['rc5']);
    expect(detalle(container)!.querySelector('[data-q-error]')).toBeNull();
  });

  it('una respuesta tardía de una apertura anterior no pisa la de la que se está viendo', async () => {
    cargar();
    let tarde!: (f: QuienViaja[]) => void;
    quienesMock.mockReturnValueOnce(new Promise((r) => (tarde = r)));
    quienesMock.mockResolvedValueOnce([fila('rc5', 'z', 'Felipe R.', 3)]);
    const { container } = await pintar();
    await fireEvent.click(planBtn(container, 'rc5')); // la primera petición no responde
    await fireEvent.click(planBtn(container, 'rc5')); // se cierra
    await fireEvent.click(planBtn(container, 'rc5')); // se reabre: segunda petición
    await waitFor(() => expect(within(detalle(container)!).getByText('Felipe R.')).toBeTruthy());
    tarde([fila('rc5', 'tarde', 'Tardía T.', 1)]);
    await new Promise((r) => setTimeout(r, 0));
    expect(within(detalle(container)!).queryByText('Tardía T.')).toBeNull();
    expect(within(detalle(container)!).getByText('Felipe R.')).toBeTruthy();
  });

  it('no hay hoja ni panel lateral: el detalle es el mismo en cualquier ancho', async () => {
    cargar({}, { reservas: RESERVAS });
    const { container } = await pintar();
    await fireEvent.click(planBtn(container, 'rc5'));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(container.querySelector('[data-quienes]')).toBeNull();
  });
});

describe('ResumenPage · filtro de fecha', () => {
  it('un botón con el ícono de calendario nombra el período y abre el calendario', async () => {
    cargar();
    await pintar();
    const b = disparador();
    expect(b.getAttribute('aria-label')).toBe('Filtrar por fecha. Período actual: Este mes · 1–30 nov');
    expect(b.getAttribute('aria-haspopup')).toBe('dialog');
    expect(b.getAttribute('aria-expanded')).toBe('false');
    expect(b.querySelector('svg')).not.toBeNull();
    expect(screen.queryByRole('dialog')).toBeNull();

    const d = await abrirCalendario();
    expect(d.getAttribute('aria-modal')).toBe('true');
    expect(within(d).getByRole('grid', { name: 'Noviembre de 2026' })).toBeTruthy();
    expect(b.getAttribute('aria-expanded')).toBe('true');
    expect(within(d).getByRole('button', { name: 'Este mes' }).getAttribute('aria-pressed')).toBe('true');
  });

  it('con el período por defecto no hay nada que quitar', async () => {
    cargar();
    await pintar();
    expect(screen.queryByRole('button', { name: 'Quitar el filtro de fecha' })).toBeNull();
  });

  it('al abrir, el foco entra en el calendario, en el primer día del período', async () => {
    cargar();
    await pintar();
    await abrirCalendario();
    await waitFor(() => expect(document.activeElement).toBe(diaCal('2026-11-01')));
  });

  it('el calendario marca la actividad de cada día con los viajeros de los cupos tomados, también en otros meses', async () => {
    cargar();
    await pintar();
    const d = await abrirCalendario();
    expect(diaCal('2026-11-05').getAttribute('aria-label')).toBe('Jueves 5 de noviembre: 1 salida, 5 viajeros');
    expect(diaCal('2026-11-08').getAttribute('aria-label')).toBe('Domingo 8 de noviembre: 2 salidas, 5 viajeros'); // 3 + 2
    expect(diaCal('2026-11-06').getAttribute('aria-label')).toBe('Viernes 6 de noviembre: sin salidas');
    expect(texto(diaCal('2026-11-11').querySelector('[data-viajeros]'))).toBe('9'); // 4 + 5, nivel 1
    // Las ventas solo se piden del período, pero las salidas de diciembre ya están: el calendario las muestra sin pedir nada.
    await fireEvent.click(within(d).getByRole('button', { name: 'Mes siguiente' }));
    expect(diaCal('2026-12-08').getAttribute('aria-label')).toBe('Martes 8 de diciembre: 1 salida, 14 viajeros');
    expect(diaCal('2026-12-08').querySelector('[data-viajeros]')!.getAttribute('data-nivel')).toBe('2');
    expect(ventasMock).not.toHaveBeenCalled();
    expect(texto(document.querySelector('[data-semana="2026-12-07"] [data-total]'))).toBe('14');
  });

  it('un atajo cambia el chip, cierra el calendario, devuelve el foco al botón y filtra las filas y las cifras', async () => {
    cargar({}, { porPeriodo: [ventaRio({ booking_id: 'a', pax: 2, monto_total: 200000, comision: 24000, saldo_agencia: 176000 })] });
    const { container } = await pintar();
    expect(ids(container)).toEqual(['rc5', 'sr8', 'rc8', 'sr11', 'rc11']);

    await elegirAtajo('Esta semana');
    expect(disparador().getAttribute('aria-label')).toBe('Filtrar por fecha. Período actual: Esta semana · 2–8 nov');
    expect(texto(disparador())).toContain('Esta semana · 2–8 nov');
    expect(ventasMock).toHaveBeenCalledWith('ag-1', '2026-11-02', '2026-11-08');
    await waitFor(() => expect(ids(container)).toEqual(['rc5', 'sr8', 'rc8']));
    expect(cifra(container, 'Salidas')).toEqual({ valor: '3', sub: '0 ya salieron · 3 próximas' });
    expect(cifra(container, 'Viajeros')).toEqual({ valor: '10', sub: '14 % de 72 cupos' });
    expect(cifra(container, 'Te corresponde').valor).toBe(pesos(176000));
    expect(texto(container.querySelector('#h-salidas')!.nextElementSibling)).toBe('Ordenadas por fecha · Del 2 al 8 de noviembre');
    expect(document.activeElement).toBe(disparador());
  });

  it('con un filtro aparece la equis; quitarlo vuelve al mes, pide sus ventas y deja el foco en el botón', async () => {
    cargar();
    const { container } = await pintar();
    await elegirAtajo('Esta semana');
    await waitFor(() => expect(ids(container)).toEqual(['rc5', 'sr8', 'rc8']));

    await fireEvent.click(screen.getByRole('button', { name: 'Quitar el filtro de fecha' }));
    expect(disparador().getAttribute('aria-label')).toBe('Filtrar por fecha. Período actual: Este mes · 1–30 nov');
    expect(ventasMock).toHaveBeenLastCalledWith('ag-1', '2026-11-01', '2026-11-30');
    await waitFor(() => expect(ids(container)).toEqual(['rc5', 'sr8', 'rc8', 'sr11', 'rc11']));
    expect(screen.queryByRole('button', { name: 'Quitar el filtro de fecha' })).toBeNull();
    expect(document.activeElement).toBe(disparador());
  });

  it('un día', async () => {
    cargar();
    const { container } = await pintar();
    const d = await abrirCalendario();
    await fireEvent.click(diaCal('2026-11-08'));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(texto(disparador())).toContain('dom 8 nov');
    expect(ventasMock).toHaveBeenCalledWith('ag-1', '2026-11-08', '2026-11-08');
    await waitFor(() => expect(ids(container)).toEqual(['sr8', 'rc8']));
    expect(d.isConnected).toBe(false);
  });

  it('una semana', async () => {
    cargar();
    const { container } = await pintar();
    await abrirCalendario();
    await fireEvent.click(document.querySelector('[data-semana="2026-11-09"]')!);
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(texto(disparador())).toContain('Semana 9–15 nov');
    expect(ventasMock).toHaveBeenCalledWith('ag-1', '2026-11-09', '2026-11-15');
    await waitFor(() => expect(ids(container)).toEqual(['sr11', 'rc11']));
  });

  it('un rango, y volver a abrir muestra marcado lo elegido', async () => {
    cargar();
    const { container } = await pintar();
    const d = await abrirCalendario();
    await fireEvent.click(within(d).getByRole('button', { name: 'Elegir un rango de días' }));
    await fireEvent.click(diaCal('2026-11-08'));
    expect(screen.queryByRole('dialog')).not.toBeNull(); // falta el último día
    await fireEvent.click(diaCal('2026-11-05'));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(texto(disparador())).toContain('5–8 nov');
    expect(ventasMock).toHaveBeenCalledWith('ag-1', '2026-11-05', '2026-11-08');
    await waitFor(() => expect(ids(container)).toEqual(['rc5', 'sr8', 'rc8']));

    await abrirCalendario();
    expect(['2026-11-04', '2026-11-05', '2026-11-06', '2026-11-08', '2026-11-09'].map((f) => diaCal(f).getAttribute('aria-pressed'))).toEqual(['false', 'true', 'true', 'true', 'false']);
  });

  it('otro mes: cambia el período y las ventas que se piden', async () => {
    cargar();
    await pintar();
    const d = await abrirCalendario();
    await fireEvent.click(within(d).getByRole('button', { name: 'Mes siguiente' }));
    await fireEvent.click(diaCal('2026-12-08'));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(texto(disparador())).toContain('mar 8 dic');
    expect(ventasMock).toHaveBeenCalledWith('ag-1', '2026-12-08', '2026-12-08');
  });

  it('Escape cierra el calendario y devuelve el foco al botón, sin cambiar nada', async () => {
    cargar();
    await pintar();
    await abrirCalendario();
    await fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(document.activeElement).toBe(disparador());
    expect(disparador().getAttribute('aria-expanded')).toBe('false');
    expect(ventasMock).not.toHaveBeenCalled();
  });

  it('el teclado: las flechas mueven el foco entre días y no eligen nada', async () => {
    cargar();
    await pintar();
    await abrirCalendario();
    await waitFor(() => expect(document.activeElement).toBe(diaCal('2026-11-01')));
    await fireEvent.keyDown(document.activeElement!, { key: 'ArrowDown' });
    await waitFor(() => expect(document.activeElement).toBe(diaCal('2026-11-08')));
    await fireEvent.keyDown(document.activeElement!, { key: 'PageDown' });
    await waitFor(() => expect(document.activeElement).toBe(diaCal('2026-12-08')));
    expect(screen.queryByRole('dialog')).not.toBeNull();
    expect(ventasMock).not.toHaveBeenCalled();
  });

  it('el calendario es una hoja inferior en el celular: un diálogo modal con el mismo contenido', async () => {
    cargar();
    await pintar();
    const d = await abrirCalendario();
    expect(d.className).toContain('rounded-t-hoja'); // hoja desde abajo; desde `sm` es una ventana centrada
    expect(d.parentElement!.className).toContain('place-items-end');
  });

  it('mientras llegan las ventas se siguen viendo las anteriores, se marca que se actualiza y el chip ya dice lo nuevo', async () => {
    cargar();
    let llegan!: (v: VentaRow[]) => void;
    ventasMock.mockReturnValue(new Promise((r) => (llegan = r)));
    const { container } = await pintar();
    await elegirAtajo('Esta semana');

    expect(texto(disparador())).toContain('Esta semana · 2–8 nov');
    expect(ids(container)).toEqual(['rc5', 'sr8', 'rc8', 'sr11', 'rc11']); // todavía el mes
    expect(texto(container.querySelector('#h-salidas')!.nextElementSibling)).toBe('Ordenadas por fecha · Noviembre de 2026');
    expect(container.querySelectorAll('[aria-busy="true"]').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByRole('status').some((s) => texto(s) === 'Actualizando las cifras de Esta semana · 2–8 nov…')).toBe(true);

    llegan([]);
    await waitFor(() => expect(ids(container)).toEqual(['rc5', 'sr8', 'rc8']));
    expect(container.querySelectorAll('[aria-busy="true"]')).toHaveLength(0);
    expect(screen.getAllByRole('status').every((s) => texto(s) !== 'Actualizando las cifras de Esta semana · 2–8 nov…')).toBe(true);
  });

  it('si fallan las ventas del nuevo período: alerta con el motivo, lo anterior sigue visible y «Reintentar» lo vuelve a pedir', async () => {
    cargar();
    ventasMock.mockRejectedValueOnce(new Error('sin red'));
    const { container } = await pintar();
    await elegirAtajo('Esta semana');
    const alerta = await screen.findByRole('alert');
    expect(texto(alerta)).toBe('No pudimos cargar las cifras de Esta semana · 2–8 nov: sin red Seguimos mostrando Este mes · 1–30 nov.');
    expect(ids(container)).toEqual(['rc5', 'sr8', 'rc8', 'sr11', 'rc11']);
    expect(container.querySelectorAll('[aria-busy="true"]')).toHaveLength(0);

    await fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    await waitFor(() => expect(ids(container)).toEqual(['rc5', 'sr8', 'rc8']));
    expect(ventasMock).toHaveBeenCalledTimes(2);
    expect(ventasMock).toHaveBeenLastCalledWith('ag-1', '2026-11-02', '2026-11-08');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('una respuesta tardía de un período anterior no pisa la del que se eligió después', async () => {
    cargar();
    let tarde!: (v: VentaRow[]) => void;
    ventasMock.mockReturnValueOnce(new Promise((r) => (tarde = r)));
    ventasMock.mockResolvedValueOnce([ventaRio({ booking_id: 'b', fecha: '2026-11-03', plan_titulo: 'Otro', monto_total: 1, comision: 0, saldo_agencia: 777000 })]);
    const { container } = await pintar();
    await elegirAtajo('Esta semana'); // no responde
    await elegirAtajo('Hoy'); // responde primero
    await waitFor(() => expect(cifra(container, 'Te corresponde').valor).toBe(pesos(777000)));
    tarde([ventaRio({ booking_id: 'a', saldo_agencia: 1, monto_total: 1 })]);
    await new Promise((r) => setTimeout(r, 0));
    expect(cifra(container, 'Te corresponde').valor).toBe(pesos(777000));
    expect(texto(disparador())).toContain('Hoy · mar 3 nov');
  });

  it('elegir los mismos días que ya están cargados no vuelve a pedir ventas', async () => {
    cargar();
    await pintar();
    const d = await abrirCalendario();
    // «Este mes» a mano: del 1 al 30 de noviembre.
    await fireEvent.click(within(d).getByRole('button', { name: 'Elegir un rango de días' }));
    await fireEvent.click(diaCal('2026-11-01'));
    await fireEvent.click(diaCal('2026-11-30'));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(texto(disparador())).toContain('1–30 nov');
    expect(ventasMock).not.toHaveBeenCalled();
  });

  it('un período sin salidas lo dice y «Quitar filtro» vuelve al mes', async () => {
    cargar();
    const { container } = await pintar();
    await elegirAtajo('Hoy');
    await waitFor(() => expect(container.querySelector('[data-vacio]')).not.toBeNull());
    expect(texto(container.querySelector('[data-vacio]'))).toContain('No hay salidas del martes 3 de noviembre.');
    expect(cifra(container, 'Salidas')).toEqual({ valor: '0', sub: 'Sin salidas en el período' });
    await fireEvent.click(within(container.querySelector('[data-vacio]') as HTMLElement).getByRole('button', { name: 'Quitar filtro' }));
    await waitFor(() => expect(ids(container)).toEqual(['rc5', 'sr8', 'rc8', 'sr11', 'rc11']));
    expect(disparador().getAttribute('aria-label')).toContain('Este mes');
  });

  it('el filtro «Qué salidas ver» y la fila abierta arrancan de nuevo con cada período', async () => {
    const hoyTemprano = plan('Hoy temprano', [fecha({ id: 'h', fecha: '2026-11-03', cupo_total: 10, cupo_disponible: 6 })]);
    cargar({ planes: [hoyTemprano, rio, san] });
    const { container } = await pintar();
    await fireEvent.click(planBtn(container, 'rc5'));
    expect(detalle(container)).not.toBeNull();
    await elegirAtajo('Hoy');
    await waitFor(() => expect(ids(container)).toEqual(['h'])); // solo salió una: arranca en «Ya salieron»
    expect(detalle(container)).toBeNull();
    await elegirAtajo('Esta semana');
    await waitFor(() => expect(ids(container)).toEqual(['rc5', 'sr8', 'rc8'])); // vuelve a «Próximas»
  });
});

describe('ResumenPage · tus planes', () => {
  it('por plan: viajeros, salidas y ocupación de las salidas del período, el que más tiene primero', async () => {
    cargar();
    const { container } = await pintar();
    const sec = container.querySelector('[data-tus-planes]') as HTMLElement;
    expect(texto(sec.querySelector('h2'))).toBe('Tus planes');
    expect(texto(sec)).toContain('Viajeros por plan en el período');
    const items = [...sec.querySelectorAll('li')].map((li) => texto(li));
    expect(items).toEqual([
      'Río Claro 2 días con hospedaje 12 3 salidas · 17 % de los cupos',
      'Cascadas de San Rafael 7 2 salidas · 15 % de los cupos',
    ]);
    expect(sec.querySelector('[role="img"]')!.getAttribute('aria-label')).toBe('Río Claro 2 días con hospedaje: 12 viajeros en el período');
  });

  it('cambia con el período', async () => {
    cargar();
    const { container } = await pintar();
    await elegirAtajo('Esta semana');
    await waitFor(() => expect(ids(container)).toEqual(['rc5', 'sr8', 'rc8']));
    const sec = container.querySelector('[data-tus-planes]') as HTMLElement;
    expect([...sec.querySelectorAll('li')].map((li) => texto(li))).toEqual([
      'Río Claro 2 días con hospedaje 8 2 salidas · 17 % de los cupos',
      'Cascadas de San Rafael 2 1 salida · 8 % de los cupos',
    ]);
  });

  it('sin salidas en el período lo dice simple', async () => {
    cargar({ planes: [] });
    const { container } = await pintar();
    expect(texto(container.querySelector('[data-frase]'))).toBe('Sin salidas en este período.');
  });
});

describe('ResumenPage · reseñas recientes', () => {
  it('pide las 3 últimas y muestra estrellas, texto, quién, plan y hace cuánto', async () => {
    cargar({}, {
      resenas: [
        resena(),
        resena({ nombre_corto: 'Laura V.', comentario: 'Paisajes de postal.', calificacion: 4, created_at: '2026-10-31T20:00:00Z' }),
        resena({ nombre_corto: 'Daniela C.', comentario: null, plan_titulo: 'Cascadas de San Rafael', created_at: '2026-10-20T20:00:00Z' }),
      ],
    });
    const { container } = await pintar();
    expect(resenasMock).toHaveBeenCalledWith(3);
    const items = [...container.querySelectorAll('[data-resena]')];
    expect(items.map((i) => texto(i.querySelector('figcaption')))).toEqual([
      'Juan David Z. · Río Claro 2 días con hospedaje · ayer',
      'Laura V. · Río Claro 2 días con hospedaje · hace 3 días',
      'Daniela C. · Cascadas de San Rafael · hace 2 semanas',
    ]);
    expect(items.map((i) => i.querySelector('[role="img"]')!.getAttribute('aria-label'))).toEqual([
      '5 de 5 estrellas',
      '4 de 5 estrellas',
      '5 de 5 estrellas',
    ]);
    expect(items.map((i) => i.querySelector('blockquote')?.textContent ?? null)).toEqual([
      'Plan muy bien armado',
      'Paisajes de postal.',
      null, // solo estrellas
    ]);
  });

  it('dice que no dependen del período y no cambian con él', async () => {
    cargar({}, { resenas: [resena()] });
    const { container } = await pintar();
    expect(texto(container.querySelector('[data-resenas]'))).toContain('No dependen del período');
    await elegirAtajo('Hoy');
    expect(container.querySelectorAll('[data-resena]')).toHaveLength(1);
    expect(resenasMock).toHaveBeenCalledTimes(1);
  });

  it('sin reseñas lo dice simple', async () => {
    cargar();
    const { container } = await pintar();
    expect(container.querySelectorAll('[data-resena]')).toHaveLength(0);
    expect(texto(container.querySelector('[data-sin-resenas]'))).toContain('Aún no tienes reseñas');
  });

  it('si no se pudieron consultar, el resto sigue y lo avisa', async () => {
    cargar();
    resenasMock.mockRejectedValue(new Error('sin red'));
    const { container } = await pintar();
    expect(texto(container.querySelector('[data-sin-carga]'))).toBe('No pudimos cargar las reseñas ahora.');
    expect(screen.getByRole('heading', { name: 'Tus planes' })).toBeTruthy();
  });
});

describe('ResumenPage · el día es el de Bogotá', () => {
  it('con el navegador ya en el día siguiente, el mes y «hoy» siguen siendo los de Bogotá', async () => {
    // 30-nov 23:30 en Bogotá = 1-dic 04:30 UTC: en Auckland ya es 1-dic por la tarde.
    vi.setSystemTime(new Date(Date.UTC(2026, 11, 1, 4, 30)));
    const previa = Intl.DateTimeFormat().resolvedOptions().timeZone;
    process.env.TZ = 'Pacific/Auckland';
    try {
      cargar();
      const { container } = await pintar();
      expect(misVentasMock).toHaveBeenCalledWith({ desde: '2026-11-01', hasta: '2026-11-30' });
      expect(texto(container.querySelector('time'))).toBe('Lunes 30 de noviembre de 2026');
      expect(disparador().getAttribute('aria-label')).toContain('Este mes · 1–30 nov');
    } finally {
      process.env.TZ = previa;
    }
  });
});

describe('ResumenPage · estados de carga', () => {
  it('sin agencia invita a registrarla', async () => {
    misVentasMock.mockResolvedValue({ agencia: null, planes: [], ventas: [] });
    render(ResumenPage);
    expect(await screen.findByText('Aún no tienes agencia')).toBeTruthy();
    expect(misLiquidacionesMock).not.toHaveBeenCalled();
    expect(resenasMock).not.toHaveBeenCalled();
    expect(quienesMock).not.toHaveBeenCalled();
  });

  it('si falla la carga muestra el error', async () => {
    misVentasMock.mockRejectedValue(new Error('sin red'));
    render(ResumenPage);
    expect(await screen.findByText('Sin conexión')).toBeTruthy();
    expect(screen.getByText('sin red')).toBeTruthy();
  });
});

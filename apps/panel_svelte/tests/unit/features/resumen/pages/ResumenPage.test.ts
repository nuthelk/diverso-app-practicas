import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/svelte';
import { agencia, cuentaResumen, fecha, liquidacion, plan, texto, venta } from '$tests/fixtures';

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
vi.mock('$lib/features/resumen/api/resumen.api', () => ({
  quienesVan: vi.fn(),
  resenasRecientes: vi.fn(),
}));

import { cuentasResumen, misLiquidaciones } from '$lib/features/liquidaciones/api/liquidaciones.api';
import { misVentas } from '$lib/features/ventas/api/ventas.api';
import { quitarLogo, subirLogo } from '$lib/features/agencias/api/agencias.api';
import { quienesVan, resenasRecientes } from '$lib/features/resumen/api/resumen.api';
import ResumenPage from '$lib/features/resumen/pages/ResumenPage.svelte';
import { URL_RENOVAR_RNT } from '$lib/features/resumen/model/resumen';
import type { QuienViaja, ResenaReciente } from '$lib/features/resumen/model/quienes-van';
import { cop } from '$lib/shared/lib/format';

/** El tsconfig del panel no trae los tipos de Node: solo se usa `process.env.TZ`. */
declare const process: { env: Record<string, string | undefined> };

const misVentasMock = vi.mocked(misVentas);
const misLiquidacionesMock = vi.mocked(misLiquidaciones);
const cuentasMock = vi.mocked(cuentasResumen);
const quienesMock = vi.mocked(quienesVan);
const resenasMock = vi.mocked(resenasRecientes);

type Datos = Awaited<ReturnType<typeof misVentas>>;

/** Martes 3-nov-2026, 12:00 en Bogotá: la semana es la del lunes 2 al domingo 8 de noviembre. */
const MARTES = new Date(Date.UTC(2026, 10, 3, 17, 0, 0));

/** Río Claro (06:30) y San Rafael (06:00), 24 cupos por salida, como en el diseño. */
const rio = {
  ...plan('Río Claro 2 días con hospedaje', [
    fecha({ id: 'rc5', fecha: '2026-11-05', cupo_total: 24, cupo_disponible: 19 }),
    fecha({ id: 'rc8', fecha: '2026-11-08', cupo_total: 24, cupo_disponible: 21 }),
    fecha({ id: 'rc11', fecha: '2026-11-11', cupo_total: 24, cupo_disponible: 20 }),
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
const RESERVAS = [
  fila('rc5', 'b1', 'Laura V.', 2),
  fila('rc5', 'b2', 'Andrés M.', 3, 'pendiente_pago'),
  fila('sr8', 'b3', 'Natalia B.', 2),
  fila('rc8', 'b4', 'Sebastián O.', 3),
  fila('rc11', 'b5', 'Carolina P.', 4),
  fila('sr11', 'b6', 'Felipe R.', 3),
];

const resena = (parcial: Partial<ResenaReciente> = {}): ResenaReciente => ({
  calificacion: 5,
  comentario: 'Plan muy bien armado',
  nombre_corto: 'Juan David Z.',
  plan_titulo: 'Río Claro 2 días con hospedaje',
  created_at: '2026-11-02T20:00:00Z',
  ...parcial,
});

/** Agencia al día (RNT vigente, cuenta registrada) salvo lo que se indique. */
function cargar(
  parcial: Partial<Datos> = {},
  extras: { liquidaciones?: ReturnType<typeof liquidacion>[]; cuentas?: ReturnType<typeof cuentaResumen>[]; resenas?: ResenaReciente[]; reservas?: QuienViaja[] } = {},
) {
  misVentasMock.mockResolvedValue({ agencia: agencia(), planes: [rio, san], ventas: [], ...parcial });
  misLiquidacionesMock.mockResolvedValue(extras.liquidaciones ?? [liquidacion()]);
  cuentasMock.mockResolvedValue(extras.cuentas ?? [cuentaResumen()]);
  resenasMock.mockResolvedValue(extras.resenas ?? []);
  quienesMock.mockResolvedValue(extras.reservas ?? RESERVAS);
}

async function pintar() {
  const r = render(ResumenPage);
  await screen.findByRole('heading', { level: 1 });
  return r;
}

const bloque = (c: HTMLElement, id: string) => c.querySelector(`[data-salida-id="${id}"]`) as HTMLElement;
const dia = (c: HTMLElement, iso: string) => c.querySelector(`[data-dia="${iso}"]`) as HTMLElement;
const aside = (c: HTMLElement) => c.querySelector('[data-quienes]') as HTMLElement;
const norm = (s: string) => s.replace(/[\s\u00a0]+/g, ' ');
const veces = (haystack: string, aguja: string) => haystack.split(aguja).length - 1;

function pantalla(celular: boolean) {
  vi.stubGlobal('matchMedia', (media: string) => ({
    matches: celular,
    media,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }));
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(MARTES);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.resetAllMocks();
});

describe('ResumenPage · encabezado', () => {
  it('saludo corto con el nombre, sin repetir la fecha que ya muestra el marco, y «Nuevo plan»', async () => {
    cargar();
    const { container } = await pintar();
    const cabecera = container.querySelector('header') as HTMLElement;
    expect(texto(cabecera.querySelector('h1'))).toBe('Buen día, Aventuras Antioquia');
    expect(texto(cabecera)).not.toMatch(/martes|3 de noviembre/i);
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

  it('pide las ventas de los viajes del mes en curso (Bogotá)', async () => {
    cargar();
    await pintar();
    expect(misVentasMock).toHaveBeenCalledWith({ desde: '2026-11-01' });
  });
});

describe('ResumenPage · estructura', () => {
  it('el orden: por resolver, salidas de la semana, tus planes, reseñas y la plata una sola vez al final', async () => {
    cargar({ agencia: agencia({ rnt_vigente_hasta: '2026-11-14' }) }, { cuentas: [] });
    const { container } = await pintar();
    const titulos = [...container.querySelectorAll('h2')].map((h) => texto(h));
    expect(titulos).toEqual([
      expect.stringMatching(/^Por resolver/),
      'Salidas de la semana',
      'Quiénes van',
      'Tus planes',
      'Reseñas recientes',
      'Este mes te corresponde',
    ]);
  });

  it('ya no hay tarjetas de indicadores, líneas de tendencia, línea de tiempo ni tarjeta del mes', async () => {
    cargar({ ventas: [venta({ booking_id: 'a', fecha: '2026-11-05' })] });
    const { container } = await pintar();
    expect(container.querySelectorAll('[data-kpi], svg[data-spark], [data-mes]')).toHaveLength(0);
    const t = texto(container);
    expect(t).not.toMatch(/Próximas salidas|Personas por viajar|Calificación de tus planes|Este mes ·/);
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
    expect(texto(items[0])).toContain('Tu RNT vence el 3 de noviembre de 2026');
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
    expect(screen.getByRole('link', { name: 'Agregar fechas' }).getAttribute('href')).toBe('#/planes');
  });

  it('agencia en verificación: avisa y ofrece crear un plan', async () => {
    cargar({ agencia: agencia({ estado_verificacion: 'pendiente', rnt_vigente_hasta: null }) });
    await pintar();
    const region = screen.getByRole('region', { name: /Por resolver/ });
    expect(texto(region)).toContain('Tu agencia está en verificación');
    expect(within(region).getByRole('link', { name: 'Crear un plan' }).getAttribute('href')).toBe('#/planes/nuevo');
  });
});

describe('ResumenPage · salidas de la semana', () => {
  it('lunes a domingo de la semana de Bogotá, con hoy resaltado y los días sin salidas dicho', async () => {
    cargar();
    const { container } = await pintar();
    expect(screen.getByRole('heading', { name: 'Salidas de la semana' })).toBeTruthy();
    expect(texto(container.querySelector('[data-rango]'))).toBe('Del 2 al 8 de noviembre');
    const dias = [...container.querySelectorAll('[data-semana] > li')];
    expect(dias.map((d) => texto(d.querySelector('span:nth-child(2)')))).toEqual(['2', '3', '4', '5', '6', '7', '8']);
    expect(dias.filter((d) => d.hasAttribute('data-hoy')).map((d) => d.getAttribute('data-dia'))).toEqual(['2026-11-03']);
    expect(texto(dia(container, '2026-11-03'))).toContain('Hoy');
    expect(dias.filter((d) => d.hasAttribute('data-pasado')).map((d) => d.getAttribute('data-dia'))).toEqual(['2026-11-02']);
    expect(dias.filter((d) => texto(d).includes('Sin salidas'))).toHaveLength(5); // todos menos jue 5 y dom 8
    expect(texto(dia(container, '2026-11-04'))).toContain('Sin salidas');
  });

  it('cada salida es un bloque con plan, hora, «N de M» y «K libres», y su relleno es lo reservado', async () => {
    cargar();
    const { container } = await pintar();
    const b = bloque(container, 'rc5');
    expect(b.closest('[data-dia]')!.getAttribute('data-dia')).toBe('2026-11-05');
    expect(texto(b)).toBe('Río Claro 2 días con hospedaje 06:30 5 de 24 19 libres');
    expect((b.querySelector('[data-relleno]') as HTMLElement).style.height).toBe('21%');
    expect(b.getAttribute('aria-label')).toContain('Río Claro 2 días con hospedaje, Jueves 5 de noviembre, 06:30: 5 de 24 cupos reservados.');
    // el domingo 8: San Rafael (06:00) antes que Río Claro (06:30)
    const delDomingo = [...dia(container, '2026-11-08').querySelectorAll('[data-salida-id]')].map((x) => x.getAttribute('data-salida-id'));
    expect(delDomingo).toEqual(['sr8', 'rc8']);
  });

  it('lo que ya salió sigue en su día, marcado como ya salido y sin cupos libres que ofrecer', async () => {
    cargar({ planes: [plan('Hoy temprano', [fecha({ id: 'h', fecha: '2026-11-03', cupo_total: 10, cupo_disponible: 6 })]), rio] });
    const { container } = await pintar();
    const pasado = bloque(container, 'h');
    expect(pasado.closest('[data-dia]')!.getAttribute('data-dia')).toBe('2026-11-03');
    expect(pasado.className).toContain('pasada');
    expect(texto(pasado)).toContain('Ya salió');
    expect(texto(pasado)).not.toContain('libres');
    expect(pasado.getAttribute('aria-label')).toContain('Ya salió.');
  });

  it('«Siguiente» muestra del 9 al 15 con sus salidas y «Esta semana» vuelve', async () => {
    cargar();
    const { container } = await pintar();
    const esta = screen.getByRole('button', { name: 'Esta semana' });
    const sig = screen.getByRole('button', { name: 'Siguiente' });
    expect(esta.getAttribute('aria-pressed')).toBe('true');
    expect(sig.getAttribute('aria-pressed')).toBe('false');

    await fireEvent.click(sig);
    expect(texto(container.querySelector('[data-rango]'))).toBe('Del 9 al 15 de noviembre');
    expect(sig.getAttribute('aria-pressed')).toBe('true');
    expect(esta.getAttribute('aria-pressed')).toBe('false');
    expect(bloque(container, 'rc11')).not.toBeNull();
    expect(bloque(container, 'rc5')).toBeNull();
    expect(container.querySelector('[data-hoy]')).toBeNull();

    await fireEvent.click(esta);
    expect(texto(container.querySelector('[data-rango]'))).toBe('Del 2 al 8 de noviembre');
    expect(bloque(container, 'rc5')).not.toBeNull();
  });

  it('«Más adelante» apunta a la siguiente salida después de la semana y ofrece verla', async () => {
    cargar();
    const { container } = await pintar();
    const linea = container.querySelector('[data-mas-adelante]') as HTMLElement;
    expect(texto(linea)).toContain('Más adelante · mié 11 nov: Cascadas de San Rafael (5 de 24) y Río Claro 2 días con hospedaje (4 de 24)');
    await fireEvent.click(within(linea).getByRole('button', { name: /Ver la semana siguiente/ }));
    expect(texto(container.querySelector('[data-rango]'))).toBe('Del 9 al 15 de noviembre');
    // Ya en la siguiente, no hay nada más adelante.
    expect(texto(container.querySelector('[data-mas-adelante]'))).toBe('Más adelante · no tienes más salidas programadas.');
    expect(screen.queryByRole('button', { name: /Ver la semana siguiente/ })).toBeNull();
  });

  it('la semana mostrada es la de Bogotá aunque el navegador ya esté en el día siguiente', async () => {
    // Domingo 8-nov 23:30 en Bogotá = lunes 9 04:30 UTC: en Auckland ya es lunes 9 por la tarde.
    vi.setSystemTime(new Date(Date.UTC(2026, 10, 9, 4, 30)));
    const previa = Intl.DateTimeFormat().resolvedOptions().timeZone;
    process.env.TZ = 'Pacific/Auckland';
    try {
      cargar();
      const { container } = await pintar();
      expect(texto(container.querySelector('[data-rango]'))).toBe('Del 2 al 8 de noviembre');
      expect(dia(container, '2026-11-08').hasAttribute('data-hoy')).toBe(true);
    } finally {
      process.env.TZ = previa;
    }
  });

  it('sin salidas en la semana lo dice día por día', async () => {
    cargar({ planes: [] });
    const { container } = await pintar();
    expect(container.querySelectorAll('[data-salida-id]')).toHaveLength(0);
    expect(texto(container.querySelector('[data-semana]'))).toContain('Sin salidas');
  });
});

describe('ResumenPage · teclado', () => {
  it('solo un bloque entra con Tab (el elegido) y las flechas mueven el foco entre días y bloques', async () => {
    cargar();
    const { container } = await pintar();
    const todos = [...container.querySelectorAll<HTMLElement>('[data-salida-id]')];
    expect(todos.filter((b) => b.tabIndex === 0).map((b) => b.getAttribute('data-salida-id'))).toEqual(['rc5']);

    bloque(container, 'rc5').focus();
    await fireEvent.keyDown(document.activeElement!, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(bloque(container, 'sr8'));
    await fireEvent.keyDown(document.activeElement!, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(bloque(container, 'rc8'));
    await fireEvent.keyDown(document.activeElement!, { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(bloque(container, 'rc5'));
    await fireEvent.keyDown(document.activeElement!, { key: 'End' });
    expect(document.activeElement).toBe(bloque(container, 'rc8'));
    await fireEvent.keyDown(document.activeElement!, { key: 'Home' });
    expect(document.activeElement).toBe(bloque(container, 'rc5'));
    // El foco rodante: ahora Tab volvería al último bloque donde estuvo el foco.
    expect(bloque(container, 'rc5').tabIndex).toBe(0);
    expect(bloque(container, 'sr8').tabIndex).toBe(-1);
  });

  it('otras teclas no se tragan (Tab y Enter siguen su camino)', async () => {
    cargar();
    const { container } = await pintar();
    bloque(container, 'rc5').focus();
    expect(await fireEvent.keyDown(document.activeElement!, { key: 'Tab' })).toBe(true); // true: no se canceló
  });

  it('elegir un bloque lo marca con aria-pressed y suelta el anterior', async () => {
    cargar();
    const { container } = await pintar();
    expect(bloque(container, 'rc5').getAttribute('aria-pressed')).toBe('true');
    await fireEvent.click(bloque(container, 'sr8'));
    expect(bloque(container, 'sr8').getAttribute('aria-pressed')).toBe('true');
    expect(bloque(container, 'rc5').getAttribute('aria-pressed')).toBe('false');
    expect([...container.querySelectorAll('[data-salida-id][aria-pressed="true"]')]).toHaveLength(1);
  });
});

describe('ResumenPage · quiénes van (escritorio)', () => {
  it('la primera salida próxima viene elegida y el panel dice plan, día, hora, cupos y puntos', async () => {
    cargar();
    const { container } = await pintar();
    await waitFor(() => expect(within(aside(container)).getByText('Laura V.')).toBeTruthy());
    const panel = aside(container);
    expect(bloque(container, 'rc5').getAttribute('aria-pressed')).toBe('true');
    expect(texto(panel.querySelector('h2'))).toBe('Quiénes van');
    expect(texto(panel)).toContain('Río Claro 2 días con hospedaje');
    expect(texto(panel)).toContain('Jueves 5 de noviembre · sale a las 06:30');
    expect(texto(panel)).toContain('5 de 24 cupos reservados · 19 libres');
    expect(panel.querySelectorAll('[data-puntos] i')).toHaveLength(24);
    expect(panel.querySelectorAll('[data-puntos] i[data-lleno]')).toHaveLength(5);
  });

  it('lista las reservas con nombre corto y personas; la que no ha pagado lo dice, la confirmada no', async () => {
    cargar();
    const { container } = await pintar();
    await waitFor(() => expect(within(aside(container)).getByText('Laura V.')).toBeTruthy());
    const filas = [...aside(container).querySelectorAll('[data-reserva]')].map((f) => texto(f));
    expect(filas).toEqual(['L Laura V. 2 personas', 'A Andrés M. pendiente de pago 3 personas']);
    expect(aside(container).querySelectorAll('[data-pendiente]')).toHaveLength(1);
  });

  it('agrupa por fecha: cada bloque muestra solo sus reservas', async () => {
    cargar();
    const { container } = await pintar();
    await waitFor(() => expect(within(aside(container)).getByText('Laura V.')).toBeTruthy());
    await fireEvent.click(bloque(container, 'sr8'));
    expect([...aside(container).querySelectorAll('[data-reserva]')].map((f) => texto(f))).toEqual(['N Natalia B. 2 personas']);
    expect(texto(aside(container))).toContain('Domingo 8 de noviembre · sale a las 06:00');
    expect(texto(aside(container))).toContain('2 de 24 cupos reservados · 22 libres');
    await fireEvent.click(bloque(container, 'rc8'));
    expect([...aside(container).querySelectorAll('[data-reserva]')].map((f) => texto(f))).toEqual(['S Sebastián O. 3 personas']);
  });

  it('una persona va en singular', async () => {
    cargar({}, { reservas: [fila('rc5', 'b1', 'Laura V.', 1)] });
    const { container } = await pintar();
    await waitFor(() => expect(within(aside(container)).getByText('Laura V.')).toBeTruthy());
    expect(texto(aside(container).querySelector('[data-pax]'))).toBe('1 persona');
  });

  it('una sola llamada por semana con las fechas de la semana; elegir bloques no vuelve a llamar', async () => {
    cargar();
    const { container } = await pintar();
    await waitFor(() => expect(quienesMock).toHaveBeenCalledTimes(1));
    expect(quienesMock).toHaveBeenLastCalledWith(['rc5', 'sr8', 'rc8']);

    await fireEvent.click(bloque(container, 'sr8'));
    await fireEvent.click(bloque(container, 'rc8'));
    expect(quienesMock).toHaveBeenCalledTimes(1);

    await fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    await waitFor(() => expect(quienesMock).toHaveBeenCalledTimes(2));
    expect(quienesMock).toHaveBeenLastCalledWith(['sr11', 'rc11']);
    // La primera salida de la semana siguiente queda elegida y su panel se llena.
    expect(bloque(container, 'sr11').getAttribute('aria-pressed')).toBe('true');
    await waitFor(() => expect(within(aside(container)).getByText('Felipe R.')).toBeTruthy());

    await fireEvent.click(screen.getByRole('button', { name: 'Esta semana' }));
    await waitFor(() => expect(quienesMock).toHaveBeenCalledTimes(3));
    expect(quienesMock).toHaveBeenLastCalledWith(['rc5', 'sr8', 'rc8']);
  });

  it('una semana sin salidas no llama al servidor ni elige nada', async () => {
    cargar({ planes: [] });
    const { container } = await pintar();
    expect(quienesMock).not.toHaveBeenCalled();
    expect(texto(aside(container))).toContain('Elige una salida para ver quiénes van.');
  });

  it('una salida sin reservas dice «Aún nadie reservó esta salida»', async () => {
    cargar({}, { reservas: [] });
    const { container } = await pintar();
    await waitFor(() => expect(aside(container).querySelector('[data-q-vacio]')).not.toBeNull());
    expect(texto(aside(container).querySelector('[data-q-vacio]'))).toBe('Aún nadie reservó esta salida');
    expect(aside(container).querySelector('[data-reservas]')).toBeNull();
  });

  it('si falla muestra el error con «Reintentar», que vuelve a pedir la misma semana', async () => {
    cargar();
    quienesMock.mockRejectedValueOnce(new Error('sin red'));
    const { container } = await pintar();
    await waitFor(() => expect(aside(container).querySelector('[data-q-error]')).not.toBeNull());
    expect(texto(aside(container))).toContain('No pudimos cargar quiénes van.');
    await fireEvent.click(within(aside(container)).getByRole('button', { name: 'Reintentar' }));
    await waitFor(() => expect(within(aside(container)).getByText('Laura V.')).toBeTruthy());
    expect(quienesMock).toHaveBeenCalledTimes(2);
    expect(quienesMock).toHaveBeenLastCalledWith(['rc5', 'sr8', 'rc8']);
    expect(aside(container).querySelector('[data-q-error]')).toBeNull();
  });

  it('una respuesta tardía de la semana anterior no pisa la de la semana que se está viendo', async () => {
    cargar();
    let tarde!: (f: QuienViaja[]) => void;
    quienesMock.mockReturnValueOnce(new Promise((r) => (tarde = r)));
    const { container } = await pintar();
    quienesMock.mockResolvedValueOnce([fila('sr11', 'z', 'Felipe R.', 3)]);
    await fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    await waitFor(() => expect(within(aside(container)).getByText('Felipe R.')).toBeTruthy());
    tarde([fila('sr11', 'tarde', 'Tardía T.', 1)]);
    await new Promise((r) => setTimeout(r, 0));
    expect(within(aside(container)).queryByText('Tardía T.')).toBeNull();
    expect(within(aside(container)).getByText('Felipe R.')).toBeTruthy();
  });

  it('en escritorio no hay hoja', async () => {
    cargar();
    await pintar();
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

describe('ResumenPage · quiénes van (celular)', () => {
  const abrirHoja = async (container: HTMLElement, id = 'rc5') => {
    await fireEvent.click(bloque(container, id));
    return screen.findByRole('dialog', { name: 'Quiénes van' });
  };

  it('no hay panel lateral y la hoja no se abre sola: se abre al tocar una salida', async () => {
    pantalla(true);
    cargar();
    const { container } = await pintar();
    expect(aside(container)).toBeNull();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(bloque(container, 'rc5').getAttribute('aria-pressed')).toBe('true'); // elegida por defecto, hoja cerrada

    const hoja = await abrirHoja(container);
    expect(hoja.getAttribute('aria-modal')).toBe('true');
    await waitFor(() => expect(within(hoja).getByText('Laura V.')).toBeTruthy());
    expect(texto(hoja)).toContain('5 de 24 cupos reservados · 19 libres');
    expect(texto(hoja)).toContain('pendiente de pago');
  });

  it('al abrir el foco entra a la hoja (el botón de cerrar) y Tab no se escapa de ella', async () => {
    pantalla(true);
    cargar({}, { reservas: [] });
    const { container } = await pintar();
    const hoja = await abrirHoja(container);
    const cerrar = within(hoja).getByRole('button', { name: 'Cerrar Quiénes van' });
    await waitFor(() => expect(document.activeElement).toBe(cerrar));
    // Solo hay un elemento enfocable: Tab y Mayús+Tab se quedan en él.
    expect(await fireEvent.keyDown(cerrar, { key: 'Tab' })).toBe(false); // cancelado: lo atrapa la hoja
    expect(document.activeElement).toBe(cerrar);
    expect(await fireEvent.keyDown(cerrar, { key: 'Tab', shiftKey: true })).toBe(false);
    expect(document.activeElement).toBe(cerrar);
  });

  it('con varios elementos enfocables, Tab del último vuelve al primero y Mayús+Tab del primero va al último', async () => {
    pantalla(true);
    cargar();
    quienesMock.mockRejectedValueOnce(new Error('sin red'));
    const { container } = await pintar();
    const hoja = await abrirHoja(container);
    const reintentar = await within(hoja).findByRole('button', { name: 'Reintentar' });
    const cerrar = within(hoja).getByRole('button', { name: 'Cerrar Quiénes van' });
    reintentar.focus();
    await fireEvent.keyDown(reintentar, { key: 'Tab' });
    expect(document.activeElement).toBe(cerrar);
    await fireEvent.keyDown(cerrar, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(reintentar);
  });

  it('Esc cierra la hoja y el foco vuelve al bloque que la abrió', async () => {
    pantalla(true);
    cargar();
    const { container } = await pintar();
    bloque(container, 'sr8').focus();
    await abrirHoja(container, 'sr8');
    await fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(document.activeElement).toBe(bloque(container, 'sr8'));
    expect(bloque(container, 'sr8').getAttribute('aria-pressed')).toBe('true');
  });

  it('el botón de cerrar y la cortina también cierran y devuelven el foco', async () => {
    pantalla(true);
    cargar();
    const { container } = await pintar();
    let hoja = await abrirHoja(container);
    await fireEvent.click(within(hoja).getByRole('button', { name: 'Cerrar Quiénes van' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(document.activeElement).toBe(bloque(container, 'rc5'));

    hoja = await abrirHoja(container, 'rc8');
    await fireEvent.click(document.querySelector('button[aria-hidden="true"][tabindex="-1"]')!); // la cortina
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(document.activeElement).toBe(bloque(container, 'rc8'));
  });

  it('cambiar de semana cierra la hoja', async () => {
    pantalla(true);
    cargar();
    const { container } = await pintar();
    await abrirHoja(container);
    await fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });
});

describe('ResumenPage · tus planes', () => {
  const ventas = [venta({ booking_id: 'a', fecha: '2026-11-05' })];

  it('por plan: personas, salidas y ocupación de este mes, con «Vende más» y «Vende menos» y una frase simple', async () => {
    cargar({
      planes: [rio, san],
      ventas,
    });
    const { container } = await pintar();
    const sec = container.querySelector('[data-tus-planes]') as HTMLElement;
    expect(texto(sec.querySelector('[data-frase]'))).toBe('Este mes se vende más Río Claro 2 días con hospedaje; Cascadas de San Rafael vende menos.');
    const items = [...sec.querySelectorAll('li')].map((li) => texto(li));
    expect(items).toEqual([
      'Río Claro 2 días con hospedaje Vende más 12 personas en 3 salidas · 17 % de los cupos ocupados',
      'Cascadas de San Rafael Vende menos 7 personas en 2 salidas · 15 % de los cupos ocupados',
    ]);
  });

  it('con un solo plan no hay «Vende más» ni «Vende menos»', async () => {
    cargar({ planes: [rio] });
    const { container } = await pintar();
    const sec = container.querySelector('[data-tus-planes]') as HTMLElement;
    expect(texto(sec)).not.toMatch(/Vende más|Vende menos/);
    expect(texto(sec.querySelector('[data-frase]'))).toBe('Este mes tienes 12 personas reservadas en 3 salidas.');
  });

  it('sin planes publicados lo dice simple', async () => {
    cargar({ planes: [] });
    const { container } = await pintar();
    expect(texto(container.querySelector('[data-frase]'))).toBe('Aún no tienes planes publicados.');
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
      'Juan David Z. Río Claro 2 días con hospedaje · ayer',
      'Laura V. Río Claro 2 días con hospedaje · hace 3 días',
      'Daniela C. Cascadas de San Rafael · hace 2 semanas',
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

describe('ResumenPage · la plata, una sola vez', () => {
  const ventas = [
    venta({ booking_id: 'a', fecha: '2026-11-05', monto_total: 6981000, comision: 837720, saldo_agencia: 6143280 }),
    venta({ booking_id: 'b', fecha: '2026-10-30', monto_total: 111111, comision: 13333, saldo_agencia: 97778 }), // otro mes
  ];
  const liquidaciones = [liquidacion({ monto_a_pagar: 2151600 })];

  it('«Este mes te corresponde», lo vendido con la comisión real y el próximo pago: cada monto exactamente una vez', async () => {
    cargar({ ventas }, { liquidaciones });
    const { container } = await pintar();
    const t = norm(texto(container));
    const monto = (n: number) => norm(cop(n));
    for (const n of [6143280, 6981000, 837720, 2151600]) expect(veces(t, monto(n)), monto(n)).toBe(1);
    const dinero = container.querySelector('[data-dinero]') as HTMLElement;
    expect(texto(dinero.querySelector('h2'))).toBe('Este mes te corresponde');
    expect(norm(texto(dinero.querySelector('[data-monto]')))).toBe(monto(6143280));
    expect(norm(texto(dinero.querySelector('[data-desglose]')))).toBe(`Vendiste ${monto(6981000)} en noviembre · comisión del 12 % (${monto(837720)})`);
    expect(norm(texto(dinero.querySelector('[data-proximo]')))).toBe(`Próximo pago: lun 9 nov · ${monto(2151600)}`);
    expect(within(dinero).getByRole('link', { name: 'Ver liquidaciones' }).getAttribute('href')).toBe('#/liquidaciones');
  });

  it('el porcentaje de comisión sale de la agencia', async () => {
    cargar({ agencia: agencia({ comision_pct: 15 }), ventas }, { liquidaciones });
    const { container } = await pintar();
    expect(norm(texto(container.querySelector('[data-desglose]')))).toContain('comisión del 15 %');
  });

  it('sin ventas ni pagos lo dice en lenguaje simple', async () => {
    cargar({}, { liquidaciones: [] });
    const { container } = await pintar();
    expect(norm(texto(container.querySelector('[data-monto]')))).toBe(norm(cop(0)));
    expect(texto(container.querySelector('[data-desglose]'))).toBe('Todavía no hay reservas pagadas en los viajes de noviembre.');
    expect(texto(container.querySelector('[data-proximo]'))).toBe('Próximo pago: no tienes pagos pendientes por ahora.');
  });

  it('si fallan los pagos, el resto sigue y lo avisa sin inventar nada', async () => {
    misVentasMock.mockResolvedValue({ agencia: agencia(), planes: [rio, san], ventas });
    misLiquidacionesMock.mockRejectedValue(new Error('sin red'));
    cuentasMock.mockRejectedValue(new Error('sin red'));
    resenasMock.mockResolvedValue([]);
    quienesMock.mockResolvedValue([]);
    const { container } = await pintar();
    expect(texto(container.querySelector('[data-proximo]'))).toBe('No pudimos consultar tus pagos ahora.');
    expect(norm(texto(container.querySelector('[data-monto]')))).toBe(norm(cop(6143280)));
    expect(texto(container)).not.toContain('Registrar cuenta');
  });
});

describe('ResumenPage · cifras', () => {
  it('precios, horas, conteos y cifras grandes van en la tipografía de títulos (sin el cero tachado de la de interfaz)', async () => {
    cargar({ ventas: [venta({ booking_id: 'a', fecha: '2026-11-05' })] });
    const { container } = await pintar();
    await waitFor(() => expect(within(aside(container)).getByText('Laura V.')).toBeTruthy());
    const titulo = (el: Element | null) => expect(el?.closest('.font-titulo'), el?.outerHTML).not.toBeNull();
    titulo(container.querySelector('[data-monto]'));
    titulo(container.querySelector('[data-desglose]'));
    titulo(container.querySelector('[data-proximo]'));
    titulo(container.querySelector('[data-rango]'));
    titulo(bloque(container, 'rc5').querySelector('[data-hora]'));
    titulo(bloque(container, 'rc5').querySelector('[data-cupos]'));
    titulo(bloque(container, 'rc5').querySelector('[data-libres]'));
    titulo(aside(container).querySelector('[data-q-cupos]'));
    titulo(aside(container).querySelector('[data-q-fecha]'));
    titulo(aside(container).querySelector('[data-pax]'));
    titulo(container.querySelector('[data-tus-planes] li p'));
    titulo(container.querySelector('[data-dia] > div > span:nth-child(2)'));
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

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/svelte';
import { agencia, cuentaResumen, HOY, itemLiquidacion, liquidacion, texto } from '$tests/fixtures';

vi.mock('$app/state', () => import('$tests/pagina-falsa.svelte'));
vi.mock('$lib/features/admin/api/admin.api', () => ({
  todasLasAgencias: vi.fn(),
  todasLiquidaciones: vi.fn(),
  generarLiquidaciones: vi.fn(),
  generarAnticipos: vi.fn(),
  ejecutarLiquidacion: vi.fn(),
  bloquearAnticipo: vi.fn(),
}));
vi.mock('$lib/features/liquidaciones/api/liquidaciones.api', () => ({
  cuentasResumen: vi.fn(),
  liquidacionDetalle: vi.fn(),
}));
vi.mock('$lib/features/auth/model/auth.svelte', () => ({
  auth: { userId: 'u-admin', email: 'admin@diverso.app' },
  signOut: vi.fn(),
}));

import {
  bloquearAnticipo,
  ejecutarLiquidacion,
  generarAnticipos,
  generarLiquidaciones,
  todasLasAgencias,
  todasLiquidaciones,
} from '$lib/features/admin/api/admin.api';
import { cuentasResumen, liquidacionDetalle } from '$lib/features/liquidaciones/api/liquidaciones.api';
import { toast } from '$lib/shared/lib/toast.svelte';
import AdminDispersionesPage from '$lib/features/admin/pages/AdminDispersionesPage.svelte';

const liqsMock = vi.mocked(todasLiquidaciones);
const agenciasMock = vi.mocked(todasLasAgencias);
const cuentasMock = vi.mocked(cuentasResumen);
const detalleMock = vi.mocked(liquidacionDetalle);
const semanaMock = vi.mocked(generarLiquidaciones);
const anticiposMock = vi.mocked(generarAnticipos);
const ejecutarMock = vi.mocked(ejecutarLiquidacion);
const bloquearMock = vi.mocked(bloquearAnticipo);

const eco = agencia({ id: 'ag-eco', nombre: 'EcoAndes' });
const graf = agencia({ id: 'ag-graf', nombre: 'Graffiti Tours', anticipo_bloqueado: true });
const pendiente = liquidacion({ id: 'l1', agency_id: 'ag-eco', agencies: { nombre: 'EcoAndes' } });
const sinCuenta = liquidacion({
  id: 'l2',
  agency_id: 'ag-graf',
  agencies: { nombre: 'Graffiti Tours' },
  monto_a_pagar: 90000,
});
const pagada = liquidacion({
  id: 'l3',
  agency_id: 'ag-eco',
  agencies: { nombre: 'EcoAndes' },
  tipo: 'anticipo',
  estado: 'pagada_prueba',
  referencia_prueba: 'PRUEBA-20260203-ABC',
  monto_a_pagar: 26400,
});

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(HOY); // domingo 25-oct-2026
  liqsMock.mockResolvedValue([pendiente, sinCuenta, pagada]);
  agenciasMock.mockResolvedValue([eco, graf]);
  cuentasMock.mockResolvedValue([cuentaResumen({ agency_id: 'ag-eco' })]);
});

afterEach(() => {
  toast.mensaje = '';
  vi.useRealTimers();
  vi.resetAllMocks();
});

/** Nombres de agencia de las tarjetas de liquidación visibles. */
function tarjetas(): string[] {
  return screen
    .getAllByRole('listitem')
    .filter((li) => li.querySelector('dl'))
    .map((li) => texto(li.querySelector('.truncate')));
}

const filtros = () => screen.getByRole('group', { name: 'Qué liquidaciones ver' });
const tablaAnticipos = () => screen.getByRole('table', { name: 'Anticipos por agencia' });

async function abrir() {
  const r = render(AdminDispersionesPage);
  await screen.findAllByText('Graffiti Tours');
  return r;
}

describe('AdminDispersiones', () => {
  it('el «Modo de prueba» es el de la barra y no se repite en la página; lista las pendientes con su cuenta enmascarada', async () => {
    const { container } = await abrir();
    const t = texto(container);
    expect(screen.getAllByText(/Modo de prueba/)).toHaveLength(1);
    expect(screen.queryByRole('note')).toBeNull(); // el aviso de página que repetía la barra ya no está
    expect(t).not.toContain('Dispersión de prueba — no se mueve dinero real');
    expect(tarjetas()).toEqual(['EcoAndes', 'Graffiti Tours']);
    expect(t).toContain('Bancolombia · Ahorros •••• 4321');
    expect(t).toContain('Sin cuenta registrada');
    expect(t).not.toContain('PRUEBA-20260203-ABC'); // la pagada no está en «Pendientes»
  });

  it('filtra por estado y cada filtro dice cuántas liquidaciones trae', async () => {
    const { container } = await abrir();
    expect(within(filtros()).getAllByRole('button').map((b) => texto(b))).toEqual(['Pendientes 2', 'Pagadas (prueba) 1', 'Todas 3']);
    expect(within(filtros()).getByRole('button', { name: /^Pendientes/ }).getAttribute('aria-pressed')).toBe('true');

    await fireEvent.click(within(filtros()).getByRole('button', { name: /^Pagadas/ }));
    expect(within(filtros()).getByRole('button', { name: /^Pagadas/ }).getAttribute('aria-pressed')).toBe('true');
    expect(tarjetas()).toEqual(['EcoAndes']);
    expect(texto(container)).toContain('Referencia: PRUEBA-20260203-ABC');
    await fireEvent.click(within(filtros()).getByRole('button', { name: /^Todas/ }));
    expect(tarjetas()).toHaveLength(3);
  });

  it('propone la semana pasada y genera sus liquidaciones', async () => {
    semanaMock.mockResolvedValue({ periodo_inicio: '2026-10-12', periodo_fin: '2026-10-18', liquidaciones: 2, items: 5 });
    const { container } = await abrir();
    expect((screen.getByLabelText(/^Semana a liquidar/) as HTMLInputElement).value).toBe('2026-10-12');
    expect(texto(container)).toContain('Semana del lunes 12 de octubre de 2026 al domingo 18 de octubre de 2026');

    await fireEvent.click(screen.getByRole('button', { name: 'Generar liquidaciones de la semana' }));
    await vi.waitFor(() => expect(semanaMock).toHaveBeenCalledWith('2026-10-12'));
    await vi.waitFor(() => expect(toast.mensaje).toMatch(/2 liquidaciones con 5 items/));
    expect(liqsMock).toHaveBeenCalledTimes(2); // recarga la lista
  });

  it('no deja generar una semana que no ha terminado', async () => {
    const { container } = await abrir();
    await fireEvent.input(screen.getByLabelText(/^Semana a liquidar/), { target: { value: '2026-10-22' } });
    expect(texto(container)).toContain('Aún no termina');
    const boton = screen.getByRole('button', { name: 'Generar liquidaciones de la semana' }) as HTMLButtonElement;
    expect(boton.disabled).toBe(true); // el navegador no deja pulsarlo
    expect(semanaMock).not.toHaveBeenCalled();

    // Una semana que ya terminó vuelve a habilitarlo.
    await fireEvent.input(screen.getByLabelText(/^Semana a liquidar/), { target: { value: '2026-10-18' } });
    expect((screen.getByRole('button', { name: 'Generar liquidaciones de la semana' }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('si el servidor rechaza la semana lo muestra', async () => {
    semanaMock.mockRejectedValue(new Error('Esa semana aún no termina'));
    await abrir();
    await fireEvent.click(screen.getByRole('button', { name: 'Generar liquidaciones de la semana' }));
    await vi.waitFor(() => expect(toast.mensaje).toBe('Esa semana aún no termina'));
  });

  it('genera los anticipos ahora', async () => {
    anticiposMock.mockResolvedValue({ liquidaciones: 1, items: 3 });
    await abrir();
    await fireEvent.click(screen.getByRole('button', { name: 'Generar anticipos ahora' }));
    await vi.waitFor(() => expect(toast.mensaje).toMatch(/Anticipos generados: 1 liquidaciones con 3 reservas/));
    anticiposMock.mockResolvedValue({ liquidaciones: 0, items: 0 });
    await fireEvent.click(screen.getByRole('button', { name: 'Generar anticipos ahora' }));
    await vi.waitFor(() => expect(toast.mensaje).toBe('No había anticipos nuevos por generar.'));
  });

  it('ejecutar abre una confirmación con el foco dentro y solo al confirmar llama al backend', async () => {
    ejecutarMock.mockResolvedValue({ referencia_prueba: 'PRUEBA-20260209-NEW' });
    const { container } = await abrir();
    const disparador = screen.getAllByRole('button', { name: 'Ejecutar dispersión de prueba' })[0];
    disparador.focus();
    await fireEvent.click(disparador);

    const dialogo = screen.getByRole('alertdialog');
    expect(texto(dialogo)).toContain('Vas a registrar una dispersión de prueba de $ 272.800 a EcoAndes (Bancolombia · Ahorros •••• 4321)');
    expect(texto(dialogo)).toContain('Dispersión de prueba — no se mueve dinero real');
    expect(dialogo.contains(document.activeElement)).toBe(true);
    expect(ejecutarMock).not.toHaveBeenCalled();

    await fireEvent.click(within(dialogo).getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(ejecutarMock).not.toHaveBeenCalled();

    await fireEvent.click(screen.getAllByRole('button', { name: 'Ejecutar dispersión de prueba' })[0]);
    await fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Confirmar dispersión de prueba' }));
    await vi.waitFor(() => expect(ejecutarMock).toHaveBeenCalledWith('l1'));
    await vi.waitFor(() => expect(toast.mensaje).toBe('Dispersión de prueba registrada: PRUEBA-20260209-NEW'));
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(texto(container)).not.toContain('Confirmar dispersión de prueba');
  });

  it('Escape cancela la confirmación sin llamar al backend y devuelve el foco a quien la abrió', async () => {
    await abrir();
    const disparador = screen.getAllByRole('button', { name: 'Ejecutar dispersión de prueba' })[0];
    disparador.focus();
    await fireEvent.click(disparador);
    expect(screen.getByRole('alertdialog')).toBeTruthy();

    await fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(ejecutarMock).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(disparador);
  });

  it('si la agencia no tiene cuenta, el error del servidor aparece en la confirmación, que sigue abierta', async () => {
    ejecutarMock.mockRejectedValue(new Error('La agencia aún no registró su cuenta para dispersiones.'));
    await abrir();
    await fireEvent.click(screen.getAllByRole('button', { name: 'Ejecutar dispersión de prueba' })[1]); // Graffiti
    const dialogo = screen.getByRole('alertdialog');
    expect(texto(dialogo)).toContain('Sin cuenta registrada');
    await fireEvent.click(within(dialogo).getByRole('button', { name: 'Confirmar dispersión de prueba' }));
    const alerta = await within(dialogo).findByRole('alert');
    expect(texto(alerta)).toBe('La agencia aún no registró su cuenta para dispersiones.');
    expect(screen.getByRole('alertdialog')).toBeTruthy();
    expect(toast.mensaje).toBe(''); // el error se queda en el diálogo, no se repite en el aviso
  });

  it('una pendiente con saldo negativo no se puede ejecutar: se compensa sola', async () => {
    liqsMock.mockResolvedValue([
      liquidacion({ id: 'neg', agency_id: 'ag-eco', agencies: { nombre: 'EcoAndes' }, monto_a_pagar: -8800 }),
      pendiente,
    ]);
    const { container } = await abrir();
    expect(screen.getAllByRole('button', { name: 'Ejecutar dispersión de prueba' })).toHaveLength(1);
    expect(texto(container)).toContain('Saldo negativo: se descontará automáticamente de la próxima liquidación semanal.');
  });

  it('muestra las compensadas y sin saldo en «Todas», sin botón de ejecutar', async () => {
    liqsMock.mockResolvedValue([
      liquidacion({ id: 'c', agency_id: 'ag-eco', agencies: { nombre: 'EcoAndes' }, estado: 'compensada', compensada_en: 'x', monto_a_pagar: -1000 }),
      liquidacion({ id: 'z', agency_id: 'ag-graf', agencies: { nombre: 'Graffiti Tours' }, estado: 'sin_saldo', monto_a_pagar: 0 }),
    ]);
    const { container } = await abrir();
    await fireEvent.click(within(filtros()).getByRole('button', { name: /^Todas/ }));
    const t = texto(container);
    expect(t).toContain('Compensada: su saldo se descontó en otra liquidación.');
    expect(t).toContain('Sin saldo por dispersar: los anticipos ya cubrieron este periodo.');
    expect(screen.queryByRole('button', { name: 'Ejecutar dispersión de prueba' })).toBeNull();
  });

  it('las pagadas no ofrecen ejecutar otra vez', async () => {
    await abrir();
    await fireEvent.click(within(filtros()).getByRole('button', { name: /^Pagadas/ }));
    expect(screen.queryByRole('button', { name: 'Ejecutar dispersión de prueba' })).toBeNull();
  });

  it('despliega las reservas de una liquidación', async () => {
    detalleMock.mockResolvedValue({ ...pendiente, liquidacion_items: [itemLiquidacion()] });
    await abrir();
    await fireEvent.click(screen.getAllByRole('button', { name: 'Ver reservas' })[0]);
    expect(await screen.findByText('DV-AAAA')).toBeTruthy();
    expect(detalleMock).toHaveBeenCalledWith('l1');
    await fireEvent.click(screen.getByRole('button', { name: 'Ocultar reservas' }));
    expect(screen.queryByText('DV-AAAA')).toBeNull();
  });

  it('lista el anticipo de cada agencia verificada en una tabla y lo bloquea o desbloquea', async () => {
    bloquearMock.mockResolvedValue();
    await abrir();
    expect(within(tablaAnticipos()).getAllByRole('columnheader').map((c) => texto(c))).toEqual(['Agencia', 'Cuenta para dispersiones', 'Anticipos']);
    const fila = (nombre: string) => within(tablaAnticipos()).getByRole('row', { name: new RegExp(`^${nombre}`) });
    expect(texto(fila('EcoAndes'))).toContain('Habilitados');
    expect(texto(fila('EcoAndes'))).toContain('Bancolombia · Ahorros •••• 4321');
    expect(texto(fila('Graffiti Tours'))).toContain('Bloqueados');
    expect(texto(fila('Graffiti Tours'))).toContain('Sin cuenta registrada');

    await fireEvent.click(within(fila('EcoAndes')).getByRole('button', { name: 'Bloquear anticipo' }));
    await vi.waitFor(() => expect(bloquearMock).toHaveBeenCalledWith('ag-eco', true));
    await vi.waitFor(() => expect(toast.mensaje).toBe('Anticipos de EcoAndes bloqueados.'));
    expect(texto(fila('EcoAndes'))).toContain('Bloqueados');

    await fireEvent.click(within(fila('Graffiti Tours')).getByRole('button', { name: 'Desbloquear anticipo' }));
    await vi.waitFor(() => expect(bloquearMock).toHaveBeenCalledWith('ag-graf', false));
  });

  it('si el servidor rechaza el bloqueo, la agencia conserva su estado y el motivo sale en el aviso', async () => {
    bloquearMock.mockRejectedValue(new Error('sin permisos'));
    await abrir();
    const fila = within(tablaAnticipos()).getByRole('row', { name: /^EcoAndes/ });
    await fireEvent.click(within(fila).getByRole('button', { name: 'Bloquear anticipo' }));
    await vi.waitFor(() => expect(toast.mensaje).toBe('sin permisos'));
    expect(texto(fila)).toContain('Habilitados');
  });

  it('la barra marca Dispersiones como la pestaña activa y enlaza con Agencias', async () => {
    await abrir();
    const secciones = screen.getByRole('navigation', { name: 'Secciones de administración' });
    expect(within(secciones).getByRole('link', { name: 'Agencias' }).getAttribute('href')).toBe('#/admin');
    expect(within(secciones).getAllByRole('link', { current: 'page' }).map((a) => texto(a))).toEqual(['Dispersiones']);
  });

  it('explica en palabras simples cuándo se generan solas las liquidaciones y los anticipos', async () => {
    const { container } = await abrir();
    const t = texto(container);
    expect(t).toContain('Las liquidaciones de la semana se generan solas los lunes por la mañana');
    expect(t).toContain('los anticipos, cada hora');
    expect(t).not.toMatch(/06:00|Bogotá|cron/i);
  });

  it('«Cerrar sesión» y el tema viven en el menú de cuenta, no sueltos en la barra', async () => {
    await abrir();
    expect(screen.queryByRole('button', { name: 'Cerrar sesión' })).toBeNull();
    await fireEvent.click(screen.getByRole('button', { name: 'Cuenta de Administración' }));
    expect(screen.getByRole('radiogroup', { name: 'Tema' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Cerrar sesión' })).toBeTruthy();
  });

  it('si falla la carga muestra el error y deja reintentar', async () => {
    liqsMock.mockRejectedValueOnce(new Error('sin permisos'));
    render(AdminDispersionesPage);
    expect(await screen.findByText('No pudimos cargar las liquidaciones')).toBeTruthy();
    expect(screen.getByText('sin permisos')).toBeTruthy();

    await fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findAllByText('Graffiti Tours')).toBeTruthy();
    expect(screen.queryByText('No pudimos cargar las liquidaciones')).toBeNull();
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/svelte';
import { agencia, cuentaResumen, HOY, itemLiquidacion, liquidacion, texto } from '@/test/fixtures';

vi.mock('./admin.api', () => ({
  todasLasAgencias: vi.fn(),
  todasLiquidaciones: vi.fn(),
  generarLiquidaciones: vi.fn(),
  generarAnticipos: vi.fn(),
  ejecutarLiquidacion: vi.fn(),
  bloquearAnticipo: vi.fn(),
}));
vi.mock('@/features/liquidaciones/liquidaciones.api', () => ({
  cuentasResumen: vi.fn(),
  liquidacionDetalle: vi.fn(),
}));
vi.mock('@/features/auth/auth.svelte', () => ({
  auth: { email: 'admin@diverso.app' },
  signOut: vi.fn(),
}));

import {
  bloquearAnticipo,
  ejecutarLiquidacion,
  generarAnticipos,
  generarLiquidaciones,
  todasLasAgencias,
  todasLiquidaciones,
} from './admin.api';
import { cuentasResumen, liquidacionDetalle } from '@/features/liquidaciones/liquidaciones.api';
import { toast } from '@/shared/lib/toast.svelte';
import AdminDispersionesPage from './AdminDispersionesPage.svelte';

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

async function abrir() {
  const r = render(AdminDispersionesPage);
  await screen.findAllByText('Graffiti Tours');
  return r;
}

describe('AdminDispersiones', () => {
  it('muestra el aviso de prueba y las liquidaciones pendientes con su cuenta enmascarada', async () => {
    const { container } = await abrir();
    const t = texto(container);
    expect(t).toContain('Dispersión de prueba — no se mueve dinero real');
    expect(tarjetas()).toEqual(['EcoAndes', 'Graffiti Tours']);
    expect(t).toContain('Bancolombia · Ahorros •••• 4321');
    expect(t).toContain('Sin cuenta registrada');
    expect(t).not.toContain('PRUEBA-20260203-ABC'); // la pagada no está en «Pendientes»
  });

  it('filtra por estado', async () => {
    const { container } = await abrir();
    await fireEvent.click(screen.getByRole('button', { name: 'Pagadas (prueba)' }));
    expect(tarjetas()).toEqual(['EcoAndes']);
    expect(texto(container)).toContain('Referencia: PRUEBA-20260203-ABC');
    await fireEvent.click(screen.getByRole('button', { name: 'Todas' }));
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

  it('ejecutar pide confirmación y solo entonces llama al backend', async () => {
    ejecutarMock.mockResolvedValue({ referencia_prueba: 'PRUEBA-20260209-NEW' });
    const { container } = await abrir();
    const botones = screen.getAllByRole('button', { name: 'Ejecutar dispersión de prueba' });
    await fireEvent.click(botones[0]);

    const dialogo = screen.getByRole('alertdialog');
    expect(texto(dialogo)).toContain('Vas a registrar una dispersión de prueba de $ 272.800 a EcoAndes (Bancolombia · Ahorros •••• 4321)');
    expect(texto(dialogo)).toContain('Dispersión de prueba — no se mueve dinero real');
    expect(ejecutarMock).not.toHaveBeenCalled();

    await fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(ejecutarMock).not.toHaveBeenCalled();

    await fireEvent.click(screen.getAllByRole('button', { name: 'Ejecutar dispersión de prueba' })[0]);
    await fireEvent.click(screen.getByRole('button', { name: 'Confirmar dispersión de prueba' }));
    await vi.waitFor(() => expect(ejecutarMock).toHaveBeenCalledWith('l1'));
    await vi.waitFor(() => expect(toast.mensaje).toBe('Dispersión de prueba registrada: PRUEBA-20260209-NEW'));
    expect(texto(container)).not.toContain('Confirmar dispersión de prueba');
  });

  it('si la agencia no tiene cuenta, el error del servidor aparece en la confirmación', async () => {
    ejecutarMock.mockRejectedValue(new Error('La agencia aún no registró su cuenta para dispersiones.'));
    await abrir();
    await fireEvent.click(screen.getAllByRole('button', { name: 'Ejecutar dispersión de prueba' })[1]); // Graffiti
    expect(texto(screen.getByRole('alertdialog'))).toContain('Sin cuenta registrada');
    await fireEvent.click(screen.getByRole('button', { name: 'Confirmar dispersión de prueba' }));
    expect(await screen.findByText('La agencia aún no registró su cuenta para dispersiones.')).toBeTruthy();
    expect(screen.getByRole('alertdialog')).toBeTruthy(); // sigue abierta
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
    await fireEvent.click(screen.getByRole('button', { name: 'Todas' }));
    const t = texto(container);
    expect(t).toContain('Compensada: su saldo se descontó en otra liquidación.');
    expect(t).toContain('Sin saldo por dispersar: los anticipos ya cubrieron este periodo.');
    expect(screen.queryByRole('button', { name: 'Ejecutar dispersión de prueba' })).toBeNull();
  });

  it('las pagadas no ofrecen ejecutar otra vez', async () => {
    await abrir();
    await fireEvent.click(screen.getByRole('button', { name: 'Pagadas (prueba)' }));
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

  it('bloquea y desbloquea el anticipo por agencia', async () => {
    bloquearMock.mockResolvedValue();
    const { container } = await abrir();
    expect(texto(container)).toContain('Anticipos: habilitados');
    expect(texto(container)).toContain('Anticipos: bloqueados');

    await fireEvent.click(screen.getByRole('button', { name: 'Bloquear anticipo' }));
    await vi.waitFor(() => expect(bloquearMock).toHaveBeenCalledWith('ag-eco', true));
    await vi.waitFor(() => expect(toast.mensaje).toBe('Anticipos de EcoAndes bloqueados.'));

    await fireEvent.click(screen.getAllByRole('button', { name: 'Desbloquear anticipo' })[1]);
    await vi.waitFor(() => expect(bloquearMock).toHaveBeenCalledWith('ag-graf', false));
  });

  it('enlaza con la verificación de agencias', async () => {
    await abrir();
    expect(screen.getByRole('link', { name: 'Verificación de agencias' }).getAttribute('href')).toBe('#/admin');
  });

  it('si falla la carga muestra el error', async () => {
    liqsMock.mockRejectedValue(new Error('sin permisos'));
    render(AdminDispersionesPage);
    expect(await screen.findByText('No pudimos cargar las liquidaciones')).toBeTruthy();
    expect(screen.getByText('sin permisos')).toBeTruthy();
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/svelte';
import { agencia, HOY, texto } from '$tests/fixtures';

vi.mock('$lib/features/admin/api/admin.api', () => ({
  todasLasAgencias: vi.fn(),
  verificarAgencia: vi.fn(),
  rechazarAgencia: vi.fn(),
  actualizarVigencia: vi.fn(),
  historialVerificacion: vi.fn(),
}));
vi.mock('$lib/features/auth/model/auth.svelte', () => ({
  auth: { email: 'admin@diverso.app' },
  signOut: vi.fn(),
}));

import { todasLasAgencias } from '$lib/features/admin/api/admin.api';
import AdminAgenciasPage from '$lib/features/admin/pages/AdminAgenciasPage.svelte';

const todasMock = vi.mocked(todasLasAgencias);

const agencias = [
  agencia({ id: 'v', nombre: 'Verde Vigente' }),
  agencia({
    id: 'p',
    nombre: 'Pendiente Plan',
    estado_verificacion: 'pendiente',
    rnt_vigente_hasta: null,
    numero_rnt: '555',
  }),
  agencia({ id: 'x', nombre: 'Por Vencer', rnt_vigente_hasta: '2026-11-04', ciudad: 'Jardín' }),
  agencia({
    id: 'r',
    nombre: 'Rechazada Ltda',
    estado_verificacion: 'rechazado',
    rnt_vigente_hasta: null,
    motivo_rechazo: 'RNT no coincide',
  }),
  agencia({ id: 's', nombre: 'Sin Vigencia', rnt_vigente_hasta: null }),
  agencia({ id: 'o', nombre: 'Ya Vencida', rnt_vigente_hasta: '2026-10-20' }),
];

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(HOY);
});

afterEach(() => {
  vi.useRealTimers();
  vi.resetAllMocks();
});

/** Nombres de las agencias visibles en la lista. */
function nombres(): string[] {
  return screen.getAllByRole('listitem').map((li) => texto(li.querySelector('.truncate')));
}

function boton(nombre: string): string {
  return texto(screen.getByRole('button', { name: new RegExp(`^${nombre}`) }));
}

describe('Admin', () => {
  it('cuenta cada cola y abre en «Por verificar» si hay pendientes', async () => {
    todasMock.mockResolvedValue(agencias);
    render(AdminAgenciasPage);
    await screen.findByText('Verificación de agencias');
    await screen.findByText('Pendiente Plan');

    expect(boton('Por verificar')).toBe('Por verificar 1');
    expect(boton('RNT por renovar')).toBe('RNT por renovar 3'); // por vencer + sin vigencia + vencida
    expect(boton('Verificadas')).toBe('Verificadas 4');
    expect(boton('Rechazadas')).toBe('Rechazadas 1');
    expect(boton('Todas')).toBe('Todas 6');
    expect(nombres()).toEqual(['Pendiente Plan']);
  });

  it('«RNT por renovar» lista las verificadas con vigencia vencida, por vencer o ausente', async () => {
    todasMock.mockResolvedValue(agencias);
    const { container } = render(AdminAgenciasPage);
    await screen.findByText('Pendiente Plan');
    await fireEvent.click(screen.getByRole('button', { name: /^RNT por renovar/ }));

    expect(nombres()).toEqual(['Por Vencer', 'Sin Vigencia', 'Ya Vencida']);
    const t = texto(container);
    expect(t).toContain('RNT vence en 10 días');
    expect(t).toContain('Sin vigencia registrada');
    expect(t).toContain('RNT vencido hace 5 días');
  });

  it('abre en «RNT por renovar» si no hay pendientes y en «Todas» si tampoco hay qué renovar', async () => {
    todasMock.mockResolvedValueOnce([
      agencia({ id: 'v', nombre: 'Verde Vigente' }),
      agencia({ id: 's', nombre: 'Sin Vigencia', rnt_vigente_hasta: null }),
    ]);
    const primera = render(AdminAgenciasPage);
    await screen.findByText('Sin Vigencia');
    expect(nombres()).toEqual(['Sin Vigencia']);
    primera.unmount();

    todasMock.mockResolvedValueOnce([agencia({ id: 'v', nombre: 'Verde Vigente' })]);
    render(AdminAgenciasPage);
    await screen.findByText('Verde Vigente');
    expect(nombres()).toEqual(['Verde Vigente']);
  });

  it('busca por nombre, RNT o ciudad dentro de «Todas»', async () => {
    todasMock.mockResolvedValue(agencias);
    render(AdminAgenciasPage);
    await screen.findByText('Pendiente Plan');
    await fireEvent.click(screen.getByRole('button', { name: /^Todas/ }));
    const buscar = screen.getByLabelText('Buscar agencias');

    await fireEvent.input(buscar, { target: { value: 'jardín' } });
    expect(nombres()).toEqual(['Por Vencer']);
    await fireEvent.input(buscar, { target: { value: '555' } });
    expect(nombres()).toEqual(['Pendiente Plan']);
    await fireEvent.input(buscar, { target: { value: 'RECHAZADA' } });
    expect(nombres()).toEqual(['Rechazada Ltda']);
  });

  it('muestra el motivo del rechazo y el vacío de cada cola', async () => {
    todasMock.mockResolvedValue(agencias);
    const { container } = render(AdminAgenciasPage);
    await screen.findByText('Pendiente Plan');
    await fireEvent.click(screen.getByRole('button', { name: /^Rechazadas/ }));
    expect(texto(container)).toContain('Motivo del rechazo: RNT no coincide');

    await fireEvent.input(screen.getByLabelText('Buscar agencias'), { target: { value: 'zzz' } });
    expect(texto(container)).toContain('No hay agencias en esta categoría.');
  });

  it('enlaza con las dispersiones de prueba', async () => {
    todasMock.mockResolvedValue(agencias);
    render(AdminAgenciasPage);
    await screen.findByText('Pendiente Plan');
    expect(screen.getByRole('link', { name: 'Dispersiones de prueba' }).getAttribute('href')).toBe('#/admin/dispersiones');
  });

  it('si falla la carga muestra el error', async () => {
    todasMock.mockRejectedValue(new Error('sin permisos'));
    render(AdminAgenciasPage);
    expect(await screen.findByText('No pudimos cargar las agencias')).toBeTruthy();
    expect(screen.getByText('sin permisos')).toBeTruthy();
  });
});

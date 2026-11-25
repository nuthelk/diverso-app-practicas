import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen, within } from '@testing-library/react';
import { agencia, HOY, texto } from '@tests/fixtures';
import { renderConRuta } from '@tests/render';

vi.mock('@/features/admin/api/admin.api', () => ({
  todasLasAgencias: vi.fn(),
  verificarAgencia: vi.fn(),
  rechazarAgencia: vi.fn(),
  actualizarVigencia: vi.fn(),
  historialVerificacion: vi.fn(),
}));
vi.mock('@/features/auth/model/auth', async () =>
  (await import('@tests/auth-falso')).authFalso({ userId: 'u-admin', email: 'admin@diverso.app' }),
);

import {
  actualizarVigencia,
  rechazarAgencia,
  todasLasAgencias,
  verificarAgencia,
} from '@/features/admin/api/admin.api';
import { toast } from '@/shared/lib/toast';
import AdminAgenciasPage from '@/features/admin/pages/AdminAgenciasPage';

// La página vive en /admin dentro de un router en memoria (el menú de cuenta de la barra lee la ruta y navega al salir).
const pintar = () => renderConRuta(<AdminAgenciasPage />, { ruta: '/admin' });

const todasMock = vi.mocked(todasLasAgencias);
const verificarMock = vi.mocked(verificarAgencia);
const rechazarMock = vi.mocked(rechazarAgencia);
const vigenciaMock = vi.mocked(actualizarVigencia);

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
  cleanup();
  toast.set({ mensaje: '' });
  vi.useRealTimers();
  vi.resetAllMocks();
});

/** Las tarjetas de agencia: los ítems de la página, no los de la barra de pestañas. */
const tarjetas = () => within(screen.getByRole('main')).getAllByRole('listitem');

/** Nombres de las agencias visibles en la lista. */
function nombres(): string[] {
  return tarjetas().map((li) => texto(li.querySelector('.truncate')));
}

/** La tarjeta de una agencia visible. */
function tarjeta(nombre: string): HTMLElement {
  const li = tarjetas().find((x) => texto(x.querySelector('.truncate')) === nombre);
  if (!li) throw new Error(`No hay tarjeta de ${nombre}`);
  return li;
}

function boton(nombre: string): string {
  return texto(screen.getByRole('button', { name: new RegExp(`^${nombre}`) }));
}

async function abrirTodas() {
  const r = pintar();
  await screen.findByText('Pendiente Plan');
  await fireEvent.click(screen.getByRole('button', { name: /^Todas/ }));
  return r;
}

describe('Admin', () => {
  it('cuenta cada cola y abre en «Por verificar» si hay pendientes', async () => {
    todasMock.mockResolvedValue(agencias);
    pintar();
    await screen.findByText('Verificación de agencias');
    await screen.findByText('Pendiente Plan');

    expect(boton('Por verificar')).toBe('Por verificar 1');
    expect(boton('RNT por renovar')).toBe('RNT por renovar 3'); // por vencer + sin vigencia + vencida
    expect(boton('Verificadas')).toBe('Verificadas 4');
    expect(boton('Rechazadas')).toBe('Rechazadas 1');
    expect(boton('Todas')).toBe('Todas 6');
    expect(screen.getByRole('button', { name: /^Por verificar/ }).getAttribute('aria-pressed')).toBe('true');
    expect(nombres()).toEqual(['Pendiente Plan']);
  });

  it('«RNT por renovar» lista las verificadas con vigencia vencida, por vencer o ausente', async () => {
    todasMock.mockResolvedValue(agencias);
    const { container } = pintar();
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
    const primera = pintar();
    await screen.findByText('Sin Vigencia');
    expect(nombres()).toEqual(['Sin Vigencia']);
    primera.unmount();

    todasMock.mockResolvedValueOnce([agencia({ id: 'v', nombre: 'Verde Vigente' })]);
    pintar();
    await screen.findByText('Verde Vigente');
    expect(nombres()).toEqual(['Verde Vigente']);
  });

  it('busca por nombre, RNT o ciudad dentro de «Todas»', async () => {
    todasMock.mockResolvedValue(agencias);
    pintar();
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
    const { container } = pintar();
    await screen.findByText('Pendiente Plan');
    await fireEvent.click(screen.getByRole('button', { name: /^Rechazadas/ }));
    expect(texto(container)).toContain('Motivo del rechazo: RNT no coincide');

    await fireEvent.input(screen.getByLabelText('Buscar agencias'), { target: { value: 'zzz' } });
    expect(texto(container)).toContain('No hay agencias en esta categoría.');
  });

  it('la barra marca Agencias como la pestaña activa y enlaza con Dispersiones', async () => {
    todasMock.mockResolvedValue(agencias);
    pintar();
    await screen.findByText('Pendiente Plan');
    const secciones = screen.getByRole('navigation', { name: 'Secciones de administración' });
    expect(within(secciones).getByRole('link', { name: 'Dispersiones' }).getAttribute('href')).toBe('#/admin/dispersiones');
    expect(within(secciones).getAllByRole('link', { current: 'page' }).map((a) => texto(a))).toEqual(['Agencias']);
    expect(screen.queryByRole('link', { name: 'Dispersiones de prueba' })).toBeNull();
  });

  it('un solo «Modo de prueba» y el cierre de sesión en el menú de cuenta', async () => {
    todasMock.mockResolvedValue(agencias);
    pintar();
    await screen.findByText('Pendiente Plan');
    expect(screen.getAllByText(/Modo de prueba/)).toHaveLength(1);
    expect(screen.queryByRole('button', { name: 'Cerrar sesión' })).toBeNull();
    await fireEvent.click(screen.getByRole('button', { name: 'Cuenta de Administración' }));
    expect(screen.getByText('admin@diverso.app')).toBeTruthy();
    expect(screen.getByRole('radiogroup', { name: 'Tema' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Cerrar sesión' })).toBeTruthy();
  });

  it('si falla la carga muestra el error y deja reintentar', async () => {
    todasMock.mockRejectedValueOnce(new Error('sin permisos'));
    todasMock.mockResolvedValueOnce(agencias);
    pintar();
    expect(await screen.findByText('No pudimos cargar las agencias')).toBeTruthy();
    expect(screen.getByText('sin permisos')).toBeTruthy();

    await fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText('Pendiente Plan')).toBeTruthy();
    expect(screen.queryByText('No pudimos cargar las agencias')).toBeNull();
  });
});

describe('Admin · acciones sobre una agencia', () => {
  it('cada estado ofrece acciones con nombres llanos', async () => {
    todasMock.mockResolvedValue(agencias);
    await abrirTodas();
    const nombresDeBotones = (nombre: string) =>
      within(tarjeta(nombre))
        .getAllByRole('button')
        .map((b) => texto(b));

    expect(nombresDeBotones('Pendiente Plan')).toEqual(['Ver historial', 'Rechazar', 'Verificar']);
    expect(nombresDeBotones('Verde Vigente')).toEqual(['Ver historial', 'Quitar verificación', 'Renovar vigencia RNT']);
    expect(nombresDeBotones('Rechazada Ltda')).toEqual(['Ver historial', 'Verificar agencia']);
  });

  it('verificar pide confirmar el contraste del RNT, dice hasta cuándo podrá vender y llama al backend', async () => {
    todasMock.mockResolvedValue(agencias);
    verificarMock.mockResolvedValue();
    pintar();
    await screen.findByText('Pendiente Plan');

    await fireEvent.click(within(tarjeta('Pendiente Plan')).getByRole('button', { name: 'Verificar' }));
    const t = tarjeta('Pendiente Plan');
    expect((within(t).getByLabelText('RNT vigente hasta') as HTMLInputElement).value).toBe('2027-03-31');
    expect(texto(t)).toContain('La agencia podrá publicar planes y vender hasta el 31 de marzo de 2027.');
    const enviar = within(t).getByRole('button', { name: 'Verificar agencia' }) as HTMLButtonElement;
    expect(enviar.disabled).toBe(true); // falta confirmar el contraste con las fuentes oficiales

    await fireEvent.click(within(t).getByRole('checkbox', { name: /Confirmo que contrasté el RNT 555/ }));
    expect(enviar.disabled).toBe(false);
    await fireEvent.click(enviar);
    await vi.waitFor(() => expect(verificarMock).toHaveBeenCalledWith('p', '2027-03-31'));
    await vi.waitFor(() => expect(toast.get().mensaje).toBe('Pendiente Plan verificada hasta el 31 de marzo de 2027.'));
    expect(todasMock).toHaveBeenCalledTimes(2); // recarga la cola
  });

  it('quitar la verificación pide el motivo, explica la consecuencia y llama al backend con el motivo recortado', async () => {
    todasMock.mockResolvedValue(agencias);
    rechazarMock.mockResolvedValue();
    await abrirTodas();

    await fireEvent.click(within(tarjeta('Verde Vigente')).getByRole('button', { name: 'Quitar verificación' }));
    const t = tarjeta('Verde Vigente');
    expect(texto(t)).toContain('La agencia dejará de vender: sus planes dejan de mostrarse y de recibir reservas. Verá el motivo en su panel.');
    const enviar = within(t).getByRole('button', { name: 'Quitar verificación' }) as HTMLButtonElement;
    expect(enviar.disabled).toBe(true);

    await fireEvent.input(within(t).getByLabelText(/^Motivo del retiro de la verificación/), { target: { value: '  RNT cancelado en el registro.  ' } });
    expect(enviar.disabled).toBe(false);
    await fireEvent.click(enviar);
    await vi.waitFor(() => expect(rechazarMock).toHaveBeenCalledWith('v', 'RNT cancelado en el registro.'));
    await vi.waitFor(() => expect(toast.get().mensaje).toBe('Verde Vigente quedó rechazada. Verá el motivo en su panel.'));
  });

  it('cancelar cierra el formulario sin llamar al backend', async () => {
    todasMock.mockResolvedValue(agencias);
    pintar();
    await screen.findByText('Pendiente Plan');
    await fireEvent.click(within(tarjeta('Pendiente Plan')).getByRole('button', { name: 'Rechazar' }));
    expect(texto(tarjeta('Pendiente Plan'))).toContain('La agencia seguirá sin poder publicar planes. Verá el motivo en su panel.');
    await fireEvent.click(within(tarjeta('Pendiente Plan')).getByRole('button', { name: 'Cancelar' }));
    expect(within(tarjeta('Pendiente Plan')).queryByRole('button', { name: 'Rechazar agencia' })).toBeNull();
    expect(rechazarMock).not.toHaveBeenCalled();
    expect(verificarMock).not.toHaveBeenCalled();
  });

  it('reconsiderar una rechazada dice que se quita el rechazo', async () => {
    todasMock.mockResolvedValue(agencias);
    verificarMock.mockResolvedValue();
    await abrirTodas();
    await fireEvent.click(within(tarjeta('Rechazada Ltda')).getByRole('button', { name: 'Verificar agencia' }));
    const t = tarjeta('Rechazada Ltda');
    expect(texto(t)).toContain('Se quita el rechazo: la agencia podrá publicar planes y vender hasta el 31 de marzo de 2027.');
    await fireEvent.click(within(t).getByRole('checkbox'));
    await fireEvent.click(within(t).getByRole('button', { name: 'Verificar agencia' }));
    await vi.waitFor(() => expect(verificarMock).toHaveBeenCalledWith('r', '2027-03-31'));
  });

  it('renovar la vigencia propone un año más y guarda la fecha', async () => {
    todasMock.mockResolvedValue(agencias);
    vigenciaMock.mockResolvedValue();
    await abrirTodas();
    await fireEvent.click(within(tarjeta('Verde Vigente')).getByRole('button', { name: 'Renovar vigencia RNT' }));
    const t = tarjeta('Verde Vigente');
    expect((within(t).getByLabelText('RNT vigente hasta') as HTMLInputElement).value).toBe('2028-03-31');
    await fireEvent.click(within(t).getByRole('checkbox'));
    await fireEvent.click(within(t).getByRole('button', { name: 'Guardar vigencia' }));
    await vi.waitFor(() => expect(vigenciaMock).toHaveBeenCalledWith('v', '2028-03-31'));
    await vi.waitFor(() => expect(toast.get().mensaje).toBe('Vigencia del RNT de Verde Vigente actualizada.'));
  });

  it('si el servidor rechaza la acción, el error sale como alerta dentro del formulario y este sigue abierto', async () => {
    todasMock.mockResolvedValue(agencias);
    verificarMock.mockRejectedValue(new Error('sin permisos'));
    pintar();
    await screen.findByText('Pendiente Plan');
    await fireEvent.click(within(tarjeta('Pendiente Plan')).getByRole('button', { name: 'Verificar' }));
    const t = tarjeta('Pendiente Plan');
    await fireEvent.click(within(t).getByRole('checkbox'));
    await fireEvent.click(within(t).getByRole('button', { name: 'Verificar agencia' }));

    const alerta = await within(tarjeta('Pendiente Plan')).findByRole('alert');
    expect(texto(alerta)).toContain('sin permisos');
    expect(within(tarjeta('Pendiente Plan')).getByRole('button', { name: 'Verificar agencia' })).toBeTruthy();
  });
});

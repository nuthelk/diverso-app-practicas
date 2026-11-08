import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/svelte';
import { agencia, texto } from '$tests/fixtures';

vi.mock('$app/navigation', () => ({ goto: vi.fn() }));
vi.mock('$lib/features/agencias/api/agencias.api', () => ({
  miAgencia: vi.fn(),
}));
vi.mock('$lib/features/liquidaciones/api/liquidaciones.api', () => ({
  miCuentaDispersion: vi.fn(),
  guardarCuentaDispersion: vi.fn(),
}));

import { goto } from '$app/navigation';
import { guardarCuentaDispersion, miCuentaDispersion } from '$lib/features/liquidaciones/api/liquidaciones.api';
import { miAgencia } from '$lib/features/agencias/api/agencias.api';
import CuentaDispersionPage from '$lib/features/liquidaciones/pages/CuentaDispersionPage.svelte';

const miAgenciaMock = vi.mocked(miAgencia);
const cuentaMock = vi.mocked(miCuentaDispersion);
const guardarMock = vi.mocked(guardarCuentaDispersion);

afterEach(() => {
  vi.resetAllMocks();
});

async function llenar() {
  await fireEvent.input(screen.getByLabelText(/^Banco/), { target: { value: 'Bancolombia' } });
  await fireEvent.input(screen.getByLabelText(/^Número de cuenta/), { target: { value: '1234 5678 9043' } });
  await fireEvent.input(screen.getByLabelText(/^Titular/), { target: { value: 'EcoAndes SAS' } });
  await fireEvent.input(screen.getByLabelText(/^Número de documento/), { target: { value: '9001234567' } });
}

describe('Cuenta para dispersiones', () => {
  it('muestra el formulario con la privacidad de la cuenta y sin repetir el aviso de «Modo de prueba» del marco', async () => {
    miAgenciaMock.mockResolvedValue(agencia());
    cuentaMock.mockResolvedValue(null);
    const { container } = render(CuentaDispersionPage);
    await screen.findByRole('heading', { name: 'Cuenta para dispersiones' });
    const t = texto(container);
    expect(t).not.toContain('Dispersión de prueba');
    expect(t).not.toContain('Modo de prueba');
    expect(t).toContain('solo se muestran los 4 últimos dígitos');
    expect(screen.getByRole('button', { name: 'Guardar cuenta' })).toBeTruthy();
  });

  it('una leyenda dice que todos los campos son obligatorios, en vez de un asterisco por etiqueta', async () => {
    miAgenciaMock.mockResolvedValue(agencia());
    cuentaMock.mockResolvedValue(null);
    const { container } = render(CuentaDispersionPage);
    await screen.findByRole('heading', { name: 'Cuenta para dispersiones' });
    expect(texto(container)).toContain('Todos los campos son obligatorios.');
    expect(texto(container)).not.toContain('*');
    for (const nombre of [/^Banco/, /^Número de cuenta/, /^Titular/, /^Número de documento/]) {
      expect(screen.getByLabelText(nombre).getAttribute('aria-required')).toBe('true');
    }
  });

  it('los dos selectores tienen nombre accesible con su etiqueta visible y el valor elegido', async () => {
    miAgenciaMock.mockResolvedValue(agencia());
    cuentaMock.mockResolvedValue(null);
    render(CuentaDispersionPage);
    await screen.findByRole('heading', { name: 'Cuenta para dispersiones' });
    expect(screen.getByRole('button', { name: 'Tipo de cuenta Ahorros' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Tipo de documento NIT' })).toBeTruthy();
    expect(screen.getByText('Tipo de cuenta').tagName).toBe('SPAN');
  });

  it('cada error queda ligado a su campo (aria-invalid y aria-describedby) y se anuncia como alerta', async () => {
    miAgenciaMock.mockResolvedValue(agencia());
    cuentaMock.mockResolvedValue(null);
    render(CuentaDispersionPage);
    await screen.findByRole('heading', { name: 'Cuenta para dispersiones' });
    const banco = screen.getByLabelText(/^Banco/);
    expect(banco.getAttribute('aria-invalid')).toBeNull();

    await fireEvent.click(screen.getByRole('button', { name: 'Guardar cuenta' }));
    expect(banco.getAttribute('aria-invalid')).toBe('true');
    const error = document.getElementById(banco.getAttribute('aria-describedby')!)!;
    expect(texto(error)).toContain('Indica el banco');
    expect(error.getAttribute('role')).toBe('alert');
    expect(screen.getAllByRole('alert')).toHaveLength(4);
  });

  it('con datos inválidos muestra los errores y no guarda', async () => {
    miAgenciaMock.mockResolvedValue(agencia());
    cuentaMock.mockResolvedValue(null);
    const { container } = render(CuentaDispersionPage);
    await screen.findByRole('heading', { name: 'Cuenta para dispersiones' });
    await fireEvent.input(screen.getByLabelText(/^Número de cuenta/), { target: { value: '12ab' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Guardar cuenta' }));

    const t = texto(container);
    expect(t).toContain('Indica el banco');
    expect(t).toContain('El número de cuenta debe tener solo dígitos');
    expect(t).toContain('Escribe el nombre del titular');
    expect(t).toContain('El documento debe tener de 4 a 20 caracteres');
    expect(guardarMock).not.toHaveBeenCalled();
  });

  it('con datos válidos guarda para la agencia y vuelve a Liquidaciones', async () => {
    miAgenciaMock.mockResolvedValue(agencia({ id: 'ag-9' }));
    cuentaMock.mockResolvedValue(null);
    guardarMock.mockResolvedValue();
    render(CuentaDispersionPage);
    await screen.findByRole('heading', { name: 'Cuenta para dispersiones' });
    await llenar();
    await fireEvent.click(screen.getByRole('button', { name: 'Guardar cuenta' }));

    await vi.waitFor(() => expect(guardarMock).toHaveBeenCalledTimes(1));
    expect(guardarMock).toHaveBeenCalledWith('ag-9', {
      banco: 'Bancolombia',
      tipo_cuenta: 'ahorros',
      numero_cuenta: '1234 5678 9043', // la capa de datos la normaliza
      titular: 'EcoAndes SAS',
      tipo_documento: 'NIT',
      numero_documento: '9001234567',
    });
    await vi.waitFor(() => expect(goto).toHaveBeenCalledWith('#/liquidaciones'));
  });

  it('una cuenta existente se carga para editarla', async () => {
    miAgenciaMock.mockResolvedValue(agencia());
    cuentaMock.mockResolvedValue({
      banco: 'Davivienda',
      tipo_cuenta: 'corriente',
      numero_cuenta: '5566778899',
      titular: 'Graffiti SAS',
      tipo_documento: 'CC',
      numero_documento: '1037000111',
    });
    render(CuentaDispersionPage);
    await screen.findByRole('button', { name: 'Actualizar cuenta' });
    expect((screen.getByLabelText(/^Banco/) as HTMLInputElement).value).toBe('Davivienda');
    expect((screen.getByLabelText(/^Número de cuenta/) as HTMLInputElement).value).toBe('5566778899');
    expect((screen.getByLabelText(/^Titular/) as HTMLInputElement).value).toBe('Graffiti SAS');
  });

  it('si el servidor rechaza, muestra el mensaje y se queda en el formulario', async () => {
    miAgenciaMock.mockResolvedValue(agencia());
    cuentaMock.mockResolvedValue(null);
    guardarMock.mockRejectedValue(new Error('El número de cuenta debe tener de 6 a 20 dígitos.'));
    render(CuentaDispersionPage);
    await screen.findByRole('heading', { name: 'Cuenta para dispersiones' });
    await llenar();
    await fireEvent.click(screen.getByRole('button', { name: 'Guardar cuenta' }));
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.getByText('El número de cuenta debe tener de 6 a 20 dígitos.')).toBeTruthy();
    expect(goto).not.toHaveBeenCalled();
  });

  it('sin agencia lo dice y no ofrece guardar', async () => {
    miAgenciaMock.mockResolvedValue(null);
    render(CuentaDispersionPage);
    expect(await screen.findByText('Aún no tienes agencia')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Guardar cuenta' })).toBeNull();
    expect(cuentaMock).not.toHaveBeenCalled();
  });
});

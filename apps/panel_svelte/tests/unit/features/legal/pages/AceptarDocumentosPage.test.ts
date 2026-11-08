import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import { texto } from '$tests/fixtures';

vi.mock('$app/navigation', () => ({ goto: vi.fn() }));
vi.mock('$lib/features/auth/model/auth.svelte', () => ({ signOut: vi.fn() }));
vi.mock('$lib/features/legal/api/legal.api', () => ({
  consentimientosPendientes: vi.fn(),
  registrarConsentimiento: vi.fn(),
}));

import { goto } from '$app/navigation';
import { signOut } from '$lib/features/auth/model/auth.svelte';
import { consentimientosPendientes, registrarConsentimiento } from '$lib/features/legal/api/legal.api';
import AceptarDocumentosPage from '$lib/features/legal/pages/AceptarDocumentosPage.svelte';

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

const aceptarTodo = async () => {
  await fireEvent.click(screen.getByRole('checkbox', { name: /tratamiento de mis datos/ }));
  await fireEvent.click(screen.getByRole('checkbox', { name: /Acepto los/ }));
};
const continuar = () => fireEvent.click(screen.getByRole('button', { name: 'Aceptar y continuar' }));

describe('Aceptar documentos', () => {
  it('cada autorización enlaza su documento en una pestaña nueva y lo avisa', () => {
    render(AceptarDocumentosPage);
    const politica = screen.getByRole('link', { name: /política de tratamiento de datos/ });
    const terminos = screen.getByRole('link', { name: /términos y condiciones/ });
    expect(politica.getAttribute('href')).toBe('#/legal/privacidad');
    expect(terminos.getAttribute('href')).toBe('#/legal/terminos-agencias');
    for (const enlace of [politica, terminos]) {
      expect(enlace.getAttribute('target')).toBe('_blank');
      expect(texto(enlace)).toContain('se abre en una pestaña nueva');
    }
  });

  it('las casillas no vienen marcadas y el botón de continuar no está deshabilitado', () => {
    render(AceptarDocumentosPage);
    expect((screen.getByRole('checkbox', { name: /tratamiento de mis datos/ }) as HTMLInputElement).checked).toBe(false);
    expect((screen.getByRole('checkbox', { name: /Acepto los/ }) as HTMLInputElement).checked).toBe(false);
    expect((screen.getByRole('button', { name: 'Aceptar y continuar' }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('continuar sin marcar no guarda y dice qué falta', async () => {
    render(AceptarDocumentosPage);
    await continuar();
    expect(consentimientosPendientes).not.toHaveBeenCalled();
    expect(registrarConsentimiento).not.toHaveBeenCalled();
    expect(screen.getByRole('checkbox', { name: /tratamiento de mis datos/ }).getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByRole('checkbox', { name: /Acepto los/ }).getAttribute('aria-invalid')).toBe('true');
    expect(screen.getAllByRole('alert').length).toBeGreaterThan(0);
  });

  it('marcadas las dos, registra cada consentimiento pendiente y vuelve al Starter', async () => {
    vi.mocked(consentimientosPendientes).mockResolvedValue(['tratamiento_datos', 'terminos_agencia']);
    vi.mocked(registrarConsentimiento).mockResolvedValue(undefined);
    render(AceptarDocumentosPage);
    await aceptarTodo();
    await continuar();
    await vi.waitFor(() => expect(goto).toHaveBeenCalledWith('#/starter'));
    expect(registrarConsentimiento).toHaveBeenCalledTimes(2);
    expect(registrarConsentimiento).toHaveBeenCalledWith('tratamiento_datos');
    expect(registrarConsentimiento).toHaveBeenCalledWith('terminos_agencia');
  });

  it('si falla el guardado muestra el mensaje y no navega', async () => {
    vi.mocked(consentimientosPendientes).mockRejectedValue(new Error('Failed to fetch'));
    render(AceptarDocumentosPage);
    await aceptarTodo();
    await continuar();
    expect(await screen.findByText(/No hay conexión con el servidor/)).toBeTruthy();
    expect(goto).not.toHaveBeenCalled();
  });

  it('Salir cierra la sesión', async () => {
    render(AceptarDocumentosPage);
    await fireEvent.click(screen.getByRole('button', { name: 'Salir' }));
    expect(signOut).toHaveBeenCalled();
  });
});

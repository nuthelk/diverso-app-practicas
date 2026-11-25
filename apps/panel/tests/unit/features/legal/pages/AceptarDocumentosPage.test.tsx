import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { texto } from '@tests/fixtures';
import { renderConRuta } from '@tests/render';

vi.mock('@/features/auth/model/auth', async () => (await import('@tests/auth-falso')).authFalso({ userId: 'u-1' }));
vi.mock('@/features/legal/api/legal.api', () => ({
  consentimientosPendientes: vi.fn(),
  registrarConsentimiento: vi.fn(),
}));

import { signOut } from '@/features/auth/model/auth';
import { consentimientosPendientes, registrarConsentimiento } from '@/features/legal/api/legal.api';
import AceptarDocumentosPage from '@/features/legal/pages/AceptarDocumentosPage';

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

// La página vive en /consentimiento; `ruta()` dice a dónde navegó (reemplaza a `expect(goto)…`).
const pintar = () => renderConRuta(<AceptarDocumentosPage />, { ruta: '/consentimiento' });

const aceptarTodo = async () => {
  await fireEvent.click(screen.getByRole('checkbox', { name: /tratamiento de mis datos/ }));
  await fireEvent.click(screen.getByRole('checkbox', { name: /Acepto los/ }));
};
const continuar = () => fireEvent.click(screen.getByRole('button', { name: 'Aceptar y continuar' }));

describe('Aceptar documentos', () => {
  it('cada autorización enlaza su documento en una pestaña nueva y lo avisa', () => {
    pintar();
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
    pintar();
    expect((screen.getByRole('checkbox', { name: /tratamiento de mis datos/ }) as HTMLInputElement).checked).toBe(false);
    expect((screen.getByRole('checkbox', { name: /Acepto los/ }) as HTMLInputElement).checked).toBe(false);
    expect((screen.getByRole('button', { name: 'Aceptar y continuar' }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('continuar sin marcar no guarda y dice qué falta', async () => {
    pintar();
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
    const { ruta } = pintar();
    await aceptarTodo();
    await continuar();
    await vi.waitFor(() => expect(ruta()).toBe('/starter'));
    expect(registrarConsentimiento).toHaveBeenCalledTimes(2);
    expect(registrarConsentimiento).toHaveBeenCalledWith('tratamiento_datos');
    expect(registrarConsentimiento).toHaveBeenCalledWith('terminos_agencia');
  });

  it('si falla el guardado muestra el mensaje y no navega', async () => {
    vi.mocked(consentimientosPendientes).mockRejectedValue(new Error('Failed to fetch'));
    const { ruta } = pintar();
    await aceptarTodo();
    await continuar();
    expect(await screen.findByText(/No hay conexión con el servidor/)).toBeTruthy();
    expect(ruta()).toBe('/consentimiento');
  });

  it('Salir cierra la sesión', async () => {
    pintar();
    await fireEvent.click(screen.getByRole('button', { name: 'Salir' }));
    expect(signOut).toHaveBeenCalled();
  });
});

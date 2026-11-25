import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { texto } from '@tests/fixtures';
import { renderConRuta } from '@tests/render';

vi.mock('@/features/agencias/api/agencias.api', () => ({ registrarAgencia: vi.fn() }));
vi.mock('@/features/legal/api/legal.api', () => ({ registrarConsentimiento: vi.fn() }));

import { registrarAgencia } from '@/features/agencias/api/agencias.api';
import { registrarConsentimiento } from '@/features/legal/api/legal.api';
import OnboardingPage from '@/features/agencias/pages/OnboardingPage';

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

// La página vive en /onboarding; `ruta()` dice a dónde navegó (reemplaza a `expect(goto)…`).
const pintar = () => renderConRuta(<OnboardingPage />, { ruta: '/onboarding' });

const campo = (nombre: string | RegExp) => screen.getByLabelText(nombre) as HTMLInputElement;
const enviar = () => fireEvent.click(screen.getByRole('button', { name: 'Enviar a verificación' }));

async function llenar(parcial: Record<string, string> = {}) {
  const v = {
    nombre: '  Aventuras Antioquia ',
    rnt: '85421',
    matricula: '02345678-9',
    telefono: '3001234567',
    correo: 'hola@aventuras.co',
    ...parcial,
  };
  await fireEvent.input(campo('Nombre de la agencia'), { target: { value: v.nombre } });
  await fireEvent.input(campo(/^Número de RNT/), { target: { value: v.rnt } });
  await fireEvent.input(campo('Matrícula mercantil'), { target: { value: v.matricula } });
  await fireEvent.input(campo('Teléfono'), { target: { value: v.telefono } });
  await fireEvent.input(campo('Correo de contacto'), { target: { value: v.correo } });
}
const aceptar = async () => {
  await fireEvent.click(screen.getByRole('checkbox', { name: /tratamiento de mis datos/ }));
  await fireEvent.click(screen.getByRole('checkbox', { name: /Acepto los/ }));
};

describe('Onboarding', () => {
  it('cada campo tiene etiqueta; el RNT se explica en palabras y los opcionales lo dicen', () => {
    const { container } = pintar();
    for (const n of ['Nombre de la agencia', 'Matrícula mercantil', 'Ciudad', 'Teléfono', 'Correo de contacto', /^WhatsApp/, /^Descripción/]) {
      expect(campo(n)).toBeTruthy();
    }
    expect(texto(container)).toContain('Registro Nacional de Turismo');
    expect(campo(/^Número de RNT/).getAttribute('aria-describedby')).toBeTruthy();
    expect(campo(/^WhatsApp/).labels?.[0]?.textContent).toContain('opcional');
    expect(texto(container)).not.toContain('*');
  });

  it('avisa que sin agencia el resto del panel no está disponible', () => {
    const { container } = pintar();
    expect(texto(container)).toContain('Hasta que registres tu agencia');
  });

  it('el botón de enviar nunca queda deshabilitado en silencio', () => {
    pintar();
    expect((screen.getByRole('button', { name: 'Enviar a verificación' }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('enviar vacío no guarda: resume lo que falta, marca cada campo y enfoca el primero', async () => {
    pintar();
    await enviar();
    expect(registrarAgencia).not.toHaveBeenCalled();
    expect(registrarConsentimiento).not.toHaveBeenCalled();
    const resumen = texto(screen.getByText(/Para enviar falta completar/));
    for (const falta of [
      'el nombre de la agencia',
      'el número de RNT',
      'la matrícula mercantil',
      'el teléfono',
      'el correo de contacto',
      'la autorización de datos',
      'los términos y condiciones',
    ]) {
      expect(resumen).toContain(falta);
    }
    expect(campo('Nombre de la agencia').getAttribute('aria-invalid')).toBe('true');
    expect(campo(/^Número de RNT/).getAttribute('aria-invalid')).toBe('true');
    await vi.waitFor(() => expect(document.activeElement).toBe(campo('Nombre de la agencia')));
  });

  it('un RNT mal escrito se explica en el campo y deja de marcarse al corregirlo', async () => {
    pintar();
    await llenar({ rnt: 'abc' });
    await aceptar();
    await enviar();
    expect(registrarAgencia).not.toHaveBeenCalled();
    expect(texto(screen.getByText(/Para enviar falta completar/))).toContain('el número de RNT');
    expect(texto(document.getElementById(campo(/^Número de RNT/).getAttribute('aria-describedby')!.split(' ').pop()!))).toContain(
      'entre 4 y 8 dígitos',
    );
    await fireEvent.input(campo(/^Número de RNT/), { target: { value: '85421' } });
    expect(campo(/^Número de RNT/).getAttribute('aria-invalid')).toBeNull();
  });

  it('sin marcar las autorizaciones no guarda y las señala', async () => {
    pintar();
    await llenar();
    await enviar();
    expect(registrarAgencia).not.toHaveBeenCalled();
    expect(screen.getByRole('checkbox', { name: /tratamiento de mis datos/ }).getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByRole('checkbox', { name: /Acepto los/ }).getAttribute('aria-invalid')).toBe('true');
  });

  it('con todo en orden registra primero las autorizaciones, luego la agencia con los datos recortados, y va al resumen', async () => {
    vi.mocked(registrarConsentimiento).mockResolvedValue(undefined);
    vi.mocked(registrarAgencia).mockResolvedValue(undefined);
    const { ruta } = pintar();
    await llenar();
    await aceptar();
    await enviar();
    await vi.waitFor(() => expect(ruta()).toBe('/dashboard'));
    expect(registrarConsentimiento).toHaveBeenNthCalledWith(1, 'tratamiento_datos');
    expect(registrarConsentimiento).toHaveBeenNthCalledWith(2, 'terminos_agencia');
    expect(registrarAgencia).toHaveBeenCalledWith({
      nombre: 'Aventuras Antioquia',
      numero_rnt: '85421',
      matricula_camara_comercio: '02345678-9',
      ciudad: 'Medellín',
      telefono: '3001234567',
      email: 'hola@aventuras.co',
      whatsapp: '',
      descripcion: '',
    });
  });

  it('si el servidor falla muestra el mensaje traducido y no navega', async () => {
    vi.mocked(registrarConsentimiento).mockResolvedValue(undefined);
    vi.mocked(registrarAgencia).mockRejectedValue(new Error('agencies_numero_rnt_key'));
    const { ruta } = pintar();
    await llenar();
    await aceptar();
    await enviar();
    const alerta = await screen.findByText('Ya existe una agencia registrada con ese número de RNT.');
    expect(alerta.closest('[role="alert"]')).toBeTruthy();
    expect(ruta()).toBe('/onboarding');
  });
});

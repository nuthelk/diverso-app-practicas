import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { texto } from '@tests/fixtures';
import { renderConRuta } from '@tests/render';

vi.mock('@/features/auth/model/auth', async () => (await import('@tests/auth-falso')).authFalso({ ready: true, userId: null, email: null }));

import { signIn } from '@/features/auth/model/auth';
import LoginPage from '@/features/auth/pages/LoginPage';

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  vi.resetAllMocks();
});

// La página vive en /login; `ruta()` dice a dónde navegó (reemplaza a `expect(goto)…`).
const pintar = () => renderConRuta(<LoginPage />, { ruta: '/login' });
const correo = () => screen.getByLabelText('Correo de la agencia') as HTMLInputElement;
const clave = () => screen.getByLabelText('Contraseña') as HTMLInputElement;

describe('Login: cuentas demo (S4)', () => {
  it('en desarrollo ofrece las cuentas demo y rellena correo y contraseña al elegir una', async () => {
    vi.stubEnv('DEV', true);
    pintar();
    expect(texto(document.body)).toContain('demo1234');
    await fireEvent.click(screen.getByRole('button', { name: 'Agencia verificada' }));
    expect(correo().value).toBe('graffiti@demo.com');
    expect(clave().value).toBe('demo1234');
    expect(screen.getByRole('button', { name: 'En verificación' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Admin' })).toBeTruthy();
  });

  it('fuera de desarrollo (build publicado) no hay cuentas demo ni la contraseña en ninguna parte', () => {
    vi.stubEnv('DEV', false);
    const { container } = pintar();
    expect(screen.queryByRole('button', { name: 'Agencia verificada' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Admin' })).toBeNull();
    expect(container.innerHTML).not.toContain('demo1234');
    expect(container.innerHTML).not.toContain('@demo.com');
    expect(correo().value).toBe('');
    expect(clave().value).toBe('');
  });
});

describe('Login', () => {
  it('no promete una comisión fija: cada agencia tiene la suya', () => {
    vi.stubEnv('DEV', false);
    const { container } = pintar();
    expect(texto(container)).not.toContain('12%');
  });

  it('los campos tienen etiqueta, un solo h1 y el botón de entrar', () => {
    vi.stubEnv('DEV', false);
    pintar();
    expect(correo().type).toBe('email');
    expect(clave().type).toBe('password');
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeTruthy();
  });

  it('entra con el correo recortado y va al Starter', async () => {
    vi.stubEnv('DEV', false);
    vi.mocked(signIn).mockResolvedValue(undefined);
    const { ruta } = pintar();
    await fireEvent.input(correo(), { target: { value: '  ana@agencia.co ' } });
    await fireEvent.input(clave(), { target: { value: 'secreta' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));
    await vi.waitFor(() => expect(ruta()).toBe('/starter'));
    expect(signIn).toHaveBeenCalledWith('ana@agencia.co', 'secreta');
  });

  it('si falla, avisa con una alerta y no navega', async () => {
    vi.stubEnv('DEV', false);
    vi.mocked(signIn).mockRejectedValue(new Error('Invalid login credentials'));
    const { ruta } = pintar();
    await fireEvent.input(correo(), { target: { value: 'ana@agencia.co' } });
    await fireEvent.input(clave(), { target: { value: 'mala' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));
    const alerta = await screen.findByRole('alert');
    expect(texto(alerta)).toContain('Correo o contraseña incorrectos');
    expect(ruta()).toBe('/login');
  });
});

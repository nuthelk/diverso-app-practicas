import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import { texto } from '$tests/fixtures';

vi.mock('$app/navigation', () => ({ goto: vi.fn() }));
vi.mock('$lib/features/auth/model/auth.svelte', () => ({
  auth: { ready: true, userId: null, email: null },
  signIn: vi.fn(),
}));

import { goto } from '$app/navigation';
import { signIn } from '$lib/features/auth/model/auth.svelte';
import LoginPage from '$lib/features/auth/pages/LoginPage.svelte';

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  vi.resetAllMocks();
});

const correo = () => screen.getByLabelText('Correo de la agencia') as HTMLInputElement;
const clave = () => screen.getByLabelText('Contraseña') as HTMLInputElement;

describe('Login: cuentas demo (S4)', () => {
  it('en desarrollo ofrece las cuentas demo y rellena correo y contraseña al elegir una', async () => {
    vi.stubEnv('DEV', true);
    render(LoginPage);
    expect(texto(document.body)).toContain('demo1234');
    await fireEvent.click(screen.getByRole('button', { name: 'Agencia verificada' }));
    expect(correo().value).toBe('graffiti@demo.com');
    expect(clave().value).toBe('demo1234');
    expect(screen.getByRole('button', { name: 'En verificación' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Admin' })).toBeTruthy();
  });

  it('fuera de desarrollo (build publicado) no hay cuentas demo ni la contraseña en ninguna parte', () => {
    vi.stubEnv('DEV', false);
    const { container } = render(LoginPage);
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
    const { container } = render(LoginPage);
    expect(texto(container)).not.toContain('12%');
  });

  it('los campos tienen etiqueta, un solo h1 y el botón de entrar', () => {
    vi.stubEnv('DEV', false);
    render(LoginPage);
    expect(correo().type).toBe('email');
    expect(clave().type).toBe('password');
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeTruthy();
  });

  it('entra con el correo recortado y va al Starter', async () => {
    vi.stubEnv('DEV', false);
    vi.mocked(signIn).mockResolvedValue(undefined);
    render(LoginPage);
    await fireEvent.input(correo(), { target: { value: '  ana@agencia.co ' } });
    await fireEvent.input(clave(), { target: { value: 'secreta' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));
    await vi.waitFor(() => expect(goto).toHaveBeenCalledWith('#/starter'));
    expect(signIn).toHaveBeenCalledWith('ana@agencia.co', 'secreta');
  });

  it('si falla, avisa con una alerta y no navega', async () => {
    vi.stubEnv('DEV', false);
    vi.mocked(signIn).mockRejectedValue(new Error('Invalid login credentials'));
    render(LoginPage);
    await fireEvent.input(correo(), { target: { value: 'ana@agencia.co' } });
    await fireEvent.input(clave(), { target: { value: 'mala' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));
    const alerta = await screen.findByRole('alert');
    expect(texto(alerta)).toContain('Correo o contraseña incorrectos');
    expect(goto).not.toHaveBeenCalled();
  });
});

import { act, renderHook } from '@testing-library/react-native';

import { Profile, UserRole } from '@/core';
import { initialOf, DEFAULT_NAME, useProfileViewModel } from '@/features/profile/view-models/useProfileViewModel';

import { AuthFalso } from '../../../support/auth-falso';
import { compuerta } from '../../../support/compuerta';

/**
 * `useProfileViewModel` con un `AuthFalso`: carga del perfil (éxito, error, reintento), nombre e
 * inicial con respaldo, cierre de sesión y protección tras desmontar. Port 1:1 de
 * `profile_view_model_test.dart`.
 *
 * Diferencia con Dart: supabase-js no da el correo de forma síncrona (`currentUserEmail()` es una
 * promesa), así que el VM lo lee en `load()`, aparte del perfil (si el perfil falla, el correo
 * igual se ve).
 */

let auth: AuthFalso;
beforeEach(() => {
  auth = new AuthFalso();
});

async function setup() {
  const loadingStates: boolean[] = [];
  const r = await renderHook(() => {
    const vm = useProfileViewModel({ auth });
    if (loadingStates[loadingStates.length - 1] !== vm.loading) loadingStates.push(vm.loading);
    return vm;
  });
  return { ...r, loadingStates };
}

test('antes de cargar: cargando, «Viajero» con inicial V', async () => {
  const { result } = await setup();
  expect(result.current.loading).toBe(true);
  expect(result.current.profile).toBeNull();
  expect(result.current.error).toBeNull();
  expect(result.current.name).toBe('Viajero');
  expect(DEFAULT_NAME).toBe('Viajero');
  expect(result.current.initial).toBe('V');
});

test('éxito: cargando → perfil con su nombre, su inicial en mayúscula y el correo de la sesión', async () => {
  auth.perfil = new Profile({ id: 'u', role: UserRole.traveler, name: 'ana' });
  const { result, loadingStates } = await setup();

  await act(() => result.current.load());

  expect(loadingStates).toEqual([true, false]);
  expect(result.current.name).toBe('ana');
  expect(result.current.initial).toBe('A');
  expect(result.current.email).toBe('ana@correo.test');
  expect(result.current.error).toBeNull();
  expect(auth.cargasDePerfil).toBe(1);
});

test('nombre vacío: la inicial es V (no se rompe)', async () => {
  auth.perfil = new Profile({ id: 'u', role: UserRole.traveler, name: '' });
  const { result } = await setup();
  await act(() => result.current.load());

  expect(result.current.initial).toBe('V');
});

test('la inicial es la primera letra completa, aunque sea un emoji (sin partir el carácter)', async () => {
  auth.perfil = new Profile({ id: 'u', role: UserRole.traveler, name: '😀 Ana' });
  const { result } = await setup();
  await act(() => result.current.load());

  expect(result.current.initial).toBe('😀');
});

test('initialOf: grafema completo (emoji con tono de piel, letra con tilde combinada) y mayúscula', () => {
  expect(initialOf('👍🏽 Ana')).toBe('👍🏽');
  expect(initialOf('émile')).toBe('É');
  expect(initialOf('ñandú')).toBe('Ñ');
  expect(initialOf('')).toBe('V');
});

test('sin correo en la sesión, el correo es vacío', async () => {
  auth.email = null;
  const { result } = await setup();
  await act(() => result.current.load());
  expect(result.current.email).toBe('');
});

test('error: queda visible en `error`, sigue «Viajero» (con el correo) y reintentar lo limpia', async () => {
  auth.falloAlCargarPerfil = new Error('sin red');
  const { result } = await setup();
  await act(() => result.current.load());

  expect(result.current.error).toBe('No pudimos cargar tu perfil.');
  expect(result.current.loading).toBe(false);
  expect(result.current.profile).toBeNull();
  expect(result.current.name).toBe('Viajero');
  expect(result.current.email).toBe('ana@correo.test');

  auth.falloAlCargarPerfil = null;
  await act(() => result.current.load());

  expect(result.current.error).toBeNull();
  expect(result.current.name).toBe('Ana');
});

test('signOut: true y la sesión se cierra', async () => {
  const { result } = await setup();
  let ok: boolean | null = false;
  await act(async () => {
    ok = await result.current.signOut();
  });
  expect(ok).toBe(true);
  expect(await auth.currentUserId()).toBeNull();
});

test('signOut que falla: false, y la sesión sigue abierta', async () => {
  auth.falloAlSalir = new Error('sin red');
  const { result } = await setup();

  let ok: boolean | null = true;
  await act(async () => {
    ok = await result.current.signOut();
  });
  expect(ok).toBe(false);
  expect(await auth.currentUserId()).toBe('viajero-1');
});

test('desmontada: una carga que termina después no avisa a nadie ni lanza', async () => {
  auth.compuertaPerfil = compuerta();
  const { result, unmount } = await setup();
  let loadPromise!: Promise<void>;
  await act(async () => {
    loadPromise = result.current.load();
  });
  await unmount();
  auth.compuertaPerfil.completar();

  await expect(loadPromise).resolves.toBeUndefined();
});

test('signOut: mientras cierra, `signingOut`; un segundo pedido no vuelve a llamar a signOut', async () => {
  const signOutGate = compuerta();
  const signOut = jest.spyOn(auth, 'signOut').mockImplementation(() => signOutGate.promesa);
  const { result } = await setup();
  expect(result.current.signingOut).toBe(false);

  let first!: Promise<boolean | null>;
  let second!: Promise<boolean | null>;
  await act(async () => {
    first = result.current.signOut();
    second = result.current.signOut();
  });

  expect(signOut).toHaveBeenCalledTimes(1);
  expect(result.current.signingOut).toBe(true);

  await act(async () => {
    signOutGate.completar();
    await first;
  });
  expect(await first).toBe(true);
  expect(await second).toBeNull(); // ignorado: no es un fallo que haya que avisar
  expect(result.current.signingOut).toBe(false);
});

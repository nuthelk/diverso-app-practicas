import { act, renderHook } from '@testing-library/react-native';

import { Profile, UserRole } from '@/core';
import { inicialDe, NOMBRE_POR_DEFECTO, useProfileViewModel } from '@/features/profile/view-models/useProfileViewModel';

import { AuthFalso } from '../../../support/auth-falso';
import { compuerta } from '../../../support/compuerta';

/**
 * `useProfileViewModel` con un `AuthFalso`: carga del perfil (éxito, error, reintento), nombre e
 * inicial con respaldo, cierre de sesión y protección tras desmontar. Port 1:1 de
 * `profile_view_model_test.dart`.
 *
 * Diferencia con Dart: supabase-js no da el correo de forma síncrona (`currentUserEmail()` es una
 * promesa), así que el VM lo lee en `cargar()`, aparte del perfil (si el perfil falla, el correo
 * igual se ve).
 */

let auth: AuthFalso;
beforeEach(() => {
  auth = new AuthFalso();
});

async function crear() {
  const cargandos: boolean[] = [];
  const r = await renderHook(() => {
    const vm = useProfileViewModel({ auth });
    if (cargandos[cargandos.length - 1] !== vm.cargando) cargandos.push(vm.cargando);
    return vm;
  });
  return { ...r, cargandos };
}

test('antes de cargar: cargando, «Viajero» con inicial V', async () => {
  const { result } = await crear();
  expect(result.current.cargando).toBe(true);
  expect(result.current.perfil).toBeNull();
  expect(result.current.error).toBeNull();
  expect(result.current.nombre).toBe('Viajero');
  expect(NOMBRE_POR_DEFECTO).toBe('Viajero');
  expect(result.current.inicial).toBe('V');
});

test('éxito: cargando → perfil con su nombre, su inicial en mayúscula y el correo de la sesión', async () => {
  auth.perfil = new Profile({ id: 'u', rol: UserRole.viajero, nombre: 'ana' });
  const { result, cargandos } = await crear();

  await act(() => result.current.cargar());

  expect(cargandos).toEqual([true, false]);
  expect(result.current.nombre).toBe('ana');
  expect(result.current.inicial).toBe('A');
  expect(result.current.email).toBe('ana@correo.test');
  expect(result.current.error).toBeNull();
  expect(auth.cargasDePerfil).toBe(1);
});

test('nombre vacío: la inicial es V (no se rompe)', async () => {
  auth.perfil = new Profile({ id: 'u', rol: UserRole.viajero, nombre: '' });
  const { result } = await crear();
  await act(() => result.current.cargar());

  expect(result.current.inicial).toBe('V');
});

test('la inicial es la primera letra completa, aunque sea un emoji (sin partir el carácter)', async () => {
  auth.perfil = new Profile({ id: 'u', rol: UserRole.viajero, nombre: '😀 Ana' });
  const { result } = await crear();
  await act(() => result.current.cargar());

  expect(result.current.inicial).toBe('😀');
});

test('inicialDe: grafema completo (emoji con tono de piel, letra con tilde combinada) y mayúscula', () => {
  expect(inicialDe('👍🏽 Ana')).toBe('👍🏽');
  expect(inicialDe('émile')).toBe('É');
  expect(inicialDe('ñandú')).toBe('Ñ');
  expect(inicialDe('')).toBe('V');
});

test('sin correo en la sesión, el correo es vacío', async () => {
  auth.email = null;
  const { result } = await crear();
  await act(() => result.current.cargar());
  expect(result.current.email).toBe('');
});

test('error: queda visible en `error`, sigue «Viajero» (con el correo) y reintentar lo limpia', async () => {
  auth.falloAlCargarPerfil = new Error('sin red');
  const { result } = await crear();
  await act(() => result.current.cargar());

  expect(result.current.error).toBe('No pudimos cargar tu perfil.');
  expect(result.current.cargando).toBe(false);
  expect(result.current.perfil).toBeNull();
  expect(result.current.nombre).toBe('Viajero');
  expect(result.current.email).toBe('ana@correo.test');

  auth.falloAlCargarPerfil = null;
  await act(() => result.current.cargar());

  expect(result.current.error).toBeNull();
  expect(result.current.nombre).toBe('Ana');
});

test('cerrarSesion: true y la sesión se cierra', async () => {
  const { result } = await crear();
  let ok = false;
  await act(async () => {
    ok = await result.current.cerrarSesion();
  });
  expect(ok).toBe(true);
  expect(await auth.currentUserId()).toBeNull();
});

test('cerrarSesion que falla: false, y la sesión sigue abierta', async () => {
  auth.falloAlSalir = new Error('sin red');
  const { result } = await crear();

  let ok = true;
  await act(async () => {
    ok = await result.current.cerrarSesion();
  });
  expect(ok).toBe(false);
  expect(await auth.currentUserId()).toBe('viajero-1');
});

test('desmontada: una carga que termina después no avisa a nadie ni lanza', async () => {
  auth.compuertaPerfil = compuerta();
  const { result, unmount } = await crear();
  let carga!: Promise<void>;
  await act(async () => {
    carga = result.current.cargar();
  });
  await unmount();
  auth.compuertaPerfil.completar();

  await expect(carga).resolves.toBeUndefined();
});

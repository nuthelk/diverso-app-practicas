import { fireEvent, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { VERSION_LEGAL } from '@/core';
import { ocultarAviso } from '@/features/compartido/aviso-flotante';
import { ProfileView } from '@/features/profile/views/ProfileView';
import { temaClaro } from '@/ui/theme';

import { AuthFalso } from '../../../support/auth-falso';
import { dependenciasDePrueba } from '../../../support/dependencias-de-prueba';
import { reiniciarRouterFalso, routerFalso } from '../../../support/expo-router-falso';
import { fijarVentana, renderPantalla, restaurarVentana } from '../../../support/pantalla';
import { asentarPantalla } from '../../bookings/support';

jest.mock('expo-router', () => require('../../../support/expo-router-falso'));

/**
 * Perfil: el nombre y el correo vienen del view model; si el perfil no carga ya no se queda
 * callado (aviso con «Reintentar»); «Cerrar sesión» pasa por el view model; el selector de
 * apariencia cambia el tema (sin persistirlo). Sin red ni Supabase. Port 1:1 de
 * `profile_view_test.dart` (+ apariencia y documentos legales).
 */

async function abrir(auth: AuthFalso) {
  await fijarVentana(800, 1600);
  // El tema arranca en «Sistema», como la app (no se persiste).
  await renderPantalla(<ProfileView />, { dependencias: dependenciasDePrueba({ auth }), modo: 'system' });
  await asentarPantalla();
}

const tocar = async (texto: string) => {
  await fireEvent.press(screen.getByText(texto));
  await asentarPantalla();
};

beforeEach(reiniciarRouterFalso);
afterEach(async () => {
  ocultarAviso();
  await restaurarVentana();
});

test('muestra el nombre, la inicial y el correo del viajero', async () => {
  await abrir(new AuthFalso());

  expect(screen.getByText('Perfil')).toBeOnTheScreen();
  expect(screen.getByText('Ana')).toBeOnTheScreen();
  expect(screen.getByText('A')).toBeOnTheScreen();
  expect(screen.getByText('ana@correo.test')).toBeOnTheScreen();
  expect(screen.queryByText('No pudimos cargar tu perfil.')).toBeNull();
});

test('si el perfil no carga avisa con «Reintentar» y al reintentar muestra el nombre', async () => {
  const auth = new AuthFalso();
  auth.falloAlCargarPerfil = new Error('sin red');
  await abrir(auth);

  expect(screen.getByText('Viajero')).toBeOnTheScreen();
  expect(screen.getByText('V')).toBeOnTheScreen();
  expect(screen.getByText('ana@correo.test')).toBeOnTheScreen();
  expect(screen.getByText('No pudimos cargar tu perfil.')).toBeOnTheScreen();
  expect(StyleSheet.flatten(screen.getByText('No pudimos cargar tu perfil.').props.style).color).toBe(
    temaClaro.colorScheme.error,
  );

  auth.falloAlCargarPerfil = null;
  await tocar('Reintentar');

  expect(screen.getByText('Ana')).toBeOnTheScreen();
  expect(screen.queryByText('No pudimos cargar tu perfil.')).toBeNull();
});

test('«Cerrar sesión» cierra la sesión', async () => {
  const auth = new AuthFalso();
  await abrir(auth);

  await tocar('Cerrar sesión');

  expect(await auth.currentUserId()).toBeNull();
});

test('si cerrar la sesión falla lo dice en un aviso', async () => {
  const auth = new AuthFalso();
  auth.falloAlSalir = new Error('sin red');
  await abrir(auth);

  await tocar('Cerrar sesión');

  expect(screen.getByText('No pudimos cerrar la sesión. Intenta de nuevo.')).toBeOnTheScreen();
  expect(await auth.currentUserId()).toBe('viajero-1');
});

test('secciones: apariencia, confianza y documentos legales con la versión vigente', async () => {
  await abrir(new AuthFalso());

  expect(screen.getByText('APARIENCIA')).toBeOnTheScreen();
  expect(screen.getByText('CONFIANZA')).toBeOnTheScreen();
  expect(screen.getByText('DOCUMENTOS LEGALES')).toBeOnTheScreen();
  expect(screen.getByText('Compra protegida')).toBeOnTheScreen();
  expect(screen.getByText('Tus datos')).toBeOnTheScreen();
  expect(screen.getByText(/Ley 1581 de 2012 \(Habeas Data\)/)).toBeOnTheScreen();
  expect(screen.getAllByText(`Versión ${VERSION_LEGAL}`)).toHaveLength(2);
});

test('los documentos legales se abren encima del perfil', async () => {
  await abrir(new AuthFalso());

  await tocar('Política de tratamiento de datos');
  expect(routerFalso.push).toHaveBeenLastCalledWith('/legal/privacidad');

  await tocar('Términos y condiciones');
  expect(routerFalso.push).toHaveBeenLastCalledWith('/legal/terminos-viajeros');
});

test('apariencia: arranca en «Sistema» y elegir «Oscuro» o «Claro» cambia el tema', async () => {
  await abrir(new AuthFalso());
  const segmento = (nombre: string) => screen.getByRole('button', { name: nombre });

  expect(segmento('Sistema')).toBeSelected();

  await fireEvent.press(segmento('Oscuro'));
  await asentarPantalla();
  expect(segmento('Oscuro')).toBeSelected();
  expect(segmento('Sistema')).not.toBeSelected();
  // El tema efectivo cambió: el título usa el onSurface del modo oscuro.
  expect(StyleSheet.flatten(screen.getByText('Perfil').props.style).color).not.toBe(temaClaro.colorScheme.onSurface);

  await fireEvent.press(segmento('Claro'));
  await asentarPantalla();
  expect(segmento('Claro')).toBeSelected();
  expect(StyleSheet.flatten(screen.getByText('Perfil').props.style).color).toBe(temaClaro.colorScheme.onSurface);
});

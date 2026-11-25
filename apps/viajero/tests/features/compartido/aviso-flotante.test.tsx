import { act, screen } from '@testing-library/react-native';

import { AvisoFlotante, DURACION_AVISO_MS, mostrarAviso, ocultarAviso } from '@/features/compartido/aviso-flotante';

import { renderConTema } from '../../ui/support/conTema';

jest.mock('expo-router', () => require('../../support/expo-router-falso'));

/** El SnackBar de Flutter: aviso flotante de toda la app, 4 s, uno nuevo reemplaza al anterior. */

beforeEach(() => jest.useFakeTimers());
afterEach(() => {
  ocultarAviso();
  jest.useRealTimers();
});

test('sin aviso no pinta nada; con aviso lo anuncia como alerta', async () => {
  await renderConTema(<AvisoFlotante />);
  expect(screen.queryByTestId('aviso-flotante')).toBeNull();

  await act(async () => mostrarAviso('Hola'));

  expect(screen.getByText('Hola')).toBeOnTheScreen();
  expect(screen.getByRole('alert')).toBeOnTheScreen();
});

test('dura 4 s', async () => {
  await renderConTema(<AvisoFlotante />);
  await act(async () => mostrarAviso('Hola'));

  await act(async () => {
    jest.advanceTimersByTime(DURACION_AVISO_MS - 1);
  });
  expect(screen.getByText('Hola')).toBeOnTheScreen();

  await act(async () => {
    jest.advanceTimersByTime(1);
  });
  expect(screen.queryByText('Hola')).toBeNull();
});

test('uno nuevo reemplaza al anterior y reinicia el tiempo', async () => {
  await renderConTema(<AvisoFlotante />);
  await act(async () => mostrarAviso('Primero'));
  await act(async () => {
    jest.advanceTimersByTime(3000);
  });
  await act(async () => mostrarAviso('Segundo'));
  await act(async () => {
    jest.advanceTimersByTime(3000);
  });

  expect(screen.queryByText('Primero')).toBeNull();
  expect(screen.getByText('Segundo')).toBeOnTheScreen();
});

test('un aviso mostrado antes de montar la pantalla se ve al montarla (sobrevive a la navegación)', async () => {
  mostrarAviso('¡Gracias!');
  await renderConTema(<AvisoFlotante />);
  expect(screen.getByText('¡Gracias!')).toBeOnTheScreen();
});

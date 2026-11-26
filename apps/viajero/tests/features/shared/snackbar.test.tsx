import { act, screen } from '@testing-library/react-native';

import { Snackbar, SNACKBAR_DURATION_MS, showSnackbar, hideSnackbar } from '@/features/shared/snackbar';

import { renderWithTheme } from '../../ui/support/render-with-theme';
import { rawText } from '../../support/raw-text';

jest.mock('expo-router', () => require('../../support/fake-expo-router'));

/** El SnackBar de Flutter: aviso flotante de toda la app, 4 s, uno nuevo reemplaza al anterior. */

beforeEach(() => jest.useFakeTimers());
afterEach(() => {
  hideSnackbar();
  jest.useRealTimers();
});

test('sin aviso no pinta nada; con aviso lo anuncia como alerta', async () => {
  await renderWithTheme(<Snackbar />);
  expect(screen.queryByTestId('snackbar')).toBeNull();

  await act(async () => showSnackbar('Hola'));

  expect(screen.getByText('Hola')).toBeOnTheScreen();
  expect(screen.getByRole('alert')).toBeOnTheScreen();
});

test('un monto o porcentaje del aviso no se separa de su signo al partirse la línea', async () => {
  await renderWithTheme(<Snackbar />);
  await act(async () => showSnackbar('Reembolso de prueba aprobado: $ 190.000 (100 %).'));

  expect(rawText(screen.getByText(/Reembolso de prueba aprobado/))).toBe(
    'Reembolso de prueba aprobado: $\u00A0190.000 (100\u00A0%).',
  );
});

test('dura 4 s', async () => {
  await renderWithTheme(<Snackbar />);
  await act(async () => showSnackbar('Hola'));

  await act(async () => {
    jest.advanceTimersByTime(SNACKBAR_DURATION_MS - 1);
  });
  expect(screen.getByText('Hola')).toBeOnTheScreen();

  await act(async () => {
    jest.advanceTimersByTime(1);
  });
  expect(screen.queryByText('Hola')).toBeNull();
});

test('uno nuevo reemplaza al anterior y reinicia el tiempo', async () => {
  await renderWithTheme(<Snackbar />);
  await act(async () => showSnackbar('Primero'));
  await act(async () => {
    jest.advanceTimersByTime(3000);
  });
  await act(async () => showSnackbar('Segundo'));
  await act(async () => {
    jest.advanceTimersByTime(3000);
  });

  expect(screen.queryByText('Primero')).toBeNull();
  expect(screen.getByText('Segundo')).toBeOnTheScreen();
});

test('un aviso mostrado antes de montar la pantalla se ve al montarla (sobrevive a la navegación)', async () => {
  showSnackbar('¡Gracias!');
  await renderWithTheme(<Snackbar />);
  expect(screen.getByText('¡Gracias!')).toBeOnTheScreen();
});

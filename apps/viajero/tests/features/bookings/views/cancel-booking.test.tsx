import { router } from 'expo-router';
import { act, fireEvent, screen } from 'expo-router/testing-library';

import { DiversoError } from '@/core';
import { hideSnackbar } from '@/features/shared/snackbar';
import { forgetPreloadedBooking } from '@/features/bookings/between-screens';

import { arrancarApp, asentar } from '../../../support/app';
import { dependenciasDePrueba } from '../../../support/dependencias-de-prueba';
import { ReservasFalsas, reservaDePrueba } from '../../../support/reservas-falsas';

/**
 * El aviso (snackbar) que sigue a cancelar, desde «Mis reservas» y desde el detalle: lo escribe
 * el view model y la vista solo lo muestra y lo consume; y el «resultado al volver» del detalle
 * (la lista solo se recarga si hubo cambios). Con el router real. Sin red ni Supabase. Port 1:1
 * de `cancelar_reserva_test.dart`.
 */

afterEach(() => {
  hideSnackbar();
  forgetPreloadedBooking();
});

const notice = 'Reserva cancelada y cupos liberados. Reembolso de prueba aprobado: $ 190.000 (100 %).';

async function openApp(url: string, bookings: ReservasFalsas) {
  return arrancarApp(url, dependenciasDePrueba({ bookings }));
}

async function tap(text: string) {
  await fireEvent.press(screen.getByText(text));
  await asentar();
}

async function goBack() {
  await act(async () => router.back());
  await asentar();
}

test('«Mis reservas»: confirmar la cancelación avisa y recarga la lista', async () => {
  const bookings = new ReservasFalsas([reservaDePrueba()]);
  await openApp('/reservas', bookings);

  await tap('Cancelar');
  await tap('Sí, cancelar');

  expect(bookings.canceladas).toEqual(['res-1']);
  expect(screen.getByText(notice)).toBeOnTheScreen();
  expect(bookings.consultasLista).toBe(2);
});

test('«Mis reservas»: «Mantener» no cancela ni avisa', async () => {
  const bookings = new ReservasFalsas([reservaDePrueba()]);
  await openApp('/reservas', bookings);

  await tap('Cancelar');
  await tap('Mantener');

  expect(bookings.canceladas).toEqual([]);
  expect(screen.queryByText(/Reserva cancelada/)).toBeNull();
  expect(screen.queryByText('¿Cancelar reserva?')).toBeNull();
});

test('«Mis reservas»: si no se puede consultar la política explica el motivo', async () => {
  const bookings = new ReservasFalsas([reservaDePrueba()]);
  bookings.falloAlCancelar = new DiversoError('RESERVA_YA_SALIO');
  await openApp('/reservas', bookings);

  await tap('Cancelar');

  expect(screen.queryByText('¿Cancelar reserva?')).toBeNull();
  expect(
    screen.getByText('Este viaje ya salió, así que la reserva ya no se puede pagar ni cancelar.'),
  ).toBeOnTheScreen();
});

test('detalle: confirmar la cancelación avisa y recarga solo esa reserva', async () => {
  const bookings = new ReservasFalsas([reservaDePrueba()]);
  await openApp('/reservas/res-1', bookings);

  await tap('Cancelar');
  await tap('Sí, cancelar');

  expect(bookings.canceladas).toEqual(['res-1']);
  expect(screen.getByText(notice)).toBeOnTheScreen();
  expect(bookings.consultas).toEqual(['res-1', 'res-1']); // carga en frío + recarga tras cancelar
  expect(bookings.consultasLista).toBe(0);
});

test('detalle: si hubo un cambio, al volver la lista se recarga', async () => {
  const bookings = new ReservasFalsas([reservaDePrueba()]);
  const r = await openApp('/reservas', bookings);

  await tap('DIV-AAAA0001');
  expect(r.getPathname()).toBe('/reservas/res-1');
  expect(bookings.consultasLista).toBe(1);

  await tap('Cancelar');
  await tap('Sí, cancelar');

  await goBack();

  expect(r.getPathname()).toBe('/reservas');
  expect(bookings.consultasLista).toBe(2);
});

test('detalle: una cancelación que el servidor rechaza también recarga la lista al volver', async () => {
  const bookings = new ReservasFalsas([reservaDePrueba()]);
  const r = await openApp('/reservas', bookings);

  await tap('DIV-AAAA0001');
  await tap('Cancelar');
  bookings.falloAlCancelar = new DiversoError('ESTADO_INVALIDO');
  await tap('Sí, cancelar');
  expect(screen.getByText('La reserva ya no admite esta operación.')).toBeOnTheScreen();

  await goBack();

  expect(r.getPathname()).toBe('/reservas');
  expect(bookings.consultasLista).toBe(2);
});

test('detalle: sin cambios, al volver la lista no se recarga', async () => {
  const bookings = new ReservasFalsas([reservaDePrueba()]);
  const r = await openApp('/reservas', bookings);

  await tap('DIV-AAAA0001');
  await goBack();

  expect(r.getPathname()).toBe('/reservas');
  expect(bookings.consultasLista).toBe(1);
});

test('detalle: el botón «Volver» devuelve el resultado igual que el gesto atrás', async () => {
  const bookings = new ReservasFalsas([reservaDePrueba()]);
  const r = await openApp('/reservas', bookings);

  await tap('DIV-AAAA0001');
  await tap('Cancelar');
  await tap('Sí, cancelar');
  await fireEvent.press(screen.getByLabelText('Volver'));
  await asentar();

  expect(r.getPathname()).toBe('/reservas');
  expect(bookings.consultasLista).toBe(2);
});

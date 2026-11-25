import { router } from 'expo-router';
import { act, fireEvent, screen } from 'expo-router/testing-library';

import { DiversoError } from '@/core';
import { hideSnackbar } from '@/features/shared/snackbar';
import { olvidarReservaAdelantada } from '@/features/bookings/paso-entre-pantallas';

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
  olvidarReservaAdelantada();
});

const aviso = 'Reserva cancelada y cupos liberados. Reembolso de prueba aprobado: $ 190.000 (100 %).';

async function abrir(url: string, reservas: ReservasFalsas) {
  return arrancarApp(url, dependenciasDePrueba({ reservas }));
}

async function tocar(texto: string) {
  await fireEvent.press(screen.getByText(texto));
  await asentar();
}

async function volver() {
  await act(async () => router.back());
  await asentar();
}

test('«Mis reservas»: confirmar la cancelación avisa y recarga la lista', async () => {
  const reservas = new ReservasFalsas([reservaDePrueba()]);
  await abrir('/reservas', reservas);

  await tocar('Cancelar');
  await tocar('Sí, cancelar');

  expect(reservas.canceladas).toEqual(['res-1']);
  expect(screen.getByText(aviso)).toBeOnTheScreen();
  expect(reservas.consultasLista).toBe(2);
});

test('«Mis reservas»: «Mantener» no cancela ni avisa', async () => {
  const reservas = new ReservasFalsas([reservaDePrueba()]);
  await abrir('/reservas', reservas);

  await tocar('Cancelar');
  await tocar('Mantener');

  expect(reservas.canceladas).toEqual([]);
  expect(screen.queryByText(/Reserva cancelada/)).toBeNull();
  expect(screen.queryByText('¿Cancelar reserva?')).toBeNull();
});

test('«Mis reservas»: si no se puede consultar la política explica el motivo', async () => {
  const reservas = new ReservasFalsas([reservaDePrueba()]);
  reservas.falloAlCancelar = new DiversoError('RESERVA_YA_SALIO');
  await abrir('/reservas', reservas);

  await tocar('Cancelar');

  expect(screen.queryByText('¿Cancelar reserva?')).toBeNull();
  expect(
    screen.getByText('Este viaje ya salió, así que la reserva ya no se puede pagar ni cancelar.'),
  ).toBeOnTheScreen();
});

test('detalle: confirmar la cancelación avisa y recarga solo esa reserva', async () => {
  const reservas = new ReservasFalsas([reservaDePrueba()]);
  await abrir('/reservas/res-1', reservas);

  await tocar('Cancelar');
  await tocar('Sí, cancelar');

  expect(reservas.canceladas).toEqual(['res-1']);
  expect(screen.getByText(aviso)).toBeOnTheScreen();
  expect(reservas.consultas).toEqual(['res-1', 'res-1']); // carga en frío + recarga tras cancelar
  expect(reservas.consultasLista).toBe(0);
});

test('detalle: si hubo un cambio, al volver la lista se recarga', async () => {
  const reservas = new ReservasFalsas([reservaDePrueba()]);
  const r = await abrir('/reservas', reservas);

  await tocar('DIV-AAAA0001');
  expect(r.getPathname()).toBe('/reservas/res-1');
  expect(reservas.consultasLista).toBe(1);

  await tocar('Cancelar');
  await tocar('Sí, cancelar');

  await volver();

  expect(r.getPathname()).toBe('/reservas');
  expect(reservas.consultasLista).toBe(2);
});

test('detalle: una cancelación que el servidor rechaza también recarga la lista al volver', async () => {
  const reservas = new ReservasFalsas([reservaDePrueba()]);
  const r = await abrir('/reservas', reservas);

  await tocar('DIV-AAAA0001');
  await tocar('Cancelar');
  reservas.falloAlCancelar = new DiversoError('ESTADO_INVALIDO');
  await tocar('Sí, cancelar');
  expect(screen.getByText('La reserva ya no admite esta operación.')).toBeOnTheScreen();

  await volver();

  expect(r.getPathname()).toBe('/reservas');
  expect(reservas.consultasLista).toBe(2);
});

test('detalle: sin cambios, al volver la lista no se recarga', async () => {
  const reservas = new ReservasFalsas([reservaDePrueba()]);
  const r = await abrir('/reservas', reservas);

  await tocar('DIV-AAAA0001');
  await volver();

  expect(r.getPathname()).toBe('/reservas');
  expect(reservas.consultasLista).toBe(1);
});

test('detalle: el botón «Volver» devuelve el resultado igual que el gesto atrás', async () => {
  const reservas = new ReservasFalsas([reservaDePrueba()]);
  const r = await abrir('/reservas', reservas);

  await tocar('DIV-AAAA0001');
  await tocar('Cancelar');
  await tocar('Sí, cancelar');
  await fireEvent.press(screen.getByLabelText('Volver'));
  await asentar();

  expect(r.getPathname()).toBe('/reservas');
  expect(reservas.consultasLista).toBe(2);
});

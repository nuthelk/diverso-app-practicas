import { fireEvent, screen } from '@testing-library/react-native';

import { BookingStatus, DiversoError, EstadoPago } from '@/core';
import { PagoResultadoView } from '@/features/checkout/views/PagoResultadoView';
import { AppRoutes } from '@/router';

import { dependenciasDePrueba } from '../../../support/dependencias-de-prueba';
import { reiniciarRouterFalso, routerFalso } from '../../../support/expo-router-falso';
import { renderPantalla } from '../../../support/pantalla';
import { pagoDePrueba, PasarelaFalsa } from '../support/pasarela-falsa';

jest.mock('expo-router', () => require('../../../support/expo-router-falso'));

/**
 * «Intentar de nuevo» en `/pago/resultado`: la vista solo pinta y delega en el view model. Sin
 * red ni Wompi. Port 1:1 de `pago_resultado_view_test.dart` (+ estados de la pantalla).
 */

beforeEach(reiniciarRouterFalso);

async function abrir({
  respuestas = [pagoDePrueba(EstadoPago.rechazado, BookingStatus.pendientePago)],
  falloAlIniciar,
  transactionId = 'tx-1',
  bookingId = null,
}: {
  respuestas?: unknown[];
  falloAlIniciar?: unknown;
  transactionId?: string | null;
  bookingId?: string | null;
} = {}) {
  const pasarela = new PasarelaFalsa(respuestas);
  if (falloAlIniciar !== undefined) pasarela.falloAlIniciar = falloAlIniciar;
  await renderPantalla(<PagoResultadoView transactionId={transactionId} bookingId={bookingId} />, {
    dependencias: dependenciasDePrueba({ pasarela }),
  });
  return pasarela;
}

test('«Intentar de nuevo» pide el checkout de la misma reserva y muestra el error', async () => {
  const pasarela = await abrir({ falloAlIniciar: new DiversoError('RESERVA_VENCIDA') });

  await fireEvent.press(await screen.findByText('Intentar de nuevo'));

  expect(pasarela.iniciadas.map((i) => i.bookingId)).toEqual(['res-1']);
  expect(await screen.findByText(new DiversoError('RESERVA_VENCIDA').mensajeUsuario)).toBeOnTheScreen();
  // El botón se libera para volver a intentar.
  expect(screen.getByRole('button', { name: 'Intentar de nuevo' })).toBeEnabled();
});

test('un error inesperado al reintentar no rompe la pantalla', async () => {
  await abrir();

  await fireEvent.press(await screen.findByText('Intentar de nuevo'));

  expect(await screen.findByText('No pudimos iniciar el pago. Intenta de nuevo.')).toBeOnTheScreen();
});

describe('estados', () => {
  test('mientras verifica: «Confirmando tu pago de prueba con Wompi…»', async () => {
    await abrir({ respuestas: [pagoDePrueba(EstadoPago.aprobado)] });
    expect(screen.getByText('Resultado del pago')).toBeOnTheScreen();
    expect(screen.getByText('Confirmando tu pago de prueba con Wompi…')).toBeOnTheScreen();
  });

  test('aprobado: va a la confirmación de la reserva (reemplaza, como `go`)', async () => {
    await abrir({ respuestas: [pagoDePrueba(EstadoPago.aprobado)] });
    await screen.findByText('Confirmando tu pago de prueba con Wompi…');
    await new Promise((r) => setTimeout(r, 0));
    expect(routerFalso.replace).toHaveBeenCalledWith(AppRoutes.reserva('res-1'));
  });

  test('sin transacción ni reserva vuelve a Mis reservas', async () => {
    const pasarela = await abrir({ transactionId: null, bookingId: null });
    expect(routerFalso.replace).toHaveBeenCalledWith(AppRoutes.reservas);
    expect(pasarela.verificaciones).toEqual([]);
  });

  test('rechazado con la reserva ya cancelada: no ofrece reintentar y «Ver mis reservas» es la acción principal', async () => {
    await abrir({ respuestas: [pagoDePrueba(EstadoPago.rechazado, BookingStatus.cancelada)] });
    expect(await screen.findByText('El pago no se completó')).toBeOnTheScreen();
    expect(screen.getByText(/Tu reserva ya no está vigente; vuelve a reservar\.$/)).toBeOnTheScreen();
    expect(screen.queryByText('Intentar de nuevo')).toBeNull();
    expect(screen.getByTestId('filled-button')).toHaveTextContent('Ver mis reservas');
  });

  test('pago aprobado tarde (reserva vencida): definitivo, sin «Reintentar»', async () => {
    await abrir({
      respuestas: [new DiversoError('RESERVA_VENCIDA', null, { estado_pago: 'aprobado_tarde' })],
    });
    expect(await screen.findByText('Tu reserva había vencido')).toBeOnTheScreen();
    expect(screen.queryByText('Reintentar')).toBeNull();
    await fireEvent.press(screen.getByText('Ver mis reservas'));
    expect(routerFalso.replace).toHaveBeenCalledWith(AppRoutes.reservas);
  });

  test('error al verificar: «No pudimos verificar el pago» con «Reintentar» que vuelve a preguntar', async () => {
    const pasarela = await abrir({ respuestas: [new DiversoError('ERROR_RED'), pagoDePrueba(EstadoPago.rechazado, BookingStatus.pendientePago)] });
    expect(await screen.findByText('No pudimos verificar el pago')).toBeOnTheScreen();
    await fireEvent.press(screen.getByText('Reintentar'));
    expect(await screen.findByText('El pago no se completó')).toBeOnTheScreen();
    expect(pasarela.verificaciones).toHaveLength(2);
  });
});

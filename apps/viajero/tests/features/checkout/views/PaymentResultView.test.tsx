import { fireEvent, screen } from '@testing-library/react-native';

import { BookingStatus, DiversoError, VerifiedPaymentStatus } from '@/core';
import { PaymentResultView } from '@/features/checkout/views/PaymentResultView';
import { AppRoutes } from '@/router';

import { dependenciasDePrueba } from '../../../support/dependencias-de-prueba';
import { reiniciarRouterFalso, routerFalso } from '../../../support/expo-router-falso';
import { renderPantalla } from '../../../support/pantalla';
import { testPayment, FakePaymentGateway } from '../support/fake-payment-gateway';

jest.mock('expo-router', () => require('../../../support/expo-router-falso'));

/**
 * «Intentar de nuevo» en `/pago/resultado`: la vista solo pinta y delega en el view model. Sin
 * red ni Wompi. Port 1:1 de `pago_resultado_view_test.dart` (+ estados de la pantalla).
 */

beforeEach(reiniciarRouterFalso);

async function openResult({
  responses = [testPayment(VerifiedPaymentStatus.rejected, BookingStatus.pendingPayment)],
  startFailure,
  transactionId = 'tx-1',
  bookingId = null,
}: {
  responses?: unknown[];
  startFailure?: unknown;
  transactionId?: string | null;
  bookingId?: string | null;
} = {}) {
  const gateway = new FakePaymentGateway(responses);
  if (startFailure !== undefined) gateway.startFailure = startFailure;
  await renderPantalla(<PaymentResultView transactionId={transactionId} bookingId={bookingId} />, {
    dependencias: dependenciasDePrueba({ pasarela: gateway }),
  });
  return gateway;
}

test('«Intentar de nuevo» pide el checkout de la misma reserva y muestra el error', async () => {
  const gateway = await openResult({ startFailure: new DiversoError('RESERVA_VENCIDA') });

  await fireEvent.press(await screen.findByText('Intentar de nuevo'));

  expect(gateway.startedCheckouts.map((i) => i.bookingId)).toEqual(['res-1']);
  expect(await screen.findByText(new DiversoError('RESERVA_VENCIDA').userMessage)).toBeOnTheScreen();
  // El botón se libera para volver a intentar.
  expect(screen.getByRole('button', { name: 'Intentar de nuevo' })).toBeEnabled();
});

test('un error inesperado al reintentar no rompe la pantalla', async () => {
  await openResult();

  await fireEvent.press(await screen.findByText('Intentar de nuevo'));

  expect(await screen.findByText('No pudimos iniciar el pago. Intenta de nuevo.')).toBeOnTheScreen();
});

describe('estados', () => {
  test('mientras verifica: «Confirmando tu pago de prueba con Wompi…»', async () => {
    await openResult({ responses: [testPayment(VerifiedPaymentStatus.approved)] });
    expect(screen.getByText('Resultado del pago')).toBeOnTheScreen();
    expect(screen.getByText('Confirmando tu pago de prueba con Wompi…')).toBeOnTheScreen();
  });

  test('aprobado: va a la confirmación de la reserva (reemplaza, como `go`)', async () => {
    await openResult({ responses: [testPayment(VerifiedPaymentStatus.approved)] });
    await screen.findByText('Confirmando tu pago de prueba con Wompi…');
    await new Promise((r) => setTimeout(r, 0));
    expect(routerFalso.replace).toHaveBeenCalledWith(AppRoutes.reserva('res-1'));
  });

  test('sin transacción ni reserva vuelve a Mis reservas', async () => {
    const gateway = await openResult({ transactionId: null, bookingId: null });
    expect(routerFalso.replace).toHaveBeenCalledWith(AppRoutes.reservas);
    expect(gateway.verifications).toEqual([]);
  });

  test('rechazado con la reserva ya cancelada: no ofrece reintentar y «Ver mis reservas» es la acción principal', async () => {
    await openResult({ responses: [testPayment(VerifiedPaymentStatus.rejected, BookingStatus.cancelled)] });
    expect(await screen.findByText('El pago no se completó')).toBeOnTheScreen();
    expect(screen.getByText(/Tu reserva ya no está vigente; vuelve a reservar\.$/)).toBeOnTheScreen();
    expect(screen.queryByText('Intentar de nuevo')).toBeNull();
    expect(screen.getByTestId('filled-button')).toHaveTextContent('Ver mis reservas');
  });

  test('pago aprobado tarde (reserva vencida): definitivo, sin «Reintentar»', async () => {
    await openResult({
      responses: [new DiversoError('RESERVA_VENCIDA', null, { estado_pago: 'aprobado_tarde' })],
    });
    expect(await screen.findByText('Tu reserva había vencido')).toBeOnTheScreen();
    expect(screen.queryByText('Reintentar')).toBeNull();
    await fireEvent.press(screen.getByText('Ver mis reservas'));
    expect(routerFalso.replace).toHaveBeenCalledWith(AppRoutes.reservas);
  });

  test('error al verificar: «No pudimos verificar el pago» con «Reintentar» que vuelve a preguntar', async () => {
    const gateway = await openResult({ responses: [new DiversoError('ERROR_RED'), testPayment(VerifiedPaymentStatus.rejected, BookingStatus.pendingPayment)] });
    expect(await screen.findByText('No pudimos verificar el pago')).toBeOnTheScreen();
    await fireEvent.press(screen.getByText('Reintentar'));
    expect(await screen.findByText('El pago no se completó')).toBeOnTheScreen();
    expect(gateway.verifications).toHaveLength(2);
  });
});

test('«Volver» sin historial lleva a Mis reservas (nunca de vuelta al pago)', async () => {
  await openResult();
  await fireEvent.press(await screen.findByRole('button', { name: 'Volver' }));
  expect(routerFalso.replace).toHaveBeenCalledWith(AppRoutes.reservas);
});

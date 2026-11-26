import { act, screen } from 'expo-router/testing-library';

import {
  Booking,
  BookingStatus,
  VerifiedPaymentStatus,
  ItineraryStep,
  Payment,
  PaymentMethodOption,
  PaymentStatus,
  VerifiedPayment,
  type BookingRepository,
  type CatalogRepository,
  type Public,
} from '@/core';
import { AppRoutes } from '@/router';

import { arrancarApp, asentar } from '../../support/app';
import { dependenciasDePrueba, doble } from '../../support/dependencias-de-prueba';
import { FakeCatalog, testPlanDate, testPlan } from './support/fake-catalog';
import { FakePaymentGateway } from './support/fake-payment-gateway';
import { FakeBookings } from './support/fake-bookings';

/**
 * Pruebas de rutas: lo que sobrevive a una recarga en web es que la URL sola (con ids) reconstruya
 * la pantalla cargando todo del backend. Monta la app real (providers + guard + rutas de
 * `src/app`) con dobles. Sin red ni Supabase. Port 1:1 de `router/rutas_pago_test.dart` (las rutas
 * viejas `/exito` y `/checkout` ya las cubre `tests/app/arranque.test.tsx`).
 */

afterEach(() => jest.useRealTimers());

const plan = () =>
  testPlan({
    dates: [testPlanDate()],
    meetingPoint: 'Parque Berrío',
    itinerary: [new ItineraryStep({ time: '06:00', activity: 'Salida desde Medellín' })],
  });

function bookingWithStatus(status: BookingStatus): Booking {
  const p = plan();
  return new Booking({
    id: 'res-1',
    code: 'DIV-ABC123',
    planDateId: 'fecha-1',
    travelerId: 'v-1',
    pax: 2,
    totalAmount: 300000,
    status,
    createdAt: new Date(),
    plan: p,
    planDate: p.dates[0],
    payments: [
      new Payment({
        id: 'p-1',
        bookingId: 'res-1',
        method: PaymentMethodOption.card,
        status: PaymentStatus.approved,
        amount: 300000,
        reference: 'DIV-ABC123-1',
        provider: 'wompi',
        simulated: false,
      }),
    ],
  });
}

const verifiedPayment = (status: VerifiedPaymentStatus, bookingStatus: BookingStatus = BookingStatus.confirmed) =>
  new VerifiedPayment({
    status,
    method: PaymentMethodOption.card,
    reference: 'DIV-ABC123-1',
    bookingId: 'res-1',
    code: 'DIV-ABC123',
    bookingStatus,
  });

let catalog: FakeCatalog;
let bookings: FakeBookings;

beforeEach(() => {
  catalog = new FakeCatalog({ details: { 'plan-1': plan() } });
  bookings = new FakeBookings([bookingWithStatus(BookingStatus.confirmed)]);
});

async function openApp(url: string, gateway: FakePaymentGateway) {
  return arrancarApp(
    url,
    dependenciasDePrueba({
      catalogo: doble<Public<CatalogRepository>>('CatalogRepository', catalog),
      reservas: doble<Public<BookingRepository>>('BookingRepository', bookings),
      pasarela: gateway,
    }),
  );
}

test('/checkout/:planId/:fechaId carga plan y fecha por id (sin extra)', async () => {
  await openApp(AppRoutes.checkout('plan-1', 'fecha-1'), new FakePaymentGateway([verifiedPayment(VerifiedPaymentStatus.approved)]));
  expect(catalog.requestedPlanIds).toEqual(['plan-1']);
  expect(screen.getByText('Guatapé en un día')).toBeOnTheScreen();
  expect(screen.getByText('¿Cuántos viajan?')).toBeOnTheScreen();
  expect(screen.getByText('Total a pagar')).toBeOnTheScreen();
  expect(screen.getAllByText('Pagar con Wompi').length).toBeGreaterThan(0);
  expect(screen.getByText('Modo de prueba — no se cobra dinero real')).toBeOnTheScreen();
});

test('/checkout con una fecha que no existe en el plan avisa en vez de romperse', async () => {
  await openApp(AppRoutes.checkout('plan-1', 'otra-fecha'), new FakePaymentGateway([verifiedPayment(VerifiedPaymentStatus.approved)]));
  expect(screen.getByText(/ya no está disponible/)).toBeOnTheScreen();
  expect(screen.queryByText('Pagar con Wompi')).toBeNull();
});

test('/reserva/:bookingId muestra la confirmación cargada del backend', async () => {
  await openApp(AppRoutes.booking('res-1'), new FakePaymentGateway([verifiedPayment(VerifiedPaymentStatus.approved)]));
  expect(bookings.bookingQueries).toEqual(['res-1']);
  expect(screen.getByText('DIV-ABC123')).toBeOnTheScreen();
  expect(screen.getByText('Guatapé en un día')).toBeOnTheScreen();
  expect(screen.getByText(/Pagado con Tarjeta · ref\. DIV-ABC123-1 \(prueba\)/)).toBeOnTheScreen();
  expect(screen.getByText('Ver mis reservas')).toBeOnTheScreen();
});

test('/reserva/:bookingId inexistente muestra el error, no una pantalla vacía', async () => {
  await openApp(AppRoutes.booking('nope'), new FakePaymentGateway([verifiedPayment(VerifiedPaymentStatus.approved)]));
  expect(screen.getByText(/No encontramos esa reserva/)).toBeOnTheScreen();
});

test('/pago/resultado?id=… verifica en el servidor y, si fue aprobado, abre /reserva/:id', async () => {
  const gateway = new FakePaymentGateway([verifiedPayment(VerifiedPaymentStatus.approved)]);
  const r = await openApp(AppRoutes.paymentForTransaction('tx-77'), gateway);
  await asentar();
  expect(gateway.verifications).toEqual([{ transactionId: 'tx-77', bookingId: null }]);
  expect(r.getPathname()).toBe('/reserva/res-1');
  expect(screen.getByText('DIV-ABC123')).toBeOnTheScreen();
});

test('/pago/resultado?reserva=… («Ya pagué, verificar») verifica por reserva', async () => {
  const gateway = new FakePaymentGateway([verifiedPayment(VerifiedPaymentStatus.approved)]);
  await openApp(AppRoutes.paymentForBooking('res-1'), gateway);
  expect(gateway.verifications).toEqual([{ transactionId: null, bookingId: 'res-1' }]);
});

test('/pago/resultado rechazado: mensaje y «Intentar de nuevo»', async () => {
  await openApp('/pago/resultado?id=tx-1', new FakePaymentGateway([verifiedPayment(VerifiedPaymentStatus.rejected, BookingStatus.pendingPayment)]));
  expect(screen.getByText(/Wompi rechazó el pago de prueba/)).toBeOnTheScreen();
  expect(screen.getByText('Intentar de nuevo')).toBeOnTheScreen();
  expect(screen.getByText('Ver mis reservas')).toBeOnTheScreen();
});

test('/pago/resultado pendiente: reintenta unas veces y luego remite a Mis reservas', async () => {
  const gateway = new FakePaymentGateway([verifiedPayment(VerifiedPaymentStatus.pending, BookingStatus.pendingPayment)]);
  await openApp('/pago/resultado?id=tx-1', gateway);
  for (let i = 0; i < 8; i++) {
    await act(async () => {
      await jest.advanceTimersByTimeAsync(4000);
    });
  }
  expect(gateway.verifications.length).toBeGreaterThan(1);
  expect(gateway.verifications.length).toBeLessThanOrEqual(5);
  expect(screen.getByText(/Te avisaremos en Mis reservas/)).toBeOnTheScreen();
});

test('/pago/resultado sin id ni reserva vuelve a Mis reservas', async () => {
  const r = await openApp(AppRoutes.paymentResult, new FakePaymentGateway([verifiedPayment(VerifiedPaymentStatus.approved)]));
  expect(r.getPathname()).toBe('/reservas');
});

test('/reserva/:bookingId pendiente de pago manda a verificar el pago de esa reserva', async () => {
  bookings = new FakeBookings([bookingWithStatus(BookingStatus.pendingPayment)]);
  const gateway = new FakePaymentGateway([verifiedPayment(VerifiedPaymentStatus.pending, BookingStatus.pendingPayment)]);
  const r = await openApp(AppRoutes.booking('res-1'), gateway);
  await asentar();
  expect(r.getPathname()).toBe('/pago/resultado');
  expect(gateway.verifications[0]).toEqual({ transactionId: null, bookingId: 'res-1' });
});

test('/reserva/:bookingId cancelada lo dice con su código', async () => {
  bookings = new FakeBookings([bookingWithStatus(BookingStatus.cancelled)]);
  await openApp(AppRoutes.booking('res-1'), new FakePaymentGateway());
  expect(screen.getByText('Reserva cancelada')).toBeOnTheScreen();
  expect(screen.getByText(/La reserva DIV-ABC123 está cancelada\./)).toBeOnTheScreen();
});

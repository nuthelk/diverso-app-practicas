import { act, fireEvent, renderHook, screen } from '@testing-library/react-native';

import { DiversoError, type BookingRepository, type CatalogRepository, type Public } from '@/core';
import { PaymentOutcome } from '@/features/checkout/payment-outcome';
import { pendingBookingText } from '@/features/checkout/components/PendingBookingNotice';
import { useCheckoutViewModel } from '@/features/checkout/view-models/useCheckoutViewModel';
import { CheckoutView } from '@/features/checkout/views/CheckoutView';

import { dependenciasDePrueba, doble } from '../../support/dependencias-de-prueba';
import { reiniciarRouterFalso } from '../../support/expo-router-falso';
import { fijarVentana, renderPantalla, restaurarVentana } from '../../support/pantalla';
import { textoCrudo } from '../../support/texto-crudo';
import { FakeCatalog, testPlanDate, testPlan } from './support/fake-catalog';
import { FakePaymentGateway } from './support/fake-payment-gateway';
import { testPendingBooking, FakeBookings } from './support/fake-bookings';

jest.mock('expo-router', () => require('../../support/expo-router-falso'));

/**
 * Reserva pendiente de pago ya existente: el checkout no debe crear otra (retendría cupos dos
 * veces durante 30 min), sino ofrecer completarla o cancelarla. Sin red ni Supabase. Port 1:1 de
 * `checkout_pendiente_test.dart`.
 */

const planDate = testPlanDate();

const timeOf = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

describe('useCheckoutViewModel', () => {
  let bookings: FakeBookings;
  let opened: string[];
  const fakeOpenPayment = (completed: boolean) => async (id: string) => {
    opened.push(id);
    return completed ? PaymentOutcome.completed : PaymentOutcome.closed;
  };

  beforeEach(() => {
    bookings = new FakeBookings();
    bookings.pending = testPendingBooking();
    opened = [];
  });

  async function setup() {
    const { result } = await renderHook(() => useCheckoutViewModel({ bookings }, { vibrate: () => {} }));
    return result;
  }

  test('al abrir busca la reserva pendiente de esa fecha y la expone', async () => {
    const c = await setup();
    await act(() => c.current.loadPending(planDate));
    expect(c.current.pending?.id).toBe('pend-1');
    expect(bookings.createdBookings).toEqual([]);
  });

  test('sin reserva pendiente no hay aviso', async () => {
    bookings.pending = null;
    const c = await setup();
    await act(() => c.current.loadPending(planDate));
    expect(c.current.pending).toBeNull();
  });

  test('si la búsqueda falla, el checkout sigue usable (la guarda real está en pagar)', async () => {
    bookings.pendingLookupFailure = new DiversoError('ERROR_BD');
    const c = await setup();
    await act(() => c.current.loadPending(planDate));
    expect(c.current.pending).toBeNull();
    expect(c.current.error).toBeNull();
  });

  test('pagar con una pendiente existente NO crea otra reserva ni abre el pago', async () => {
    const c = await setup();
    await act(() => c.current.pay(planDate, fakeOpenPayment(true)));
    expect(bookings.createdBookings).toEqual([]);
    expect(opened).toEqual([]);
    // Se muestra el aviso aunque la carga inicial no haya terminado.
    expect(c.current.pending?.id).toBe('pend-1');
    expect(c.current.processing).toBe(false);
  });

  test('RESERVA_PENDIENTE_EXISTENTE del servidor (otra pestaña) muestra el aviso de la pendiente, no un error', async () => {
    bookings.pending = null;
    bookings.createFailure = new DiversoError('RESERVA_PENDIENTE_EXISTENTE');
    bookings.pendingAfterFailure = testPendingBooking();
    const c = await setup();
    await act(() => c.current.pay(planDate, fakeOpenPayment(true)));
    expect(c.current.pending?.id).toBe('pend-1');
    expect(c.current.error).toBeNull();
    expect(c.current.bookingId).toBeNull();
    expect(opened).toEqual([]);
    expect(c.current.processing).toBe(false);
  });

  test('RESERVA_PENDIENTE_EXISTENTE sin poder recuperar la pendiente: mensaje claro, sin abrir el pago', async () => {
    bookings.pending = null;
    bookings.createFailure = new DiversoError('RESERVA_PENDIENTE_EXISTENTE');
    bookings.pendingAfterFailure = null;
    const c = await setup();
    await act(() => c.current.pay(planDate, fakeOpenPayment(true)));
    expect(c.current.pending).toBeNull();
    expect(c.current.error).toContain('reserva pendiente');
    expect(opened).toEqual([]);
  });

  test('PRESERVE: cualquier otro error al crear la reserva se sigue mostrando como error', async () => {
    bookings.pending = null;
    bookings.createFailure = new DiversoError('SIN_CUPO');
    const c = await setup();
    await act(() => c.current.pay(planDate, fakeOpenPayment(true)));
    expect(c.current.pending).toBeNull();
    expect(c.current.error).toBe(new DiversoError('SIN_CUPO').userMessage);
    expect(opened).toEqual([]);
  });

  test('pagar dos veces reutiliza la misma reserva (solo se crea una)', async () => {
    bookings.pending = null;
    const c = await setup();
    await act(() => c.current.pay(planDate, fakeOpenPayment(false)));
    await act(() => c.current.pay(planDate, fakeOpenPayment(false)));
    expect(bookings.createdBookings).toEqual([{ planDateId: 'fecha-1', pax: 1 }]);
    expect(opened).toEqual(['nueva-1', 'nueva-1']);
  });

  test('un segundo pagar mientras el primero sigue en curso se ignora', async () => {
    bookings.pending = null;
    const c = await setup();
    await act(async () => {
      const first = c.current.pay(planDate, fakeOpenPayment(true));
      await c.current.pay(planDate, fakeOpenPayment(true));
      await first;
    });
    expect(bookings.createdBookings).toHaveLength(1);
    expect(opened).toHaveLength(1);
  });

  test('completePending reutiliza esa reserva: mismo id y personas, sin crear otra', async () => {
    const c = await setup();
    await act(() => c.current.loadPending(planDate));
    await act(() => c.current.completePending(fakeOpenPayment(true)));
    expect(opened).toEqual(['pend-1']);
    expect(bookings.createdBookings).toEqual([]);
    expect(c.current.pending).toBeNull();
    expect(c.current.bookingId).toBe('pend-1');
    expect(c.current.pax).toBe(2);
    await act(() => c.current.setPax(5));
    // Con la reserva ya creada no se cambian las personas.
    expect(c.current.pax).toBe(2);
  });

  test('completePending: si el pago se cierra sin terminar, avisa y se puede reintentar', async () => {
    const c = await setup();
    await act(() => c.current.loadPending(planDate));
    await act(() => c.current.completePending(fakeOpenPayment(false)));
    expect(c.current.error).toContain('Cerraste el pago');
    await act(() => c.current.pay(planDate, fakeOpenPayment(false)));
    expect(opened).toEqual(['pend-1', 'pend-1']);
    expect(bookings.createdBookings).toEqual([]);
  });

  test('cancelPending cancela por reservas-cancelar y deja seguir como una compra nueva', async () => {
    const c = await setup();
    await act(() => c.current.loadPending(planDate));
    await act(() => c.current.cancelPending());
    expect(bookings.cancelledIds).toEqual(['pend-1']);
    expect(c.current.pending).toBeNull();
    expect(c.current.error).toBeNull();

    await act(() => c.current.setPax(3));
    await act(() => c.current.pay(planDate, fakeOpenPayment(true)));
    expect(bookings.createdBookings).toEqual([{ planDateId: 'fecha-1', pax: 3 }]);
    expect(opened).toEqual(['nueva-1']);
  });

  test('cancelPending que falla deja el mensaje y mantiene el aviso', async () => {
    bookings.cancelFailure = new DiversoError('ESTADO_INVALIDO');
    const c = await setup();
    await act(() => c.current.loadPending(planDate));
    await act(() => c.current.cancelPending());
    expect(c.current.error).toBe('La reserva ya no admite esta operación.');
    expect(c.current.pending?.id).toBe('pend-1');
    expect(c.current.processing).toBe(false);
  });
});

describe('aviso de reserva pendiente', () => {
  test('la retención dura 30 minutos desde la creación', () => {
    const b = testPendingBooking({ minutesAgo: 5 });
    expect(b.expiresAt.getTime()).toBe(b.createdAt.getTime() + 30 * 60_000);
  });

  test('texto: personas, total y hora de vencimiento', () => {
    const b = testPendingBooking({ pax: 2 });
    expect(pendingBookingText(b)).toBe(
      `Ya tienes una reserva pendiente de pago para esta fecha (2 personas, $ 300.000). Vence a las ${timeOf(b.expiresAt)}.`,
    );
    expect(pendingBookingText(testPendingBooking({ pax: 1 }))).toContain('(1 persona, $ 150.000)');
  });
});

describe('pantalla /checkout/:planId/:fechaId', () => {
  beforeEach(reiniciarRouterFalso);
  afterEach(restaurarVentana);

  /** `start` falla a propósito (RESERVA_VENCIDA): así «Completar pago» no abre el WebView. */
  async function openCheckout(bookings: FakeBookings, gateway = new FakePaymentGateway()) {
    gateway.startFailure = new DiversoError('RESERVA_VENCIDA');
    await fijarVentana(900, 2600);
    const catalog = new FakeCatalog({ details: { 'plan-1': testPlan({ dates: [planDate] }) } });
    await renderPantalla(<CheckoutView planId="plan-1" dateId="fecha-1" />, {
      dependencias: dependenciasDePrueba({
        catalogo: doble<Public<CatalogRepository>>('CatalogRepository', catalog),
        reservas: doble<Public<BookingRepository>>('BookingRepository', bookings),
        pasarela: gateway,
      }),
    });
    await screen.findByText('¿Cuántos viajan?');
    return gateway;
  }

  // El botón inferior es el único «Pagar con Wompi» que es un botón (la tarjeta repite el texto).
  const payButton = () => screen.getByRole('button', { name: 'Pagar con Wompi' });

  test('con una pendiente muestra el aviso, las dos acciones y bloquea «Pagar»', async () => {
    const bookings = new FakeBookings();
    bookings.pending = testPendingBooking();
    await openCheckout(bookings);
    await screen.findByText(/Ya tienes una reserva pendiente/);

    expect(
      screen.getByText(/Ya tienes una reserva pendiente de pago para esta fecha \(2 personas, \$ 300\.000\)/),
    ).toBeOnTheScreen();
    expect(screen.getByText(new RegExp(`Vence a las ${timeOf(testPendingBooking().expiresAt)}\\.`))).toBeOnTheScreen();
    // El aviso es texto corrido: si se parte, el «$» no queda solo al final de una línea.
    expect(textoCrudo(screen.getByText(/Ya tienes una reserva pendiente/))).toContain('2 personas, $\u00A0300.000');
    expect(screen.getByText('Completar pago')).toBeOnTheScreen();
    expect(screen.getByText('Cancelar y empezar de nuevo')).toBeOnTheScreen();
    expect(payButton()).toBeDisabled();
    expect(bookings.createdBookings).toEqual([]);
  });

  test('«Completar pago» pide el checkout de ESA reserva, sin crear otra', async () => {
    const bookings = new FakeBookings();
    bookings.pending = testPendingBooking();
    const gateway = await openCheckout(bookings);
    await screen.findByText('Completar pago');

    await fireEvent.press(screen.getByText('Completar pago'));

    expect(gateway.startedCheckouts.map((i) => i.bookingId)).toEqual(['pend-1']);
    expect(bookings.createdBookings).toEqual([]);
    // El error de pagos-iniciar se muestra.
    expect(await screen.findByText(/venció/)).toBeOnTheScreen();
  });

  test('«Cancelar y empezar de nuevo» cancela, quita el aviso y habilita «Pagar»', async () => {
    const bookings = new FakeBookings();
    bookings.pending = testPendingBooking();
    await openCheckout(bookings);
    await screen.findByText('Cancelar y empezar de nuevo');

    await fireEvent.press(screen.getByText('Cancelar y empezar de nuevo'));

    expect(bookings.cancelledIds).toEqual(['pend-1']);
    expect(screen.queryByText(/Ya tienes una reserva pendiente/)).toBeNull();
    expect(payButton()).toBeEnabled();
  });

  test('sin reserva pendiente no hay aviso y «Pagar» está habilitado', async () => {
    await openCheckout(new FakeBookings());
    expect(screen.queryByText(/Ya tienes una reserva pendiente/)).toBeNull();
    expect(payButton()).toBeEnabled();
  });
});

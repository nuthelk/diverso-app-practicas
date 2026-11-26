import { act, fireEvent, screen, within } from 'expo-router/testing-library';
import { BackHandler } from 'react-native';

import {
  Agency,
  Booking,
  BookingStatus,
  DiversoError,
  RefundStatus,
  ExperienceCategory,
  ItineraryStep,
  Payment,
  PaymentMethodOption,
  PaymentStatus,
  Plan,
  PlanStatus,
  Refund,
  VerificationStatus,
  CancellationPreview,
  type BookingRepository,
  type Public,
} from '@/core';
import { hideSnackbar } from '@/features/shared/snackbar';
import { forgetPreloadedBooking } from '@/features/bookings/between-screens';

import { startApp, settle } from '../../../support/app';
import { testDependencies, stub } from '../../../support/test-dependencies';
import { createGate } from '../../../support/gate';
import { FakeReviewPublisher, FakeBookingRepository } from '../../../support/fake-booking-repository';
import { rawText } from '../../../support/raw-text';

/**
 * Tarjeta de «Mis reservas» tocable + pantalla «Detalle de la reserva» (`/reservas/:bookingId`).
 * Con el router real para fijar también el registro de la ruta. Sin red ni Supabase. Port 1:1 de
 * `reserva_detalle_test.dart`.
 */

afterEach(() => {
  hideSnackbar();
  forgetPreloadedBooking();
});

function inDays(days: number, hour = 6) {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), today.getDate() + days, hour);
}

function plan({
  title = 'Street food tour',
  meetingPoint = 'Estación San Javier',
  agency = 'EcoAndes Viajes',
}: { title?: string; meetingPoint?: string; agency?: string } = {}) {
  return new Plan({
    id: 'plan-1',
    agencyId: 'ag',
    title,
    destination: 'Medellín',
    category: ExperienceCategory.gastronomy,
    priceCop: 95000,
    status: PlanStatus.published,
    meetingPoint,
    cancellationPolicy: 'Reembolso total hasta 48 horas antes.',
    itinerary: [
      new ItineraryStep({ time: '06:00', activity: 'Salida desde el metro' }),
      new ItineraryStep({ time: '09:30', activity: 'Desayuno típico' }),
    ],
    agency: new Agency({
      id: 'ag',
      name: agency,
      rntNumber: '12345',
      commercialRegistration: '999',
      verificationStatus: VerificationStatus.verified,
    }),
  });
}

function bookingWith({
  id = 'res-1',
  code = 'DIV-CC70944A',
  pax = 2,
  departure,
  status = BookingStatus.confirmed,
  withPlan = plan(),
  withPayment = true,
}: {
  id?: string;
  code?: string;
  pax?: number;
  departure?: Date;
  status?: BookingStatus;
  withPlan?: Plan;
  withPayment?: boolean;
} = {}) {
  return new Booking({
    id,
    code,
    planDateId: 'pd',
    travelerId: 'v',
    pax,
    totalAmount: 190000,
    status,
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    departureAt: departure ?? inDays(3),
    plan: withPlan,
    payments: withPayment
      ? [
          new Payment({
            id: 'p',
            bookingId: id,
            method: PaymentMethodOption.card,
            status: PaymentStatus.approved,
            amount: 190000,
            reference: 'DIV-REF-1',
            provider: 'wompi',
            simulated: false,
          }),
        ]
      : [],
  });
}

function fakeRepo(list: Booking[]) {
  const queries: string[] = [];
  const r = stub<Public<BookingRepository>>('BookingRepository', {
    myBookings: async () => list,
    booking: async (id: string) => {
      queries.push(id);
      const b = list.find((x) => x.id === id);
      if (!b) throw new DiversoError('RESERVA_NO_EXISTE');
      return b;
    },
    cancellationPreview: async () =>
      new CancellationPreview({ applies: true, percentage: 100, amount: 190000, hoursBefore: 72, reason: '' }),
  });
  return { repo: r, queries };
}

async function openApp(url: string, list: Booking[]) {
  const { repo: bookings, queries } = fakeRepo(list);
  const r = await startApp(url, testDependencies({ bookings }));
  return { r, queries };
}

async function tap(text: string) {
  await fireEvent.press(screen.getByText(text));
  await settle();
}

describe('tarjeta de «Mis reservas»', () => {
  test('tocarla abre el detalle con código, punto de encuentro, itinerario y «Ver plan»', async () => {
    const { r } = await openApp('/reservas', [bookingWith()]);

    await tap('Street food tour');

    expect(r.getPathname()).toBe('/reservas/res-1');
    expect(screen.getByText('DIV-CC70944A')).toBeOnTheScreen();
    expect(screen.getByText('Estación San Javier')).toBeOnTheScreen();
    expect(screen.getByText('Salida desde el metro')).toBeOnTheScreen();
    expect(screen.getByText('Ver plan')).toBeOnTheScreen();
  });

  test('«Cancelar» de la tarjeta no navega: abre su propio diálogo', async () => {
    const { r } = await openApp('/reservas', [bookingWith()]);

    await tap('Cancelar');

    expect(r.getPathname()).toBe('/reservas');
    expect(screen.getByText('¿Cancelar reserva?')).toBeOnTheScreen();
  });

  test('la tarjeta se anuncia como botón con la reserva', async () => {
    await openApp('/reservas', [bookingWith()]);

    const card = screen.getByLabelText('Ver detalle de la reserva DIV-CC70944A');
    expect(card).toHaveProp('accessibilityRole', 'button');
  });

  test('jerarquía: código en la cabecera, hora, punto de encuentro, personas y precio; sin referencia de pago', async () => {
    await openApp('/reservas', [bookingWith({ departure: inDays(3, 6) })]);

    expect(within(screen.getByTestId('booking-header')).getByText('DIV-CC70944A')).toBeOnTheScreen();
    expect(screen.getByText(/06:00/)).toBeOnTheScreen();
    expect(screen.getByText('Estación San Javier')).toBeOnTheScreen();
    expect(screen.getByText('2 personas')).toBeOnTheScreen();
    expect(screen.getByText('$ 190.000')).toBeOnTheScreen();
    // La línea suelta «código · pax · precio» y la referencia del pago ya no están en la tarjeta.
    expect(screen.queryByText(/pax/)).toBeNull();
    expect(screen.queryByText(/ref\./)).toBeNull();
  });

  test('una sola persona va en singular', async () => {
    await openApp('/reservas', [bookingWith({ pax: 1 })]);
    expect(screen.getByText('1 persona')).toBeOnTheScreen();
  });

  test.each([
    [3, 'en 3 días'],
    [1, 'Mañana'],
  ])('cuenta regresiva: a %i días dice «%s»', async (days, text) => {
    await openApp('/reservas', [bookingWith({ departure: inDays(days) })]);
    expect(screen.getByText(text)).toBeOnTheScreen();
  });

  test('cuenta regresiva: «Hoy»', async () => {
    await openApp('/reservas', [bookingWith({ departure: new Date(Date.now() + 5 * 60 * 1000) })]);
    expect(screen.getByText('Hoy')).toBeOnTheScreen();
  });

  test('el historial no muestra cuenta regresiva ni «Cancelar»', async () => {
    await openApp('/reservas', [bookingWith({ departure: inDays(-5) })]);
    await tap('Historial (1)');

    expect(screen.queryByText(/en 5 días/)).toBeNull();
    expect(screen.queryByText('Hoy')).toBeNull();
    expect(screen.queryByText('Cancelar')).toBeNull();
  });

  test('a 320 px con textos largos: el título se corta en 2 líneas y lo demás se parte, no desborda', async () => {
    // Sin motor de layout en jest no se mide el desborde (Flutter usa textScaleFactor 1.6): se
    // fija lo que lo evita (líneas máximas y filas que se parten).
    const longPlan = plan({
      title: 'Recorrido gastronómico por las plazas de mercado más tradicionales del Valle de Aburrá',
      meetingPoint: 'Estación San Javier, salida norte, junto a la tienda de la esquina',
      agency: 'Agencia de viajes con un nombre larguísimo S.A.S.',
    });
    await openApp('/reservas', [
      bookingWith({ id: 'a', withPlan: longPlan }),
      bookingWith({ id: 'b', code: 'DIV-PEND', withPlan: longPlan, status: BookingStatus.pendingPayment, withPayment: false }),
    ]);

    for (const title of screen.getAllByText(longPlan.title)) expect(title).toHaveProp('numberOfLines', 2);
    for (const agency of screen.getAllByText(longPlan.agency!.name)) expect(agency).toHaveProp('numberOfLines', 1);
    for (const place of screen.getAllByText(longPlan.meetingPoint)) expect(place.props.numberOfLines).toBeUndefined();
  });
});

describe('detalle de la reserva', () => {
  test('muestra estado, fecha y hora, lugar, personas y total, pago, agencia, itinerario y política', async () => {
    await openApp('/reservas/res-1', [bookingWith({ departure: inDays(3, 6) })]);

    expect(screen.getAllByText('Street food tour').length).toBeGreaterThan(0);
    expect(screen.getByText('Confirmada')).toBeOnTheScreen();
    expect(screen.getByText('DIV-CC70944A')).toBeOnTheScreen();
    expect(screen.getByText(/· 06:00/)).toBeOnTheScreen();
    expect(screen.getByText('Estación San Javier')).toBeOnTheScreen();
    expect(screen.getByText(/2 personas/)).toBeOnTheScreen();
    expect(screen.getByText(/\$ 190\.000/)).toBeOnTheScreen();
    expect(screen.getByText('Pagado con Tarjeta · ref. DIV-REF-1 (prueba)')).toBeOnTheScreen();
    expect(screen.getByText('EcoAndes Viajes')).toBeOnTheScreen();
    expect(screen.getByText('Desayuno típico')).toBeOnTheScreen();
    expect(screen.getByText('Reembolso total hasta 48 horas antes.')).toBeOnTheScreen();
    expect(screen.getByText('Ver plan')).toBeOnTheScreen();
    expect(screen.getByText('Cancelar')).toBeOnTheScreen();
  });

  test('cancelada con reembolso: «$» y «%» no se separan de su número si la línea se parte', async () => {
    const cancelled = bookingWith({ status: BookingStatus.cancelled });
    const withRefund = new Booking({
      ...cancelled,
      refunds: [
        new Refund({
          id: 'r1',
          bookingId: 'res-1',
          amount: 399000,
          percentage: 100,
          status: RefundStatus.pending,
          reason: '',
          createdAt: new Date(),
        }),
      ],
    });
    await openApp('/reservas/res-1', [withRefund]);

    expect(rawText(screen.getByText(/Reembolso de prueba pendiente/))).toBe(
      'Reembolso de prueba pendiente · 100\u00A0% · $\u00A0399.000',
    );
    expect(rawText(screen.getByText(/2 personas/))).toBe('2 personas · $\u00A0190.000');
  });

  test('itinerario: la línea de tiempo termina en el último paso (2 pasos, 1 tramo)', async () => {
    await openApp('/reservas/res-1', [bookingWith()]);

    expect(screen.getAllByTestId('itinerary-line')).toHaveLength(1);
  });

  test('carga en frío por id (sin extra) con BookingRepository.reserva', async () => {
    const { queries } = await openApp('/reservas/res-1', [bookingWith()]);

    expect(queries).toEqual(['res-1']);
    expect(screen.getByText('DIV-CC70944A')).toBeOnTheScreen();
    expect(screen.getByText('Estación San Javier')).toBeOnTheScreen();
  });

  test('con la reserva en extra no vuelve a pedirla', async () => {
    const { queries } = await openApp('/reservas', [bookingWith()]);
    await tap('Street food tour');

    expect(queries).toEqual([]);
    expect(screen.getByText('Ver plan')).toBeOnTheScreen();
  });

  test('una reserva inexistente muestra el error con «Reintentar»', async () => {
    await openApp('/reservas/nope', [bookingWith()]);

    expect(screen.getByText('No pudimos cargar la reserva')).toBeOnTheScreen();
    expect(screen.getByText('Reintentar')).toBeOnTheScreen();
    expect(screen.queryByText('Ver plan')).toBeNull();
    // El marco del error tiene «Volver»: abierta en frío lleva a «Mis reservas».
    await fireEvent.press(screen.getByLabelText('Volver'));
    await settle();
    expect(screen.getByText('Mis reservas')).toBeOnTheScreen();
  });

  test('«Ver plan» abre el plan', async () => {
    const { r } = await openApp('/reservas/res-1', [bookingWith()]);

    await tap('Ver plan');

    expect(r.getPathname()).toBe('/plan/plan-1');
  });

  test('«Cancelar» abre la confirmación con la política', async () => {
    const { r } = await openApp('/reservas/res-1', [bookingWith()]);

    await tap('Cancelar');

    expect(screen.getByText('¿Cancelar reserva?')).toBeOnTheScreen();
    expect(r.getPathname()).toBe('/reservas/res-1');
  });

  test('una reserva que ya salió no se puede cancelar; sí reseñar', async () => {
    await openApp('/reservas/res-1', [bookingWith({ departure: inDays(-5) })]);

    expect(screen.getByText('Realizada')).toBeOnTheScreen();
    expect(screen.queryByText('Cancelar')).toBeNull();
    expect(screen.getByText('Reseñar')).toBeOnTheScreen();
  });

  test('pendiente de pago ofrece completar el pago y verificar', async () => {
    await openApp('/reservas/res-1', [bookingWith({ status: BookingStatus.pendingPayment, withPayment: false })]);

    expect(screen.getByText('Pendiente')).toBeOnTheScreen();
    expect(screen.getByText('Completar pago')).toBeOnTheScreen();
    expect(screen.getByText('Ya pagué, verificar')).toBeOnTheScreen();
  });

  test('«Ya pagué, verificar» lleva al resultado del pago de esa reserva', async () => {
    const { r } = await openApp('/reservas/res-1', [bookingWith({ status: BookingStatus.pendingPayment, withPayment: false })]);

    await tap('Ya pagué, verificar');

    expect(r.getPathnameWithParams()).toBe('/pago/resultado?reserva=res-1');
  });

  test('reseñar desde el detalle y publicar: vuelve con «Ya dejaste tu reseña»', async () => {
    const list = [bookingWith({ departure: inDays(-5) })];
    const { repo: bookings } = fakeRepo(list);
    const reviews = new FakeReviewPublisher();
    const r = await startApp('/reservas', testDependencies({ bookings, reviews }));
    await tap('Historial (1)');
    await tap('Street food tour');

    await tap('Reseñar');
    expect(r.getPathname()).toBe('/resena/res-1');
    await tap('Publicar reseña');

    expect(reviews.createdReviews).toEqual([{ bookingId: 'res-1', rating: 5, comment: '' }]);
    expect(r.getPathname()).toBe('/reservas/res-1');
    expect(screen.getByText('Ya dejaste tu reseña')).toBeOnTheScreen();
    expect(screen.queryByText('Reseñar')).toBeNull();
  });

  // Volver de «Tu reseña» sin publicar no cambia nada: recargar devolvía la lista al principio
  // (en Flutter se recargaba siempre; esto es una mejora deliberada).
  test('volver de «Tu reseña» sin publicar no recarga «Mis reservas» (conserva el desplazamiento)', async () => {
    const bookings = new FakeBookingRepository([bookingWith({ departure: inDays(-5) })]);
    const r = await startApp('/reservas', testDependencies({ bookings, reviews: new FakeReviewPublisher() }));
    await tap('Historial (1)');
    expect(bookings.listQueries).toBe(1);

    await tap('Reseñar');
    expect(r.getPathname()).toBe('/resena/res-1');
    await fireEvent.press(screen.getByRole('button', { name: 'Volver' }));
    await settle();

    expect(r.getPathname()).toBe('/reservas');
    expect(bookings.listQueries).toBe(1);
    expect(screen.getByText('Reseñar')).toBeOnTheScreen();
  });

  test('publicar la reseña recarga «Mis reservas» sin desmontar la lista (sin volver al esqueleto)', async () => {
    const bookings = new FakeBookingRepository([bookingWith({ departure: inDays(-5) })]);
    const reviews = new FakeReviewPublisher();
    const r = await startApp('/reservas', testDependencies({ bookings, reviews }));
    await tap('Historial (1)');
    await tap('Reseñar');

    // La recarga queda colgada: así se ve qué muestra la lista MIENTRAS recarga.
    bookings.gate = createGate();
    await tap('Publicar reseña');

    expect(r.getPathname()).toBe('/reservas');
    expect(bookings.listQueries).toBe(2);
    expect(screen.queryAllByTestId('skeleton')).toHaveLength(0);
    expect(screen.getByTestId('bookings-list')).toBeOnTheScreen();
    expect(screen.getByText('Street food tour')).toBeOnTheScreen();

    bookings.list = [new Booking({ ...bookings.list[0]!, hasReview: true })];
    await act(async () => bookings.gate!.resolve());
    await settle();

    expect(screen.queryByText('Reseñar')).toBeNull();
  });

  test('el botón atrás de Android vuelve como «Volver» (y abierto en frío lleva a «Mis reservas»)', async () => {
    type Listener = Parameters<typeof BackHandler.addEventListener>[1];
    const listeners: Listener[] = [];
    const spy = jest.spyOn(BackHandler, 'addEventListener').mockImplementation((_event, listener) => {
      listeners.push(listener);
      return { remove: () => listeners.splice(listeners.indexOf(listener), 1) };
    });
    try {
      const { r } = await openApp('/reservas/res-1', [bookingWith()]);
      expect(listeners.length).toBeGreaterThan(0);

      let consumed: unknown = false;
      await act(async () => {
        consumed = (listeners[listeners.length - 1] as (...args: unknown[]) => unknown)({});
      });
      await settle();

      expect(consumed).toBe(true);
      expect(r.getPathname()).toBe('/reservas');
    } finally {
      spy.mockRestore();
    }
  });

  test('a 320 px con textos largos: el título y la agencia se parten en varias líneas', async () => {
    const longPlan = plan({
      title: 'Recorrido gastronómico por las plazas de mercado más tradicionales del Valle de Aburrá',
      meetingPoint: 'Estación San Javier, salida norte, junto a la tienda de la esquina',
      agency: 'Agencia de viajes con un nombre larguísimo S.A.S.',
    });
    await openApp('/reservas/res-1', [bookingWith({ withPlan: longPlan })]);

    const inContent = screen.getAllByText(longPlan.title).filter((t) => t.props.testID !== 'header-title');
    expect(inContent).toHaveLength(1);
    expect(inContent[0]!.props.numberOfLines).toBeUndefined();
    expect(screen.getByText(longPlan.agency!.name).props.numberOfLines).toBeUndefined();
  });
});

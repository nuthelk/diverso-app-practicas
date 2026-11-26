import { act, renderHook } from '@testing-library/react-native';

import { BookingStatus, DiversoError, type Booking } from '@/core';
import { useReviewViewModel } from '@/features/bookings/view-models/useReviewViewModel';

import { createGate } from '../../../support/gate';
import { FakeReviewPublisher, FakeBookingRepository, testBooking } from '../../../support/fake-booking-repository';

/**
 * `useReviewViewModel` con repositorios falsos: carga la reserva por id (o usa la de la lista),
 * decide si se puede reseñar, guarda la calificación y publica la reseña. Port 1:1 de
 * `review_view_model_test.dart`.
 */

const now = new Date(Date.UTC(2026, 9, 25, 15, 0));
const daysFromNow = (d: number) => new Date(now.getTime() + d * 24 * 60 * 60 * 1000);
const departure = daysFromNow(-3);

let bookings: FakeBookingRepository;
let reviews: FakeReviewPublisher;
beforeEach(() => {
  bookings = new FakeBookingRepository([testBooking({ departure })]);
  reviews = new FakeReviewPublisher();
});

async function setup({ preloaded }: { preloaded?: Booking } = {}) {
  return renderHook(() =>
    useReviewViewModel({ bookings, reviews, bookingId: 'res-1', preloaded, clock: () => now }),
  );
}

describe('carga de la reserva', () => {
  test('sin reserva adelantada: cargando hasta que llega', async () => {
    const { result } = await setup();
    expect(result.current.loading).toBe(true);
    expect(result.current.booking).toBeNull();

    await act(() => result.current.load());

    expect(result.current.loading).toBe(false);
    expect(result.current.booking?.id).toBe('res-1');
    expect(result.current.canReview).toBe(true);
    expect(bookings.bookingQueries).toEqual(['res-1']);
  });

  test('con la reserva de «Mis reservas» no se vuelve a pedir', async () => {
    const { result } = await setup({ preloaded: bookings.list[0] });
    expect(result.current.loading).toBe(false);

    await act(() => result.current.load());

    expect(bookings.bookingQueries).toEqual([]);
    expect(result.current.canReview).toBe(true);
  });

  test('una reserva adelantada de otro id se ignora y se carga la pedida', async () => {
    const { result } = await setup({ preloaded: testBooking({ id: 'otra', departure }) });
    expect(result.current.loading).toBe(true);

    await act(() => result.current.load());

    expect(result.current.booking?.id).toBe('res-1');
  });

  test('error: queda el motivo y reintentar lo limpia', async () => {
    bookings.list = [];
    const { result } = await setup();
    await act(() => result.current.load());

    expect(result.current.error).toBe(new DiversoError('RESERVA_NO_EXISTE').userMessage);
    expect(result.current.booking).toBeNull();
    expect(result.current.canReview).toBe(false);

    bookings.list = [testBooking({ departure })];
    await act(() => result.current.load());

    expect(result.current.error).toBeNull();
    expect(result.current.booking?.id).toBe('res-1');
  });

  test('un error que no es de Diverso también queda como mensaje', async () => {
    bookings.failure = new Error('sin red');
    const { result } = await setup();
    await act(() => result.current.load());
    expect(result.current.error).not.toBeNull();
  });

  test.each([
    ['aún no viajó', () => testBooking({ departure: daysFromNow(1) })],
    ['ya reseñada', () => testBooking({ departure, hasReview: true })],
    ['cancelada', () => testBooking({ departure, status: BookingStatus.cancelled })],
    ['pendiente de pago', () => testBooking({ departure, status: BookingStatus.pendingPayment })],
  ])('no se puede reseñar una reserva %s', async (_label, make) => {
    bookings.list = [make()];
    const { result } = await setup();
    await act(() => result.current.load());

    expect(result.current.booking).not.toBeNull();
    expect(result.current.canReview).toBe(false);
  });

  test('desmontada: una carga que termina después no avisa a nadie ni lanza', async () => {
    bookings.gate = createGate();
    const { result, unmount } = await setup();
    let pendingLoad!: Promise<void>;
    await act(async () => {
      pendingLoad = result.current.load();
    });
    await unmount();
    bookings.gate.resolve();

    await expect(pendingLoad).resolves.toBeUndefined();
  });
});

describe('calificación y envío', () => {
  test('empieza en 5 estrellas y rate la cambia (solo de 1 a 5)', async () => {
    const { result } = await setup({ preloaded: bookings.list[0] });
    expect(result.current.rating).toBe(5);

    await act(async () => result.current.rate(2));
    expect(result.current.rating).toBe(2);

    await act(async () => {
      result.current.rate(0);
      result.current.rate(6);
    });
    expect(result.current.rating).toBe(2);
  });

  test('submit publica con la calificación y el comentario, y devuelve true', async () => {
    const { result } = await setup({ preloaded: bookings.list[0] });
    await act(async () => result.current.rate(4));

    let ok = false;
    await act(async () => {
      ok = await result.current.submit('Muy bueno');
    });

    expect(ok).toBe(true);
    expect(reviews.createdReviews).toEqual([{ bookingId: 'res-1', rating: 4, comment: 'Muy bueno' }]);
    expect(result.current.submitting).toBe(false);
    // La pantalla se cierra: el botón no se vuelve a activar.
    expect(result.current.published).toBe(true);
    expect(result.current.submitError).toBeNull();
  });

  test('una reseña ya publicada no se publica dos veces', async () => {
    const { result } = await setup({ preloaded: bookings.list[0] });
    await act(async () => {
      await result.current.submit('a');
    });

    let ok = true;
    await act(async () => {
      ok = await result.current.submit('a');
    });
    expect(ok).toBe(false);
    expect(reviews.createdReviews).toHaveLength(1);
  });

  test('mientras envía `submitting` es true y un segundo envío no publica dos veces', async () => {
    reviews.gate = createGate();
    const { result } = await setup({ preloaded: bookings.list[0] });

    let first!: Promise<boolean>;
    await act(async () => {
      first = result.current.submit('a');
    });
    expect(result.current.submitting).toBe(true);
    let second = true;
    await act(async () => {
      second = await result.current.submit('a');
    });
    expect(second).toBe(false);

    await act(async () => {
      reviews.gate!.resolve();
      await first;
    });
    await expect(first).resolves.toBe(true);
    expect(reviews.createdReviews).toHaveLength(1);
  });

  test('si el servidor rechaza: false, `submitError` con el motivo y se puede reintentar', async () => {
    reviews.failure = new DiversoError('ESTADO_INVALIDO');
    const { result } = await setup({ preloaded: bookings.list[0] });

    let ok = true;
    await act(async () => {
      ok = await result.current.submit('');
    });

    expect(ok).toBe(false);
    expect(result.current.submitError).toBe('La reserva ya no admite esta operación.');
    expect(result.current.submitting).toBe(false);
    expect(reviews.createdReviews).toEqual([]);

    reviews.failure = null;
    await act(async () => {
      ok = await result.current.submit('');
    });
    expect(ok).toBe(true);
    expect(result.current.submitError).toBeNull();
  });

  test('un error inesperado al publicar también queda como mensaje y libera el botón', async () => {
    reviews.failure = new Error('boom');
    const { result } = await setup({ preloaded: bookings.list[0] });

    let ok = true;
    await act(async () => {
      ok = await result.current.submit('');
    });
    expect(ok).toBe(false);
    expect(result.current.submitError).not.toBeNull();
    expect(result.current.submitting).toBe(false);
  });

  test('desmontada: un envío que termina después no avisa a nadie ni lanza', async () => {
    reviews.gate = createGate();
    const { result, unmount } = await setup({ preloaded: bookings.list[0] });
    let pendingSubmit!: Promise<boolean>;
    await act(async () => {
      pendingSubmit = result.current.submit('');
    });
    await unmount();
    reviews.gate.resolve();

    await expect(pendingSubmit).resolves.toBe(true);
  });
});

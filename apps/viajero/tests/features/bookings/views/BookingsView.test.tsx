import { fireEvent, screen, within } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import {
  Agency,
  Booking,
  BookingStatus,
  ExperienceCategory,
  Plan,
  PlanStatus,
  VerificationStatus,
  type BookingRepository,
  type Public,
} from '@/core';
import { BookingsView } from '@/features/bookings/views/BookingsView';
import { withAlpha, lightTheme } from '@/ui/theme';
import { hideSnackbar } from '@/features/shared/snackbar';
import { forgetPreloadedBooking } from '@/features/bookings/between-screens';

import { testDependencies, stub } from '../../../support/test-dependencies';
import { resetFakeRouter, fakeRouter } from '../../../support/fake-expo-router';
import { setWindowSize, renderScreen, restoreWindowSize } from '../../../support/render-screen';
import { settleScreen } from '../support';

jest.mock('expo-router', () => require('../../../support/fake-expo-router'));

/**
 * «Mis reservas» con salidas reales (relativas a hoy): «Cancelar» solo antes de salir, «Reseñar»
 * solo después, los viajes que ya salieron viven en «Historial» y la lista nunca pasa por encima
 * del título ni de las pestañas. Sin red ni Supabase. Port 1:1 de `bookings_view_test.dart`.
 */

afterEach(() => {
  hideSnackbar();
  forgetPreloadedBooking();
});

const DAY_MS = 24 * 60 * 60 * 1000;

function bookingIn(
  code: string,
  days: number,
  { status = BookingStatus.confirmed, plan = null }: { status?: BookingStatus; plan?: Plan | null } = {},
) {
  return new Booking({
    id: code,
    code,
    planDateId: 'pd',
    travelerId: 'v',
    pax: 2,
    totalAmount: 190000,
    status,
    createdAt: new Date(Date.now() - 40 * DAY_MS),
    departureAt: new Date(Date.now() + days * DAY_MS),
    plan,
  });
}

function plan({ photos = [], withAgency = true }: { photos?: string[]; withAgency?: boolean } = {}) {
  return new Plan({
    id: 'plan-1',
    agencyId: 'ag',
    title: 'Comuna 13 y memoria',
    destination: 'Medellín',
    category: ExperienceCategory.culture,
    priceCop: 95000,
    status: PlanStatus.published,
    photos,
    agency: withAgency
      ? new Agency({
          id: 'ag',
          name: 'EcoAndes Viajes',
          rntNumber: '12345',
          commercialRegistration: '999',
          verificationStatus: VerificationStatus.verified,
        })
      : null,
  });
}

async function renderBookings(bookings: Booking[]) {
  await setWindowSize(800, 1400);
  const repo = stub<Public<BookingRepository>>('BookingRepository', { myBookings: async () => bookings });
  await renderScreen(<BookingsView />, { dependencies: testDependencies({ bookings: repo }) });
  await settleScreen();
}

const tap = async (text: string) => {
  await fireEvent.press(screen.getByText(text));
  await settleScreen();
};

beforeEach(resetFakeRouter);
afterEach(restoreWindowSize);

test('una confirmada que ya salió está en «Historial», sin «Cancelar» y con «Reseñar»', async () => {
  await renderBookings([bookingIn('PASADA', -5), bookingIn('FUTURA', 5)]);

  expect(screen.getByText('Próximas (1)')).toBeOnTheScreen();
  expect(screen.getByText('Historial (1)')).toBeOnTheScreen();

  // Próximas: solo la futura, con «Cancelar» y sin «Reseñar».
  expect(screen.getByText('FUTURA')).toBeOnTheScreen();
  expect(screen.queryByText('PASADA')).toBeNull();
  expect(screen.getByText('Cancelar')).toBeOnTheScreen();
  expect(screen.queryByText('Reseñar')).toBeNull();

  await tap('Historial (1)');

  expect(screen.getByText('PASADA')).toBeOnTheScreen();
  expect(screen.queryByText('FUTURA')).toBeNull();
  expect(screen.queryByText('Cancelar')).toBeNull();
  expect(screen.getByText('Reseñar')).toBeOnTheScreen();
});

test('las pestañas se anuncian como pestañas, con la seleccionada marcada', async () => {
  await renderBookings([bookingIn('FUTURA', 5)]);

  const [upcomingTab, historyTab] = screen.getAllByRole('tab');
  expect(upcomingTab).toBeSelected();
  expect(historyTab).not.toBeSelected();
});

test('el viaje de mañana no se puede reseñar todavía', async () => {
  await renderBookings([bookingIn('MANANA', 1)]);

  expect(screen.queryByText('Reseñar')).toBeNull();
  expect(screen.getByText('Cancelar')).toBeOnTheScreen();
});

test('la lista queda debajo del título y las pestañas (no se desplazan con ella)', async () => {
  await renderBookings(Array.from({ length: 9 }, (_, i) => bookingIn(`FUT${i}`, 3 + i)));

  // Flutter mide que la lista no pase por encima: aquí el título y las pestañas están FUERA del
  // área desplazable (la lista ocupa el resto de la pantalla, debajo).
  const list = screen.getByTestId('bookings-list');
  expect(within(list).getByText('FUT0')).toBeOnTheScreen();
  expect(within(list).queryByText('Mis reservas')).toBeNull();
  expect(within(list).queryByText('Próximas (9)')).toBeNull();
  expect(screen.getByText('Mis reservas')).toBeOnTheScreen();
});

describe('tarjeta con la foto del plan', () => {
  test('con foto: imagen de cabecera con la fecha y el estado encima, título y agencia', async () => {
    await renderBookings([bookingIn('FUT', 5, { plan: plan({ photos: ['https://fotos.test/a.jpg', 'https://fotos.test/b.jpg'] }) })]);

    expect(screen.getByTestId('booking-photo')).toBeOnTheScreen();
    expect(screen.queryByTestId('booking-no-photo')).toBeNull();
    expect(screen.getByText('Comuna 13 y memoria')).toBeOnTheScreen();
    expect(screen.getByText('EcoAndes Viajes')).toBeOnTheScreen();
    // El código es una etiqueta; personas y total son un pie propio.
    expect(screen.getByText('FUT')).toBeOnTheScreen();
    expect(screen.getByText('2 personas')).toBeOnTheScreen();
    expect(screen.getByText('$ 190.000')).toBeOnTheScreen();

    // La insignia de fecha y la píldora de estado van DENTRO de la cabecera (sobre la foto); el
    // título, debajo (fuera de ella).
    const header = screen.getByTestId('booking-header');
    expect(within(header).getByTestId('date-badge')).toBeOnTheScreen();
    expect(within(header).getByText('Confirmada')).toBeOnTheScreen();
    expect(within(header).queryByText('Comuna 13 y memoria')).toBeNull();
  });

  test('sin foto: respaldo en su lugar, sin pedir imagen, con fecha, estado y acciones', async () => {
    await renderBookings([bookingIn('FUT', 5, { plan: plan({ withAgency: false }) })]);

    expect(screen.queryByTestId('booking-photo')).toBeNull();
    expect(screen.getByTestId('booking-no-photo')).toBeOnTheScreen();
    expect(screen.getByText('🏘️')).toBeOnTheScreen();
    expect(screen.getByTestId('date-badge')).toBeOnTheScreen();
    expect(screen.getByText('Confirmada')).toBeOnTheScreen();
    expect(screen.getByText('Comuna 13 y memoria')).toBeOnTheScreen();
    expect(screen.queryByText('EcoAndes Viajes')).toBeNull(); // sin agencia no hay línea de agencia
    expect(screen.getByText('Cancelar')).toBeOnTheScreen();
  });

  test('reserva sin plan cargado: título de respaldo y respaldo de foto', async () => {
    await renderBookings([bookingIn('FUT', 5)]);

    expect(screen.getByText('Plan')).toBeOnTheScreen();
    expect(screen.getByTestId('booking-no-photo')).toBeOnTheScreen();
  });

  test('el historial se ve más apagado que las próximas', async () => {
    await renderBookings([
      bookingIn('PASADA', -5, { plan: plan({ photos: ['https://fotos.test/a.jpg'] }) }),
      bookingIn('FUTURA', 5, { plan: plan({ photos: ['https://fotos.test/a.jpg'] }) }),
    ]);
    const colorOf = () => StyleSheet.flatten(screen.getByText('Comuna 13 y memoria').props.style).color;
    expect(colorOf()).toBe(lightTheme.colorScheme.onSurface);

    await tap('Historial (1)');

    expect(colorOf()).toBe(withAlpha(lightTheme.colorScheme.onSurface, 0.72));
  });
});

describe('etiqueta de estado', () => {
  test('confirmada que ya salió dice «Realizada»; la próxima sigue «Confirmada»', async () => {
    await renderBookings([bookingIn('PASADA', -5), bookingIn('FUTURA', 5)]);

    expect(screen.getByText('Confirmada')).toBeOnTheScreen();
    expect(screen.queryByText('Realizada')).toBeNull();

    await tap('Historial (1)');

    expect(screen.getByText('Realizada')).toBeOnTheScreen();
    expect(screen.queryByText('Confirmada')).toBeNull();
    // Solo cambia la etiqueta: las reglas siguen igual.
    expect(screen.getByText('Reseñar')).toBeOnTheScreen();
    expect(screen.queryByText('Cancelar')).toBeNull();
  });

  test('PRESERVE: «Cancelada», «Pendiente» y «Completada» no cambian aunque ya salieron', async () => {
    await renderBookings([
      bookingIn('CAN', -5, { status: BookingStatus.cancelled }),
      bookingIn('PEN', -4, { status: BookingStatus.pendingPayment }),
      bookingIn('COM', -3, { status: BookingStatus.completed }),
    ]);
    await tap('Historial (3)');

    expect(screen.getByText('Cancelada')).toBeOnTheScreen();
    expect(screen.getByText('Pendiente')).toBeOnTheScreen();
    expect(screen.getByText('Completada')).toBeOnTheScreen();
    expect(screen.queryByText('Realizada')).toBeNull();
  });

  test('PRESERVE: «Pendiente» de un viaje próximo sigue igual', async () => {
    await renderBookings([bookingIn('PEN', 4, { status: BookingStatus.pendingPayment })]);
    expect(screen.getByText('Pendiente')).toBeOnTheScreen();
  });
});

test('PRESERVE: sin reservas muestra el estado vacío', async () => {
  await renderBookings([]);

  expect(screen.getByText('Aún no tienes reservas')).toBeOnTheScreen();
  expect(
    screen.getByText('Cuando reserves un plan, aquí verás tu código, la fecha y el itinerario.'),
  ).toBeOnTheScreen();
});

test('«Próximas» vacía: estado vacío (ícono, «Sin viajes próximos», «¡Hora de explorar!») con «Explorar planes»', async () => {
  await renderBookings([bookingIn('PASADA', -5)]);

  expect(screen.queryByTestId('empty-state-icon', { includeHiddenElements: true })).toBeOnTheScreen();
  expect(screen.queryByText('Sin viajes próximos')).toBeOnTheScreen();
  expect(screen.queryByText('¡Hora de explorar!')).toBeOnTheScreen();

  const exploreButton = screen.queryByRole('button', { name: 'Explorar planes' });
  expect(exploreButton).toBeOnTheScreen();
  await fireEvent.press(exploreButton!);
  // A la pestaña «Explorar» (que ya existe): `navigate`, no se apila otra encima.
  expect(fakeRouter.navigate).toHaveBeenCalledWith('/');
});

test('«Historial» vacía: «Todavía no hay historial.»', async () => {
  await renderBookings([bookingIn('FUTURA', 5)]);
  await tap('Historial (0)');
  expect(screen.getByText('Todavía no hay historial.')).toBeOnTheScreen();
});

test('error: «Sin conexión» con «Reintentar», que vuelve a cargar', async () => {
  await setWindowSize(800, 1400);
  let attempts = 0;
  const repo = stub<Public<BookingRepository>>('BookingRepository', {
    myBookings: async () => {
      attempts++;
      if (attempts === 1) throw new Error('sin red');
      return [bookingIn('FUTURA', 5)];
    },
  });
  await renderScreen(<BookingsView />, { dependencies: testDependencies({ bookings: repo }) });
  await settleScreen();

  expect(screen.getByText('Sin conexión')).toBeOnTheScreen();
  expect(screen.getByText('No pudimos cargar tus reservas.')).toBeOnTheScreen();

  await tap('Reintentar');

  expect(screen.getByText('FUTURA')).toBeOnTheScreen();
});

test('mientras carga muestra el esqueleto de tres tarjetas', async () => {
  await setWindowSize(800, 1400);
  const repo = stub<Public<BookingRepository>>('BookingRepository', {
    myBookings: () => new Promise<Booking[]>(() => {}),
  });
  await renderScreen(<BookingsView />, { dependencies: testDependencies({ bookings: repo }) });

  expect(screen.getAllByTestId('skeleton')).toHaveLength(3);
});

test('pendiente de pago: «Ya pagué, verificar» lleva a verificar el pago de esa reserva', async () => {
  await renderBookings([bookingIn('PEN', 4, { status: BookingStatus.pendingPayment })]);

  expect(screen.getByText('Completar pago')).toBeOnTheScreen();
  await tap('Ya pagué, verificar');

  expect(fakeRouter.replace).toHaveBeenCalledWith('/pago/resultado?reserva=PEN');
});

test('tocar la tarjeta abre el detalle de esa reserva', async () => {
  await renderBookings([bookingIn('FUTURA', 5)]);

  await fireEvent.press(screen.getByLabelText('Ver detalle de la reserva FUTURA'));

  expect(fakeRouter.push).toHaveBeenCalledWith('/reservas/FUTURA');
});

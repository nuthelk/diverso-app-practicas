import { act, fireEvent, screen } from 'expo-router/testing-library';

import { DiversoError, Profile, UserRole, type Booking, type BookingRepository, type Public } from '@/core';
import { forgetPreloadedBooking } from '@/features/bookings/between-screens';
import { hideSnackbar } from '@/features/shared/snackbar';

import { startApp, settle, visibleScreen } from '../support/app';
import { FakeAuth } from '../support/fake-auth';
import { createGate, type Gate } from '../support/gate';
import { testDependencies, stub } from '../support/test-dependencies';

/**
 * Los casos de `router/consentimiento_guard_test.dart` que dependen de las pantallas reales de
 * T7: las aserciones de DATOS de V1 (la pantalla protegida no consulta nada mientras se verifica
 * el consentimiento; aceptado, carga la reserva del enlace; tras aceptar, el perfil muestra el
 * nombre) y J2 (la reseña de una reserva ajena no muestra el formulario). Los de navegación de V1
 * están en `consent.test.tsx`.
 */

const testPendingDocuments = ['tratamiento_datos', 'terminos_viajero'];

/** Cada consulta de consentimiento queda en [openQueries] hasta que el test la responde. */
class ManualAuth extends FakeAuth {
  readonly openQueries: Gate<string[]>[] = [];

  constructor(userId: string) {
    super({ userId });
    this.email = 'viajero@demo.com';
    this.profile = new Profile({ id: 'viajero-1', role: UserRole.traveler, name: 'Santiago' });
  }

  override pendingConsents(): Promise<string[]> {
    this.consentQueries++;
    const c = createGate<string[]>();
    this.openQueries.push(c);
    return c.promise;
  }
}

/** RLS oculta las reservas de otros viajeros: el servidor responde «no existe». */
function foreignBookings() {
  const queries: string[] = [];
  const repo = stub<Public<BookingRepository>>('BookingRepository', {
    booking: async (bookingId: string): Promise<Booking> => {
      queries.push(bookingId);
      throw new DiversoError('RESERVA_NO_EXISTE');
    },
    myBookings: async () => {
      queries.push('myBookings');
      return [];
    },
  });
  return { repo, queries };
}

async function respond(c: Gate<string[]> | undefined, value: string[]) {
  await act(async () => c!.resolve(value));
  await settle();
}

afterEach(() => {
  hideSnackbar();
  forgetPreloadedBooking();
  jest.useRealTimers();
});

describe('V1: mientras se verifica el consentimiento', () => {
  test('un enlace a una pantalla protegida no carga sus datos', async () => {
    const auth = new ManualAuth('viajero-1');
    const { repo, queries } = foreignBookings();
    const r = await startApp('/reservas/b-1', testDependencies({ auth, bookings: repo }));

    expect(r.getPathname()).toBe('/consentimiento');
    expect(queries).toEqual([]);

    await respond(auth.openQueries[0], []);
  });

  test('aceptado, el enlace original se conserva y carga esa reserva', async () => {
    const auth = new ManualAuth('viajero-1');
    const { repo, queries } = foreignBookings();
    const r = await startApp('/reservas/b-1', testDependencies({ auth, bookings: repo }));

    await respond(auth.openQueries[0], []);

    expect(r.getPathname()).toBe('/reservas/b-1');
    expect(visibleScreen('BookingDetailView')).toBeOnTheScreen();
    expect(queries).toEqual(['b-1']);
  });

  test('pendiente, tras aceptar se llega al perfil con el nombre del viajero', async () => {
    const auth = new ManualAuth('viajero-1');
    const r = await startApp('/perfil', testDependencies({ auth }));

    await respond(auth.openQueries[0], testPendingDocuments);
    expect(screen.getByText('Antes de continuar')).toBeOnTheScreen();
    expect(auth.profileLoads).toBe(0);

    for (const checkbox of screen.getAllByRole('checkbox')) await fireEvent.press(checkbox);
    await fireEvent.press(screen.getByText('Aceptar y continuar'));
    await settle(2);
    await respond(auth.openQueries[1], []);

    expect(r.getPathname()).toBe('/perfil');
    expect(screen.getByText('Santiago')).toBeOnTheScreen();
    expect(screen.getByText('viajero@demo.com')).toBeOnTheScreen();
  });
});

describe('J2: rutas con ids con el consentimiento al día', () => {
  test('/resena/<reserva de otro viajero> no muestra el formulario', async () => {
    const auth = new ManualAuth('viajero-1');
    const { repo, queries } = foreignBookings();
    await startApp('/resena/03341be8-fa33-4958-8b64-a0893b3197e4', testDependencies({ auth, bookings: repo }));
    await respond(auth.openQueries[0], []);

    expect(queries).toEqual(['03341be8-fa33-4958-8b64-a0893b3197e4']);
    expect(screen.getByText('No pudimos cargar la reserva')).toBeOnTheScreen();
    expect(screen.queryByText('Publicar reseña')).toBeNull();
  });
});

import { act, fireEvent, screen } from 'expo-router/testing-library';

import { DiversoError, Profile, UserRole, type Booking, type BookingRepository, type Public } from '@/core';
import { forgetPreloadedBooking } from '@/features/bookings/between-screens';
import { hideSnackbar } from '@/features/shared/snackbar';

import { arrancarApp, asentar, pantallaVisible } from '../support/app';
import { AuthFalso } from '../support/auth-falso';
import { compuerta, type Compuerta } from '../support/compuerta';
import { dependenciasDePrueba, doble } from '../support/dependencias-de-prueba';

/**
 * Los casos de `router/consentimiento_guard_test.dart` que dependen de las pantallas reales de
 * T7: las aserciones de DATOS de V1 (la pantalla protegida no consulta nada mientras se verifica
 * el consentimiento; aceptado, carga la reserva del enlace; tras aceptar, el perfil muestra el
 * nombre) y J2 (la reseña de una reserva ajena no muestra el formulario). Los de navegación de V1
 * están en `consentimiento.test.tsx`.
 */

const pendientesDePrueba = ['tratamiento_datos', 'terminos_viajero'];

/** Cada consulta de consentimiento queda en [abiertas] hasta que el test la responde. */
class AuthManual extends AuthFalso {
  readonly abiertas: Compuerta<string[]>[] = [];

  constructor(usuario: string) {
    super({ usuario });
    this.email = 'viajero@demo.com';
    this.perfil = new Profile({ id: 'viajero-1', role: UserRole.traveler, name: 'Santiago' });
  }

  override pendingConsents(): Promise<string[]> {
    this.consultas++;
    const c = compuerta<string[]>();
    this.abiertas.push(c);
    return c.promesa;
  }
}

/** RLS oculta las reservas de otros viajeros: el servidor responde «no existe». */
function reservasAjenas() {
  const consultas: string[] = [];
  const repo = doble<Public<BookingRepository>>('BookingRepository', {
    booking: async (bookingId: string): Promise<Booking> => {
      consultas.push(bookingId);
      throw new DiversoError('RESERVA_NO_EXISTE');
    },
    myBookings: async () => {
      consultas.push('misReservas');
      return [];
    },
  });
  return { repo, consultas };
}

async function responder(c: Compuerta<string[]> | undefined, valor: string[]) {
  await act(async () => c!.completar(valor));
  await asentar();
}

afterEach(() => {
  hideSnackbar();
  forgetPreloadedBooking();
  jest.useRealTimers();
});

describe('V1: mientras se verifica el consentimiento', () => {
  test('un enlace a una pantalla protegida no carga sus datos', async () => {
    const auth = new AuthManual('viajero-1');
    const { repo, consultas } = reservasAjenas();
    const r = await arrancarApp('/reservas/b-1', dependenciasDePrueba({ auth, bookings: repo }));

    expect(r.getPathname()).toBe('/consentimiento');
    expect(consultas).toEqual([]);

    await responder(auth.abiertas[0], []);
  });

  test('aceptado, el enlace original se conserva y carga esa reserva', async () => {
    const auth = new AuthManual('viajero-1');
    const { repo, consultas } = reservasAjenas();
    const r = await arrancarApp('/reservas/b-1', dependenciasDePrueba({ auth, bookings: repo }));

    await responder(auth.abiertas[0], []);

    expect(r.getPathname()).toBe('/reservas/b-1');
    expect(pantallaVisible('ReservaDetalleView')).toBeOnTheScreen();
    expect(consultas).toEqual(['b-1']);
  });

  test('pendiente, tras aceptar se llega al perfil con el nombre del viajero', async () => {
    const auth = new AuthManual('viajero-1');
    const r = await arrancarApp('/perfil', dependenciasDePrueba({ auth }));

    await responder(auth.abiertas[0], pendientesDePrueba);
    expect(screen.getByText('Antes de continuar')).toBeOnTheScreen();
    expect(auth.cargasDePerfil).toBe(0);

    for (const casilla of screen.getAllByRole('checkbox')) await fireEvent.press(casilla);
    await fireEvent.press(screen.getByText('Aceptar y continuar'));
    await asentar(2);
    await responder(auth.abiertas[1], []);

    expect(r.getPathname()).toBe('/perfil');
    expect(screen.getByText('Santiago')).toBeOnTheScreen();
    expect(screen.getByText('viajero@demo.com')).toBeOnTheScreen();
  });
});

describe('J2: rutas con ids con el consentimiento al día', () => {
  test('/resena/<reserva de otro viajero> no muestra el formulario', async () => {
    const auth = new AuthManual('viajero-1');
    const { repo, consultas } = reservasAjenas();
    await arrancarApp('/resena/03341be8-fa33-4958-8b64-a0893b3197e4', dependenciasDePrueba({ auth, bookings: repo }));
    await responder(auth.abiertas[0], []);

    expect(consultas).toEqual(['03341be8-fa33-4958-8b64-a0893b3197e4']);
    expect(screen.getByText('No pudimos cargar la reserva')).toBeOnTheScreen();
    expect(screen.queryByText('Publicar reseña')).toBeNull();
  });
});

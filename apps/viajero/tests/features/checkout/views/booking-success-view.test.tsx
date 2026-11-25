import { fireEvent, screen } from '@testing-library/react-native';

import { Booking, BookingStatus, ItineraryStep } from '@/core';
import { BookingSuccessView } from '@/features/checkout/views/BookingSuccessView';
import { AppRoutes } from '@/router';

import { reiniciarRouterFalso, routerFalso } from '../../../support/expo-router-falso';
import { renderPantalla } from '../../../support/pantalla';
import { planDePrueba } from '../support/catalogo-falso';

jest.mock('expo-router', () => require('../../../support/expo-router-falso'));

/** Confirmación: código seleccionable, detalle, hasta 5 pasos del itinerario y las dos salidas. */

beforeEach(reiniciarRouterFalso);

function reserva(pasos: number, pax = 1) {
  const plan = planDePrueba({
    puntoEncuentro: 'Parque Berrío',
    itinerario: Array.from({ length: pasos }, (_, i) => new ItineraryStep({ time: `0${i}:00`, activity: `Paso ${i + 1}` })),
  });
  return new Booking({
    id: 'res-1',
    code: 'DIV-ABC123',
    planDateId: 'fecha-1',
    travelerId: 'v',
    pax,
    totalAmount: 150000 * pax,
    status: BookingStatus.confirmed,
    createdAt: new Date(),
    plan,
    planDate: plan.dates[0],
  });
}

test('título, código seleccionable y detalle del viaje', async () => {
  await renderPantalla(<BookingSuccessView booking={reserva(0)} />);
  expect(screen.getByText('¡Listo, nos vemos ahí!')).toBeOnTheScreen();
  expect(screen.getByText('Tu reserva está confirmada y el cupo es tuyo.')).toBeOnTheScreen();
  expect(screen.getByText('CÓDIGO DE RESERVA')).toBeOnTheScreen();
  expect(screen.getByText('DIV-ABC123').props.selectable).toBe(true);
  expect(screen.getByText('1 persona')).toBeOnTheScreen();
  expect(screen.getByText('Parque Berrío')).toBeOnTheScreen();
  expect(screen.getByText('$ 150.000')).toBeOnTheScreen();
  // Sin itinerario no hay tarjeta de itinerario.
  expect(screen.queryByText('ITINERARIO')).toBeNull();
});

test('itinerario: los primeros 5 pasos y cuántos faltan', async () => {
  await renderPantalla(<BookingSuccessView booking={reserva(7, 2)} />);
  expect(screen.getByText('ITINERARIO')).toBeOnTheScreen();
  expect(screen.getByText('Paso 5')).toBeOnTheScreen();
  expect(screen.queryByText('Paso 6')).toBeNull();
  expect(screen.getByText('+ 2 pasos más en la app')).toBeOnTheScreen();
  expect(screen.getByText('2 personas')).toBeOnTheScreen();
});

test('«Ver mis reservas» y «Seguir explorando» reemplazan la pila (como `go`)', async () => {
  await renderPantalla(<BookingSuccessView booking={reserva(1)} />);
  await fireEvent.press(screen.getByText('Ver mis reservas'));
  expect(routerFalso.replace).toHaveBeenLastCalledWith(AppRoutes.reservas);
  await fireEvent.press(screen.getByText('Seguir explorando'));
  expect(routerFalso.replace).toHaveBeenLastCalledWith(AppRoutes.explorar);
});

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
import { conAlfa, temaClaro } from '@/ui/theme';
import { ocultarAviso } from '@/features/compartido/aviso-flotante';
import { olvidarReservaAdelantada } from '@/features/bookings/paso-entre-pantallas';

import { dependenciasDePrueba, doble } from '../../../support/dependencias-de-prueba';
import { reiniciarRouterFalso, routerFalso } from '../../../support/expo-router-falso';
import { fijarVentana, renderPantalla, restaurarVentana } from '../../../support/pantalla';
import { asentarPantalla } from '../support';

jest.mock('expo-router', () => require('../../../support/expo-router-falso'));

/**
 * «Mis reservas» con salidas reales (relativas a hoy): «Cancelar» solo antes de salir, «Reseñar»
 * solo después, los viajes que ya salieron viven en «Historial» y la lista nunca pasa por encima
 * del título ni de las pestañas. Sin red ni Supabase. Port 1:1 de `bookings_view_test.dart`.
 */

afterEach(() => {
  ocultarAviso();
  olvidarReservaAdelantada();
});

const DIA = 24 * 60 * 60 * 1000;

function reserva(
  codigo: string,
  dias: number,
  { estado = BookingStatus.confirmed, plan = null }: { estado?: BookingStatus; plan?: Plan | null } = {},
) {
  return new Booking({
    id: codigo,
    code: codigo,
    planDateId: 'pd',
    travelerId: 'v',
    pax: 2,
    totalAmount: 190000,
    status: estado,
    createdAt: new Date(Date.now() - 40 * DIA),
    departureAt: new Date(Date.now() + dias * DIA),
    plan,
  });
}

function plan({ fotos = [], conAgencia = true }: { fotos?: string[]; conAgencia?: boolean } = {}) {
  return new Plan({
    id: 'plan-1',
    agencyId: 'ag',
    title: 'Comuna 13 y memoria',
    destination: 'Medellín',
    category: ExperienceCategory.culture,
    priceCop: 95000,
    status: PlanStatus.published,
    photos: fotos,
    agency: conAgencia
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

async function abrir(reservas: Booking[]) {
  await fijarVentana(800, 1400);
  const repo = doble<Public<BookingRepository>>('BookingRepository', { misReservas: async () => reservas });
  await renderPantalla(<BookingsView />, { dependencias: dependenciasDePrueba({ reservas: repo }) });
  await asentarPantalla();
}

const tocar = async (texto: string) => {
  await fireEvent.press(screen.getByText(texto));
  await asentarPantalla();
};

beforeEach(reiniciarRouterFalso);
afterEach(restaurarVentana);

test('una confirmada que ya salió está en «Historial», sin «Cancelar» y con «Reseñar»', async () => {
  await abrir([reserva('PASADA', -5), reserva('FUTURA', 5)]);

  expect(screen.getByText('Próximas (1)')).toBeOnTheScreen();
  expect(screen.getByText('Historial (1)')).toBeOnTheScreen();

  // Próximas: solo la futura, con «Cancelar» y sin «Reseñar».
  expect(screen.getByText('FUTURA')).toBeOnTheScreen();
  expect(screen.queryByText('PASADA')).toBeNull();
  expect(screen.getByText('Cancelar')).toBeOnTheScreen();
  expect(screen.queryByText('Reseñar')).toBeNull();

  await tocar('Historial (1)');

  expect(screen.getByText('PASADA')).toBeOnTheScreen();
  expect(screen.queryByText('FUTURA')).toBeNull();
  expect(screen.queryByText('Cancelar')).toBeNull();
  expect(screen.getByText('Reseñar')).toBeOnTheScreen();
});

test('las pestañas se anuncian como pestañas, con la seleccionada marcada', async () => {
  await abrir([reserva('FUTURA', 5)]);

  const [proximas, historial] = screen.getAllByRole('tab');
  expect(proximas).toBeSelected();
  expect(historial).not.toBeSelected();
});

test('el viaje de mañana no se puede reseñar todavía', async () => {
  await abrir([reserva('MANANA', 1)]);

  expect(screen.queryByText('Reseñar')).toBeNull();
  expect(screen.getByText('Cancelar')).toBeOnTheScreen();
});

test('la lista queda debajo del título y las pestañas (no se desplazan con ella)', async () => {
  await abrir(Array.from({ length: 9 }, (_, i) => reserva(`FUT${i}`, 3 + i)));

  // Flutter mide que la lista no pase por encima: aquí el título y las pestañas están FUERA del
  // área desplazable (la lista ocupa el resto de la pantalla, debajo).
  const lista = screen.getByTestId('lista-reservas');
  expect(within(lista).getByText('FUT0')).toBeOnTheScreen();
  expect(within(lista).queryByText('Mis reservas')).toBeNull();
  expect(within(lista).queryByText('Próximas (9)')).toBeNull();
  expect(screen.getByText('Mis reservas')).toBeOnTheScreen();
});

describe('tarjeta con la foto del plan', () => {
  test('con foto: imagen de cabecera con la fecha y el estado encima, título y agencia', async () => {
    await abrir([reserva('FUT', 5, { plan: plan({ fotos: ['https://fotos.test/a.jpg', 'https://fotos.test/b.jpg'] }) })]);

    expect(screen.getByTestId('foto-reserva')).toBeOnTheScreen();
    expect(screen.queryByTestId('sin-foto-reserva')).toBeNull();
    expect(screen.getByText('Comuna 13 y memoria')).toBeOnTheScreen();
    expect(screen.getByText('EcoAndes Viajes')).toBeOnTheScreen();
    // El código es una etiqueta; personas y total son un pie propio.
    expect(screen.getByText('FUT')).toBeOnTheScreen();
    expect(screen.getByText('2 personas')).toBeOnTheScreen();
    expect(screen.getByText('$ 190.000')).toBeOnTheScreen();

    // La insignia de fecha y la píldora de estado van DENTRO de la cabecera (sobre la foto); el
    // título, debajo (fuera de ella).
    const cabecera = screen.getByTestId('encabezado-reserva');
    expect(within(cabecera).getByTestId('insignia-fecha')).toBeOnTheScreen();
    expect(within(cabecera).getByText('Confirmada')).toBeOnTheScreen();
    expect(within(cabecera).queryByText('Comuna 13 y memoria')).toBeNull();
  });

  test('sin foto: respaldo en su lugar, sin pedir imagen, con fecha, estado y acciones', async () => {
    await abrir([reserva('FUT', 5, { plan: plan({ conAgencia: false }) })]);

    expect(screen.queryByTestId('foto-reserva')).toBeNull();
    expect(screen.getByTestId('sin-foto-reserva')).toBeOnTheScreen();
    expect(screen.getByText('🏘️')).toBeOnTheScreen();
    expect(screen.getByTestId('insignia-fecha')).toBeOnTheScreen();
    expect(screen.getByText('Confirmada')).toBeOnTheScreen();
    expect(screen.getByText('Comuna 13 y memoria')).toBeOnTheScreen();
    expect(screen.queryByText('EcoAndes Viajes')).toBeNull(); // sin agencia no hay línea de agencia
    expect(screen.getByText('Cancelar')).toBeOnTheScreen();
  });

  test('reserva sin plan cargado: título de respaldo y respaldo de foto', async () => {
    await abrir([reserva('FUT', 5)]);

    expect(screen.getByText('Plan')).toBeOnTheScreen();
    expect(screen.getByTestId('sin-foto-reserva')).toBeOnTheScreen();
  });

  test('el historial se ve más apagado que las próximas', async () => {
    await abrir([
      reserva('PASADA', -5, { plan: plan({ fotos: ['https://fotos.test/a.jpg'] }) }),
      reserva('FUTURA', 5, { plan: plan({ fotos: ['https://fotos.test/a.jpg'] }) }),
    ]);
    const colorDe = () => StyleSheet.flatten(screen.getByText('Comuna 13 y memoria').props.style).color;
    expect(colorDe()).toBe(temaClaro.colorScheme.onSurface);

    await tocar('Historial (1)');

    expect(colorDe()).toBe(conAlfa(temaClaro.colorScheme.onSurface, 0.72));
  });
});

describe('etiqueta de estado', () => {
  test('confirmada que ya salió dice «Realizada»; la próxima sigue «Confirmada»', async () => {
    await abrir([reserva('PASADA', -5), reserva('FUTURA', 5)]);

    expect(screen.getByText('Confirmada')).toBeOnTheScreen();
    expect(screen.queryByText('Realizada')).toBeNull();

    await tocar('Historial (1)');

    expect(screen.getByText('Realizada')).toBeOnTheScreen();
    expect(screen.queryByText('Confirmada')).toBeNull();
    // Solo cambia la etiqueta: las reglas siguen igual.
    expect(screen.getByText('Reseñar')).toBeOnTheScreen();
    expect(screen.queryByText('Cancelar')).toBeNull();
  });

  test('PRESERVE: «Cancelada», «Pendiente» y «Completada» no cambian aunque ya salieron', async () => {
    await abrir([
      reserva('CAN', -5, { estado: BookingStatus.cancelled }),
      reserva('PEN', -4, { estado: BookingStatus.pendingPayment }),
      reserva('COM', -3, { estado: BookingStatus.completed }),
    ]);
    await tocar('Historial (3)');

    expect(screen.getByText('Cancelada')).toBeOnTheScreen();
    expect(screen.getByText('Pendiente')).toBeOnTheScreen();
    expect(screen.getByText('Completada')).toBeOnTheScreen();
    expect(screen.queryByText('Realizada')).toBeNull();
  });

  test('PRESERVE: «Pendiente» de un viaje próximo sigue igual', async () => {
    await abrir([reserva('PEN', 4, { estado: BookingStatus.pendingPayment })]);
    expect(screen.getByText('Pendiente')).toBeOnTheScreen();
  });
});

test('PRESERVE: sin reservas muestra el estado vacío', async () => {
  await abrir([]);

  expect(screen.getByText('Aún no tienes reservas')).toBeOnTheScreen();
  expect(
    screen.getByText('Cuando reserves un plan, aquí verás tu código, la fecha y el itinerario.'),
  ).toBeOnTheScreen();
});

test('«Próximas» vacía: estado vacío (ícono, «Sin viajes próximos», «¡Hora de explorar!») con «Explorar planes»', async () => {
  await abrir([reserva('PASADA', -5)]);

  expect(screen.queryByTestId('empty-state-icono', { includeHiddenElements: true })).toBeOnTheScreen();
  expect(screen.queryByText('Sin viajes próximos')).toBeOnTheScreen();
  expect(screen.queryByText('¡Hora de explorar!')).toBeOnTheScreen();

  const explorar = screen.queryByRole('button', { name: 'Explorar planes' });
  expect(explorar).toBeOnTheScreen();
  await fireEvent.press(explorar!);
  // A la pestaña «Explorar» (que ya existe): `navigate`, no se apila otra encima.
  expect(routerFalso.navigate).toHaveBeenCalledWith('/');
});

test('«Historial» vacía: «Todavía no hay historial.»', async () => {
  await abrir([reserva('FUTURA', 5)]);
  await tocar('Historial (0)');
  expect(screen.getByText('Todavía no hay historial.')).toBeOnTheScreen();
});

test('error: «Sin conexión» con «Reintentar», que vuelve a cargar', async () => {
  await fijarVentana(800, 1400);
  let intentos = 0;
  const repo = doble<Public<BookingRepository>>('BookingRepository', {
    misReservas: async () => {
      intentos++;
      if (intentos === 1) throw new Error('sin red');
      return [reserva('FUTURA', 5)];
    },
  });
  await renderPantalla(<BookingsView />, { dependencias: dependenciasDePrueba({ reservas: repo }) });
  await asentarPantalla();

  expect(screen.getByText('Sin conexión')).toBeOnTheScreen();
  expect(screen.getByText('No pudimos cargar tus reservas.')).toBeOnTheScreen();

  await tocar('Reintentar');

  expect(screen.getByText('FUTURA')).toBeOnTheScreen();
});

test('mientras carga muestra el esqueleto de tres tarjetas', async () => {
  await fijarVentana(800, 1400);
  const repo = doble<Public<BookingRepository>>('BookingRepository', {
    misReservas: () => new Promise<Booking[]>(() => {}),
  });
  await renderPantalla(<BookingsView />, { dependencias: dependenciasDePrueba({ reservas: repo }) });

  expect(screen.getAllByTestId('skeleton')).toHaveLength(3);
});

test('pendiente de pago: «Ya pagué, verificar» lleva a verificar el pago de esa reserva', async () => {
  await abrir([reserva('PEN', 4, { estado: BookingStatus.pendingPayment })]);

  expect(screen.getByText('Completar pago')).toBeOnTheScreen();
  await tocar('Ya pagué, verificar');

  expect(routerFalso.replace).toHaveBeenCalledWith('/pago/resultado?reserva=PEN');
});

test('tocar la tarjeta abre el detalle de esa reserva', async () => {
  await abrir([reserva('FUTURA', 5)]);

  await fireEvent.press(screen.getByLabelText('Ver detalle de la reserva FUTURA'));

  expect(routerFalso.push).toHaveBeenCalledWith('/reservas/FUTURA');
});

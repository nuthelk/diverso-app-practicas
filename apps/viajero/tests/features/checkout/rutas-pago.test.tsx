import { act, screen } from 'expo-router/testing-library';

import {
  Booking,
  BookingStatus,
  EstadoPago,
  ItinerarioPaso,
  Payment,
  PaymentMethodOption,
  PaymentStatus,
  PagoVerificado,
  type BookingRepository,
  type CatalogRepository,
  type Publico,
} from '@/core';
import { AppRoutes } from '@/router';

import { arrancarApp, asentar } from '../../support/app';
import { dependenciasDePrueba, doble } from '../../support/dependencias-de-prueba';
import { CatalogoFalso, fechaDePrueba, planDePrueba } from './support/catalogo-falso';
import { PasarelaFalsa } from './support/pasarela-falsa';
import { ReservasFalsas } from './support/reservas-falsas';

/**
 * Pruebas de rutas: lo que sobrevive a una recarga en web es que la URL sola (con ids) reconstruya
 * la pantalla cargando todo del backend. Monta la app real (providers + guard + rutas de
 * `src/app`) con dobles. Sin red ni Supabase. Port 1:1 de `router/rutas_pago_test.dart` (las rutas
 * viejas `/exito` y `/checkout` ya las cubre `tests/app/arranque.test.tsx`).
 */

afterEach(() => jest.useRealTimers());

const plan = () =>
  planDePrueba({
    fechas: [fechaDePrueba()],
    puntoEncuentro: 'Parque Berrío',
    itinerario: [new ItinerarioPaso({ hora: '06:00', actividad: 'Salida desde Medellín' })],
  });

function reserva(estado: BookingStatus): Booking {
  const p = plan();
  return new Booking({
    id: 'res-1',
    codigo: 'DIV-ABC123',
    planDateId: 'fecha-1',
    viajeroId: 'v-1',
    pax: 2,
    montoTotal: 300000,
    estado,
    createdAt: new Date(),
    plan: p,
    planDate: p.dates[0],
    payments: [
      new Payment({
        id: 'p-1',
        bookingId: 'res-1',
        metodo: PaymentMethodOption.tarjeta,
        estado: PaymentStatus.aprobado,
        monto: 300000,
        referencia: 'DIV-ABC123-1',
        provider: 'wompi',
        simulated: false,
      }),
    ],
  });
}

const pago = (estado: EstadoPago, reserva: BookingStatus = BookingStatus.confirmada) =>
  new PagoVerificado({
    estado,
    metodo: PaymentMethodOption.tarjeta,
    referencia: 'DIV-ABC123-1',
    bookingId: 'res-1',
    codigo: 'DIV-ABC123',
    bookingEstado: reserva,
  });

let catalogo: CatalogoFalso;
let reservas: ReservasFalsas;

beforeEach(() => {
  catalogo = new CatalogoFalso({ detalles: { 'plan-1': plan() } });
  reservas = new ReservasFalsas([reserva(BookingStatus.confirmada)]);
});

async function abrir(url: string, pasarela: PasarelaFalsa) {
  return arrancarApp(
    url,
    dependenciasDePrueba({
      catalogo: doble<Publico<CatalogRepository>>('CatalogRepository', catalogo),
      reservas: doble<Publico<BookingRepository>>('BookingRepository', reservas),
      pasarela,
    }),
  );
}

test('/checkout/:planId/:fechaId carga plan y fecha por id (sin extra)', async () => {
  await abrir(AppRoutes.checkout('plan-1', 'fecha-1'), new PasarelaFalsa([pago(EstadoPago.aprobado)]));
  expect(catalogo.detallesPedidos).toEqual(['plan-1']);
  expect(screen.getByText('Guatapé en un día')).toBeOnTheScreen();
  expect(screen.getByText('¿Cuántos viajan?')).toBeOnTheScreen();
  expect(screen.getByText('Total a pagar')).toBeOnTheScreen();
  expect(screen.getAllByText('Pagar con Wompi').length).toBeGreaterThan(0);
  expect(screen.getByText('Modo de prueba — no se cobra dinero real')).toBeOnTheScreen();
});

test('/checkout con una fecha que no existe en el plan avisa en vez de romperse', async () => {
  await abrir(AppRoutes.checkout('plan-1', 'otra-fecha'), new PasarelaFalsa([pago(EstadoPago.aprobado)]));
  expect(screen.getByText(/ya no está disponible/)).toBeOnTheScreen();
  expect(screen.queryByText('Pagar con Wompi')).toBeNull();
});

test('/reserva/:bookingId muestra la confirmación cargada del backend', async () => {
  await abrir(AppRoutes.reserva('res-1'), new PasarelaFalsa([pago(EstadoPago.aprobado)]));
  expect(reservas.consultas).toEqual(['res-1']);
  expect(screen.getByText('DIV-ABC123')).toBeOnTheScreen();
  expect(screen.getByText('Guatapé en un día')).toBeOnTheScreen();
  expect(screen.getByText(/Pagado con Tarjeta · ref\. DIV-ABC123-1 \(prueba\)/)).toBeOnTheScreen();
  expect(screen.getByText('Ver mis reservas')).toBeOnTheScreen();
});

test('/reserva/:bookingId inexistente muestra el error, no una pantalla vacía', async () => {
  await abrir(AppRoutes.reserva('nope'), new PasarelaFalsa([pago(EstadoPago.aprobado)]));
  expect(screen.getByText(/No encontramos esa reserva/)).toBeOnTheScreen();
});

test('/pago/resultado?id=… verifica en el servidor y, si fue aprobado, abre /reserva/:id', async () => {
  const pasarela = new PasarelaFalsa([pago(EstadoPago.aprobado)]);
  const r = await abrir(AppRoutes.pagoDeTransaccion('tx-77'), pasarela);
  await asentar();
  expect(pasarela.verificaciones).toEqual([{ transaccion: 'tx-77', reserva: null }]);
  expect(r.getPathname()).toBe('/reserva/res-1');
  expect(screen.getByText('DIV-ABC123')).toBeOnTheScreen();
});

test('/pago/resultado?reserva=… («Ya pagué, verificar») verifica por reserva', async () => {
  const pasarela = new PasarelaFalsa([pago(EstadoPago.aprobado)]);
  await abrir(AppRoutes.pagoDeReserva('res-1'), pasarela);
  expect(pasarela.verificaciones).toEqual([{ transaccion: null, reserva: 'res-1' }]);
});

test('/pago/resultado rechazado: mensaje y «Intentar de nuevo»', async () => {
  await abrir('/pago/resultado?id=tx-1', new PasarelaFalsa([pago(EstadoPago.rechazado, BookingStatus.pendientePago)]));
  expect(screen.getByText(/Wompi rechazó el pago de prueba/)).toBeOnTheScreen();
  expect(screen.getByText('Intentar de nuevo')).toBeOnTheScreen();
  expect(screen.getByText('Ver mis reservas')).toBeOnTheScreen();
});

test('/pago/resultado pendiente: reintenta unas veces y luego remite a Mis reservas', async () => {
  const pasarela = new PasarelaFalsa([pago(EstadoPago.pendiente, BookingStatus.pendientePago)]);
  await abrir('/pago/resultado?id=tx-1', pasarela);
  for (let i = 0; i < 8; i++) {
    await act(async () => {
      await jest.advanceTimersByTimeAsync(4000);
    });
  }
  expect(pasarela.verificaciones.length).toBeGreaterThan(1);
  expect(pasarela.verificaciones.length).toBeLessThanOrEqual(5);
  expect(screen.getByText(/Te avisaremos en Mis reservas/)).toBeOnTheScreen();
});

test('/pago/resultado sin id ni reserva vuelve a Mis reservas', async () => {
  const r = await abrir(AppRoutes.pagoResultado, new PasarelaFalsa([pago(EstadoPago.aprobado)]));
  expect(r.getPathname()).toBe('/reservas');
});

test('/reserva/:bookingId pendiente de pago manda a verificar el pago de esa reserva', async () => {
  reservas = new ReservasFalsas([reserva(BookingStatus.pendientePago)]);
  const pasarela = new PasarelaFalsa([pago(EstadoPago.pendiente, BookingStatus.pendientePago)]);
  const r = await abrir(AppRoutes.reserva('res-1'), pasarela);
  await asentar();
  expect(r.getPathname()).toBe('/pago/resultado');
  expect(pasarela.verificaciones[0]).toEqual({ transaccion: null, reserva: 'res-1' });
});

test('/reserva/:bookingId cancelada lo dice con su código', async () => {
  reservas = new ReservasFalsas([reserva(BookingStatus.cancelada)]);
  await abrir(AppRoutes.reserva('res-1'), new PasarelaFalsa());
  expect(screen.getByText('Reserva cancelada')).toBeOnTheScreen();
  expect(screen.getByText(/La reserva DIV-ABC123 está cancelada\./)).toBeOnTheScreen();
});

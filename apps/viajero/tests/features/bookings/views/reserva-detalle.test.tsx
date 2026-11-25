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
import { ocultarAviso } from '@/features/compartido/aviso-flotante';
import { olvidarReservaAdelantada } from '@/features/bookings/paso-entre-pantallas';

import { arrancarApp, asentar } from '../../../support/app';
import { dependenciasDePrueba, doble } from '../../../support/dependencias-de-prueba';
import { compuerta } from '../../../support/compuerta';
import { PublicadorDeResenasFalso, ReservasFalsas } from '../../../support/reservas-falsas';
import { textoCrudo } from '../../../support/texto-crudo';

/**
 * Tarjeta de «Mis reservas» tocable + pantalla «Detalle de la reserva» (`/reservas/:bookingId`).
 * Con el router real para fijar también el registro de la ruta. Sin red ni Supabase. Port 1:1 de
 * `reserva_detalle_test.dart`.
 */

afterEach(() => {
  ocultarAviso();
  olvidarReservaAdelantada();
});

function enDias(dias: number, hora = 6) {
  const hoy = new Date();
  return new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + dias, hora);
}

function plan({
  titulo = 'Street food tour',
  puntoEncuentro = 'Estación San Javier',
  agencia = 'EcoAndes Viajes',
}: { titulo?: string; puntoEncuentro?: string; agencia?: string } = {}) {
  return new Plan({
    id: 'plan-1',
    agencyId: 'ag',
    title: titulo,
    destination: 'Medellín',
    category: ExperienceCategory.gastronomy,
    priceCop: 95000,
    status: PlanStatus.published,
    meetingPoint: puntoEncuentro,
    cancellationPolicy: 'Reembolso total hasta 48 horas antes.',
    itinerary: [
      new ItineraryStep({ time: '06:00', activity: 'Salida desde el metro' }),
      new ItineraryStep({ time: '09:30', activity: 'Desayuno típico' }),
    ],
    agency: new Agency({
      id: 'ag',
      name: agencia,
      rntNumber: '12345',
      commercialRegistration: '999',
      verificationStatus: VerificationStatus.verified,
    }),
  });
}

function reserva({
  id = 'res-1',
  codigo = 'DIV-CC70944A',
  pax = 2,
  salida,
  estado = BookingStatus.confirmed,
  conPlan = plan(),
  conPago = true,
}: {
  id?: string;
  codigo?: string;
  pax?: number;
  salida?: Date;
  estado?: BookingStatus;
  conPlan?: Plan;
  conPago?: boolean;
} = {}) {
  return new Booking({
    id,
    code: codigo,
    planDateId: 'pd',
    travelerId: 'v',
    pax,
    totalAmount: 190000,
    status: estado,
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    departureAt: salida ?? enDias(3),
    plan: conPlan,
    payments: conPago
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

function repo(lista: Booking[]) {
  const consultas: string[] = [];
  const r = doble<Public<BookingRepository>>('BookingRepository', {
    misReservas: async () => lista,
    reserva: async (id: string) => {
      consultas.push(id);
      const b = lista.find((x) => x.id === id);
      if (!b) throw new DiversoError('RESERVA_NO_EXISTE');
      return b;
    },
    vistaPreviaCancelacion: async () =>
      new CancellationPreview({ applies: true, percentage: 100, amount: 190000, hoursBefore: 72, reason: '' }),
  });
  return { repo: r, consultas };
}

async function abrir(url: string, lista: Booking[]) {
  const { repo: reservas, consultas } = repo(lista);
  const r = await arrancarApp(url, dependenciasDePrueba({ reservas }));
  return { r, consultas };
}

async function tocar(texto: string) {
  await fireEvent.press(screen.getByText(texto));
  await asentar();
}

describe('tarjeta de «Mis reservas»', () => {
  test('tocarla abre el detalle con código, punto de encuentro, itinerario y «Ver plan»', async () => {
    const { r } = await abrir('/reservas', [reserva()]);

    await tocar('Street food tour');

    expect(r.getPathname()).toBe('/reservas/res-1');
    expect(screen.getByText('DIV-CC70944A')).toBeOnTheScreen();
    expect(screen.getByText('Estación San Javier')).toBeOnTheScreen();
    expect(screen.getByText('Salida desde el metro')).toBeOnTheScreen();
    expect(screen.getByText('Ver plan')).toBeOnTheScreen();
  });

  test('«Cancelar» de la tarjeta no navega: abre su propio diálogo', async () => {
    const { r } = await abrir('/reservas', [reserva()]);

    await tocar('Cancelar');

    expect(r.getPathname()).toBe('/reservas');
    expect(screen.getByText('¿Cancelar reserva?')).toBeOnTheScreen();
  });

  test('la tarjeta se anuncia como botón con la reserva', async () => {
    await abrir('/reservas', [reserva()]);

    const tarjeta = screen.getByLabelText('Ver detalle de la reserva DIV-CC70944A');
    expect(tarjeta).toHaveProp('accessibilityRole', 'button');
  });

  test('jerarquía: código en la cabecera, hora, punto de encuentro, personas y precio; sin referencia de pago', async () => {
    await abrir('/reservas', [reserva({ salida: enDias(3, 6) })]);

    expect(within(screen.getByTestId('encabezado-reserva')).getByText('DIV-CC70944A')).toBeOnTheScreen();
    expect(screen.getByText(/06:00/)).toBeOnTheScreen();
    expect(screen.getByText('Estación San Javier')).toBeOnTheScreen();
    expect(screen.getByText('2 personas')).toBeOnTheScreen();
    expect(screen.getByText('$ 190.000')).toBeOnTheScreen();
    // La línea suelta «código · pax · precio» y la referencia del pago ya no están en la tarjeta.
    expect(screen.queryByText(/pax/)).toBeNull();
    expect(screen.queryByText(/ref\./)).toBeNull();
  });

  test('una sola persona va en singular', async () => {
    await abrir('/reservas', [reserva({ pax: 1 })]);
    expect(screen.getByText('1 persona')).toBeOnTheScreen();
  });

  test.each([
    [3, 'en 3 días'],
    [1, 'Mañana'],
  ])('cuenta regresiva: a %i días dice «%s»', async (dias, texto) => {
    await abrir('/reservas', [reserva({ salida: enDias(dias) })]);
    expect(screen.getByText(texto)).toBeOnTheScreen();
  });

  test('cuenta regresiva: «Hoy»', async () => {
    await abrir('/reservas', [reserva({ salida: new Date(Date.now() + 5 * 60 * 1000) })]);
    expect(screen.getByText('Hoy')).toBeOnTheScreen();
  });

  test('el historial no muestra cuenta regresiva ni «Cancelar»', async () => {
    await abrir('/reservas', [reserva({ salida: enDias(-5) })]);
    await tocar('Historial (1)');

    expect(screen.queryByText(/en 5 días/)).toBeNull();
    expect(screen.queryByText('Hoy')).toBeNull();
    expect(screen.queryByText('Cancelar')).toBeNull();
  });

  test('a 320 px con textos largos: el título se corta en 2 líneas y lo demás se parte, no desborda', async () => {
    // Sin motor de layout en jest no se mide el desborde (Flutter usa textScaleFactor 1.6): se
    // fija lo que lo evita (líneas máximas y filas que se parten).
    const largo = plan({
      titulo: 'Recorrido gastronómico por las plazas de mercado más tradicionales del Valle de Aburrá',
      puntoEncuentro: 'Estación San Javier, salida norte, junto a la tienda de la esquina',
      agencia: 'Agencia de viajes con un nombre larguísimo S.A.S.',
    });
    await abrir('/reservas', [
      reserva({ id: 'a', conPlan: largo }),
      reserva({ id: 'b', codigo: 'DIV-PEND', conPlan: largo, estado: BookingStatus.pendingPayment, conPago: false }),
    ]);

    for (const titulo of screen.getAllByText(largo.title)) expect(titulo).toHaveProp('numberOfLines', 2);
    for (const agencia of screen.getAllByText(largo.agency!.name)) expect(agencia).toHaveProp('numberOfLines', 1);
    for (const lugar of screen.getAllByText(largo.meetingPoint)) expect(lugar.props.numberOfLines).toBeUndefined();
  });
});

describe('detalle de la reserva', () => {
  test('muestra estado, fecha y hora, lugar, personas y total, pago, agencia, itinerario y política', async () => {
    await abrir('/reservas/res-1', [reserva({ salida: enDias(3, 6) })]);

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
    const cancelada = reserva({ estado: BookingStatus.cancelled });
    const conReembolso = new Booking({
      ...cancelada,
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
    await abrir('/reservas/res-1', [conReembolso]);

    expect(textoCrudo(screen.getByText(/Reembolso de prueba pendiente/))).toBe(
      'Reembolso de prueba pendiente · 100\u00A0% · $\u00A0399.000',
    );
    expect(textoCrudo(screen.getByText(/2 personas/))).toBe('2 personas · $\u00A0190.000');
  });

  test('itinerario: la línea de tiempo termina en el último paso (2 pasos, 1 tramo)', async () => {
    await abrir('/reservas/res-1', [reserva()]);

    expect(screen.getAllByTestId('linea-itinerario')).toHaveLength(1);
  });

  test('carga en frío por id (sin extra) con BookingRepository.reserva', async () => {
    const { consultas } = await abrir('/reservas/res-1', [reserva()]);

    expect(consultas).toEqual(['res-1']);
    expect(screen.getByText('DIV-CC70944A')).toBeOnTheScreen();
    expect(screen.getByText('Estación San Javier')).toBeOnTheScreen();
  });

  test('con la reserva en extra no vuelve a pedirla', async () => {
    const { consultas } = await abrir('/reservas', [reserva()]);
    await tocar('Street food tour');

    expect(consultas).toEqual([]);
    expect(screen.getByText('Ver plan')).toBeOnTheScreen();
  });

  test('una reserva inexistente muestra el error con «Reintentar»', async () => {
    await abrir('/reservas/nope', [reserva()]);

    expect(screen.getByText('No pudimos cargar la reserva')).toBeOnTheScreen();
    expect(screen.getByText('Reintentar')).toBeOnTheScreen();
    expect(screen.queryByText('Ver plan')).toBeNull();
    // El marco del error tiene «Volver»: abierta en frío lleva a «Mis reservas».
    await fireEvent.press(screen.getByLabelText('Volver'));
    await asentar();
    expect(screen.getByText('Mis reservas')).toBeOnTheScreen();
  });

  test('«Ver plan» abre el plan', async () => {
    const { r } = await abrir('/reservas/res-1', [reserva()]);

    await tocar('Ver plan');

    expect(r.getPathname()).toBe('/plan/plan-1');
  });

  test('«Cancelar» abre la confirmación con la política', async () => {
    const { r } = await abrir('/reservas/res-1', [reserva()]);

    await tocar('Cancelar');

    expect(screen.getByText('¿Cancelar reserva?')).toBeOnTheScreen();
    expect(r.getPathname()).toBe('/reservas/res-1');
  });

  test('una reserva que ya salió no se puede cancelar; sí reseñar', async () => {
    await abrir('/reservas/res-1', [reserva({ salida: enDias(-5) })]);

    expect(screen.getByText('Realizada')).toBeOnTheScreen();
    expect(screen.queryByText('Cancelar')).toBeNull();
    expect(screen.getByText('Reseñar')).toBeOnTheScreen();
  });

  test('pendiente de pago ofrece completar el pago y verificar', async () => {
    await abrir('/reservas/res-1', [reserva({ estado: BookingStatus.pendingPayment, conPago: false })]);

    expect(screen.getByText('Pendiente')).toBeOnTheScreen();
    expect(screen.getByText('Completar pago')).toBeOnTheScreen();
    expect(screen.getByText('Ya pagué, verificar')).toBeOnTheScreen();
  });

  test('«Ya pagué, verificar» lleva al resultado del pago de esa reserva', async () => {
    const { r } = await abrir('/reservas/res-1', [reserva({ estado: BookingStatus.pendingPayment, conPago: false })]);

    await tocar('Ya pagué, verificar');

    expect(r.getPathnameWithParams()).toBe('/pago/resultado?reserva=res-1');
  });

  test('reseñar desde el detalle y publicar: vuelve con «Ya dejaste tu reseña»', async () => {
    const lista = [reserva({ salida: enDias(-5) })];
    const { repo: reservas } = repo(lista);
    const resenas = new PublicadorDeResenasFalso();
    const r = await arrancarApp('/reservas', dependenciasDePrueba({ reservas, resenas }));
    await tocar('Historial (1)');
    await tocar('Street food tour');

    await tocar('Reseñar');
    expect(r.getPathname()).toBe('/resena/res-1');
    await tocar('Publicar reseña');

    expect(resenas.creadas).toEqual([{ bookingId: 'res-1', calificacion: 5, comentario: '' }]);
    expect(r.getPathname()).toBe('/reservas/res-1');
    expect(screen.getByText('Ya dejaste tu reseña')).toBeOnTheScreen();
    expect(screen.queryByText('Reseñar')).toBeNull();
  });

  // Volver de «Tu reseña» sin publicar no cambia nada: recargar devolvía la lista al principio
  // (en Flutter se recargaba siempre; esto es una mejora deliberada).
  test('volver de «Tu reseña» sin publicar no recarga «Mis reservas» (conserva el desplazamiento)', async () => {
    const reservas = new ReservasFalsas([reserva({ salida: enDias(-5) })]);
    const r = await arrancarApp('/reservas', dependenciasDePrueba({ reservas, resenas: new PublicadorDeResenasFalso() }));
    await tocar('Historial (1)');
    expect(reservas.consultasLista).toBe(1);

    await tocar('Reseñar');
    expect(r.getPathname()).toBe('/resena/res-1');
    await fireEvent.press(screen.getByRole('button', { name: 'Volver' }));
    await asentar();

    expect(r.getPathname()).toBe('/reservas');
    expect(reservas.consultasLista).toBe(1);
    expect(screen.getByText('Reseñar')).toBeOnTheScreen();
  });

  test('publicar la reseña recarga «Mis reservas» sin desmontar la lista (sin volver al esqueleto)', async () => {
    const reservas = new ReservasFalsas([reserva({ salida: enDias(-5) })]);
    const resenas = new PublicadorDeResenasFalso();
    const r = await arrancarApp('/reservas', dependenciasDePrueba({ reservas, resenas }));
    await tocar('Historial (1)');
    await tocar('Reseñar');

    // La recarga queda colgada: así se ve qué muestra la lista MIENTRAS recarga.
    reservas.compuerta = compuerta();
    await tocar('Publicar reseña');

    expect(r.getPathname()).toBe('/reservas');
    expect(reservas.consultasLista).toBe(2);
    expect(screen.queryAllByTestId('skeleton')).toHaveLength(0);
    expect(screen.getByTestId('lista-reservas')).toBeOnTheScreen();
    expect(screen.getByText('Street food tour')).toBeOnTheScreen();

    reservas.lista = [new Booking({ ...reservas.lista[0]!, hasReview: true })];
    await act(async () => reservas.compuerta!.completar());
    await asentar();

    expect(screen.queryByText('Reseñar')).toBeNull();
  });

  test('el botón atrás de Android vuelve como «Volver» (y abierto en frío lleva a «Mis reservas»)', async () => {
    type Escucha = Parameters<typeof BackHandler.addEventListener>[1];
    const escuchas: Escucha[] = [];
    const espia = jest.spyOn(BackHandler, 'addEventListener').mockImplementation((_evento, escucha) => {
      escuchas.push(escucha);
      return { remove: () => escuchas.splice(escuchas.indexOf(escucha), 1) };
    });
    try {
      const { r } = await abrir('/reservas/res-1', [reserva()]);
      expect(escuchas.length).toBeGreaterThan(0);

      let consumido: unknown = false;
      await act(async () => {
        consumido = (escuchas[escuchas.length - 1] as (...args: unknown[]) => unknown)({});
      });
      await asentar();

      expect(consumido).toBe(true);
      expect(r.getPathname()).toBe('/reservas');
    } finally {
      espia.mockRestore();
    }
  });

  test('a 320 px con textos largos: el título y la agencia se parten en varias líneas', async () => {
    const largo = plan({
      titulo: 'Recorrido gastronómico por las plazas de mercado más tradicionales del Valle de Aburrá',
      puntoEncuentro: 'Estación San Javier, salida norte, junto a la tienda de la esquina',
      agencia: 'Agencia de viajes con un nombre larguísimo S.A.S.',
    });
    await abrir('/reservas/res-1', [reserva({ conPlan: largo })]);

    const enContenido = screen.getAllByText(largo.title).filter((t) => t.props.testID !== 'cabecera-titulo');
    expect(enContenido).toHaveLength(1);
    expect(enContenido[0]!.props.numberOfLines).toBeUndefined();
    expect(screen.getByText(largo.agency!.name).props.numberOfLines).toBeUndefined();
  });
});

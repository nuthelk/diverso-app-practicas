import { act, fireEvent, renderHook, screen } from '@testing-library/react-native';

import { DiversoError, type BookingRepository, type CatalogRepository, type Publico } from '@/core';
import { PagoAbierto } from '@/features/checkout/pago-abierto';
import { textoReservaPendiente } from '@/features/checkout/components/ReservaPendienteAviso';
import { useCheckoutViewModel } from '@/features/checkout/view-models/useCheckoutViewModel';
import { CheckoutView } from '@/features/checkout/views/CheckoutView';

import { dependenciasDePrueba, doble } from '../../support/dependencias-de-prueba';
import { reiniciarRouterFalso } from '../../support/expo-router-falso';
import { fijarVentana, renderPantalla, restaurarVentana } from '../../support/pantalla';
import { textoCrudo } from '../../support/texto-crudo';
import { CatalogoFalso, fechaDePrueba, planDePrueba } from './support/catalogo-falso';
import { PasarelaFalsa } from './support/pasarela-falsa';
import { pendienteDePrueba, ReservasFalsas } from './support/reservas-falsas';

jest.mock('expo-router', () => require('../../support/expo-router-falso'));

/**
 * Reserva pendiente de pago ya existente: el checkout no debe crear otra (retendría cupos dos
 * veces durante 30 min), sino ofrecer completarla o cancelarla. Sin red ni Supabase. Port 1:1 de
 * `checkout_pendiente_test.dart`.
 */

const fecha = fechaDePrueba();

const hora = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

describe('useCheckoutViewModel', () => {
  let reservas: ReservasFalsas;
  let abiertos: string[];
  const abrir = (terminado: boolean) => async (id: string) => {
    abiertos.push(id);
    return terminado ? PagoAbierto.completado : PagoAbierto.cerrado;
  };

  beforeEach(() => {
    reservas = new ReservasFalsas();
    reservas.pendiente = pendienteDePrueba();
    abiertos = [];
  });

  async function crear() {
    const { result } = await renderHook(() => useCheckoutViewModel({ reservas }, { vibrar: () => {} }));
    return result;
  }

  test('al abrir busca la reserva pendiente de esa fecha y la expone', async () => {
    const c = await crear();
    await act(() => c.current.cargarPendiente(fecha));
    expect(c.current.pendiente?.id).toBe('pend-1');
    expect(reservas.creadas).toEqual([]);
  });

  test('sin reserva pendiente no hay aviso', async () => {
    reservas.pendiente = null;
    const c = await crear();
    await act(() => c.current.cargarPendiente(fecha));
    expect(c.current.pendiente).toBeNull();
  });

  test('si la búsqueda falla, el checkout sigue usable (la guarda real está en pagar)', async () => {
    reservas.falloAlBuscarPendiente = new DiversoError('ERROR_BD');
    const c = await crear();
    await act(() => c.current.cargarPendiente(fecha));
    expect(c.current.pendiente).toBeNull();
    expect(c.current.error).toBeNull();
  });

  test('pagar con una pendiente existente NO crea otra reserva ni abre el pago', async () => {
    const c = await crear();
    await act(() => c.current.pagar(fecha, abrir(true)));
    expect(reservas.creadas).toEqual([]);
    expect(abiertos).toEqual([]);
    // Se muestra el aviso aunque la carga inicial no haya terminado.
    expect(c.current.pendiente?.id).toBe('pend-1');
    expect(c.current.procesando).toBe(false);
  });

  test('RESERVA_PENDIENTE_EXISTENTE del servidor (otra pestaña) muestra el aviso de la pendiente, no un error', async () => {
    reservas.pendiente = null;
    reservas.falloAlCrear = new DiversoError('RESERVA_PENDIENTE_EXISTENTE');
    reservas.pendienteTrasFalla = pendienteDePrueba();
    const c = await crear();
    await act(() => c.current.pagar(fecha, abrir(true)));
    expect(c.current.pendiente?.id).toBe('pend-1');
    expect(c.current.error).toBeNull();
    expect(c.current.bookingId).toBeNull();
    expect(abiertos).toEqual([]);
    expect(c.current.procesando).toBe(false);
  });

  test('RESERVA_PENDIENTE_EXISTENTE sin poder recuperar la pendiente: mensaje claro, sin abrir el pago', async () => {
    reservas.pendiente = null;
    reservas.falloAlCrear = new DiversoError('RESERVA_PENDIENTE_EXISTENTE');
    reservas.pendienteTrasFalla = null;
    const c = await crear();
    await act(() => c.current.pagar(fecha, abrir(true)));
    expect(c.current.pendiente).toBeNull();
    expect(c.current.error).toContain('reserva pendiente');
    expect(abiertos).toEqual([]);
  });

  test('PRESERVE: cualquier otro error al crear la reserva se sigue mostrando como error', async () => {
    reservas.pendiente = null;
    reservas.falloAlCrear = new DiversoError('SIN_CUPO');
    const c = await crear();
    await act(() => c.current.pagar(fecha, abrir(true)));
    expect(c.current.pendiente).toBeNull();
    expect(c.current.error).toBe(new DiversoError('SIN_CUPO').mensajeUsuario);
    expect(abiertos).toEqual([]);
  });

  test('pagar dos veces reutiliza la misma reserva (solo se crea una)', async () => {
    reservas.pendiente = null;
    const c = await crear();
    await act(() => c.current.pagar(fecha, abrir(false)));
    await act(() => c.current.pagar(fecha, abrir(false)));
    expect(reservas.creadas).toEqual([{ planDateId: 'fecha-1', pax: 1 }]);
    expect(abiertos).toEqual(['nueva-1', 'nueva-1']);
  });

  test('un segundo pagar mientras el primero sigue en curso se ignora', async () => {
    reservas.pendiente = null;
    const c = await crear();
    await act(async () => {
      const primero = c.current.pagar(fecha, abrir(true));
      await c.current.pagar(fecha, abrir(true));
      await primero;
    });
    expect(reservas.creadas).toHaveLength(1);
    expect(abiertos).toHaveLength(1);
  });

  test('completarPendiente reutiliza esa reserva: mismo id y personas, sin crear otra', async () => {
    const c = await crear();
    await act(() => c.current.cargarPendiente(fecha));
    await act(() => c.current.completarPendiente(abrir(true)));
    expect(abiertos).toEqual(['pend-1']);
    expect(reservas.creadas).toEqual([]);
    expect(c.current.pendiente).toBeNull();
    expect(c.current.bookingId).toBe('pend-1');
    expect(c.current.pax).toBe(2);
    await act(() => c.current.setPax(5));
    // Con la reserva ya creada no se cambian las personas.
    expect(c.current.pax).toBe(2);
  });

  test('completarPendiente: si el pago se cierra sin terminar, avisa y se puede reintentar', async () => {
    const c = await crear();
    await act(() => c.current.cargarPendiente(fecha));
    await act(() => c.current.completarPendiente(abrir(false)));
    expect(c.current.error).toContain('Cerraste el pago');
    await act(() => c.current.pagar(fecha, abrir(false)));
    expect(abiertos).toEqual(['pend-1', 'pend-1']);
    expect(reservas.creadas).toEqual([]);
  });

  test('cancelarPendiente cancela por reservas-cancelar y deja seguir como una compra nueva', async () => {
    const c = await crear();
    await act(() => c.current.cargarPendiente(fecha));
    await act(() => c.current.cancelarPendiente());
    expect(reservas.canceladas).toEqual(['pend-1']);
    expect(c.current.pendiente).toBeNull();
    expect(c.current.error).toBeNull();

    await act(() => c.current.setPax(3));
    await act(() => c.current.pagar(fecha, abrir(true)));
    expect(reservas.creadas).toEqual([{ planDateId: 'fecha-1', pax: 3 }]);
    expect(abiertos).toEqual(['nueva-1']);
  });

  test('cancelarPendiente que falla deja el mensaje y mantiene el aviso', async () => {
    reservas.falloAlCancelar = new DiversoError('ESTADO_INVALIDO');
    const c = await crear();
    await act(() => c.current.cargarPendiente(fecha));
    await act(() => c.current.cancelarPendiente());
    expect(c.current.error).toBe('La reserva ya no admite esta operación.');
    expect(c.current.pendiente?.id).toBe('pend-1');
    expect(c.current.procesando).toBe(false);
  });
});

describe('aviso de reserva pendiente', () => {
  test('la retención dura 30 minutos desde la creación', () => {
    const b = pendienteDePrueba({ haceMin: 5 });
    expect(b.venceAt.getTime()).toBe(b.createdAt.getTime() + 30 * 60_000);
  });

  test('texto: personas, total y hora de vencimiento', () => {
    const b = pendienteDePrueba({ pax: 2 });
    expect(textoReservaPendiente(b)).toBe(
      `Ya tienes una reserva pendiente de pago para esta fecha (2 personas, $ 300.000). Vence a las ${hora(b.venceAt)}.`,
    );
    expect(textoReservaPendiente(pendienteDePrueba({ pax: 1 }))).toContain('(1 persona, $ 150.000)');
  });
});

describe('pantalla /checkout/:planId/:fechaId', () => {
  beforeEach(reiniciarRouterFalso);
  afterEach(restaurarVentana);

  /** `iniciar` falla a propósito (RESERVA_VENCIDA): así «Completar pago» no abre el WebView. */
  async function abrirCheckout(reservas: ReservasFalsas, pasarela = new PasarelaFalsa()) {
    pasarela.falloAlIniciar = new DiversoError('RESERVA_VENCIDA');
    await fijarVentana(900, 2600);
    const catalogo = new CatalogoFalso({ detalles: { 'plan-1': planDePrueba({ fechas: [fecha] }) } });
    await renderPantalla(<CheckoutView planId="plan-1" fechaId="fecha-1" />, {
      dependencias: dependenciasDePrueba({
        catalogo: doble<Publico<CatalogRepository>>('CatalogRepository', catalogo),
        reservas: doble<Publico<BookingRepository>>('BookingRepository', reservas),
        pasarela,
      }),
    });
    await screen.findByText('¿Cuántos viajan?');
    return pasarela;
  }

  // El botón inferior es el único «Pagar con Wompi» que es un botón (la tarjeta repite el texto).
  const botonPagar = () => screen.getByRole('button', { name: 'Pagar con Wompi' });

  test('con una pendiente muestra el aviso, las dos acciones y bloquea «Pagar»', async () => {
    const reservas = new ReservasFalsas();
    reservas.pendiente = pendienteDePrueba();
    await abrirCheckout(reservas);
    await screen.findByText(/Ya tienes una reserva pendiente/);

    expect(
      screen.getByText(/Ya tienes una reserva pendiente de pago para esta fecha \(2 personas, \$ 300\.000\)/),
    ).toBeOnTheScreen();
    expect(screen.getByText(new RegExp(`Vence a las ${hora(pendienteDePrueba().venceAt)}\\.`))).toBeOnTheScreen();
    // El aviso es texto corrido: si se parte, el «$» no queda solo al final de una línea.
    expect(textoCrudo(screen.getByText(/Ya tienes una reserva pendiente/))).toContain('2 personas, $\u00A0300.000');
    expect(screen.getByText('Completar pago')).toBeOnTheScreen();
    expect(screen.getByText('Cancelar y empezar de nuevo')).toBeOnTheScreen();
    expect(botonPagar()).toBeDisabled();
    expect(reservas.creadas).toEqual([]);
  });

  test('«Completar pago» pide el checkout de ESA reserva, sin crear otra', async () => {
    const reservas = new ReservasFalsas();
    reservas.pendiente = pendienteDePrueba();
    const pasarela = await abrirCheckout(reservas);
    await screen.findByText('Completar pago');

    await fireEvent.press(screen.getByText('Completar pago'));

    expect(pasarela.iniciadas.map((i) => i.bookingId)).toEqual(['pend-1']);
    expect(reservas.creadas).toEqual([]);
    // El error de pagos-iniciar se muestra.
    expect(await screen.findByText(/venció/)).toBeOnTheScreen();
  });

  test('«Cancelar y empezar de nuevo» cancela, quita el aviso y habilita «Pagar»', async () => {
    const reservas = new ReservasFalsas();
    reservas.pendiente = pendienteDePrueba();
    await abrirCheckout(reservas);
    await screen.findByText('Cancelar y empezar de nuevo');

    await fireEvent.press(screen.getByText('Cancelar y empezar de nuevo'));

    expect(reservas.canceladas).toEqual(['pend-1']);
    expect(screen.queryByText(/Ya tienes una reserva pendiente/)).toBeNull();
    expect(botonPagar()).toBeEnabled();
  });

  test('sin reserva pendiente no hay aviso y «Pagar» está habilitado', async () => {
    await abrirCheckout(new ReservasFalsas());
    expect(screen.queryByText(/Ya tienes una reserva pendiente/)).toBeNull();
    expect(botonPagar()).toBeEnabled();
  });
});

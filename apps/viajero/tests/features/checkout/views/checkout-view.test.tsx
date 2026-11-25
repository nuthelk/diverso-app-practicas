import { act, fireEvent, screen, within } from '@testing-library/react-native';
import { Platform } from 'react-native';

import { DiversoError, diversoConfig, type BookingRepository, type CatalogRepository, type Public } from '@/core';
import { CheckoutView } from '@/features/checkout/views/CheckoutView';
import { AppRoutes } from '@/router';

import { dependenciasDePrueba, doble } from '../../../support/dependencias-de-prueba';
import { reiniciarRouterFalso, routerFalso } from '../../../support/expo-router-falso';
import { renderPantalla } from '../../../support/pantalla';
import { CatalogoFalso, fechaDePrueba, planDePrueba } from '../support/catalogo-falso';
import { PasarelaFalsa } from '../support/pasarela-falsa';
import { ReservasFalsas } from '../support/reservas-falsas';

jest.mock('expo-router', () => require('../../../support/expo-router-falso'));

/** WebView falso: guarda las props para simular lo que haría Wompi dentro del WebView. */
let webview: Record<string, any> | null = null;
jest.mock('react-native-webview', () => ({
  WebView: (props: Record<string, unknown>) => {
    webview = props;
    return null;
  },
}));

/**
 * Pantalla del checkout de punta a punta con dobles: estados de carga, personas, pago en el
 * WebView (Android/iOS) y en la misma pestaña (web), y «Ya pagué, verificar». Complementa los
 * tests portados de Flutter (que nunca abren el WebView).
 */

beforeEach(() => {
  reiniciarRouterFalso();
  webview = null;
});

async function abrir({
  catalogo = new CatalogoFalso({ detalles: { 'plan-1': planDePrueba() } }),
  reservas = new ReservasFalsas(),
  pasarela = new PasarelaFalsa(),
  fechaId = 'fecha-1',
}: { catalogo?: CatalogoFalso; reservas?: ReservasFalsas; pasarela?: PasarelaFalsa; fechaId?: string } = {}) {
  await renderPantalla(<CheckoutView planId="plan-1" fechaId={fechaId} />, {
    dependencias: dependenciasDePrueba({
      catalogo: doble<Public<CatalogRepository>>('CatalogRepository', catalogo),
      reservas: doble<Public<BookingRepository>>('BookingRepository', reservas),
      pasarela,
    }),
  });
  return { catalogo, reservas, pasarela };
}

const pagar = () => fireEvent.press(screen.getByRole('button', { name: 'Pagar con Wompi' }));

describe('carga del plan', () => {
  test('si falla: «No pudimos cargar el plan» y «Reintentar» vuelve a pedirlo', async () => {
    const catalogo = new CatalogoFalso({ detalles: { 'plan-1': planDePrueba() } });
    catalogo.fallo = new Error('sin red');
    await abrir({ catalogo });
    expect(await screen.findByText('No pudimos cargar el plan')).toBeOnTheScreen();
    expect(screen.getByText('Confirmar y pagar')).toBeOnTheScreen();

    catalogo.fallo = null;
    await fireEvent.press(screen.getByText('Reintentar'));
    expect(await screen.findByText('¿Cuántos viajan?')).toBeOnTheScreen();
    expect(catalogo.detallesPedidos).toEqual(['plan-1', 'plan-1']);
  });

  test('fecha que ya salió: «Fecha no disponible» y «Ver fechas del plan» va a la ficha', async () => {
    const catalogo = new CatalogoFalso({
      detalles: { 'plan-1': planDePrueba({ fechas: [fechaDePrueba('fecha-1', { dias: -1 })] }) },
    });
    await abrir({ catalogo });
    expect(await screen.findByText('Fecha no disponible')).toBeOnTheScreen();
    await fireEvent.press(screen.getByText('Ver fechas del plan'));
    expect(routerFalso.replace).toHaveBeenCalledWith(AppRoutes.plan('plan-1'));
  });
});

describe('formulario', () => {
  test('resumen, personas con sus límites y total en la barra', async () => {
    const catalogo = new CatalogoFalso({ detalles: { 'plan-1': planDePrueba({ fechas: [fechaDePrueba('fecha-1', { cupos: 2 })] }) } });
    await abrir({ catalogo });
    await screen.findByText('¿Cuántos viajan?');
    expect(screen.getByText('2 cupos disponibles para esta fecha')).toBeOnTheScreen();
    expect(screen.getByText('total por 1 persona')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Quitar una persona' })).toBeDisabled();

    await fireEvent.press(screen.getByRole('button', { name: 'Agregar una persona' }));
    expect(screen.getByText('total por 2 personas')).toBeOnTheScreen();
    // Sin más cupos no se puede sumar otra persona.
    expect(screen.getByRole('button', { name: 'Agregar una persona' })).toBeDisabled();
    expect(within(screen.getByTestId('barra-pagar')).getByText('$ 300.000')).toBeOnTheScreen();
  });

  test('la barra de pagar va DEBAJO del scroll, no encima del contenido', async () => {
    await abrir();
    await screen.findByText('¿Cuántos viajan?');
    const scroll = screen.getByTestId('checkout-scroll');
    expect(within(scroll).queryByTestId('barra-pagar')).toBeNull();
    expect(screen.getByTestId('barra-pagar')).toBeOnTheScreen();
  });

  test('los datos de prueba de Wompi se despliegan al tocar «Modo de prueba»', async () => {
    await abrir();
    await screen.findByText('¿Cuántos viajan?');
    expect(screen.queryByText(/4242 4242 4242 4242/)).toBeNull();
    await fireEvent.press(screen.getByText('Modo de prueba — no se cobra dinero real'));
    expect(screen.getByText(/• Tarjeta: 4242 4242 4242 4242 → aprobada/)).toBeOnTheScreen();
    expect(screen.getByText(/• Bancolombia: el estado final se elige/)).toBeOnTheScreen();
  });
});

describe('pago en Android/iOS (WebView)', () => {
  function pasarelaConCheckout() {
    const pasarela = new PasarelaFalsa();
    pasarela.checkoutUrl = 'https://checkout.wompi.co/p/?public-key=pub_test_x&reference=DIV-1';
    return pasarela;
  }

  test('crea la reserva, abre Wompi con la URL de retorno móvil y, al interceptarla, va al resultado sin cargarla', async () => {
    const { reservas, pasarela } = await abrir({ pasarela: pasarelaConCheckout() });
    await screen.findByText('¿Cuántos viajan?');
    await pagar();

    expect(reservas.creadas).toEqual([{ planDateId: 'fecha-1', pax: 1 }]);
    expect(pasarela.iniciadas).toEqual([{ bookingId: 'nueva-1', redirectUrl: diversoConfig.mobilePaymentReturnUrl }]);
    expect(screen.getByText('Pago de prueba con Wompi')).toBeOnTheScreen();
    expect(webview?.source).toEqual({ uri: pasarela.checkoutUrl });

    let cargar!: boolean;
    await act(async () => {
      cargar = webview!.onShouldStartLoadWithRequest({ url: 'https://diverso.app/pago/resultado?id=tx-9' });
    });
    expect(cargar).toBe(false);
    expect(routerFalso.replace).toHaveBeenCalledWith(AppRoutes.pagoDeTransaccion('tx-9'));
    expect(screen.queryByText('Pago de prueba con Wompi')).toBeNull();
  });

  test('el WebView carga Wompi y bancos, pero bloquea esquemas de otras apps', async () => {
    await abrir({ pasarela: pasarelaConCheckout() });
    await screen.findByText('¿Cuántos viajan?');
    await pagar();
    expect(webview!.onShouldStartLoadWithRequest({ url: 'https://checkout.wompi.co/p/x' })).toBe(true);
    expect(webview!.onShouldStartLoadWithRequest({ url: 'nequi://pagar' })).toBe(false);
    expect(webview!.originWhitelist).toEqual(['*']);
  });

  test('cerrar con ✕ deja el aviso, conserva la reserva y ofrece «Ya pagué, verificar»', async () => {
    const { reservas } = await abrir({ pasarela: pasarelaConCheckout() });
    await screen.findByText('¿Cuántos viajan?');
    await pagar();

    await fireEvent.press(screen.getByRole('button', { name: 'Cerrar' }));

    expect(await screen.findByText(/Cerraste el pago antes de terminar/)).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Pagar con Wompi' })).toBeEnabled();
    // Las personas quedan fijas: la reserva ya existe.
    expect(screen.getByRole('button', { name: 'Agregar una persona' })).toBeDisabled();

    await fireEvent.press(screen.getByText('Ya pagué, verificar'));
    expect(routerFalso.replace).toHaveBeenCalledWith(AppRoutes.pagoDeReserva('nueva-1'));
    expect(reservas.creadas).toHaveLength(1);
  });

  test('si pagos-iniciar rechaza, el error se muestra en la caja de error', async () => {
    const pasarela = new PasarelaFalsa();
    pasarela.falloAlIniciar = new DiversoError('RESERVA_VENCIDA');
    await abrir({ pasarela });
    await screen.findByText('¿Cuántos viajan?');
    await pagar();
    expect(await screen.findByText(new DiversoError('RESERVA_VENCIDA').userMessage)).toBeOnTheScreen();
  });
});

describe('pago en web (misma pestaña)', () => {
  const osOriginal = Platform.OS;
  const locationOriginal = (globalThis as { location?: unknown }).location;
  let asignadas: string[];

  beforeEach(() => {
    asignadas = [];
    Object.defineProperty(Platform, 'OS', { configurable: true, get: () => 'web' });
    Object.defineProperty(globalThis, 'location', {
      configurable: true,
      value: { origin: 'http://localhost:8081', assign: (u: string) => asignadas.push(u) },
    });
  });
  afterEach(() => {
    Object.defineProperty(Platform, 'OS', { configurable: true, get: () => osOriginal });
    Object.defineProperty(globalThis, 'location', { configurable: true, value: locationOriginal });
  });

  test('pide el retorno a <origen>/pago/resultado, navega la pestaña a Wompi y bloquea un segundo pago', async () => {
    const pasarela = new PasarelaFalsa();
    pasarela.checkoutUrl = 'https://checkout.wompi.co/p/?reference=DIV-1';
    const { reservas } = await abrir({ pasarela });
    await screen.findByText('¿Cuántos viajan?');
    await pagar();

    expect(pasarela.iniciadas).toEqual([{ bookingId: 'nueva-1', redirectUrl: 'http://localhost:8081/pago/resultado' }]);
    expect(asignadas).toEqual([pasarela.checkoutUrl]);
    expect(webview).toBeNull();
    expect(screen.getByRole('button', { name: 'Pagar con Wompi' })).toBeDisabled();
    expect(screen.queryByText(/Cerraste el pago/)).toBeNull();
    expect(reservas.creadas).toHaveLength(1);
  });
});

describe('«Volver» sin historial (recarga o enlace directo)', () => {
  test('lleva a la ficha del plan en vez de dejar la pantalla sin salida', async () => {
    await abrir();
    await fireEvent.press(await screen.findByRole('button', { name: 'Volver' }));
    expect(routerFalso.replace).toHaveBeenCalledWith(AppRoutes.plan('plan-1'));
    expect(routerFalso.back).not.toHaveBeenCalled();
  });

  test('con historial, vuelve atrás', async () => {
    routerFalso.canGoBack.mockImplementation(() => true);
    await abrir();
    await fireEvent.press(await screen.findByRole('button', { name: 'Volver' }));
    expect(routerFalso.back).toHaveBeenCalled();
  });
});

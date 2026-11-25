import { WompiPaymentGateway } from '@/core/data/repositories/payment-gateway';
import { DiversoError } from '@/core/errors/diverso-error';
import { ArgumentError } from '@/core/errors/programming-errors';
import { BookingStatus, LABEL_PAYMENT_METHOD, PaymentMethodOption } from '@/core/models/enums';
import { VerifiedPaymentStatus } from '@/core/models/payment-checkout';
import { utcDate } from '@/core/utils/dates';

import { EdgeFunctionsFalsas } from '../../../support/edge-functions-falsas';
import { capture, httpError, networkError } from '../../../support/errors';

const fallo = (accion: () => Promise<unknown>) =>
  capture<DiversoError>(accion).then((e) => {
    expect(e).toBeInstanceOf(DiversoError);
    return e;
  });

describe('WompiPaymentGateway.iniciar', () => {
  test('llama a pagos-iniciar y lee checkout_url, referencia, monto y vencimiento', async () => {
    const inv = new EdgeFunctionsFalsas(() => ({
      checkout_url: 'https://checkout.wompi.co/p/?public-key=pub_test_x',
      referencia: 'DIV-ABC123-1',
      amount_in_cents: 30000000,
      expira_at: '2026-10-25T15:30:00+00:00',
    }));
    const r = await new WompiPaymentGateway({ edgeFunctions: inv }).iniciar({
      bookingId: 'b-1',
      redirectUrl: 'https://diverso.app/pago/resultado',
    });

    expect(inv.llamadas).toHaveLength(1);
    expect(inv.llamadas[0]![0]).toBe('pagos-iniciar');
    expect(inv.llamadas[0]![1]).toStrictEqual({
      booking_id: 'b-1',
      redirect_url: 'https://diverso.app/pago/resultado',
    });
    expect(r.checkoutUrl).toBe('https://checkout.wompi.co/p/?public-key=pub_test_x');
    expect(r.reference).toBe('DIV-ABC123-1');
    expect(r.amountInCents).toBe(30000000);
    expect(r.amount).toBe(300000);
    expect(r.expiresAt).toEqual(utcDate(2026, 10, 25, 15, 30));
  });

  test('RESERVA_VENCIDA (409): reserva vencida sin cobro', async () => {
    const inv = new EdgeFunctionsFalsas(() => httpError(409, { error: 'RESERVA_VENCIDA', mensaje: 'x' }));
    const e = await fallo(() => new WompiPaymentGateway({ edgeFunctions: inv }).iniciar({ bookingId: 'b', redirectUrl: 'u' }));
    expect(e.code).toBe('RESERVA_VENCIDA');
    expect(e.userMessage).toContain('venció');
  });

  test('REDIRECT_NO_PERMITIDO, NO_ES_DUENO y ESTADO_INVALIDO tienen mensaje propio', async () => {
    const casos: [number, string][] = [
      [400, 'REDIRECT_NO_PERMITIDO'],
      [403, 'NO_ES_DUENO'],
      [409, 'ESTADO_INVALIDO'],
      [404, 'RESERVA_NO_EXISTE'],
      [401, 'NO_AUTENTICADO'],
    ];
    for (const [status, codigo] of casos) {
      const inv = new EdgeFunctionsFalsas(() => httpError(status, { error: codigo }));
      const e = await fallo(() =>
        new WompiPaymentGateway({ edgeFunctions: inv }).iniciar({ bookingId: 'b', redirectUrl: 'u' }),
      );
      expect(e.code).toBe(codigo);
      expect(e.userMessage).not.toContain('Algo salió mal');
    }
  });

  test('SOLO_MODO_PRUEBA (503) → «La pasarela de prueba no está configurada»', async () => {
    const inv = new EdgeFunctionsFalsas(() => httpError(503, { error: 'SOLO_MODO_PRUEBA' }));
    const e = await fallo(() => new WompiPaymentGateway({ edgeFunctions: inv }).iniciar({ bookingId: 'b', redirectUrl: 'u' }));
    expect(e.code).toBe('SOLO_MODO_PRUEBA');
    expect(e.userMessage).toContain('La pasarela de prueba no está configurada');
  });

  test('sin red (FunctionsFetchError, status 0) → SIN_CONEXION', async () => {
    const inv = new EdgeFunctionsFalsas(() => networkError('offline'));
    const e = await fallo(() => new WompiPaymentGateway({ edgeFunctions: inv }).iniciar({ bookingId: 'b', redirectUrl: 'u' }));
    expect(e.code).toBe('SIN_CONEXION');
    expect(e.userMessage).toContain('conexión');
  });
});

describe('WompiPaymentGateway.verificar', () => {
  const ok = (estado: string, metodo: string | null = 'tarjeta') => ({
    estado_pago: estado,
    metodo,
    referencia: 'DIV-ABC123-1',
    booking: { id: 'b-1', codigo: 'DIV-ABC123', estado: 'confirmada' },
  });

  test('con transaction_id envía solo ese campo y parsea un pago aprobado', async () => {
    const inv = new EdgeFunctionsFalsas(() => ok('aprobado'));
    const r = await new WompiPaymentGateway({ edgeFunctions: inv }).verificar({ transactionId: 'tx-9' });
    expect(inv.llamadas[0]![0]).toBe('pagos-verificar');
    // toStrictEqual: ni siquiera `booking_id: undefined` (el servidor compara con === undefined).
    expect(inv.llamadas[0]![1]).toStrictEqual({ transaction_id: 'tx-9' });
    expect(Object.keys(inv.llamadas[0]![1])).toEqual(['transaction_id']);
    expect(r.status).toBe(VerifiedPaymentStatus.approved);
    expect(r.method).toBe(PaymentMethodOption.card);
    expect(r.reference).toBe('DIV-ABC123-1');
    expect(r.bookingId).toBe('b-1');
    expect(r.code).toBe('DIV-ABC123');
    expect(r.bookingStatus).toBe(BookingStatus.confirmed);
  });

  test('con booking_id (fallback «Ya pagué, verificar») envía solo ese campo', async () => {
    const inv = new EdgeFunctionsFalsas(() => ok('pendiente', null));
    const r = await new WompiPaymentGateway({ edgeFunctions: inv }).verificar({ bookingId: 'b-1', transactionId: null });
    expect(inv.llamadas[0]![1]).toStrictEqual({ booking_id: 'b-1' });
    expect(JSON.stringify(inv.llamadas[0]![1])).toBe('{"booking_id":"b-1"}');
    expect(r.status).toBe(VerifiedPaymentStatus.pending);
    expect(r.method).toBeNull();
  });

  test('exige exactamente uno de transaction_id / booking_id', async () => {
    const inv = new EdgeFunctionsFalsas(() => ok('aprobado'));
    const gateway = new WompiPaymentGateway({ edgeFunctions: inv });
    await expect(gateway.verificar({})).rejects.toBeInstanceOf(ArgumentError);
    await expect(gateway.verificar({ transactionId: 'a', bookingId: 'b' })).rejects.toBeInstanceOf(ArgumentError);
    expect(inv.llamadas).toHaveLength(0);
  });

  test('rechazado y error son resultados, no excepciones', async () => {
    const casos: [string, VerifiedPaymentStatus][] = [
      ['rechazado', VerifiedPaymentStatus.rejected],
      ['error', VerifiedPaymentStatus.error],
    ];
    for (const [raw, esperado] of casos) {
      const r = await new WompiPaymentGateway({ edgeFunctions: new EdgeFunctionsFalsas(() => ok(raw)) }).verificar({
        transactionId: 't',
      });
      expect(r.status).toBe(esperado);
      expect(r.userMessage).not.toBe('');
    }
  });

  test('métodos bancolombia y otro se reconocen (no caen en PSE)', async () => {
    const casos: [string, PaymentMethodOption][] = [
      ['bancolombia', PaymentMethodOption.bancolombia],
      ['otro', PaymentMethodOption.other],
      ['pse', PaymentMethodOption.pse],
    ];
    for (const [raw, esperado] of casos) {
      const r = await new WompiPaymentGateway({
        edgeFunctions: new EdgeFunctionsFalsas(() => ok('aprobado', raw)),
      }).verificar({ transactionId: 't' });
      expect(r.method).toBe(esperado);
    }
    expect(LABEL_PAYMENT_METHOD.bancolombia).toBe('Bancolombia');
    expect(LABEL_PAYMENT_METHOD.otro).toBe('Otro medio');
  });

  test('MONTO_NO_COINCIDE (409)', async () => {
    const inv = new EdgeFunctionsFalsas(() => httpError(409, { error: 'MONTO_NO_COINCIDE' }));
    const e = await fallo(() => new WompiPaymentGateway({ edgeFunctions: inv }).verificar({ transactionId: 't' }));
    expect(e.code).toBe('MONTO_NO_COINCIDE');
    expect(e.userMessage).toContain('no coincide');
  });

  test('aprobación tardía (409 RESERVA_VENCIDA + aprobado_tarde): reembolso automático', async () => {
    for (const reembolso of ['aprobado', 'pendiente', 'rechazado']) {
      const inv = new EdgeFunctionsFalsas(() =>
        httpError(409, {
          error: 'RESERVA_VENCIDA',
          estado_pago: 'aprobado_tarde',
          reembolso,
          referencia: 'DIV-ABC123-1',
        }),
      );
      const e = await fallo(() => new WompiPaymentGateway({ edgeFunctions: inv }).verificar({ transactionId: 't' }));
      expect(e.code).toBe('RESERVA_VENCIDA');
      expect(e.approvedLate).toBe(true);
      expect(e.userMessage).toContain('ya había vencido');
      expect(e.userMessage).toContain(`reembolso de prueba ${reembolso}`);
    }
  });

  test('WOMPI_NO_DISPONIBLE y WOMPI_NO_AUTORIZADO (502)', async () => {
    const noDisp = new EdgeFunctionsFalsas(() => httpError(502, { error: 'WOMPI_NO_DISPONIBLE' }));
    const e1 = await fallo(() => new WompiPaymentGateway({ edgeFunctions: noDisp }).verificar({ bookingId: 'b' }));
    expect(e1.code).toBe('WOMPI_NO_DISPONIBLE');
    expect(e1.userMessage).toContain('Wompi no está disponible');
    const noAut = new EdgeFunctionsFalsas(() => httpError(502, { error: 'WOMPI_NO_AUTORIZADO' }));
    const e2 = await fallo(() => new WompiPaymentGateway({ edgeFunctions: noAut }).verificar({ bookingId: 'b' }));
    expect(e2.code).toBe('WOMPI_NO_AUTORIZADO');
  });

  test('TRANSACCION_NO_EXISTE y REFERENCIA_DESCONOCIDA (404) invitan a verificar después', async () => {
    for (const codigo of ['TRANSACCION_NO_EXISTE', 'REFERENCIA_DESCONOCIDA']) {
      const inv = new EdgeFunctionsFalsas(() => httpError(404, { error: codigo }));
      const e = await fallo(() => new WompiPaymentGateway({ edgeFunctions: inv }).verificar({ transactionId: 't' }));
      expect(e.code).toBe(codigo);
      expect(e.userMessage).toContain('No encontramos ese pago');
    }
  });

  test('un 500 sin código no filtra detalles internos', async () => {
    const inv = new EdgeFunctionsFalsas(() => httpError(500, { error: 'ERROR_INTERNO', mensaje: 'Error interno.' }));
    const e = await fallo(() => new WompiPaymentGateway({ edgeFunctions: inv }).verificar({ bookingId: 'b' }));
    expect(e.userMessage).toContain('servidor');
  });
});

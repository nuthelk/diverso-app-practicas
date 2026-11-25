import { AppRoutes, codificarComponenteQuery, idsAComparar } from '@/router';

/**
 * Las ubicaciones se arman en un solo sitio: estas son las URLs que ven los deep links y la
 * barra del navegador. Port 1:1 de `app_routes_test.dart` (+ `_idsAComparar` de `app_router.dart`).
 */
test('rutas sin parámetros', () => {
  expect(AppRoutes.explorar).toBe('/');
  expect(AppRoutes.login).toBe('/login');
  expect(AppRoutes.consentimiento).toBe('/consentimiento');
  expect(AppRoutes.agencias).toBe('/agencias');
  expect(AppRoutes.reservas).toBe('/reservas');
  expect(AppRoutes.perfil).toBe('/perfil');
  expect(AppRoutes.pagoResultado).toBe('/pago/resultado');
});

test('rutas con ids', () => {
  expect(AppRoutes.legal('privacidad')).toBe('/legal/privacidad');
  expect(AppRoutes.agencia('a1')).toBe('/agencia/a1');
  expect(AppRoutes.plan('p1')).toBe('/plan/p1');
  expect(AppRoutes.checkout('p1', 'f1')).toBe('/checkout/p1/f1');
  expect(AppRoutes.reserva('r1')).toBe('/reserva/r1');
  expect(AppRoutes.reservaDetalle('r1')).toBe('/reservas/r1');
  expect(AppRoutes.resena('r1')).toBe('/resena/r1');
});

test('vuelta del pago: por transacción o por reserva', () => {
  expect(AppRoutes.pagoDeTransaccion('tx-77')).toBe('/pago/resultado?id=tx-77');
  expect(AppRoutes.pagoDeReserva('r1')).toBe('/pago/resultado?reserva=r1');
  expect(AppRoutes.pagoDeReserva('a b&c')).toBe('/pago/resultado?reserva=a+b%26c');
});

test('comparador: los ids van en la URL separados por comas', () => {
  expect(AppRoutes.compararPlanes(['a', 'b'])).toBe('/comparar?ids=a,b');
  expect(AppRoutes.compararPlanes([])).toBe('/comparar?ids=');
});

test('los patrones de la tabla coinciden con las ubicaciones', () => {
  expect(AppRoutes.legalPatron).toBe('/legal/:doc');
  expect(AppRoutes.agenciaPatron).toBe('/agencia/:id');
  expect(AppRoutes.planPatron).toBe('/plan/:id');
  expect(AppRoutes.checkoutPatron).toBe('/checkout/:planId/:fechaId');
  expect(AppRoutes.reservaPatron).toBe('/reserva/:bookingId');
  expect(AppRoutes.reservaDetallePatron).toBe('/reservas/:bookingId');
  expect(AppRoutes.resenaPatron).toBe('/resena/:bookingId');
});

test('codificarComponenteQuery es el Uri.encodeQueryComponent de Dart', () => {
  expect(codificarComponenteQuery('/comparar?ids=a,b')).toBe('%2Fcomparar%3Fids%3Da%2Cb');
  expect(codificarComponenteQuery("a b!'()*~._-")).toBe('a+b%21%27%28%29%2A~._-');
  expect(codificarComponenteQuery('Jericó')).toBe('Jeric%C3%B3');
});

describe('idsAComparar (`?ids=a,b,c` → ids sin vacíos ni repetidos, máx. 3)', () => {
  test('conserva el orden y quita vacíos y repetidos', () => {
    expect(idsAComparar('b,a,,b')).toEqual(['b', 'a']);
  });

  test('como mucho los que caben en el comparador', () => {
    expect(idsAComparar('a,b,c,d')).toEqual(['a', 'b', 'c']);
  });

  test('sin parámetro o vacío no hay ids', () => {
    expect(idsAComparar(undefined)).toEqual([]);
    expect(idsAComparar('')).toEqual([]);
    expect(idsAComparar(',,,')).toEqual([]);
  });

  test('si el parámetro llega repetido (`?ids=a&ids=b`) se usan todos', () => {
    expect(idsAComparar(['a', 'b,c'])).toEqual(['a', 'b', 'c']);
  });
});

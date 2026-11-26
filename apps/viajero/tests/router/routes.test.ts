import { AppRoutes, encodeQueryComponent, idsToCompare } from '@/router';

/**
 * Las ubicaciones se arman en un solo sitio: estas son las URLs que ven los deep links y la
 * barra del navegador. Port 1:1 de `app_routes_test.dart` (+ `_idsAComparar` de `app_router.dart`).
 */
test('rutas sin parámetros', () => {
  expect(AppRoutes.explore).toBe('/');
  expect(AppRoutes.login).toBe('/login');
  expect(AppRoutes.consent).toBe('/consentimiento');
  expect(AppRoutes.agencies).toBe('/agencias');
  expect(AppRoutes.bookings).toBe('/reservas');
  expect(AppRoutes.profile).toBe('/perfil');
  expect(AppRoutes.paymentResult).toBe('/pago/resultado');
});

test('rutas con ids', () => {
  expect(AppRoutes.legal('privacidad')).toBe('/legal/privacidad');
  expect(AppRoutes.agency('a1')).toBe('/agencia/a1');
  expect(AppRoutes.plan('p1')).toBe('/plan/p1');
  expect(AppRoutes.checkout('p1', 'f1')).toBe('/checkout/p1/f1');
  expect(AppRoutes.booking('r1')).toBe('/reserva/r1');
  expect(AppRoutes.bookingDetail('r1')).toBe('/reservas/r1');
  expect(AppRoutes.review('r1')).toBe('/resena/r1');
});

test('vuelta del pago: por transacción o por reserva', () => {
  expect(AppRoutes.paymentForTransaction('tx-77')).toBe('/pago/resultado?id=tx-77');
  expect(AppRoutes.paymentForBooking('r1')).toBe('/pago/resultado?reserva=r1');
  expect(AppRoutes.paymentForBooking('a b&c')).toBe('/pago/resultado?reserva=a+b%26c');
});

test('comparador: los ids van en la URL separados por comas', () => {
  expect(AppRoutes.comparePlans(['a', 'b'])).toBe('/comparar?ids=a,b');
  expect(AppRoutes.comparePlans([])).toBe('/comparar?ids=');
});

test('los patrones de la tabla coinciden con las ubicaciones', () => {
  expect(AppRoutes.legalPattern).toBe('/legal/:doc');
  expect(AppRoutes.agencyPattern).toBe('/agencia/:id');
  expect(AppRoutes.planPattern).toBe('/plan/:id');
  expect(AppRoutes.checkoutPattern).toBe('/checkout/:planId/:fechaId');
  expect(AppRoutes.bookingPattern).toBe('/reserva/:bookingId');
  expect(AppRoutes.bookingDetailPattern).toBe('/reservas/:bookingId');
  expect(AppRoutes.reviewPattern).toBe('/resena/:bookingId');
});

test('encodeQueryComponent es el Uri.encodeQueryComponent de Dart', () => {
  expect(encodeQueryComponent('/comparar?ids=a,b')).toBe('%2Fcomparar%3Fids%3Da%2Cb');
  expect(encodeQueryComponent("a b!'()*~._-")).toBe('a+b%21%27%28%29%2A~._-');
  expect(encodeQueryComponent('Jericó')).toBe('Jeric%C3%B3');
});

describe('idsToCompare (`?ids=a,b,c` → ids sin vacíos ni repetidos, máx. 3)', () => {
  test('conserva el orden y quita vacíos y repetidos', () => {
    expect(idsToCompare('b,a,,b')).toEqual(['b', 'a']);
  });

  test('como mucho los que caben en el comparador', () => {
    expect(idsToCompare('a,b,c,d')).toEqual(['a', 'b', 'c']);
  });

  test('sin parámetro o vacío no hay ids', () => {
    expect(idsToCompare(undefined)).toEqual([]);
    expect(idsToCompare('')).toEqual([]);
    expect(idsToCompare(',,,')).toEqual([]);
  });

  test('si el parámetro llega repetido (`?ids=a&ids=b`) se usan todos', () => {
    expect(idsToCompare(['a', 'b,c'])).toEqual(['a', 'b', 'c']);
  });
});

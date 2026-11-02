import 'package:flutter_test/flutter_test.dart';
import 'package:viajero/router/app_routes.dart';

/// Las ubicaciones se arman en un solo sitio: estas son las URLs que ven los deep links y la
/// barra del navegador.
void main() {
  test('rutas sin parámetros', () {
    expect(AppRoutes.explorar, '/');
    expect(AppRoutes.login, '/login');
    expect(AppRoutes.consentimiento, '/consentimiento');
    expect(AppRoutes.agencias, '/agencias');
    expect(AppRoutes.reservas, '/reservas');
    expect(AppRoutes.perfil, '/perfil');
    expect(AppRoutes.pagoResultado, '/pago/resultado');
  });

  test('rutas con ids', () {
    expect(AppRoutes.legal('privacidad'), '/legal/privacidad');
    expect(AppRoutes.agencia('a1'), '/agencia/a1');
    expect(AppRoutes.plan('p1'), '/plan/p1');
    expect(AppRoutes.checkout('p1', 'f1'), '/checkout/p1/f1');
    expect(AppRoutes.reserva('r1'), '/reserva/r1');
    expect(AppRoutes.reservaDetalle('r1'), '/reservas/r1');
    expect(AppRoutes.resena('r1'), '/resena/r1');
  });

  test('vuelta del pago: por transacción o por reserva', () {
    expect(AppRoutes.pagoDeTransaccion('tx-77'), '/pago/resultado?id=tx-77');
    expect(AppRoutes.pagoDeReserva('r1'), '/pago/resultado?reserva=r1');
    expect(AppRoutes.pagoDeReserva('a b&c'), '/pago/resultado?reserva=a+b%26c');
  });

  test('comparador: los ids van en la URL separados por comas', () {
    expect(AppRoutes.compararPlanes(['a', 'b']), '/comparar?ids=a,b');
    expect(AppRoutes.compararPlanes(const []), '/comparar?ids=');
  });

  test('los patrones de la tabla coinciden con las ubicaciones', () {
    expect(AppRoutes.legalPatron, '/legal/:doc');
    expect(AppRoutes.agenciaPatron, '/agencia/:id');
    expect(AppRoutes.planPatron, '/plan/:id');
    expect(AppRoutes.checkoutPatron, '/checkout/:planId/:fechaId');
    expect(AppRoutes.reservaPatron, '/reserva/:bookingId');
    expect(AppRoutes.reservaDetallePatron, '/reservas/:bookingId');
    expect(AppRoutes.resenaPatron, '/resena/:bookingId');
  });
}

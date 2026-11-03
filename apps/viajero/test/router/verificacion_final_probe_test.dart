import 'package:diverso_core/diverso_core.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:viajero/router/app_routes.dart';
import 'package:viajero/router/sesion_redirect.dart';
import 'package:viajero/ui/features/checkout/pago_abierto.dart';
import 'package:viajero/ui/features/checkout/pago_wompi.dart';
import 'package:viajero/ui/features/checkout/view_models/checkout_view_model.dart';
import 'package:viajero/ui/features/legal/view_models/consent_view_model.dart';

import '../support/reservas_falsas.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  group('S1 pago: URL de retorno e intercepción (iguales a ac23018)', () {
    test('retorno móvil e intercepción', () {
      expect(urlRetornoPago(), 'https://diverso.app/pago/resultado');
      expect(esRedireccionDePago('https://diverso.app/pago/resultado?id=tx-1'), isTrue);
      expect(esRedireccionDePago('https://diverso.app/pago/resultado'), isTrue);
      expect(esRedireccionDePago('http://diverso.app/pago/resultado?id=1'), isFalse);
      expect(esRedireccionDePago('https://diverso.app.evil.com/pago/resultado?id=1'), isFalse);
      expect(esRedireccionDePago('https://diverso.app/pago/resultado/x'), isFalse);
      expect(idDeRedireccion('https://diverso.app/pago/resultado?id='), isNull);
      expect(idDeRedireccion('https://diverso.app/pago/resultado?id=12-abc'), '12-abc');
    });
    test('rutas del pago', () {
      expect(AppRoutes.pagoResultado, '/pago/resultado');
      expect(AppRoutes.pagoDeTransaccion('a b&c'), '/pago/resultado?id=a+b%26c');
      expect(
        AppRoutes.pagoDeReserva('3f2c1e7a-0000-4000-8000-000000000001'),
        '/pago/resultado?reserva=3f2c1e7a-0000-4000-8000-000000000001',
      );
      expect(AppRoutes.reserva('r1'), '/reserva/r1');
      expect(AppRoutes.checkout('p', 'f'), '/checkout/p/f');
    });
    test('web: launchUrl rechazado → ERROR_NAVEGADOR; aceptado → redirigido', () async {
      expect(
        await abrirEnLaMismaVentana('https://checkout.wompi.co/p/?x=1', lanzar: (_) async => true),
        PagoAbierto.redirigido,
      );
      await expectLater(
        abrirEnLaMismaVentana('https://checkout.wompi.co/p/', lanzar: (_) async => false),
        throwsA(isA<DiversoException>().having((e) => e.codigo, 'codigo', 'ERROR_NAVEGADOR')),
      );
    });
  });

  group('S1 errores: mapa de códigos', () {
    test('FECHA_YA_SALIO y RESERVA_YA_SALIO desde PostgREST', () {
      final a = DiversoException.fromPostgrest(const PostgrestException(message: 'FECHA_YA_SALIO'));
      expect(a.codigo, 'FECHA_YA_SALIO');
      expect(a.mensajeUsuario, 'Esta salida ya partió. Elige otra fecha.');
      final b = DiversoException.fromPostgrest(
        const PostgrestException(message: 'RESERVA_YA_SALIO'),
      );
      expect(
        b.mensajeUsuario,
        'Este viaje ya salió, así que la reserva ya no se puede pagar ni cancelar.',
      );
      expect(DiversoException.fromPostgrest(StateError('x')).codigo, 'ERROR_INESPERADO');
      expect(DiversoException('ZZZ').mensajeUsuario, 'Algo salió mal (ZZZ). Intenta de nuevo.');
    });
    test('Edge Function 409 aprobado_tarde y sin conexión', () {
      final e = DiversoException.fromFunction(
        const FunctionException(
          status: 409,
          details: {
            'error': 'RESERVA_VENCIDA',
            'estado_pago': 'aprobado_tarde',
            'reembolso': 'aprobado',
          },
        ),
      );
      expect(e.aprobadoTarde, isTrue);
      expect(e.mensajeUsuario, contains('reembolso de prueba aprobado'));
      expect(
        DiversoException.fromFunction(const FunctionException(status: 0)).codigo,
        'SIN_CONEXION',
      );
      expect(
        DiversoException.fromFunction(const FunctionException(status: 502)).codigo,
        'ERROR_SERVIDOR',
      );
    });
    test('enums: todos los valores de la BD (0001 + alter type)', () {
      expect(enumFromDb(BookingStatus.values, 'pendiente_pago'), BookingStatus.pendientePago);
      for (final v in ['confirmada', 'cancelada', 'completada']) {
        expect(enumFromDb(BookingStatus.values, v)?.db, v);
      }
      for (final v in ['pse', 'nequi', 'daviplata', 'tarjeta', 'bancolombia', 'otro']) {
        expect(enumFromDb(PaymentMethodOption.values, v)?.db, v);
      }
      expect(enumFromDb(BookingStatus.values, 'pendientePago'), isNull);
    });
  });

  group('S1 consentimiento (L16–L17)', () {
    String? r(bool s, EstadoConsentimiento c, String u) =>
        sesionRedirect(haySesion: s, consentimiento: c, ubicacion: u);
    test('vuelta de Wompi en frío mientras se verifica: pasa por /consentimiento y vuelve', () {
      final ida = r(true, EstadoConsentimiento.verificando, '/pago/resultado?id=tx-1');
      expect(ida, '/consentimiento?desde=%2Fpago%2Fresultado%3Fid%3Dtx-1');
      expect(r(true, EstadoConsentimiento.verificando, ida!), isNull);
      expect(r(true, EstadoConsentimiento.aceptado, ida), '/pago/resultado?id=tx-1');
    });
    test('error y pendiente nunca dejan entrar; legal siempre accesible', () {
      for (final c in [EstadoConsentimiento.error, EstadoConsentimiento.pendiente]) {
        expect(r(true, c, '/checkout/p/f'), startsWith('/consentimiento?desde='));
        expect(r(true, c, '/reservas/x'), startsWith('/consentimiento?desde='));
        expect(r(true, c, '/legal/privacidad'), isNull);
      }
      expect(r(false, EstadoConsentimiento.verificando, '/legal/terminos'), isNull);
      expect(r(false, EstadoConsentimiento.aceptado, '/pago/resultado?id=1'), '/login');
      expect(r(true, EstadoConsentimiento.aceptado, '/login'), '/');
    });
    test('destinoSeguro rechaza destinos externos o en bucle', () {
      for (final d in [
        null,
        '',
        'https://evil.com',
        '//evil.com',
        r'/\evil.com',
        'javascript:alert(1)',
        '/login',
        '/consentimiento?desde=/x',
        'plan/1',
      ]) {
        expect(destinoSeguro(d), isNull, reason: '$d');
      }
      expect(destinoSeguro('/plan/1?x=2'), '/plan/1?x=2');
      expect(destinoSeguro('/legal/privacidad'), '/legal/privacidad');
    });
  });

  group('S1 checkout web (advisory L22, corregido en F6d)', () {
    test('con redirigido el botón sigue bloqueado mientras la página se va', () async {
      final vm = CheckoutViewModel(reservas: ReservasFalsas());
      final fecha = PlanDate(
        id: 'f1',
        planId: 'p1',
        fecha: DateTime(2030, 1, 1),
        cupoTotal: 10,
        cupoDisponible: 10,
      );
      await vm.pagar(fecha, (_) async => PagoAbierto.redirigido);
      expect(vm.error, isNull);
      expect(vm.procesando, isFalse);
      expect(vm.puedePagar, isFalse); // L22 lo documentaba habilitado; F6d lo bloquea
    });
  });
}

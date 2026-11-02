import 'package:diverso_core/diverso_core.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:supabase_flutter/supabase_flutter.dart' show FunctionException, FunctionsFetchException;

/// Invocador falso: registra cada llamada y devuelve (o lanza) lo que se le indique,
/// igual que `Supabase.instance.client.functions.invoke` (sin red).
class _Invocador {
  _Invocador(this.respuesta);

  final Object Function(String funcion, Map<String, dynamic> cuerpo) respuesta;
  final llamadas = <(String, Map<String, dynamic>)>[];

  Future<Map<String, dynamic>> call(String funcion, Map<String, dynamic> cuerpo) async {
    llamadas.add((funcion, cuerpo));
    final r = respuesta(funcion, cuerpo);
    if (r is Map<String, dynamic>) return r;
    throw r;
  }
}

FunctionException _http(int status, Map<String, dynamic> cuerpo) =>
    FunctionException(status: status, details: cuerpo);

DiversoException _falla(Object? e) => e as DiversoException;

void main() {
  group('WompiPaymentGateway.iniciar', () {
    test('llama a pagos-iniciar y lee checkout_url, referencia, monto y vencimiento', () async {
      final inv = _Invocador((_, _) => {
            'checkout_url': 'https://checkout.wompi.co/p/?public-key=pub_test_x',
            'referencia': 'DIV-ABC123-1',
            'amount_in_cents': 30000000,
            'expira_at': '2026-10-25T15:30:00+00:00',
          });
      final r = await WompiPaymentGateway(invocar: inv.call)
          .iniciar(bookingId: 'b-1', redirectUrl: 'https://diverso.app/pago/resultado');

      expect(inv.llamadas.single.$1, 'pagos-iniciar');
      expect(inv.llamadas.single.$2, {
        'booking_id': 'b-1',
        'redirect_url': 'https://diverso.app/pago/resultado',
      });
      expect(r.checkoutUrl, 'https://checkout.wompi.co/p/?public-key=pub_test_x');
      expect(r.referencia, 'DIV-ABC123-1');
      expect(r.amountInCents, 30000000);
      expect(r.monto, 300000);
      expect(r.expiraAt, DateTime.utc(2026, 10, 25, 15, 30));
    });

    test('RESERVA_VENCIDA (409): reserva vencida sin cobro', () async {
      final inv = _Invocador((_, _) => _http(409, {'error': 'RESERVA_VENCIDA', 'mensaje': 'x'}));
      await expectLater(
        WompiPaymentGateway(invocar: inv.call).iniciar(bookingId: 'b', redirectUrl: 'u'),
        throwsA(isA<DiversoException>()
            .having((e) => e.codigo, 'codigo', 'RESERVA_VENCIDA')
            .having((e) => e.mensajeUsuario, 'mensaje', contains('venció'))),
      );
    });

    test('REDIRECT_NO_PERMITIDO, NO_ES_DUENO y ESTADO_INVALIDO tienen mensaje propio', () async {
      for (final (status, codigo) in [
        (400, 'REDIRECT_NO_PERMITIDO'),
        (403, 'NO_ES_DUENO'),
        (409, 'ESTADO_INVALIDO'),
        (404, 'RESERVA_NO_EXISTE'),
        (401, 'NO_AUTENTICADO'),
      ]) {
        final inv = _Invocador((_, _) => _http(status, {'error': codigo}));
        try {
          await WompiPaymentGateway(invocar: inv.call).iniciar(bookingId: 'b', redirectUrl: 'u');
          fail('debía fallar con $codigo');
        } catch (e) {
          expect(_falla(e).codigo, codigo);
          expect(_falla(e).mensajeUsuario, isNot(contains('Algo salió mal')), reason: codigo);
        }
      }
    });

    test('SOLO_MODO_PRUEBA (503) → «La pasarela de prueba no está configurada»', () async {
      final inv = _Invocador((_, _) => _http(503, {'error': 'SOLO_MODO_PRUEBA'}));
      try {
        await WompiPaymentGateway(invocar: inv.call).iniciar(bookingId: 'b', redirectUrl: 'u');
        fail('debía fallar');
      } catch (e) {
        expect(_falla(e).codigo, 'SOLO_MODO_PRUEBA');
        expect(_falla(e).mensajeUsuario, contains('La pasarela de prueba no está configurada'));
      }
    });

    test('sin red (FunctionsFetchException) → SIN_CONEXION', () async {
      final inv = _Invocador((_, _) => const FunctionsFetchException(details: 'offline'));
      try {
        await WompiPaymentGateway(invocar: inv.call).iniciar(bookingId: 'b', redirectUrl: 'u');
        fail('debía fallar');
      } catch (e) {
        expect(_falla(e).codigo, 'SIN_CONEXION');
        expect(_falla(e).mensajeUsuario, contains('conexión'));
      }
    });
  });

  group('WompiPaymentGateway.verificar', () {
    Map<String, dynamic> ok(String estado, {String? metodo = 'tarjeta'}) => {
          'estado_pago': estado,
          'metodo': metodo,
          'referencia': 'DIV-ABC123-1',
          'booking': {'id': 'b-1', 'codigo': 'DIV-ABC123', 'estado': 'confirmada'},
        };

    test('con transaction_id envía solo ese campo y parsea un pago aprobado', () async {
      final inv = _Invocador((_, _) => ok('aprobado'));
      final r = await WompiPaymentGateway(invocar: inv.call).verificar(transactionId: 'tx-9');
      expect(inv.llamadas.single.$1, 'pagos-verificar');
      expect(inv.llamadas.single.$2, {'transaction_id': 'tx-9'});
      expect(r.estado, EstadoPago.aprobado);
      expect(r.metodo, PaymentMethodOption.tarjeta);
      expect(r.referencia, 'DIV-ABC123-1');
      expect(r.bookingId, 'b-1');
      expect(r.codigo, 'DIV-ABC123');
      expect(r.bookingEstado, BookingStatus.confirmada);
    });

    test('con booking_id (fallback «Ya pagué, verificar») envía solo ese campo', () async {
      final inv = _Invocador((_, _) => ok('pendiente', metodo: null));
      final r = await WompiPaymentGateway(invocar: inv.call).verificar(bookingId: 'b-1');
      expect(inv.llamadas.single.$2, {'booking_id': 'b-1'});
      expect(r.estado, EstadoPago.pendiente);
      expect(r.metodo, isNull);
    });

    test('exige exactamente uno de transaction_id / booking_id', () async {
      final gateway = WompiPaymentGateway(invocar: _Invocador((_, _) => ok('aprobado')).call);
      expect(() => gateway.verificar(), throwsArgumentError);
      expect(() => gateway.verificar(transactionId: 'a', bookingId: 'b'), throwsArgumentError);
    });

    test('rechazado y error son resultados, no excepciones', () async {
      for (final (raw, esperado) in [
        ('rechazado', EstadoPago.rechazado),
        ('error', EstadoPago.error),
      ]) {
        final r = await WompiPaymentGateway(invocar: _Invocador((_, _) => ok(raw)).call)
            .verificar(transactionId: 't');
        expect(r.estado, esperado);
        expect(r.mensajeUsuario, isNotEmpty);
      }
    });

    test('métodos bancolombia y otro se reconocen (no caen en PSE)', () async {
      for (final (raw, esperado) in [
        ('bancolombia', PaymentMethodOption.bancolombia),
        ('otro', PaymentMethodOption.otro),
        ('pse', PaymentMethodOption.pse),
      ]) {
        final r = await WompiPaymentGateway(invocar: _Invocador((_, _) => ok('aprobado', metodo: raw)).call)
            .verificar(transactionId: 't');
        expect(r.metodo, esperado);
      }
      expect(PaymentMethodOption.bancolombia.label, 'Bancolombia');
      expect(PaymentMethodOption.otro.label, 'Otro medio');
    });

    test('MONTO_NO_COINCIDE (409)', () async {
      final inv = _Invocador((_, _) => _http(409, {'error': 'MONTO_NO_COINCIDE'}));
      try {
        await WompiPaymentGateway(invocar: inv.call).verificar(transactionId: 't');
        fail('debía fallar');
      } catch (e) {
        expect(_falla(e).codigo, 'MONTO_NO_COINCIDE');
        expect(_falla(e).mensajeUsuario, contains('no coincide'));
      }
    });

    test('aprobación tardía (409 RESERVA_VENCIDA + aprobado_tarde): reembolso automático', () async {
      for (final (reembolso, texto) in [
        ('aprobado', 'aprobado'),
        ('pendiente', 'pendiente'),
        ('rechazado', 'rechazado'),
      ]) {
        final inv = _Invocador((_, _) => _http(409, {
              'error': 'RESERVA_VENCIDA',
              'estado_pago': 'aprobado_tarde',
              'reembolso': reembolso,
              'referencia': 'DIV-ABC123-1',
            }));
        try {
          await WompiPaymentGateway(invocar: inv.call).verificar(transactionId: 't');
          fail('debía fallar');
        } catch (e) {
          final f = _falla(e);
          expect(f.codigo, 'RESERVA_VENCIDA');
          expect(f.aprobadoTarde, isTrue);
          expect(f.mensajeUsuario, contains('ya había vencido'));
          expect(f.mensajeUsuario, contains('reembolso de prueba $texto'));
        }
      }
    });

    test('WOMPI_NO_DISPONIBLE y WOMPI_NO_AUTORIZADO (502)', () async {
      final noDisp = _Invocador((_, _) => _http(502, {'error': 'WOMPI_NO_DISPONIBLE'}));
      try {
        await WompiPaymentGateway(invocar: noDisp.call).verificar(bookingId: 'b');
        fail('debía fallar');
      } catch (e) {
        expect(_falla(e).codigo, 'WOMPI_NO_DISPONIBLE');
        expect(_falla(e).mensajeUsuario, contains('Wompi no está disponible'));
      }
      final noAut = _Invocador((_, _) => _http(502, {'error': 'WOMPI_NO_AUTORIZADO'}));
      try {
        await WompiPaymentGateway(invocar: noAut.call).verificar(bookingId: 'b');
        fail('debía fallar');
      } catch (e) {
        expect(_falla(e).codigo, 'WOMPI_NO_AUTORIZADO');
      }
    });

    test('TRANSACCION_NO_EXISTE y REFERENCIA_DESCONOCIDA (404) invitan a verificar después', () async {
      for (final codigo in ['TRANSACCION_NO_EXISTE', 'REFERENCIA_DESCONOCIDA']) {
        final inv = _Invocador((_, _) => _http(404, {'error': codigo}));
        try {
          await WompiPaymentGateway(invocar: inv.call).verificar(transactionId: 't');
          fail('debía fallar');
        } catch (e) {
          expect(_falla(e).codigo, codigo);
          expect(_falla(e).mensajeUsuario, contains('No encontramos ese pago'));
        }
      }
    });

    test('un 500 sin código no filtra detalles internos', () async {
      final inv = _Invocador((_, _) => _http(500, {'error': 'ERROR_INTERNO', 'mensaje': 'Error interno.'}));
      try {
        await WompiPaymentGateway(invocar: inv.call).verificar(bookingId: 'b');
        fail('debía fallar');
      } catch (e) {
        expect(_falla(e).mensajeUsuario, contains('servidor'));
      }
    });
  });

  group('BookingService.cancelar (reservas-cancelar)', () {
    Map<String, dynamic> cancelada(Map<String, dynamic> r) => {'estado': 'cancelada', 'reembolso': r};

    test('llama a reservas-cancelar y lee el reembolso aprobado', () async {
      final inv = _Invocador((_, _) => cancelada({
            'aplica': true,
            'porcentaje': 50,
            'monto': 150000,
            'estado': 'aprobado',
            'motivo': 'Cancelación con menos de 48 h y al menos 24 h de anticipación: reembolso del 50 %',
          }));
      final r = await BookingService(invocar: inv.call).cancelar('b-1');
      expect(inv.llamadas.single.$1, 'reservas-cancelar');
      expect(inv.llamadas.single.$2, {'booking_id': 'b-1'});
      expect(r.aplica, isTrue);
      expect(r.porcentaje, 50);
      expect(r.monto, 150000);
      expect(r.estado, EstadoReembolso.aprobado);
      expect(r.estado.etiqueta, 'Reembolso de prueba aprobado');
    });

    test('estados pendiente, rechazado y no_aplica', () async {
      for (final (raw, esperado, etiqueta) in [
        ('pendiente', EstadoReembolso.pendiente, 'Reembolso de prueba pendiente'),
        ('rechazado', EstadoReembolso.rechazado, 'Reembolso de prueba rechazado'),
        ('no_aplica', EstadoReembolso.noAplica, 'Sin reembolso'),
      ]) {
        final inv = _Invocador((_, _) => cancelada({
              'aplica': raw != 'no_aplica',
              'porcentaje': raw == 'no_aplica' ? 0 : 100,
              'monto': raw == 'no_aplica' ? 0 : 300000,
              'estado': raw,
              'motivo': 'm',
            }));
        final r = await BookingService(invocar: inv.call).cancelar('b-1');
        expect(r.estado, esperado);
        expect(r.estado.etiqueta, etiqueta);
      }
    });

    test('errores de la función: ESTADO_INVALIDO y NO_ES_DUENO', () async {
      final inv = _Invocador((_, _) => _http(409, {'error': 'ESTADO_INVALIDO'}));
      await expectLater(
        BookingService(invocar: inv.call).cancelar('b-1'),
        throwsA(isA<DiversoException>().having((e) => e.codigo, 'codigo', 'ESTADO_INVALIDO')),
      );
    });
  });

  group('modelos', () {
    test('VistaPreviaCancelacion.fromMap (vista_previa_cancelacion)', () {
      final v = VistaPreviaCancelacion.fromMap({
        'booking_id': 'b',
        'horas_antes': 30.5,
        'aplica': true,
        'porcentaje': 50,
        'monto': 150000.0,
        'motivo': 'x',
      });
      expect(v.aplica, isTrue);
      expect(v.porcentaje, 50);
      expect(v.monto, 150000);
      expect(v.horasAntes, 30.5);
      expect(v.motivo, 'x');
    });

    test('Payment y Refund se leen con sus columnas explícitas', () {
      final b = Booking.fromMap({
        'id': 'b',
        'codigo': 'DIV-1',
        'plan_date_id': 'd',
        'viajero_id': 'v',
        'pax': 2,
        'monto_total': 300000,
        'estado': 'cancelada',
        'created_at': '2026-10-25T10:00:00+00:00',
        'payments': [
          {
            'id': 'p',
            'booking_id': 'b',
            'metodo': 'bancolombia',
            'estado': 'reembolsado',
            'monto': 300000,
            'referencia': 'DIV-1-1',
            'provider': 'wompi',
            'simulated': false,
          }
        ],
        'refunds': [
          {
            'id': 'r1',
            'booking_id': 'b',
            'monto': 150000,
            'porcentaje': 50,
            'estado': 'pendiente',
            'origen': 'cancelacion',
            'motivo': 'm',
            'created_at': '2026-10-25T11:00:00+00:00',
          },
          {
            'id': 'r2',
            'booking_id': 'b',
            'monto': 150000,
            'porcentaje': 50,
            'estado': 'aprobado',
            'origen': 'cancelacion',
            'motivo': 'm',
            'created_at': '2026-10-25T12:00:00+00:00',
          },
        ],
      });
      expect(b.pago!.metodo, PaymentMethodOption.bancolombia);
      expect(b.pago!.textoReferencia, 'Pagado con Bancolombia · ref. DIV-1-1 (prueba)');
      expect(b.reembolso!.estado, EstadoReembolso.aprobado, reason: 'el más reciente');
      expect(b.etiquetaReembolso, 'Reembolso de prueba aprobado · 50 % · \$ 150.000');
    });

    test('cancelada con pago y sin reembolso → «Sin reembolso»; sin pago → nada', () {
      Map<String, dynamic> base(List<Map<String, dynamic>> pagos) => {
            'id': 'b',
            'codigo': 'DIV-1',
            'plan_date_id': 'd',
            'viajero_id': 'v',
            'pax': 1,
            'monto_total': 100000,
            'estado': 'cancelada',
            'created_at': '2026-10-25T10:00:00+00:00',
            'payments': pagos,
            'refunds': <Map<String, dynamic>>[],
          };
      final conPago = Booking.fromMap(base([
        {
          'id': 'p',
          'booking_id': 'b',
          'metodo': 'nequi',
          'estado': 'aprobado',
          'monto': 100000,
          'referencia': 'R',
          'provider': 'wompi',
          'simulated': false,
        }
      ]));
      expect(conPago.etiquetaReembolso, 'Sin reembolso');
      expect(Booking.fromMap(base(const [])).etiquetaReembolso, isNull);
    });
  });
}

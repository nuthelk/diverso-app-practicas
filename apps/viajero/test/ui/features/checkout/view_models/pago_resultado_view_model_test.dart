import 'dart:async';

import 'package:diverso_core/diverso_core.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:viajero/ui/features/checkout/pago_abierto.dart';
import 'package:viajero/ui/features/checkout/view_models/pago_resultado_view_model.dart';

import '../../../../support/pasarela_falsa.dart';

/// Verificación del pago en el servidor (`pagos-verificar`): el resultado de la redirección del
/// navegador nunca se da por bueno. Sin red ni Supabase.

PagoResultadoViewModel _vm(PasarelaFalsa pasarela, {String? tx = 'tx-1', String? reserva}) =>
    PagoResultadoViewModel(
      pasarela: pasarela,
      transactionId: tx,
      bookingId: reserva,
      maxIntentos: 3,
      pausa: Duration.zero,
    );

PagoVerificado _pendiente() => pagoDePrueba(EstadoPago.pendiente, BookingStatus.pendientePago);

void main() {
  test('aprobado: queda el resultado, sin reintentos, verificando por la transacción', () async {
    final pasarela = PasarelaFalsa([pagoDePrueba(EstadoPago.aprobado)]);
    final vm = _vm(pasarela);
    addTearDown(vm.dispose);
    await vm.verificar();

    expect(vm.resultado?.estado, EstadoPago.aprobado);
    expect(vm.falla, isNull);
    expect(vm.cargando, isFalse);
    expect(vm.intentos, 1);
    expect(pasarela.verificaciones, [(transaccion: 'tx-1', reserva: null)]);
  });

  test('«Ya pagué, verificar» verifica por la reserva, sin transacción', () async {
    final pasarela = PasarelaFalsa([pagoDePrueba(EstadoPago.aprobado)]);
    final vm = _vm(pasarela, tx: null, reserva: 'res-1');
    addTearDown(vm.dispose);
    await vm.verificar();
    expect(pasarela.verificaciones, [(transaccion: null, reserva: 'res-1')]);
  });

  test('sin transacción ni reserva no hay nada que verificar', () {
    final vm = _vm(PasarelaFalsa(), tx: null);
    addTearDown(vm.dispose);
    expect(vm.sinDatos, isTrue);
  });

  test('pendiente: reintenta hasta el máximo y se queda en pendiente', () async {
    final pasarela = PasarelaFalsa([_pendiente()]);
    final vm = _vm(pasarela);
    addTearDown(vm.dispose);
    await vm.verificar();

    expect(pasarela.verificaciones, hasLength(3));
    expect(vm.intentos, 3);
    expect(vm.resultado?.estado, EstadoPago.pendiente);
    expect(vm.cargando, isFalse);
  });

  test('pendiente que se aprueba en el reintento deja de preguntar', () async {
    final pasarela = PasarelaFalsa([_pendiente(), pagoDePrueba(EstadoPago.aprobado)]);
    final vm = _vm(pasarela);
    addTearDown(vm.dispose);
    await vm.verificar();

    expect(pasarela.verificaciones, hasLength(2));
    expect(vm.resultado?.estado, EstadoPago.aprobado);
    expect(vm.intentos, 2);
  });

  test('rechazado no se reintenta: lo dice el servidor', () async {
    final pasarela = PasarelaFalsa([
      pagoDePrueba(EstadoPago.rechazado, BookingStatus.pendientePago),
    ]);
    final vm = _vm(pasarela);
    addTearDown(vm.dispose);
    await vm.verificar();
    expect(pasarela.verificaciones, hasLength(1));
    expect(vm.resultado?.estado, EstadoPago.rechazado);
  });

  test('error del servidor: queda la falla con su mensaje y no se reintenta', () async {
    final pasarela = PasarelaFalsa([DiversoException('MONTO_NO_COINCIDE')]);
    final vm = _vm(pasarela);
    addTearDown(vm.dispose);
    await vm.verificar();

    expect(vm.falla?.codigo, 'MONTO_NO_COINCIDE');
    expect(vm.resultado, isNull);
    expect(vm.cargando, isFalse);
    expect(pasarela.verificaciones, hasLength(1));
  });

  test('error inesperado: falla ERROR_INESPERADO en vez de romper la pantalla', () async {
    final vm = _vm(PasarelaFalsa([StateError('boom')]));
    addTearDown(vm.dispose);
    await vm.verificar();
    expect(vm.falla?.codigo, 'ERROR_INESPERADO');
    expect(vm.resultado, isNull);
  });

  test('«Reintentar» tras una falla verifica de nuevo desde cero', () async {
    final pasarela = PasarelaFalsa([
      DiversoException('ERROR_RED'),
      pagoDePrueba(EstadoPago.aprobado),
    ]);
    final vm = _vm(pasarela);
    addTearDown(vm.dispose);
    await vm.verificar();
    expect(vm.falla, isNotNull);

    final estados = <bool>[];
    vm.addListener(() => estados.add(vm.cargando));
    await vm.verificar();

    expect(estados, [true, false], reason: 'vuelve a cargar y termina');
    expect(vm.falla, isNull);
    expect(vm.resultado?.estado, EstadoPago.aprobado);
    expect(vm.intentos, 1, reason: 'los intentos empiezan de cero');
  });

  test('arranca cargando para que la pantalla no parpadee un estado vacío', () {
    final vm = _vm(PasarelaFalsa());
    addTearDown(vm.dispose);
    expect(vm.cargando, isTrue);
    expect(vm.resultado, isNull);
    expect(vm.falla, isNull);
  });

  group('intentarDeNuevo («Intentar de nuevo» tras un pago rechazado)', () {
    late PagoResultadoViewModel vm;
    final abiertos = <String>[];

    Future<PagoAbierto> Function(String) abrir(PagoAbierto resultado) => (id) async {
      abiertos.add(id);
      return resultado;
    };

    setUp(() {
      vm = _vm(PasarelaFalsa());
      abiertos.clear();
    });
    tearDown(() => vm.dispose());

    test('abre el pago de ESA reserva y deja el estado limpio', () async {
      final estados = <bool>[];
      vm.addListener(() => estados.add(vm.reintentandoPago));
      await vm.intentarDeNuevo('res-1', abrir(PagoAbierto.completado));

      expect(abiertos, ['res-1']);
      expect(estados, [true, false]);
      expect(vm.errorReintento, isNull);
    });

    test('bug F: en web queda redirigido y el botón se libera, sin error', () async {
      await vm.intentarDeNuevo('res-1', abrir(PagoAbierto.redirigido));
      expect(vm.reintentandoPago, isFalse);
      expect(vm.errorReintento, isNull);
    });

    test('cerrar el pago sin terminar avisa cómo seguir', () async {
      await vm.intentarDeNuevo('res-1', abrir(PagoAbierto.cerrado));
      expect(
        vm.errorReintento,
        'Cerraste el pago antes de terminar. Si ya pagaste, toca «Verificar de nuevo».',
      );
      expect(vm.reintentandoPago, isFalse);
    });

    test('error del servidor al abrir el pago: su mensaje en español', () async {
      await vm.intentarDeNuevo('res-1', (_) => throw DiversoException('RESERVA_VENCIDA'));
      expect(vm.errorReintento, DiversoException('RESERVA_VENCIDA').mensajeUsuario);
      expect(vm.reintentandoPago, isFalse);
    });

    test('error inesperado: mensaje genérico', () async {
      await vm.intentarDeNuevo('res-1', (_) => throw StateError('boom'));
      expect(vm.errorReintento, 'No pudimos iniciar el pago. Intenta de nuevo.');
    });

    test('un nuevo intento limpia el aviso anterior', () async {
      await vm.intentarDeNuevo('res-1', abrir(PagoAbierto.cerrado));
      await vm.intentarDeNuevo('res-1', abrir(PagoAbierto.completado));
      expect(vm.errorReintento, isNull);
    });

    test('mientras uno está en curso, otro toque se ignora', () async {
      final puerta = Completer<PagoAbierto>();
      final primero = vm.intentarDeNuevo('res-1', (_) => puerta.future);
      await vm.intentarDeNuevo('res-1', abrir(PagoAbierto.completado));
      expect(abiertos, isEmpty);
      puerta.complete(PagoAbierto.completado);
      await primero;
    });

    test('si la pantalla se cierra mientras el pago se abre, no avisa a nadie', () async {
      final otro = _vm(PasarelaFalsa());
      final puerta = Completer<PagoAbierto>();
      final reintentando = otro.intentarDeNuevo('res-1', (_) => puerta.future);
      await pumpEventQueue();

      otro.dispose();
      puerta.complete(PagoAbierto.completado);
      await reintentando;
    });
  });

  group('guarda de dispose', () {
    test('cerrar la pantalla durante la verificación corta el sondeo y no avisa', () async {
      final pasarela = PasarelaFalsa([_pendiente()])..compuerta = Completer<void>();
      final vm = _vm(pasarela);
      final verificando = vm.verificar();
      await pumpEventQueue();

      vm.dispose();
      pasarela.compuerta!.complete();
      await verificando;

      expect(pasarela.verificaciones, hasLength(1), reason: 'no sigue preguntando');
    });
  });
}

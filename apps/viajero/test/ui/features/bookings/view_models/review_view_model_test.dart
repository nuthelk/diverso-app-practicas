import 'dart:async';

import 'package:diverso_core/diverso_core.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:viajero/ui/features/bookings/view_models/review_view_model.dart';

import '../../../../support/reservas_falsas.dart';

/// `ReviewViewModel` con repositorios falsos: carga la reserva por id (o usa la de la lista),
/// decide si se puede reseñar, guarda la calificación y publica la reseña.

final _ahora = DateTime.utc(2026, 10, 25, 15, 0);
final _salida = _ahora.subtract(const Duration(days: 3));

void main() {
  late ReservasFalsas reservas;
  late PublicadorDeResenasFalso resenas;

  ReviewViewModel crear({Booking? adelantada, bool limpiar = true}) {
    final vm = ReviewViewModel(
      reservas: reservas,
      resenas: resenas,
      bookingId: 'res-1',
      adelantada: adelantada,
      reloj: () => _ahora,
    );
    if (limpiar) addTearDown(vm.dispose);
    return vm;
  }

  setUp(() {
    reservas = ReservasFalsas([reservaDePrueba(salida: _salida)]);
    resenas = PublicadorDeResenasFalso();
  });

  group('carga de la reserva', () {
    test('sin reserva adelantada: cargando hasta que llega', () async {
      final vm = crear();
      expect(vm.cargando, isTrue);
      expect(vm.reserva, isNull);

      await vm.cargar();

      expect(vm.cargando, isFalse);
      expect(vm.reserva?.id, 'res-1');
      expect(vm.puedeResenar, isTrue);
      expect(reservas.consultas, ['res-1']);
    });

    test('con la reserva de «Mis reservas» no se vuelve a pedir', () async {
      final vm = crear(adelantada: reservas.lista.first);
      expect(vm.cargando, isFalse);

      await vm.cargar();

      expect(reservas.consultas, isEmpty);
      expect(vm.puedeResenar, isTrue);
    });

    test('una reserva adelantada de otro id se ignora y se carga la pedida', () async {
      final vm = crear(
        adelantada: reservaDePrueba(id: 'otra', salida: _salida),
      );
      expect(vm.cargando, isTrue);

      await vm.cargar();

      expect(vm.reserva?.id, 'res-1');
    });

    test('error: queda el motivo y reintentar lo limpia', () async {
      reservas.lista = [];
      final vm = crear();
      await vm.cargar();

      expect(vm.error, DiversoException('RESERVA_NO_EXISTE').mensajeUsuario);
      expect(vm.reserva, isNull);
      expect(vm.puedeResenar, isFalse);

      reservas.lista = [reservaDePrueba(salida: _salida)];
      await vm.cargar();

      expect(vm.error, isNull);
      expect(vm.reserva?.id, 'res-1');
    });

    test('un error que no es de Diverso también queda como mensaje', () async {
      reservas.fallo = Exception('sin red');
      final vm = crear();
      await vm.cargar();
      expect(vm.error, isNotNull);
    });

    for (final (nombre, reserva) in [
      ('aún no viajó', reservaDePrueba(salida: _ahora.add(const Duration(days: 1)))),
      ('ya reseñada', reservaDePrueba(salida: _salida, tieneResena: true)),
      ('cancelada', reservaDePrueba(salida: _salida, estado: BookingStatus.cancelada)),
      ('pendiente de pago', reservaDePrueba(salida: _salida, estado: BookingStatus.pendientePago)),
    ]) {
      test('no se puede reseñar una reserva $nombre', () async {
        reservas.lista = [reserva];
        final vm = crear();
        await vm.cargar();

        expect(vm.reserva, isNotNull);
        expect(vm.puedeResenar, isFalse);
      });
    }

    test('dispose: una carga que termina después no avisa a nadie ni lanza', () async {
      reservas.compuerta = Completer<void>();
      final vm = crear(limpiar: false);
      final carga = vm.cargar();
      vm.dispose();
      reservas.compuerta!.complete();

      await expectLater(carga, completes);
    });
  });

  group('calificación y envío', () {
    test('empieza en 5 estrellas y calificar la cambia (solo de 1 a 5)', () {
      final vm = crear(adelantada: reservas.lista.first);
      expect(vm.calificacion, 5);

      vm.calificar(2);
      expect(vm.calificacion, 2);

      vm.calificar(0);
      vm.calificar(6);
      expect(vm.calificacion, 2);
    });

    test('enviar publica con la calificación y el comentario, y devuelve true', () async {
      final vm = crear(adelantada: reservas.lista.first);
      vm.calificar(4);

      expect(await vm.enviar('Muy bueno'), isTrue);

      expect(resenas.creadas, [(bookingId: 'res-1', calificacion: 4, comentario: 'Muy bueno')]);
      expect(vm.enviando, isFalse);
      expect(
        vm.publicada,
        isTrue,
        reason: 'la pantalla se cierra: el botón no se vuelve a activar',
      );
      expect(vm.errorEnvio, isNull);
    });

    test('una reseña ya publicada no se publica dos veces', () async {
      final vm = crear(adelantada: reservas.lista.first);
      await vm.enviar('a');

      expect(await vm.enviar('a'), isFalse);
      expect(resenas.creadas, hasLength(1));
    });

    test('mientras envía `enviando` es true y un segundo envío no publica dos veces', () async {
      resenas.compuerta = Completer<void>();
      final vm = crear(adelantada: reservas.lista.first);

      final primero = vm.enviar('a');
      expect(vm.enviando, isTrue);
      expect(await vm.enviar('a'), isFalse);

      resenas.compuerta!.complete();
      expect(await primero, isTrue);
      expect(resenas.creadas, hasLength(1));
    });

    test(
      'si el servidor rechaza: false, `errorEnvio` con el motivo y se puede reintentar',
      () async {
        resenas.fallo = DiversoException('ESTADO_INVALIDO');
        final vm = crear(adelantada: reservas.lista.first);

        expect(await vm.enviar(''), isFalse);

        expect(vm.errorEnvio, 'La reserva ya no admite esta operación.');
        expect(vm.enviando, isFalse);
        expect(resenas.creadas, isEmpty);

        resenas.fallo = null;
        expect(await vm.enviar(''), isTrue);
        expect(vm.errorEnvio, isNull);
      },
    );

    test('un error inesperado al publicar también queda como mensaje y libera el botón', () async {
      resenas.fallo = Exception('boom');
      final vm = crear(adelantada: reservas.lista.first);

      expect(await vm.enviar(''), isFalse);
      expect(vm.errorEnvio, isNotNull);
      expect(vm.enviando, isFalse);
    });

    test('dispose: un envío que termina después no avisa a nadie ni lanza', () async {
      resenas.compuerta = Completer<void>();
      final vm = crear(adelantada: reservas.lista.first, limpiar: false);
      final envio = vm.enviar('');
      vm.dispose();
      resenas.compuerta!.complete();

      await expectLater(envio, completes);
    });
  });
}

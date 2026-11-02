import 'dart:async';

import 'package:diverso_core/diverso_core.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:viajero/ui/features/bookings/view_models/reserva_detalle_view_model.dart';

import '../../../../support/reservas_falsas.dart';

/// `ReservaDetalleViewModel` con un repositorio falso: carga por id (o usa la reserva que ya
/// tenía la lista), error, marca de cambios para la lista, acciones y protección tras `dispose`.

final _ahora = DateTime.utc(2026, 10, 25, 15, 0);

void main() {
  late ReservasFalsas repo;

  ReservaDetalleViewModel crear({Booking? inicial, bool limpiar = true}) {
    final vm = ReservaDetalleViewModel(
      reservas: repo,
      bookingId: 'res-1',
      inicial: inicial,
      reloj: () => _ahora,
    );
    if (limpiar) addTearDown(vm.dispose);
    return vm;
  }

  setUp(
    () => repo = ReservasFalsas([reservaDePrueba(salida: _ahora.add(const Duration(days: 2)))]),
  );

  group('carga', () {
    test('sin reserva previa: cargando, sin reserva ni error', () {
      final vm = crear();
      expect(vm.cargando, isTrue);
      expect(vm.reserva, isNull);
      expect(vm.error, isNull);
      expect(vm.cambio, isFalse);
    });

    test('con la reserva de la lista se pinta de inmediato y no se pide al backend', () {
      final vm = crear(inicial: repo.lista.first);
      expect(vm.cargando, isFalse);
      expect(vm.reserva?.id, 'res-1');
      expect(repo.consultas, isEmpty);
    });

    test('éxito: cargando → reserva, con una consulta por id', () async {
      final vm = crear();
      final estados = <bool>[];
      vm.addListener(() => estados.add(vm.cargando));

      await vm.cargar();

      expect(estados, [true, false]);
      expect(vm.reserva?.id, 'res-1');
      expect(vm.error, isNull);
      expect(repo.consultas, ['res-1']);
    });

    test('reserva que no existe: queda el motivo en `error` y reintentar lo limpia', () async {
      repo.lista = [];
      final vm = crear();
      await vm.cargar();

      expect(vm.reserva, isNull);
      expect(vm.cargando, isFalse);
      expect(vm.error, DiversoException('RESERVA_NO_EXISTE').mensajeUsuario);

      repo.lista = [reservaDePrueba(salida: _ahora.add(const Duration(days: 2)))];
      await vm.cargar();

      expect(vm.error, isNull);
      expect(vm.reserva?.id, 'res-1');
    });

    test('un error que no es de Diverso también queda como mensaje, no se pierde', () async {
      repo.fallo = Exception('sin red');
      final vm = crear();
      await vm.cargar();

      expect(vm.error, isNotNull);
      expect(vm.reserva, isNull);
    });

    test('si falla al actualizar una reserva ya visible, la deja y avisa en `mensaje`', () async {
      final vm = crear(inicial: repo.lista.first);
      repo.fallo = Exception('sin red');

      await vm.cargar();

      expect(vm.reserva?.id, 'res-1');
      expect(vm.error, isNull);
      expect(vm.mensaje, 'No pudimos actualizar la reserva.');
    });

    test('no pierde la marca «ya reseñada» que traía la lista', () async {
      final vm = crear(inicial: reservaDePrueba(tieneResena: true));
      await vm.cargar();
      expect(vm.reserva?.tieneResena, isTrue);
    });

    test('dispose: una carga que termina después no avisa a nadie ni lanza', () async {
      repo.compuerta = Completer<void>();
      final vm = crear(limpiar: false);
      final carga = vm.cargar();
      vm.dispose();
      repo.compuerta!.complete();

      await expectLater(carga, completes);
    });
  });

  group('cambios y acciones', () {
    test('cancelar: avisa, marca que hubo cambios y recarga solo esta reserva', () async {
      final vm = crear(inicial: repo.lista.first);

      expect(await vm.cancelar(repo.lista.first), isTrue);

      expect(vm.cambio, isTrue);
      expect(vm.mensaje, startsWith('Reserva cancelada y cupos liberados.'));
      expect(repo.consultas, ['res-1']);
      expect(repo.consultasLista, 0, reason: 'el detalle no recarga la lista de reservas');
    });

    test('cancelar que el servidor rechaza explica el motivo', () async {
      final vm = crear(inicial: repo.lista.first);
      repo.falloAlCancelar = DiversoException('ESTADO_INVALIDO');

      expect(await vm.cancelar(repo.lista.first), isFalse);
      expect(vm.mensaje, 'La reserva ya no admite esta operación.');
    });

    test('después del pago: marca cambios y vuelve a cargar la reserva', () async {
      final vm = crear(inicial: repo.lista.first);

      await vm.pagoIntentado();

      expect(vm.cambio, isTrue);
      expect(repo.consultas, ['res-1']);
    });

    test('reseña publicada: marca cambios y la reserva pasa a «ya reseñada»', () {
      final vm = crear(inicial: reservaDePrueba(salida: _ahora.subtract(const Duration(days: 2))));
      expect(vm.puedeResenar(vm.reserva!), isTrue);

      vm.resenaPublicada();

      expect(vm.cambio, isTrue);
      expect(vm.reserva?.tieneResena, isTrue);
      expect(vm.puedeResenar(vm.reserva!), isFalse);
    });

    test('puedeCancelar y puedeResenar salen de la reserva y del reloj', () {
      final vm = crear();
      final proxima = reservaDePrueba(salida: _ahora.add(const Duration(days: 2)));
      final pasada = reservaDePrueba(salida: _ahora.subtract(const Duration(days: 1)));

      expect(vm.puedeCancelar(proxima), isTrue);
      expect(vm.puedeResenar(proxima), isFalse);
      expect(vm.puedeCancelar(pasada), isFalse);
      expect(vm.puedeResenar(pasada), isTrue);
    });
  });
}

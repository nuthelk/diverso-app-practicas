import 'package:flutter/foundation.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:viajero/ui/core/notifica_si_vive.dart';

/// Un view model mínimo: solo sirve para ejercitar el mixin.
class _Contador extends ChangeNotifier with NotificaSiVive {
  void sumar() => notificar();

  /// Lo que haría un comando async cuando la pantalla ya se cerró: llamar a `notifyListeners` a
  /// pelo falla; `notificar` no.
  void sumarSinGuarda() => notifyListeners();
}

void main() {
  test('mientras vive: notificar avisa a los oyentes y desechado es false', () {
    final vm = _Contador();
    var avisos = 0;
    vm.addListener(() => avisos++);

    vm.sumar();
    vm.sumar();

    expect(avisos, 2);
    expect(vm.desechado, isFalse);
    vm.dispose();
  });

  test('tras dispose: desechado es true y notificar no avisa ni lanza', () {
    final vm = _Contador();
    var avisos = 0;
    vm.addListener(() => avisos++);

    vm.dispose();

    expect(vm.desechado, isTrue);
    expect(vm.sumar, returnsNormally);
    expect(avisos, 0);
  });

  test('sin la guarda, notifyListeners tras dispose sí falla (por eso existe el mixin)', () {
    final vm = _Contador()..dispose();
    expect(vm.sumarSinGuarda, throwsFlutterError);
  });
}

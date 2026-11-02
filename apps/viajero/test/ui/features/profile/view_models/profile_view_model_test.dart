import 'dart:async';

import 'package:diverso_core/diverso_core.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:viajero/ui/features/profile/view_models/profile_view_model.dart';

import '../../../../support/auth_falso.dart';

/// `ProfileViewModel` con un `AuthFalso`: carga del perfil (éxito, error, reintento), nombre e
/// inicial con respaldo, cierre de sesión y protección tras `dispose`.

void main() {
  late AuthFalso auth;
  late ProfileViewModel vm;

  setUp(() {
    auth = AuthFalso();
    vm = ProfileViewModel(auth: auth);
    addTearDown(vm.dispose);
  });

  test('antes de cargar: cargando, «Viajero» con inicial V y el correo de la sesión', () {
    expect(vm.cargando, isTrue);
    expect(vm.perfil, isNull);
    expect(vm.error, isNull);
    expect(vm.nombre, 'Viajero');
    expect(vm.inicial, 'V');
    expect(vm.email, 'ana@correo.test');
  });

  test('éxito: cargando → perfil con su nombre y su inicial en mayúscula', () async {
    auth.perfil = Profile(id: 'u', rol: UserRole.viajero, nombre: 'ana');
    final estados = <bool>[];
    vm.addListener(() => estados.add(vm.cargando));

    await vm.cargar();

    expect(estados, [true, false]);
    expect(vm.nombre, 'ana');
    expect(vm.inicial, 'A');
    expect(vm.error, isNull);
    expect(auth.cargasDePerfil, 1);
  });

  test('nombre vacío: la inicial es V (no se rompe)', () async {
    auth.perfil = Profile(id: 'u', rol: UserRole.viajero, nombre: '');
    await vm.cargar();

    expect(vm.inicial, 'V');
  });

  test(
    'la inicial es la primera letra completa, aunque sea un emoji (sin partir el carácter)',
    () async {
      auth.perfil = Profile(id: 'u', rol: UserRole.viajero, nombre: '😀 Ana');
      await vm.cargar();

      expect(vm.inicial, '😀');
    },
  );

  test('sin correo en la sesión, el correo es vacío', () {
    auth.email = null;
    expect(vm.email, '');
  });

  test('error: queda visible en `error`, sigue «Viajero» y reintentar lo limpia', () async {
    auth.falloAlCargarPerfil = Exception('sin red');
    await vm.cargar();

    expect(vm.error, 'No pudimos cargar tu perfil.');
    expect(vm.cargando, isFalse);
    expect(vm.perfil, isNull);
    expect(vm.nombre, 'Viajero');

    auth.falloAlCargarPerfil = null;
    await vm.cargar();

    expect(vm.error, isNull);
    expect(vm.nombre, 'Ana');
  });

  test('cerrarSesion: true y la sesión se cierra', () async {
    expect(await vm.cerrarSesion(), isTrue);
    expect(auth.currentUserId, isNull);
  });

  test('cerrarSesion que falla: false, y la sesión sigue abierta', () async {
    auth.falloAlSalir = Exception('sin red');

    expect(await vm.cerrarSesion(), isFalse);
    expect(auth.currentUserId, 'viajero-1');
  });

  test('dispose: una carga que termina después no avisa a nadie ni lanza', () async {
    auth.compuertaPerfil = Completer<void>();
    final propio = ProfileViewModel(auth: auth);
    final carga = propio.cargar();
    propio.dispose();
    auth.compuertaPerfil!.complete();

    await expectLater(carga, completes);
  });
}

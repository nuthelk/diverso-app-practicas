import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:viajero/ui/features/auth/view_models/login_view_model.dart';

import '../../../../support/auth_falso.dart';

/// `LoginViewModel` con un `AuthFalso`: entrar, crear cuenta con autorización expresa, errores
/// con el mismo texto de siempre, cuenta demo solo si el flag lo permite y protección tras
/// `dispose`.

void main() {
  late AuthFalso auth;

  LoginViewModel crear({bool? cuentaDemo, bool limpiar = true}) {
    final vm = LoginViewModel(auth: auth, cuentaDemo: cuentaDemo);
    if (limpiar) addTearDown(vm.dispose);
    return vm;
  }

  setUp(() => auth = AuthFalso());

  Future<void> enviar(
    LoginViewModel vm, {
    bool valido = true,
    String nombre = '  Ana  ',
    String email = ' ana@correo.test ',
  }) => vm.enviar(formularioValido: valido, nombre: nombre, email: email, password: 'secreto');

  group('estado inicial', () {
    test('entrar, sin cargar, sin error y sin casillas marcadas', () {
      final vm = crear();
      expect(vm.esRegistro, isFalse);
      expect(vm.cargando, isFalse);
      expect(vm.error, isNull);
      expect(vm.aceptaDatos, isFalse);
      expect(vm.aceptaTerminos, isFalse);
      expect(vm.intentoRegistro, isFalse);
    });

    test('alternarModo cambia entre entrar y crear cuenta y limpia error e intento', () async {
      final vm = crear();
      vm.alternarModo();
      expect(vm.esRegistro, isTrue);

      await enviar(vm);
      expect(vm.intentoRegistro, isTrue);

      vm.alternarModo();
      expect(vm.esRegistro, isFalse);
      expect(vm.intentoRegistro, isFalse);
      expect(vm.error, isNull);
    });
  });

  group('entrar', () {
    test('con datos válidos llama a signIn con el correo recortado', () async {
      final vm = crear();
      await enviar(vm);

      expect(auth.entradas, [(email: 'ana@correo.test', password: 'secreto')]);
      expect(vm.cargando, isFalse);
      expect(vm.error, isNull);
    });

    test('con el formulario inválido no llama a nada', () async {
      final vm = crear();
      await enviar(vm, valido: false);

      expect(auth.entradas, isEmpty);
      expect(vm.cargando, isFalse);
    });

    test('cargando mientras responde y un segundo envío no repite la petición', () async {
      auth.compuerta = Completer<void>();
      final vm = crear();
      final estados = <bool>[];
      vm.addListener(() => estados.add(vm.cargando));

      final primero = enviar(vm);
      expect(vm.cargando, isTrue);
      await enviar(vm);

      auth.compuerta!.complete();
      await primero;

      expect(estados, [true, false]);
      expect(auth.entradas, hasLength(1));
    });

    test('credenciales rechazadas: mensaje de siempre y el botón se libera', () async {
      auth.falloAlEntrar = Exception('Invalid login credentials');
      final vm = crear();
      await enviar(vm);

      expect(vm.error, 'Correo o contraseña incorrectos, o no hay conexión.');
      expect(vm.cargando, isFalse);
    });

    test('un nuevo intento limpia el error anterior', () async {
      auth.falloAlEntrar = Exception('x');
      final vm = crear();
      await enviar(vm);
      auth.falloAlEntrar = null;

      await enviar(vm);

      expect(vm.error, isNull);
    });
  });

  group('crear cuenta', () {
    test('sin las dos casillas no se envía nada, pero se marca el intento', () async {
      final vm = crear()..alternarModo();
      vm.cambiarAceptaDatos(true);

      await enviar(vm);

      expect(auth.registros, isEmpty);
      expect(vm.intentoRegistro, isTrue);
      expect(vm.cargando, isFalse);
    });

    test('con las dos casillas y el formulario válido registra con autorización expresa', () async {
      final vm = crear()..alternarModo();
      vm.cambiarAceptaDatos(true);
      vm.cambiarAceptaTerminos(true);

      await enviar(vm);

      expect(auth.registros, [
        (nombre: 'Ana', email: 'ana@correo.test', password: 'secreto', aceptaDocumentos: true),
      ]);
      expect(vm.error, isNull);
    });

    test('con las casillas pero el formulario inválido tampoco registra', () async {
      final vm = crear()..alternarModo();
      vm.cambiarAceptaDatos(true);
      vm.cambiarAceptaTerminos(true);

      await enviar(vm, valido: false);

      expect(auth.registros, isEmpty);
    });

    test('si falla (correo ya registrado) muestra el mensaje de registro', () async {
      auth.falloAlEntrar = Exception('User already registered');
      final vm = crear()..alternarModo();
      vm.cambiarAceptaDatos(true);
      vm.cambiarAceptaTerminos(true);

      await enviar(vm);

      expect(vm.error, 'No pudimos crear la cuenta. ¿Ese correo ya está registrado?');
      expect(vm.cargando, isFalse);
    });
  });

  group('cuenta demo (bug A)', () {
    test('con el flag apagado (release) nunca se ofrece, ni al entrar ni al registrarse', () {
      final vm = crear(cuentaDemo: false);
      expect(vm.ofreceCuentaDemo, isFalse);
      vm.alternarModo();
      expect(vm.ofreceCuentaDemo, isFalse);
    });

    test('con el flag encendido (debug) se ofrece solo al entrar', () {
      final vm = crear(cuentaDemo: true);
      expect(vm.ofreceCuentaDemo, isTrue);
      vm.alternarModo();
      expect(vm.ofreceCuentaDemo, isFalse);
    });

    test('por defecto sigue a kDebugMode (las pruebas corren en debug)', () {
      expect(crear().ofreceCuentaDemo, isTrue);
    });
  });

  test('dispose: una respuesta que llega después no avisa a nadie ni lanza', () async {
    auth.compuerta = Completer<void>();
    final vm = crear(limpiar: false);
    final envio = enviar(vm);
    vm.dispose();
    auth.compuerta!.complete();

    await expectLater(envio, completes);
  });
}

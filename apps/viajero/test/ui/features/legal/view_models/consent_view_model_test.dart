import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:viajero/ui/features/legal/view_models/consent_view_model.dart';

import '../../../../support/auth_falso.dart';

/// El consentimiento como estado de enrutamiento: qué consulta, cuándo la repite y qué nunca
/// hace (dejar pasar un estado desconocido). Sin red ni Supabase.

const _pendientes = ['tratamiento_datos', 'terminos_viajero'];

/// Deja correr las consultas pendientes (todas son microtareas).
Future<void> _esperar() => Future<void>.delayed(Duration.zero);

ConsentViewModel _vm(AuthFalso auth) {
  final vm = ConsentViewModel(auth: auth);
  addTearDown(vm.dispose);
  return vm;
}

void main() {
  test('sin sesión no consulta nada y queda verificándose', () async {
    final auth = AuthFalso(usuario: null);
    final vm = _vm(auth);
    await _esperar();
    expect(vm.estado, EstadoConsentimiento.verificando);
    expect(auth.consultas, 0);
  });

  test('con sesión y al día: aceptado', () async {
    final vm = _vm(AuthFalso());
    expect(vm.estado, EstadoConsentimiento.verificando);
    await _esperar();
    expect(vm.estado, EstadoConsentimiento.aceptado);
    expect(vm.pendientes, isEmpty);
  });

  test('con sesión y documentos sin aceptar: pendiente, con cuáles faltan', () async {
    final vm = _vm(AuthFalso(consultas: [_pendientes]));
    await _esperar();
    expect(vm.estado, EstadoConsentimiento.pendiente);
    expect(vm.pendientes, _pendientes);
  });

  group('cuando la consulta falla', () {
    test('queda en error (nunca aceptado) y «reintentar» vuelve a consultar', () async {
      final auth = AuthFalso(consultas: [Exception('sin red'), _pendientes]);
      final vm = _vm(auth);
      await _esperar();
      expect(vm.estado, EstadoConsentimiento.error);

      await vm.reintentar();

      expect(auth.consultas, 2);
      expect(vm.estado, EstadoConsentimiento.pendiente);
      expect(vm.pendientes, _pendientes);
    });

    test('si el reintento también falla sigue en error', () async {
      final auth = AuthFalso(consultas: [Exception('sin red')]);
      final vm = _vm(auth);
      await _esperar();
      await vm.reintentar();
      expect(auth.consultas, 2);
      expect(vm.estado, EstadoConsentimiento.error);
    });

    test('notifica al pasar por «verificando» y al terminar', () async {
      final vm = _vm(AuthFalso(consultas: [Exception('sin red'), <String>[]]));
      await _esperar();
      final vistos = <EstadoConsentimiento>[];
      vm.addListener(() => vistos.add(vm.estado));

      await vm.reintentar();

      expect(vistos, [EstadoConsentimiento.verificando, EstadoConsentimiento.aceptado]);
    });
  });

  test('«reintentar» no repite la consulta si ya se sabe el estado', () async {
    final auth = AuthFalso(consultas: [_pendientes]);
    final vm = _vm(auth);
    await _esperar();
    await vm.reintentar();
    expect(auth.consultas, 1);
    expect(vm.estado, EstadoConsentimiento.pendiente);
  });

  group('sesión', () {
    test('al iniciar sesión consulta el consentimiento de ese usuario', () async {
      final auth = AuthFalso(usuario: null, consultas: [_pendientes]);
      final vm = _vm(auth);
      auth.cambiarSesion('viajero-2');
      await _esperar();
      expect(auth.consultas, 1);
      expect(vm.estado, EstadoConsentimiento.pendiente);
    });

    test('un refresco de token (mismo usuario) no vuelve a consultar', () async {
      final auth = AuthFalso();
      final vm = _vm(auth);
      await _esperar();
      var avisos = 0;
      vm.addListener(() => avisos++);

      auth.cambiarSesion('viajero-1');
      await _esperar();

      expect(auth.consultas, 1);
      expect(avisos, 0);
    });

    test('al cambiar de usuario olvida el estado del anterior y consulta de nuevo', () async {
      final auth = AuthFalso(consultas: [<String>[], _pendientes]);
      final vm = _vm(auth);
      await _esperar();
      expect(vm.estado, EstadoConsentimiento.aceptado);

      final vistos = <EstadoConsentimiento>[];
      vm.addListener(() => vistos.add(vm.estado));
      auth.cambiarSesion('viajero-2');
      await _esperar();

      expect(vistos, [EstadoConsentimiento.verificando, EstadoConsentimiento.pendiente]);
    });

    test('al cerrar sesión vuelve a «verificando» y no consulta', () async {
      final auth = AuthFalso();
      final vm = _vm(auth);
      await _esperar();

      auth.cambiarSesion(null);
      await _esperar();

      expect(vm.estado, EstadoConsentimiento.verificando);
      expect(auth.consultas, 1);
    });

    test('la respuesta tardía de un usuario anterior no pisa la del actual', () async {
      final tardia = Completer<List<String>>();
      final auth = _AuthLento(tardia.future);
      final vm = _vm(auth);
      // La consulta de viajero-1 queda colgada; entra otro usuario, que sí está al día.
      auth.cambiarSesion('viajero-2');
      await _esperar();
      expect(vm.estado, EstadoConsentimiento.aceptado);

      tardia.complete(_pendientes);
      await _esperar();

      expect(vm.estado, EstadoConsentimiento.aceptado);
      expect(vm.pendientes, isEmpty);
    });
  });

  group('aceptar', () {
    test('registra cada documento pendiente y confirma con el servidor', () async {
      final auth = AuthFalso(consultas: [_pendientes, <String>[]]);
      final vm = _vm(auth);
      await _esperar();

      final guardado = await vm.aceptar();

      expect(guardado, isTrue);
      expect(auth.registrados, _pendientes);
      expect(auth.consultas, 2);
      expect(vm.estado, EstadoConsentimiento.aceptado);
    });

    test('si no se puede guardar devuelve false y sigue pendiente', () async {
      final auth = AuthFalso(consultas: [_pendientes])..falloAlRegistrar = true;
      final vm = _vm(auth);
      await _esperar();

      expect(await vm.aceptar(), isFalse);

      expect(vm.estado, EstadoConsentimiento.pendiente);
      expect(auth.registrados, isEmpty);
      expect(auth.consultas, 1);
    });

    test('si no hay nada pendiente (error o al día) no registra nada', () async {
      final auth = AuthFalso(consultas: [Exception('sin red')]);
      final vm = _vm(auth);
      await _esperar();

      expect(await vm.aceptar(), isFalse);
      expect(auth.registrados, isEmpty);
    });
  });

  test('«cerrar sesión» cierra la sesión del repositorio', () async {
    final auth = AuthFalso();
    final vm = _vm(auth);
    await vm.cerrarSesion();
    expect(auth.currentUserId, isNull);
  });

  group('una consulta que no responde', () {
    testWidgets('pasado el tiempo límite queda en error y «reintentar» vuelve a consultar', (
      tester,
    ) async {
      final auth = _AuthColgado();
      final vm = _vm(auth);
      await tester.pump();
      expect(vm.estado, EstadoConsentimiento.verificando);

      await tester.pump(ConsentViewModel.tiempoLimite - const Duration(seconds: 1));
      expect(vm.estado, EstadoConsentimiento.verificando);

      await tester.pump(const Duration(seconds: 1));
      expect(vm.estado, EstadoConsentimiento.error);
      expect(auth.consultas, 1);

      unawaited(vm.reintentar());
      await tester.pump();
      expect(auth.consultas, 2);
      expect(vm.estado, EstadoConsentimiento.verificando);
      // La segunda consulta tampoco responde: se vence también y no queda ningún temporizador.
      await tester.pump(ConsentViewModel.tiempoLimite);
      expect(vm.estado, EstadoConsentimiento.error);
    });

    testWidgets('si responde a tiempo no hay error', (tester) async {
      final tardia = Completer<List<String>>();
      final vm = _vm(_AuthLento(tardia.future));
      await tester.pump(ConsentViewModel.tiempoLimite - const Duration(seconds: 1));

      tardia.complete(const []);
      await tester.pump();

      expect(vm.estado, EstadoConsentimiento.aceptado);
      await tester.pump(ConsentViewModel.tiempoLimite);
      expect(vm.estado, EstadoConsentimiento.aceptado);
    });
  });

  test('tras dispose una respuesta tardía no notifica', () async {
    final tardia = Completer<List<String>>();
    final vm = ConsentViewModel(auth: _AuthLento(tardia.future));
    var avisos = 0;
    vm.addListener(() => avisos++);

    vm.dispose();
    tardia.complete(_pendientes);
    await _esperar();

    expect(avisos, 0);
  });
}

/// Una consulta de consentimiento que nunca responde.
class _AuthColgado extends AuthFalso {
  @override
  Future<List<String>> consentimientosPendientes() {
    consultas++;
    return Completer<List<String>>().future;
  }
}

/// Una consulta de consentimiento que no responde hasta que el test lo decide (solo la primera).
class _AuthLento extends AuthFalso {
  _AuthLento(this._primera);

  final Future<List<String>> _primera;
  var _atendida = false;

  @override
  Future<List<String>> consentimientosPendientes() {
    if (_atendida) return super.consentimientosPendientes();
    _atendida = true;
    return _primera;
  }
}

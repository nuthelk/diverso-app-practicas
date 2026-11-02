import 'dart:async';

import 'package:diverso_core/diverso_core.dart';

/// [AuthRepository] sin Supabase para pruebas del router y del consentimiento.
class AuthFalso implements AuthRepository {
  AuthFalso({String? usuario = 'viajero-1', List<Object> consultas = const [<String>[]]})
    : _usuario = usuario,
      _consultas = consultas;

  String? _usuario;

  /// Una respuesta por consulta de consentimiento, en orden (la última se repite): la lista de
  /// documentos pendientes o un error que se lanza. Por defecto el usuario está al día.
  final List<Object> _consultas;

  /// Cuántas veces se consultó el consentimiento.
  int consultas = 0;

  /// Documentos cuya aceptación se registró.
  final registrados = <String>[];

  /// Si es `true`, `registrarConsentimiento` falla.
  bool falloAlRegistrar = false;

  final _cambios = StreamController<String?>.broadcast();

  /// Simula que entra, sale o cambia el usuario de la sesión.
  void cambiarSesion(String? usuario) {
    _usuario = usuario;
    _cambios.add(usuario);
  }

  @override
  String? get currentUserId => _usuario;

  @override
  Stream<String?> get onAuthStateChanged => _cambios.stream;

  @override
  Future<List<String>> consentimientosPendientes() async {
    final respuesta = _consultas[consultas < _consultas.length ? consultas : _consultas.length - 1];
    consultas++;
    if (respuesta is List<String>) return respuesta;
    throw respuesta;
  }

  @override
  Future<void> registrarConsentimiento(String tipo) async {
    if (falloAlRegistrar) throw Exception('sin red');
    registrados.add(tipo);
  }

  @override
  Future<void> signOut() async => cambiarSesion(null);

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

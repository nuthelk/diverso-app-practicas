import 'dart:async';

import 'package:diverso_core/diverso_core.dart';

/// [AuthRepository] sin Supabase para pruebas del router, el consentimiento, el acceso y el perfil.
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

  /// Correo y perfil del usuario actual (`currentProfile` lanza [falloAlCargarPerfil] si existe).
  String? email = 'ana@correo.test';
  Profile? perfil;
  Object? falloAlCargarPerfil;
  int cargasDePerfil = 0;

  /// Si no es null, `currentProfile` espera a que se complete (respuestas tardías).
  Completer<void>? compuertaPerfil;

  /// Si no es null, `signIn`, `signUpViajero` y `signOut` lo lanzan.
  Object? falloAlEntrar;
  Object? falloAlSalir;

  /// Si no es null, `signIn` y `signUpViajero` esperan a que se complete.
  Completer<void>? compuerta;

  final entradas = <({String email, String password})>[];
  final registros = <({String nombre, String email, String password, bool aceptaDocumentos})>[];

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
  String? get currentUserEmail => email;

  @override
  Future<Profile> currentProfile() async {
    cargasDePerfil++;
    await compuertaPerfil?.future;
    if (falloAlCargarPerfil != null) throw falloAlCargarPerfil!;
    return perfil ?? Profile(id: 'u', rol: UserRole.viajero, nombre: 'Ana');
  }

  @override
  Future<void> signIn({required String email, required String password}) async {
    await compuerta?.future;
    if (falloAlEntrar != null) throw falloAlEntrar!;
    entradas.add((email: email, password: password));
  }

  @override
  Future<void> signUpViajero({
    required String nombre,
    required String email,
    required String password,
    required bool aceptaDocumentos,
  }) async {
    await compuerta?.future;
    if (falloAlEntrar != null) throw falloAlEntrar!;
    registros.add((
      nombre: nombre,
      email: email,
      password: password,
      aceptaDocumentos: aceptaDocumentos,
    ));
  }

  @override
  Future<void> signOut() async {
    if (falloAlSalir != null) throw falloAlSalir!;
    cambiarSesion(null);
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

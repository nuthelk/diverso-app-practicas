import 'package:diverso_core/diverso_core.dart';
import 'package:flutter/foundation.dart';

/// ViewModel del acceso: alterna entre entrar y crear cuenta, guarda las casillas de autorización
/// (Ley 1581) y envía el formulario. Los campos de texto y su validación viven en la vista.
class LoginViewModel extends ChangeNotifier {
  /// [cuentaDemo] decide si se ofrece «Usar cuenta demo»; por defecto solo en builds de debug
  /// (en release la clave de la cuenta de pruebas no debe estar a un toque).
  LoginViewModel({required AuthRepository auth, bool? cuentaDemo})
    : _auth = auth,
      _cuentaDemo = cuentaDemo ?? kDebugMode;

  /// Credenciales de la cuenta de pruebas del seed.
  static const correoDemo = 'viajero@demo.com';
  static const claveDemo = 'demo1234';

  final AuthRepository _auth;
  final bool _cuentaDemo;
  bool _desechado = false;

  bool _esRegistro = false;
  bool _cargando = false;
  bool _aceptaDatos = false;
  bool _aceptaTerminos = false;
  bool _intentoRegistro = false;
  String? _error;

  bool get esRegistro => _esRegistro;
  bool get cargando => _cargando;
  bool get aceptaDatos => _aceptaDatos;
  bool get aceptaTerminos => _aceptaTerminos;

  /// Ya se intentó crear la cuenta: las casillas sin marcar se resaltan.
  bool get intentoRegistro => _intentoRegistro;

  /// Mensaje para el usuario si el último envío falló.
  String? get error => _error;

  /// «Usar cuenta demo» solo se ofrece al entrar, y solo si el flag lo permite.
  bool get ofreceCuentaDemo => _cuentaDemo && !_esRegistro;

  void alternarModo() {
    _esRegistro = !_esRegistro;
    _error = null;
    _intentoRegistro = false;
    _notificar();
  }

  void cambiarAceptaDatos(bool valor) {
    _aceptaDatos = valor;
    _notificar();
  }

  void cambiarAceptaTerminos(bool valor) {
    _aceptaTerminos = valor;
    _notificar();
  }

  /// Entra o crea la cuenta con lo escrito en el formulario. Al crear cuenta la autorización debe
  /// ser expresa: sin las dos casillas no se envía nada. Si entra, el router saca al usuario de
  /// aquí.
  Future<void> enviar({
    required bool formularioValido,
    required String nombre,
    required String email,
    required String password,
  }) async {
    if (_cargando) return;
    if (_esRegistro) {
      _intentoRegistro = true;
      _notificar();
      if (!_aceptaDatos || !_aceptaTerminos) return;
    }
    if (!formularioValido) return;
    _cargando = true;
    _error = null;
    _notificar();
    try {
      if (_esRegistro) {
        await _auth.signUpViajero(
          nombre: nombre.trim(),
          email: email.trim(),
          password: password,
          aceptaDocumentos: _aceptaDatos && _aceptaTerminos,
        );
      } else {
        await _auth.signIn(email: email.trim(), password: password);
      }
    } on Object catch (e) {
      debugPrint('LoginViewModel.enviar: $e');
      _error = _esRegistro
          ? 'No pudimos crear la cuenta. ¿Ese correo ya está registrado?'
          : 'Correo o contraseña incorrectos, o no hay conexión.';
    } finally {
      _cargando = false;
      _notificar();
    }
  }

  /// Una respuesta puede llegar cuando la pantalla ya se cerró (al entrar, el router la quita).
  void _notificar() {
    if (!_desechado) notifyListeners();
  }

  @override
  void dispose() {
    _desechado = true;
    super.dispose();
  }
}

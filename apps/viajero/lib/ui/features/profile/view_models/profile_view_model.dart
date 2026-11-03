import 'package:diverso_core/diverso_core.dart';
import 'package:flutter/foundation.dart';

import '../../../core/notifica_si_vive.dart';

/// ViewModel del perfil: carga el perfil del viajero (nombre) y cierra la sesión. El correo sale
/// de la sesión, así que se ve aunque el perfil no cargue.
class ProfileViewModel extends ChangeNotifier with NotificaSiVive {
  ProfileViewModel({required AuthRepository auth}) : _auth = auth;

  /// Lo que se muestra mientras no hay nombre (cargando, error o perfil sin nombre).
  static const nombrePorDefecto = 'Viajero';

  final AuthRepository _auth;

  Profile? _perfil;
  bool _cargando = true;
  String? _error;

  Profile? get perfil => _perfil;
  bool get cargando => _cargando;

  /// Mensaje para el usuario si el perfil no se pudo cargar.
  String? get error => _error;

  String get email => _auth.currentUserEmail ?? '';
  String get nombre => _perfil?.nombre ?? nombrePorDefecto;

  /// Primera letra del nombre en mayúscula (el carácter entero, sin partir un emoji); `V` si el
  /// nombre está vacío.
  String get inicial {
    final n = nombre;
    return n.isEmpty ? 'V' : String.fromCharCode(n.runes.first).toUpperCase();
  }

  Future<void> cargar() async {
    _cargando = true;
    _error = null;
    notificar();
    try {
      _perfil = await _auth.currentProfile();
    } on Object catch (e) {
      debugPrint('ProfileViewModel.cargar: $e');
      _error = 'No pudimos cargar tu perfil.';
    } finally {
      _cargando = false;
      notificar();
    }
  }

  /// Cierra la sesión (el router lleva al login). `false` si no se pudo.
  Future<bool> cerrarSesion() async {
    try {
      await _auth.signOut();
      return true;
    } on Object catch (e) {
      debugPrint('ProfileViewModel.cerrarSesion: $e');
      return false;
    }
  }
}

import 'dart:async';

import 'package:diverso_core/diverso_core.dart';
import 'package:flutter/foundation.dart';

import '../../../core/notifica_si_vive.dart';

/// Si el usuario actual aceptó la versión vigente de los documentos legales.
enum EstadoConsentimiento {
  /// Aún no se sabe (consulta en curso o sin sesión).
  verificando,

  /// Falta aceptar algún documento: hay que pedir la autorización.
  pendiente,

  aceptado,

  /// La consulta falló: no se sabe si aceptó, así que se trata como pendiente hasta reintentar.
  error,
}

/// Estado de consentimiento como estado de **enrutamiento**: el router lo escucha (junto con la
/// sesión) y manda a `/consentimiento` a quien no esté al día. Se vuelve a consultar cuando
/// cambia la sesión y a pedido ([reintentar], que la app llama al volver a primer plano y el
/// botón «Reintentar»).
class ConsentViewModel extends ChangeNotifier with NotificaSiVive {
  /// Una consulta que no responde en este tiempo cuenta como fallida (`error`, con «Reintentar»):
  /// sin esto una petición colgada dejaría la verificación abierta para siempre.
  static const tiempoLimite = Duration(seconds: 15);

  ConsentViewModel({required AuthRepository auth}) : _auth = auth {
    _usuario = _auth.currentUserId;
    _sesion = _auth.onAuthStateChanged.listen(_alCambiarSesion);
    if (_usuario != null) unawaited(_revisar());
  }

  final AuthRepository _auth;
  late final StreamSubscription<String?> _sesion;
  String? _usuario;
  EstadoConsentimiento _estado = EstadoConsentimiento.verificando;
  List<String> _pendientes = const [];

  /// Se incrementa en cada consulta o cambio de sesión: una respuesta vieja no pisa a una nueva.
  int _revision = 0;

  EstadoConsentimiento get estado => _estado;

  /// Documentos vigentes aún sin aceptar (`tratamiento_datos`, `terminos_viajero`…).
  List<String> get pendientes => _pendientes;

  void _alCambiarSesion(String? usuario) {
    // Los refrescos de token repiten el mismo usuario: no hay nada que volver a consultar.
    if (usuario == _usuario) return;
    _usuario = usuario;
    _revision++;
    _pendientes = const [];
    _estado = EstadoConsentimiento.verificando;
    notificar();
    if (usuario != null) unawaited(_revisar());
  }

  Future<void> _revisar() async {
    final revision = ++_revision;
    if (_estado != EstadoConsentimiento.verificando) {
      _estado = EstadoConsentimiento.verificando;
      notificar();
    }
    try {
      final pendientes = await _auth.consentimientosPendientes().timeout(tiempoLimite);
      if (desechado || revision != _revision) return;
      _pendientes = pendientes;
      _estado = pendientes.isEmpty ? EstadoConsentimiento.aceptado : EstadoConsentimiento.pendiente;
    } on Object catch (e) {
      if (desechado || revision != _revision) return;
      debugPrint('ConsentViewModel: no se pudo verificar el consentimiento: $e');
      _estado = EstadoConsentimiento.error;
    }
    notificar();
  }

  /// Vuelve a consultar solo si la última consulta falló (si ya se sabe, no hay nada que repetir).
  Future<void> reintentar() async {
    if (_estado == EstadoConsentimiento.error && _usuario != null) await _revisar();
  }

  /// Registra la aceptación de los documentos pendientes y confirma con el servidor. `false` si
  /// no se pudo guardar (el estado no cambia y el usuario puede intentar de nuevo).
  Future<bool> aceptar() async {
    if (_estado != EstadoConsentimiento.pendiente) return false;
    try {
      for (final tipo in _pendientes) {
        await _auth.registrarConsentimiento(tipo);
      }
    } on Object catch (e) {
      debugPrint('ConsentViewModel: no se pudo guardar la autorización: $e');
      return false;
    }
    await _revisar();
    return true;
  }

  Future<void> cerrarSesion() => _auth.signOut();

  @override
  void dispose() {
    unawaited(_sesion.cancel());
    super.dispose();
  }
}

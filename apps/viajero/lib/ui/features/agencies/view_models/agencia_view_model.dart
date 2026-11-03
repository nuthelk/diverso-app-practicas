import 'dart:collection';

import 'package:diverso_core/diverso_core.dart';
import 'package:flutter/foundation.dart';

import '../../../core/notifica_si_vive.dart';

/// ViewModel de la página de una agencia: su resumen público y sus planes publicados. La vista lo
/// escucha con [ListenableBuilder].
class AgenciaViewModel extends ChangeNotifier with NotificaSiVive {
  AgenciaViewModel({required CatalogRepository catalogo, required String agencyId})
    : _catalogo = catalogo,
      _agencyId = agencyId;

  final CatalogRepository _catalogo;
  final String _agencyId;

  AgenciaResumen? _agencia;
  List<Plan> _planes = const [];
  bool _cargando = true;
  bool _noEncontrada = false;
  String? _error;
  String? _errorDetalle;

  /// Null mientras se carga, si la carga falló o si la agencia no existe.
  AgenciaResumen? get agencia => _agencia;
  List<Plan> get planes => _planes;
  bool get cargando => _cargando;

  /// La agencia no existe o no está habilitada (no se distingue a propósito).
  bool get noEncontrada => _noEncontrada;

  /// Mensaje para el usuario si la última carga falló.
  String? get error => _error;

  /// Detalle técnico del último error (para soporte).
  String? get errorDetalle => _errorDetalle;

  Future<void> cargar() async {
    _cargando = true;
    _error = null;
    _errorDetalle = null;
    notificar();
    try {
      final r = await _catalogo.agenciaConPlanes(_agencyId);
      _noEncontrada = r == null;
      _agencia = r?.agencia;
      _planes = UnmodifiableListView(r?.planes ?? const []);
    } on Object catch (e) {
      debugPrint('AgenciaViewModel.cargar: $e');
      _error = 'No pudimos cargar la agencia. Revisa tu conexión e intenta de nuevo.';
      _errorDetalle = e.toString();
    } finally {
      _cargando = false;
      notificar();
    }
  }
}

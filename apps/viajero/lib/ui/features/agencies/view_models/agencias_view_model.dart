import 'dart:collection';

import 'package:diverso_core/diverso_core.dart';
import 'package:flutter/foundation.dart';

import '../../../core/notifica_si_vive.dart';

/// ViewModel de la pestaña «Agencias» (MVVM): lista pública de agencias y su orden. La vista lo
/// escucha con [ListenableBuilder].
class AgenciasViewModel extends ChangeNotifier with NotificaSiVive {
  AgenciasViewModel({required CatalogRepository catalogo}) : _catalogo = catalogo;

  final CatalogRepository _catalogo;

  List<AgenciaResumen> _agencias = const [];
  List<AgenciaResumen> _ordenadas = const [];
  bool _cargando = true;
  String? _error;
  String? _errorDetalle;
  OrdenAgencias _orden = OrdenAgencias.puntaje;

  bool get hayAgencias => _agencias.isNotEmpty;

  /// Las agencias en el orden elegido.
  List<AgenciaResumen> get agencias => _ordenadas;

  bool get cargando => _cargando;

  /// Mensaje para el usuario si la última carga falló.
  String? get error => _error;

  /// Detalle técnico del último error (para soporte).
  String? get errorDetalle => _errorDetalle;

  OrdenAgencias get orden => _orden;

  Future<void> cargar() async {
    _cargando = true;
    _error = null;
    _errorDetalle = null;
    notificar();
    try {
      _agencias = await _catalogo.agencias();
      _ordenar();
    } on Object catch (e) {
      debugPrint('AgenciasViewModel.cargar: $e');
      _error = 'No pudimos cargar las agencias. Revisa tu conexión e intenta de nuevo.';
      _errorDetalle = e.toString();
    } finally {
      _cargando = false;
      notificar();
    }
  }

  void cambiarOrden(OrdenAgencias nuevo) {
    if (nuevo == _orden) return;
    _orden = nuevo;
    _ordenar();
    notificar();
  }

  void _ordenar() => _ordenadas = UnmodifiableListView(ordenarAgencias(_agencias, _orden));
}

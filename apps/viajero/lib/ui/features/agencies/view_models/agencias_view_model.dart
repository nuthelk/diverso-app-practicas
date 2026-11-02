import 'package:diverso_core/diverso_core.dart';
import 'package:flutter/foundation.dart';

/// ViewModel de la pestaña «Agencias» (MVVM): lista pública de agencias y su orden.
class AgenciasViewModel extends ChangeNotifier {
  AgenciasViewModel({required CatalogRepository catalogo}) : _catalogo = catalogo;

  final CatalogRepository _catalogo;

  List<AgenciaResumen> _agencias = const [];
  bool cargando = true;
  String? error;
  String? errorDetalle;
  OrdenAgencias orden = OrdenAgencias.puntaje;

  bool get hayAgencias => _agencias.isNotEmpty;

  /// Las agencias en el orden elegido.
  List<AgenciaResumen> get agencias => ordenarAgencias(_agencias, orden);

  Future<void> cargar() async {
    cargando = true;
    error = null;
    errorDetalle = null;
    notifyListeners();
    try {
      _agencias = await _catalogo.agencias();
    } catch (e) {
      debugPrint('AgenciasViewModel.cargar: $e');
      error = 'No pudimos cargar las agencias. Revisa tu conexión e intenta de nuevo.';
      errorDetalle = e.toString();
    } finally {
      cargando = false;
      notifyListeners();
    }
  }

  void cambiarOrden(OrdenAgencias nuevo) {
    if (nuevo == orden) return;
    orden = nuevo;
    notifyListeners();
  }
}

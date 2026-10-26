import 'package:flutter/foundation.dart';
import 'package:diverso_core/diverso_core.dart';

/// ViewModel de la pestaña «Agencias» (MVVM): lista pública de agencias y su orden.
class AgenciasController extends ChangeNotifier {
  AgenciasController({required CatalogService catalogo}) : _catalogo = catalogo;

  final CatalogService _catalogo;

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
      debugPrint('AgenciasController.cargar: $e');
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

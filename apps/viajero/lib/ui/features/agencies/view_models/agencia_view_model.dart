import 'package:diverso_core/diverso_core.dart';
import 'package:flutter/foundation.dart';

/// ViewModel de la página de una agencia: su resumen público y sus planes publicados.
class AgenciaViewModel extends ChangeNotifier {
  AgenciaViewModel({required CatalogService catalogo, required this.agencyId})
    : _catalogo = catalogo;

  final CatalogService _catalogo;
  final String agencyId;

  AgenciaResumen? agencia;
  List<Plan> planes = const [];
  bool cargando = true;

  /// La agencia no existe o no está habilitada (no se distingue a propósito).
  bool noEncontrada = false;
  String? error;
  String? errorDetalle;

  Future<void> cargar() async {
    cargando = true;
    error = null;
    errorDetalle = null;
    notifyListeners();
    try {
      final r = await _catalogo.agenciaConPlanes(agencyId);
      noEncontrada = r == null;
      agencia = r?.agencia;
      planes = r?.planes ?? const [];
    } catch (e) {
      debugPrint('AgenciaViewModel.cargar: $e');
      error = 'No pudimos cargar la agencia. Revisa tu conexión e intenta de nuevo.';
      errorDetalle = e.toString();
    } finally {
      cargando = false;
      notifyListeners();
    }
  }
}

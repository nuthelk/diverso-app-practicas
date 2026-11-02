import 'package:diverso_core/diverso_core.dart';
import 'package:flutter/foundation.dart';

/// Carga los planes que se comparan a partir de sus ids (`/comparar?ids=a,b`), de modo que la
/// pantalla se reconstruye igual tras recargar la página en web.
class ComparatorViewModel extends ChangeNotifier {
  /// [planesIniciales] adelanta los planes que el catálogo ya tenía en memoria; solo se usan si
  /// son exactamente los de [ids].
  ComparatorViewModel({
    required CatalogRepository catalogo,
    required List<String> ids,
    List<Plan>? planesIniciales,
  }) : _catalogo = catalogo,
       _ids = ids {
    if (planesIniciales != null && listEquals(planesIniciales.map((p) => p.id).toList(), ids)) {
      _planes = planesIniciales;
    } else if (ids.isEmpty) {
      _planes = const [];
    }
  }

  final CatalogRepository _catalogo;
  final List<String> _ids;
  List<Plan>? _planes;
  String? _error;
  bool _desechado = false;

  /// Los planes a comparar, en el orden de los ids; null mientras se cargan o si falló.
  List<Plan>? get planes => _planes;

  bool get cargando => _planes == null && _error == null;

  /// Mensaje para el usuario si no se pudieron cargar los planes.
  String? get error => _error;

  Future<void> cargar() async {
    if (_planes != null) return;
    _error = null;
    notifyListeners();
    try {
      final planes = await Future.wait(_ids.map(_catalogo.planDetalle));
      if (_desechado) return;
      _planes = planes;
    } on Object catch (e) {
      if (_desechado) return;
      debugPrint('ComparatorViewModel.cargar: $e');
      _error = 'No pudimos cargar los planes. Revisa tu conexión e intenta de nuevo.';
    }
    notifyListeners();
  }

  @override
  void dispose() {
    _desechado = true;
    super.dispose();
  }
}

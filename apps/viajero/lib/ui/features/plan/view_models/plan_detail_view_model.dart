import 'dart:collection';

import 'package:diverso_core/diverso_core.dart';
import 'package:flutter/foundation.dart';

/// ViewModel de la ficha del plan: carga el plan con sus reseñas y guarda la fecha elegida en la
/// barra de reserva. La vista lo escucha con [ListenableBuilder].
class PlanDetailViewModel extends ChangeNotifier {
  PlanDetailViewModel({
    required CatalogRepository catalogo,
    required ReviewRepository resenas,
    required String planId,
  }) : _catalogo = catalogo,
       _resenas = resenas,
       _planId = planId;

  /// Cuántas reseñas se muestran en la ficha.
  static const int maxResenas = 4;

  final CatalogRepository _catalogo;
  final ReviewRepository _resenas;
  final String _planId;
  bool _desechado = false;

  Plan? _plan;
  List<Review> _resenasPlan = const [];
  bool _cargando = true;
  String? _error;
  String? _fechaId;

  /// Null mientras se carga o si la carga falló.
  Plan? get plan => _plan;
  List<Review> get resenas => _resenasPlan;
  bool get cargando => _cargando;

  /// Mensaje para el usuario si la carga falló.
  String? get error => _error;

  /// Próximas fechas reservables del plan, de la más cercana a la más lejana. Depende del reloj
  /// (una salida que ya partió deja de ofrecerse), así que se calcula en cada lectura.
  List<PlanDate> get fechas => _plan?.fechasDisponibles ?? const [];

  /// La fecha elegida en la barra de reserva; mientras no se elija una, la más cercana. Se deriva
  /// de [fechas] en cada lectura: si la elegida deja de estar disponible, vale la primera.
  PlanDate? get fechaSeleccionada {
    final disponibles = fechas;
    if (disponibles.isEmpty) return null;
    return disponibles.firstWhere((f) => f.id == _fechaId, orElse: () => disponibles.first);
  }

  Future<void> cargar() async {
    _cargando = true;
    _error = null;
    _fechaId = null;
    _notificar();
    try {
      final plan = await _catalogo.planDetalle(_planId);
      final resenas = await _resenas.porPlan(_planId, limit: maxResenas);
      _plan = plan;
      _resenasPlan = UnmodifiableListView(resenas);
    } on Object catch (e) {
      debugPrint('PlanDetailViewModel.cargar: $e');
      _error = 'Revisa tu conexión e intenta de nuevo.';
    } finally {
      _cargando = false;
      _notificar();
    }
  }

  /// Elige la fecha de la barra de reserva; una que no esté entre [fechas] se ignora.
  void seleccionarFecha(PlanDate fecha) {
    if (!fechas.any((f) => f.id == fecha.id)) return;
    _fechaId = fecha.id;
    _notificar();
  }

  /// Una carga puede terminar cuando la pantalla ya se cerró: ahí no hay nadie a quien avisar.
  void _notificar() {
    if (!_desechado) notifyListeners();
  }

  @override
  void dispose() {
    _desechado = true;
    super.dispose();
  }
}

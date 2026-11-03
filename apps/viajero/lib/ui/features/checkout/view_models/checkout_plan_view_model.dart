import 'package:diverso_core/diverso_core.dart';
import 'package:flutter/foundation.dart';

import '../../../core/notifica_si_vive.dart';

/// ViewModel de la carga de `/checkout/:planId/:fechaId`: trae el plan por id (la pantalla se
/// reconstruye igual tras recargar la página en web) y localiza la fecha pedida.
class CheckoutPlanViewModel extends ChangeNotifier with NotificaSiVive {
  CheckoutPlanViewModel({
    required CatalogRepository catalogo,
    required String planId,
    required String fechaId,
  }) : _catalogo = catalogo,
       _planId = planId,
       _fechaId = fechaId;

  final CatalogRepository _catalogo;
  final String _planId;
  final String _fechaId;

  Plan? _plan;
  bool _cargando = true;
  String? _error;

  /// Null mientras se carga o si la carga falló.
  Plan? get plan => _plan;
  bool get cargando => _cargando;

  /// Mensaje para el usuario si la carga falló.
  String? get error => _error;

  /// La fecha pedida, si sigue reservable. Null con el plan cargado = la fecha ya no está
  /// disponible (no existe en el plan o la salida ya partió); depende del reloj, así que se
  /// calcula en cada lectura.
  PlanDate? get fecha {
    final plan = _plan;
    if (plan == null) return null;
    return plan.dates.where((d) => d.id == _fechaId && !plan.yaSalio(d)).firstOrNull;
  }

  Future<void> cargar() async {
    _cargando = true;
    _error = null;
    notificar();
    try {
      _plan = await _catalogo.planDetalle(_planId);
    } on Object catch (e) {
      debugPrint('CheckoutPlanViewModel.cargar: $e');
      _error = 'Revisa tu conexión e intenta de nuevo.';
    } finally {
      _cargando = false;
      notificar();
    }
  }
}

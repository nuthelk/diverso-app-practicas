import 'dart:collection';

import 'package:diverso_core/diverso_core.dart';
import 'package:flutter/foundation.dart';

import 'reserva_acciones_view_model.dart';

/// ViewModel de "Mis reservas": carga la lista, la separa en próximas e historial por la salida y
/// ejecuta cancelaciones (las acciones y el aviso vienen de [ReservaAccionesViewModel]).
class BookingsViewModel extends ReservaAccionesViewModel {
  BookingsViewModel({required super.reservas, super.reloj});

  List<Booking> _lista = const [];
  bool _cargando = true;
  String? _error;

  List<Booking> get reservas => _lista;
  bool get cargando => _cargando;

  /// Mensaje para el usuario si la carga falló.
  String? get error => _error;

  /// Próximas: pendientes o confirmadas que aún no salen, la salida más cercana primero.
  List<Booking> get activas =>
      _lista.where(esVigente).toList()..sort((a, b) => a.salida!.compareTo(b.salida!));

  /// Historial: todo lo demás, la salida más reciente primero.
  List<Booking> get historial => _lista.where((b) => !esVigente(b)).toList()
    ..sort((a, b) {
      final sa = a.salida, sb = b.salida;
      if (sa == null || sb == null) return sa == sb ? 0 : (sa == null ? 1 : -1);
      return sb.compareTo(sa);
    });

  @override
  Future<void> cargar() async {
    _cargando = true;
    _error = null;
    notificar();
    try {
      _lista = UnmodifiableListView(await repositorio.misReservas());
    } on Object catch (e) {
      debugPrint('BookingsViewModel.cargar: $e');
      _error = 'No pudimos cargar tus reservas.';
    } finally {
      _cargando = false;
      notificar();
    }
  }
}

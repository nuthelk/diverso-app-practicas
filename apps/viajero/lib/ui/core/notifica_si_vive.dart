import 'package:flutter/foundation.dart';

/// Guarda de dispose para los view models: un comando async puede terminar cuando la pantalla ya
/// se cerró y `notifyListeners` después de `dispose` lanza. Con este mixin los view models llaman a
/// [notificar] en vez de `notifyListeners`, y [desechado] sirve para abandonar el trabajo en curso.
mixin NotificaSiVive on ChangeNotifier {
  bool _desechado = false;

  /// El view model ya se desechó: nadie escucha y no hay nada que actualizar.
  bool get desechado => _desechado;

  /// `notifyListeners` salvo que el view model ya se haya desechado.
  @protected
  void notificar() {
    if (!_desechado) notifyListeners();
  }

  @override
  void dispose() {
    _desechado = true;
    super.dispose();
  }
}

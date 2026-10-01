import 'package:flutter/material.dart';

/// Controlador global de apariencia (sistema / claro / oscuro), registrado
/// con `provider` en el raíz de la app.
class ThemeModeController extends ChangeNotifier {
  ThemeMode _mode = ThemeMode.system;

  ThemeMode get mode => _mode;

  void setMode(ThemeMode mode) {
    _mode = mode;
    notifyListeners();
  }
}

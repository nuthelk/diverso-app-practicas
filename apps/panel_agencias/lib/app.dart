import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'router.dart';
import 'theme_mode_controller.dart';
import 'ui/core/app_theme.dart';

class PanelAgenciasApp extends StatelessWidget {
  const PanelAgenciasApp({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer<ThemeModeController>(
      builder: (context, modo, _) => MaterialApp.router(
        title: 'Diverso — Panel de Agencias',
        debugShowCheckedModeBanner: false,
        theme: AppTheme.panelLight(),
        darkTheme: AppTheme.panelDark(),
        themeMode: modo.mode,
        routerConfig: buildPanelRouter(),
      ),
    );
  }
}

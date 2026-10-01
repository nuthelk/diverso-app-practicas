import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'router.dart';
import 'theme_mode_controller.dart';
import 'ui/core/app_theme.dart';

class DiversoApp extends StatelessWidget {
  const DiversoApp({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer<ThemeModeController>(
      builder: (context, modo, _) => MaterialApp.router(
        title: 'Diverso App',
        debugShowCheckedModeBanner: false,
        theme: AppTheme.viajeroLight(),
        darkTheme: AppTheme.viajeroDark(),
        themeMode: modo.mode,
        routerConfig: buildViajeroRouter(),
      ),
    );
  }
}

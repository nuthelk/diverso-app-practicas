import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'router/app_router.dart';
import 'ui/core/theme/app_theme.dart';
import 'ui/core/theme/theme_mode_view_model.dart';

class DiversoApp extends StatelessWidget {
  const DiversoApp({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer<ThemeModeViewModel>(
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

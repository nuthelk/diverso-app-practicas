import 'package:diverso_core/diverso_core.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import 'router/app_router.dart';
import 'ui/core/theme/app_theme.dart';
import 'ui/core/theme/theme_mode_view_model.dart';
import 'ui/features/legal/view_models/consent_view_model.dart';

/// Raíz de la app. El router se crea **una sola vez** (en [State.initState]): si se construyera
/// dentro de `build` (p. ej. dentro del `Consumer` del tema), cambiar el tema crearía otro router
/// y la navegación volvería al inicio.
class DiversoApp extends StatefulWidget {
  const DiversoApp({super.key});

  @override
  State<DiversoApp> createState() => _DiversoAppState();
}

class _DiversoAppState extends State<DiversoApp> with WidgetsBindingObserver {
  late final GoRouter _router;
  late final ConsentViewModel _consentimiento;

  @override
  void initState() {
    super.initState();
    _consentimiento = context.read<ConsentViewModel>();
    _router = buildViajeroRouter(
      auth: context.read<AuthRepository>(),
      consentimiento: _consentimiento,
    );
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    // Si la verificación del consentimiento falló (sin red), al volver a la app se reintenta.
    if (state == AppLifecycleState.resumed) _consentimiento.reintentar();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _router.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<ThemeModeViewModel>(
      builder: (context, modo, _) => MaterialApp.router(
        title: 'Diverso App',
        debugShowCheckedModeBanner: false,
        theme: AppTheme.viajeroLight(),
        darkTheme: AppTheme.viajeroDark(),
        themeMode: modo.mode,
        routerConfig: _router,
      ),
    );
  }
}

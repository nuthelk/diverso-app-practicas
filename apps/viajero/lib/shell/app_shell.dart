import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:diverso_core/diverso_core.dart';

import '../ui/core/widgets.dart';

/// Shell inferior de la app: navegación con píldora indicadora.
///
/// Al entrar verifica que el usuario tenga aceptada la versión vigente de
/// la política de datos y los términos; si no, pide la autorización antes
/// de continuar (Ley 1581 de 2012).
class AppShell extends StatefulWidget {
  const AppShell({super.key, required this.shell});

  final StatefulNavigationShell shell;

  @override
  State<AppShell> createState() => _AppShellState();
}

class _AppShellState extends State<AppShell> {
  bool _revisado = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _revisarConsentimiento());
  }

  Future<void> _revisarConsentimiento() async {
    if (_revisado) return;
    _revisado = true;
    try {
      final pendientes = await AuthService().consentimientosPendientes();
      if (pendientes.isNotEmpty && mounted) {
        await context.push('/consentimiento');
      }
    } catch (_) {
      // Sin conexión: se vuelve a revisar en el próximo inicio de sesión.
      _revisado = false;
    }
  }

  @override
  Widget build(BuildContext context) {
    final shell = widget.shell;
    final cs = Theme.of(context).colorScheme;
    return Scaffold(
      extendBody: true,
      body: shell,
      bottomNavigationBar: Container(
        margin: const EdgeInsets.fromLTRB(16, 0, 16, 14),
        decoration: BoxDecoration(
          color: cs.surfaceContainerHigh,
          borderRadius: BorderRadius.circular(AppRadios.pill),
          border: Border.fromBorderSide(BorderSide(color: cs.outlineVariant.withValues(alpha: .4))),
        ),
        child: NavigationBar(
          backgroundColor: Colors.transparent,
          elevation: 0,
          height: 66,
          selectedIndex: shell.currentIndex,
          onDestinationSelected: (i) => shell.goBranch(
            i,
            initialLocation: i == shell.currentIndex,
          ),
          destinations: [
            NavigationDestination(
              icon: Icon(Icons.explore_outlined, color: cs.onSurfaceVariant),
              selectedIcon: const Icon(Icons.explore_rounded),
              label: 'Explorar',
            ),
            NavigationDestination(
              icon: Icon(Icons.receipt_long_outlined, color: cs.onSurfaceVariant),
              selectedIcon: const Icon(Icons.receipt_long_rounded),
              label: 'Reservas',
            ),
            NavigationDestination(
              icon: Icon(Icons.person_outline_rounded, color: cs.onSurfaceVariant),
              selectedIcon: const Icon(Icons.person_rounded),
              label: 'Perfil',
            ),
          ],
        ),
      ),
    );
  }
}

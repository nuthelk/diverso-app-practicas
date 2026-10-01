import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';


import '../ui/core/widgets.dart';

/// Shell inferior de la app: navegación con píldora indicadora.
class AppShell extends StatelessWidget {
  const AppShell({super.key, required this.shell});

  final StatefulNavigationShell shell;

  @override
  Widget build(BuildContext context) {
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

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

/// Shell inferior de la app: barra fija al borde, sólida y con línea superior, con la píldora
/// indicadora en el destino activo. El contenido termina donde empieza la barra.
///
/// El consentimiento (Ley 1581 de 2012) no se pide aquí: lo decide el redirect del router
/// (`sesionRedirect`) a partir de `ConsentViewModel`.
class AppShell extends StatelessWidget {
  const AppShell({super.key, required this.shell});

  final StatefulNavigationShell shell;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: shell,
      bottomNavigationBar: Column(
        key: const ValueKey('barra-inferior'),
        mainAxisSize: MainAxisSize.min,
        children: [
          const Divider(height: 1, thickness: 1),
          NavigationBar(
            selectedIndex: shell.currentIndex,
            onDestinationSelected: (i) =>
                shell.goBranch(i, initialLocation: i == shell.currentIndex),
            destinations: const [
              NavigationDestination(
                icon: Icon(Icons.explore_outlined),
                selectedIcon: Icon(Icons.explore_rounded),
                label: 'Explorar',
              ),
              NavigationDestination(
                icon: Icon(Icons.storefront_outlined),
                selectedIcon: Icon(Icons.storefront_rounded),
                label: 'Agencias',
              ),
              NavigationDestination(
                icon: Icon(Icons.receipt_long_outlined),
                selectedIcon: Icon(Icons.receipt_long_rounded),
                label: 'Reservas',
              ),
              NavigationDestination(
                icon: Icon(Icons.person_outline_rounded),
                selectedIcon: Icon(Icons.person_rounded),
                label: 'Perfil',
              ),
            ],
          ),
        ],
      ),
    );
  }
}

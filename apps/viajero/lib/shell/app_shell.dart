import 'package:diverso_core/diverso_core.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

/// Shell inferior de la app: barra fija al borde, sólida y con línea superior, con la píldora
/// indicadora en el destino activo. El contenido termina donde empieza la barra.
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
    return Scaffold(
      body: shell,
      bottomNavigationBar: Column(
        key: const ValueKey('barra-inferior'),
        mainAxisSize: MainAxisSize.min,
        children: [
          const Divider(height: 1, thickness: 1),
          NavigationBar(
            selectedIndex: shell.currentIndex,
            onDestinationSelected: (i) => shell.goBranch(
              i,
              initialLocation: i == shell.currentIndex,
            ),
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

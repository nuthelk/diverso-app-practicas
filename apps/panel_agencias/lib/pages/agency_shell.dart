import 'package:flutter/material.dart';
import 'package:diverso_core/diverso_core.dart';

import 'dashboard_page.dart';
import 'login_page.dart';
import 'planes_page.dart';
import 'ventas_page.dart';

/// Panel principal de la agencia: dashboard, planes, ventas y datos.
/// Muestra el estado de verificación mientras esté pendiente.
class AgencyShell extends StatefulWidget {
  const AgencyShell({super.key, required this.perfil, required this.agencia});

  final Profile perfil;
  final AgencyRef agencia;

  @override
  State<AgencyShell> createState() => _AgencyShellState();
}

class _AgencyShellState extends State<AgencyShell> {
  int _tab = 0;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final a = widget.agencia;

    final pendiente = a.estadoVerificacion == VerificationStatus.pendiente;

    final pages = [
      DashboardPage(agencia: a),
      PlanesPage(agencia: a),
      VentasPage(agencia: a),
    ];

    return Scaffold(
      body: Row(
        children: [
          NavigationRail(
            extended: MediaQuery.of(context).size.width > 1000,
            selectedIndex: _tab,
            onDestinationSelected: (i) => setState(() => _tab = i),
            leading: Padding(
              padding: const EdgeInsets.only(top: 12, bottom: 8),
              child: Column(
                children: [
                  Icon(Icons.terrain, color: cs.primary, size: 30),
                  const SizedBox(height: 10),
                ],
              ),
            ),
            destinations: [
              NavigationRailDestination(
                icon: _iconoConAviso(Icons.dashboard_outlined, 0),
                selectedIcon: _iconoConAviso(Icons.dashboard, 0),
                label: const Text('Dashboard'),
              ),
              const NavigationRailDestination(
                icon: Icon(Icons.map_outlined),
                selectedIcon: Icon(Icons.map),
                label: Text('Planes'),
              ),
              const NavigationRailDestination(
                icon: Icon(Icons.payments_outlined),
                selectedIcon: Icon(Icons.payments),
                label: Text('Ventas'),
              ),
            ],
            trailing: Expanded(
              child: Align(
                alignment: Alignment.bottomCenter,
                child: Padding(
                  padding: const EdgeInsets.only(bottom: 24),
                  child: IconButton(
                    tooltip: 'Cerrar sesión (${widget.perfil.nombre})',
                    icon: const Icon(Icons.logout),
                    onPressed: () async {
                      await AuthService().signOut();
                      if (context.mounted) {
                        Navigator.of(context).pushReplacement(
                          MaterialPageRoute(builder: (_) => const LoginPage()),
                        );
                      }
                    },
                  ),
                ),
              ),
            ),
          ),
          const VerticalDivider(width: 1),
          Expanded(
            child: Column(
              children: [
                if (pendiente)
                  Material(
                    color: Colors.amber.shade100,
                    child: Padding(
                      padding: const EdgeInsets.all(10),
                      child: Row(
                        children: [
                          Icon(Icons.hourglass_top, color: Colors.amber.shade900),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              'Tu agencia está en verificación (RNT ${a.numeroRnt}). '
                              'Ya puedes crear planes como borrador; se publicarán '
                              'cuando el equipo Diverso verifique tu registro.',
                              style: TextStyle(color: Colors.amber.shade900),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                Expanded(child: IndexedStack(index: _tab, children: pages)),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _iconoConAviso(IconData icono, int idx) {
    return Stack(
      clipBehavior: Clip.none,
      children: [
        Icon(icono),
        if (idx == 0) // aviso sutil en dashboard mientras hay pendientes
          const Positioned(
            right: -4,
            top: -4,
            child: SizedBox.shrink(),
          ),
      ],
    );
  }
}

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:diverso_core/diverso_core.dart';

import '../../../theme_mode_controller.dart';
import '../../core/app_theme.dart';
import '../../core/widgets.dart';

/// Shell del panel: rail lateral con marca, estado de la agencia y secciones.
/// En anchuras compactas el rail colapsa a solo iconos (LayoutBuilder).
class PanelShell extends StatefulWidget {
  const PanelShell({super.key, required this.shell});

  final StatefulNavigationShell shell;

  @override
  State<PanelShell> createState() => _PanelShellState();
}

class _PanelShellState extends State<PanelShell> {
  AgencyRef? _agencia;

  @override
  void initState() {
    super.initState();
    _cargarAgencia();
  }

  Future<void> _cargarAgencia() async {
    try {
      final a = await AgencyService().miAgencia();
      if (mounted) setState(() => _agencia = a);
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final a = _agencia;

    return Scaffold(
      body: Row(
        children: [
          // Rail lateral ----------------------------------------------------
          LayoutBuilder(
            builder: (context, constraints) {
              final extendido = constraints.maxWidth > AppTheme.bpMedium;
              return Container(
                width: extendido ? 250 : 84,
                padding: const EdgeInsets.symmetric(vertical: 18, horizontal: 12),
                child: Column(
                  children: [
                    // Marca
                    Row(
                      mainAxisAlignment: extendido ? MainAxisAlignment.start : MainAxisAlignment.center,
                      children: [
                        Container(
                          width: 38,
                          height: 38,
                          alignment: Alignment.center,
                          decoration: BoxDecoration(
                            color: cs.primaryContainer,
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Icon(Icons.terrain_rounded, color: cs.onPrimaryContainer, size: 21),
                        ),
                        if (extendido) ...[
                          const SizedBox(width: 10),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('Diverso',
                                  style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15, letterSpacing: -.3)),
                              Text('Panel de agencias',
                                  style: TextStyle(fontSize: 11, color: cs.onSurfaceVariant)),
                            ],
                          ),
                        ],
                      ],
                    ),
                    if (extendido && a != null) ...[
                      const SizedBox(height: 14),
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: cs.surfaceContainerLow,
                          borderRadius: BorderRadius.circular(14),
                        ),
                        child: Row(
                          children: [
                            InitialsAvatar(a.nombre, radius: 13),
                            const SizedBox(width: 9),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    a.nombre,
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 12.5),
                                  ),
                                  const SizedBox(height: 2),
                                  StatusPill.estado(a.estadoVerificacion.name),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                    const SizedBox(height: 22),
                    // Navegación
                    Expanded(
                      child: NavigationRail(
                        extended: extendido,
                        selectedIndex: widget.shell.currentIndex,
                        onDestinationSelected: (i) => widget.shell.goBranch(
                          i,
                          initialLocation: i == widget.shell.currentIndex,
                        ),
                        groupAlignment: 0,
                        destinations: [
                          NavigationRailDestination(
                            icon: Icon(Icons.dashboard_outlined, color: cs.onSurfaceVariant),
                            selectedIcon: const Icon(Icons.dashboard_rounded),
                            label: const Text('Dashboard'),
                          ),
                          NavigationRailDestination(
                            icon: Icon(Icons.map_outlined, color: cs.onSurfaceVariant),
                            selectedIcon: const Icon(Icons.map_rounded),
                            label: const Text('Planes'),
                          ),
                          NavigationRailDestination(
                            icon: Icon(Icons.payments_outlined, color: cs.onSurfaceVariant),
                            selectedIcon: const Icon(Icons.payments_rounded),
                            label: const Text('Ventas'),
                          ),
                        ],
                      ),
                    ),
                    // Apariencia + salir
                    Consumer<ThemeModeController>(
                      builder: (context, modo, _) => IconButton(
                        tooltip: modo.mode == ThemeMode.dark ? 'Modo claro' : 'Modo oscuro',
                        icon: Icon(
                          modo.mode == ThemeMode.dark
                              ? Icons.light_mode_outlined
                              : Icons.dark_mode_outlined,
                          color: cs.onSurfaceVariant,
                        ),
                        onPressed: () => modo.setMode(
                          modo.mode == ThemeMode.dark ? ThemeMode.light : ThemeMode.dark,
                        ),
                      ),
                    ),
                    IconButton(
                      tooltip: 'Cerrar sesión',
                      icon: Icon(Icons.logout_rounded, color: cs.onSurfaceVariant),
                      onPressed: () async {
                        await AuthService().signOut();
                        if (context.mounted) context.go('/login');
                      },
                    ),
                  ],
                ),
              );
            },
          ),
          VerticalDivider(width: 1, color: cs.outlineVariant.withValues(alpha: .5)),
          // Contenido --------------------------------------------------------
          Expanded(
            child: Column(
              children: [
                if (a != null && a.estadoVerificacion == VerificationStatus.pendiente)
                  Material(
                    color: const Color(0xFFB25E09).withValues(alpha: .12),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 9),
                      child: Row(
                        children: [
                          const Icon(Icons.hourglass_top_rounded, color: Color(0xFF8A4B08), size: 19),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              'Tu agencia está en verificación (RNT ${a.numeroRnt}). Ya puedes crear planes como borrador; se publicarán cuando el equipo Diverso verifique tu registro.',
                              style: const TextStyle(color: Color(0xFF8A4B08), fontSize: 13),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                Expanded(child: widget.shell),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

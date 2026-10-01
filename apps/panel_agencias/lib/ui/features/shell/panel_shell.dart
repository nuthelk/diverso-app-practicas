import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:diverso_core/diverso_core.dart';

import '../../../theme_mode_controller.dart';
import '../../core/app_theme.dart';
import '../../core/widgets.dart';

/// Shell del panel: sidebar de escritorio (marca, agencia, navegación de
/// texto, acciones al pie). En anchuras compactas colapsa a solo iconos.
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

  static const _secciones = [
    (Icons.dashboard_outlined, Icons.dashboard_rounded, 'Dashboard', '/dashboard'),
    (Icons.map_outlined, Icons.map_rounded, 'Planes', '/planes'),
    (Icons.payments_outlined, Icons.payments_rounded, 'Ventas', '/ventas'),
  ];

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final a = _agencia;
    final actual = widget.shell.currentIndex;

    return Scaffold(
      body: Row(
        children: [
          // Sidebar -----------------------------------------------------------
          LayoutBuilder(
            builder: (context, constraints) {
              final extendido = constraints.maxWidth > AppTheme.bpMedium;
              return Container(
                width: extendido ? 236 : 76,
                padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 12),
                decoration: BoxDecoration(
                  border: Border(
                    right: BorderSide(color: cs.outlineVariant.withValues(alpha: .45)),
                  ),
                ),
                child: Column(
                  crossAxisAlignment:
                      extendido ? CrossAxisAlignment.stretch : CrossAxisAlignment.center,
                  children: [
                    // Marca
                    if (extendido)
                      const Padding(
                        padding: EdgeInsets.symmetric(horizontal: 6),
                        child: Row(
                          children: [
                            _CajaMarca(),
                            SizedBox(width: 10),
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text('Diverso',
                                    style: TextStyle(
                                        fontWeight: FontWeight.w800,
                                        fontSize: 15,
                                        letterSpacing: -.3)),
                                Text('Panel de agencias',
                                    style: TextStyle(fontSize: 10.5, height: 1.3)),
                              ],
                            ),
                          ],
                        ),
                      )
                    else
                      const _CajaMarca(),
                    if (extendido && a != null) ...[
                      const SizedBox(height: 16),
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(11),
                        decoration: BoxDecoration(
                          color: cs.surfaceContainerLow,
                          borderRadius: BorderRadius.circular(13),
                          border: Border.all(
                              color: cs.outlineVariant.withValues(alpha: .4)),
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
                                    style: const TextStyle(
                                        fontWeight: FontWeight.w700, fontSize: 12.5),
                                  ),
                                  const SizedBox(height: 3),
                                  StatusPill.estado(a.estadoVerificacion.name),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                    const SizedBox(height: 18),
                    if (extendido)
                      Padding(
                        padding: const EdgeInsets.only(left: 8, bottom: 6),
                        child: Text(
                          'GESTIÓN',
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w700,
                            letterSpacing: 1.1,
                            color: cs.onSurfaceVariant.withValues(alpha: .8),
                          ),
                        ),
                      ),
                    // Navegación
                    Expanded(
                      child: Column(
                        crossAxisAlignment: extendido
                            ? CrossAxisAlignment.stretch
                            : CrossAxisAlignment.center,
                        children: [
                          for (var i = 0; i < _secciones.length; i++)
                            _ItemNavegacion(
                              icono: _secciones[i].$1,
                              iconoActivo: _secciones[i].$2,
                              etiqueta: _secciones[i].$3,
                              seleccionado: actual == i,
                              extendido: extendido,
                              onTap: () => widget.shell.goBranch(
                                i,
                                initialLocation: i == actual,
                              ),
                            ),
                        ],
                      ),
                    ),
                    // Acciones al pie
                    const Divider(),
                    const SizedBox(height: 6),
                    Consumer<ThemeModeController>(
                      builder: (context, modo, _) => _ItemNavegacion(
                        icono: modo.mode == ThemeMode.dark
                            ? Icons.light_mode_outlined
                            : Icons.dark_mode_outlined,
                        iconoActivo: modo.mode == ThemeMode.dark
                            ? Icons.light_mode_rounded
                            : Icons.dark_mode_rounded,
                        etiqueta: modo.mode == ThemeMode.dark
                            ? 'Modo claro'
                            : 'Modo oscuro',
                        seleccionado: false,
                        extendido: extendido,
                        onTap: () => modo.setMode(
                          modo.mode == ThemeMode.dark ? ThemeMode.light : ThemeMode.dark,
                        ),
                      ),
                    ),
                    _ItemNavegacion(
                      icono: Icons.logout_rounded,
                      iconoActivo: Icons.logout_rounded,
                      etiqueta: 'Cerrar sesión',
                      seleccionado: false,
                      extendido: extendido,
                      onTap: () async {
                        await AuthService().signOut();
                        if (context.mounted) context.go('/login');
                      },
                    ),
                  ],
                ),
              );
            },
          ),
          // Contenido -----------------------------------------------------------
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
                          const Icon(Icons.hourglass_top_rounded,
                              color: Color(0xFF8A4B08), size: 19),
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

class _CajaMarca extends StatelessWidget {
  const _CajaMarca();

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Container(
      width: 36,
      height: 36,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: cs.primaryContainer,
        borderRadius: BorderRadius.circular(11),
      ),
      child: DiversoLogo(size: 22, color: cs.onPrimaryContainer),
    );
  }
}

/// Ítem de navegación web: fila de texto con fondo suave al seleccionarse
/// (en lugar de la píldora de NavigationRail).
class _ItemNavegacion extends StatelessWidget {
  const _ItemNavegacion({
    required this.icono,
    required this.iconoActivo,
    required this.etiqueta,
    required this.seleccionado,
    required this.extendido,
    required this.onTap,
  });

  final IconData icono;
  final IconData iconoActivo;
  final String etiqueta;
  final bool seleccionado;
  final bool extendido;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final tinta = seleccionado ? cs.primary : cs.onSurfaceVariant;

    final contenido = extendido
        ? Row(
            children: [
              Icon(seleccionado ? iconoActivo : icono, size: 18.5, color: tinta),
              const SizedBox(width: 11),
              Expanded(
                child: Text(
                  etiqueta,
                  style: TextStyle(
                    fontSize: 13.5,
                    fontWeight: seleccionado ? FontWeight.w700 : FontWeight.w500,
                    color: seleccionado ? cs.onSurface : cs.onSurfaceVariant,
                    letterSpacing: -.1,
                  ),
                ),
              ),
            ],
          )
        : Icon(seleccionado ? iconoActivo : icono, size: 19.5, color: tinta);

    final item = Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Material(
        color: seleccionado ? cs.primary.withValues(alpha: .12) : Colors.transparent,
        borderRadius: BorderRadius.circular(10),
        child: InkWell(
          borderRadius: BorderRadius.circular(10),
          onTap: onTap,
          child: Padding(
            padding: extendido
                ? const EdgeInsets.symmetric(horizontal: 11, vertical: 9)
                : const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
            child: contenido,
          ),
        ),
      ),
    );

    return extendido ? item : Tooltip(message: etiqueta, child: item);
  }
}

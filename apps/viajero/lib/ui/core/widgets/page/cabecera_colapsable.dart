import 'package:flutter/material.dart';

import '../../theme/app_text.dart';

/// Cabecera colapsable con foto (detalle del plan, página de la agencia): con la foto a la vista
/// el botón de volver flota sobre ella; al desplazarse termina SÓLIDA, del color de la página, con
/// [titulo] y el botón de volver, de modo que nada se dibuja debajo de la barra de estado.
class CabeceraColapsable extends StatelessWidget {
  const CabeceraColapsable({
    super.key,
    required this.titulo,
    required this.fondo,
    required this.onVolver,
    this.alturaExpandida = 260,
  });

  final String titulo;
  final Widget fondo;
  final VoidCallback onVolver;
  final double alturaExpandida;

  @override
  Widget build(BuildContext context) {
    return SliverAppBar(
      pinned: true,
      expandedHeight: alturaExpandida,
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      surfaceTintColor: Colors.transparent,
      leading: Padding(
        padding: const EdgeInsets.all(8),
        child: IconButton.filled(
          style: IconButton.styleFrom(
            backgroundColor: Colors.black.withValues(alpha: .45),
            foregroundColor: Colors.white,
          ),
          tooltip: 'Volver',
          icon: const Icon(Icons.arrow_back_rounded, size: 20),
          onPressed: onVolver,
        ),
      ),
      flexibleSpace: Stack(
        fit: StackFit.expand,
        children: [
          FlexibleSpaceBar(background: fondo),
          _FondoSolido(titulo: titulo),
        ],
      ),
    );
  }
}

/// Capa que aparece (fundido) sobre la foto cuando la cabecera está casi colapsada.
class _FondoSolido extends StatelessWidget {
  const _FondoSolido({required this.titulo});

  final String titulo;

  @override
  Widget build(BuildContext context) {
    final ajustes = context.dependOnInheritedWidgetOfExactType<FlexibleSpaceBarSettings>();
    if (ajustes == null) return const SizedBox.shrink();
    final rango = ajustes.maxExtent - ajustes.minExtent;
    final colapso = rango <= 0
        ? 1.0
        : (1 - (ajustes.currentExtent - ajustes.minExtent) / rango).clamp(0.0, 1.0);
    final solido = ((colapso - .6) / .4).clamp(0.0, 1.0);
    if (solido == 0) return const SizedBox.shrink();
    final tema = Theme.of(context);
    return Opacity(
      opacity: solido,
      child: Stack(
        children: [
          Positioned.fill(child: ColoredBox(color: tema.scaffoldBackgroundColor)),
          Positioned(
            left: 64,
            right: 20,
            top: MediaQuery.paddingOf(context).top,
            height: kToolbarHeight,
            child: Align(
              alignment: Alignment.centerLeft,
              child: Text(
                titulo,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  fontSize: AppText.encabezadoXs,
                  fontWeight: FontWeight.w800,
                  letterSpacing: -.4,
                  color: tema.colorScheme.onSurface,
                ),
              ),
            ),
          ),
          Positioned(
            left: 0,
            right: 0,
            bottom: 0,
            child: Divider(height: 1, color: tema.colorScheme.outlineVariant),
          ),
        ],
      ),
    );
  }
}

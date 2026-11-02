import 'package:diverso_core/diverso_core.dart';
import 'package:flutter/material.dart';

import '../../../core/theme/app_radii.dart';

/// Bandeja de comparación: va fija sobre la barra inferior (el catálogo la usa como
/// `bottomNavigationBar`, así que la lista termina donde empieza y nunca tapa un precio ni un
/// botón). Muestra el contador, una miniatura por plan elegido (foto + título, con ×), «Limpiar» y
/// «Comparar (n)», que se habilita desde 2 planes. Entra y sale con animación.
class BandejaComparar extends StatelessWidget {
  const BandejaComparar({
    super.key,
    required this.seleccion,
    required this.maximo,
    required this.onQuitar,
    required this.onLimpiar,
    required this.onComparar,
  });

  static const minimo = 2;

  final List<Plan> seleccion;
  final int maximo;
  final ValueChanged<Plan> onQuitar;
  final VoidCallback onLimpiar;
  final VoidCallback onComparar;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final n = seleccion.length;
    final puede = n >= minimo;
    final pista = !puede
        ? 'Elige al menos $minimo planes'
        : n >= maximo
        ? 'Máximo $maximo planes'
        : null;

    return Material(
      color: cs.surfaceContainerLowest,
      elevation: 8,
      shadowColor: Colors.black.withValues(alpha: .35),
      surfaceTintColor: Colors.transparent,
      // Borde sutil además de la sombra: en tema oscuro la sombra casi no se ve.
      shape: RoundedRectangleBorder(
        borderRadius: const BorderRadius.vertical(top: Radius.circular(AppRadios.card)),
        side: BorderSide(color: cs.outlineVariant.withValues(alpha: .6)),
      ),
      clipBehavior: Clip.antiAlias,
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 10, 16, 14),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '$n de $maximo planes',
                          style: const TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w800,
                            letterSpacing: -.2,
                          ),
                        ),
                        if (pista != null)
                          Text(pista, style: TextStyle(fontSize: 12.5, color: cs.onSurfaceVariant)),
                      ],
                    ),
                  ),
                  TextButton(onPressed: onLimpiar, child: const Text('Limpiar')),
                ],
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(
                    child: Row(
                      children: [
                        for (var i = 0; i < maximo; i++) ...[
                          if (i > 0) const SizedBox(width: 8),
                          Expanded(
                            child: i < n
                                ? _Miniatura(
                                    plan: seleccion[i],
                                    onQuitar: () => onQuitar(seleccion[i]),
                                  )
                                : const _Hueco(),
                          ),
                        ],
                      ],
                    ),
                  ),
                  const SizedBox(width: 12),
                  FilledButton(onPressed: puede ? onComparar : null, child: Text('Comparar ($n)')),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Foto del plan con su × y el título corto debajo.
class _Miniatura extends StatelessWidget {
  const _Miniatura({required this.plan, required this.onQuitar});

  final Plan plan;
  final VoidCallback onQuitar;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final respaldo = ColoredBox(
      color: cs.primaryContainer,
      child: Center(child: Text(plan.categoria.emoji, style: const TextStyle(fontSize: 20))),
    );
    final foto = plan.fotoPrincipal;
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        SizedBox(
          key: const ValueKey('foto-miniatura'),
          height: 52,
          child: Stack(
            fit: StackFit.expand,
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: foto == null
                    ? respaldo
                    : Image.network(
                        foto,
                        fit: BoxFit.cover,
                        gaplessPlayback: true,
                        filterQuality: FilterQuality.low,
                        errorBuilder: (_, _, _) => respaldo,
                      ),
              ),
              Positioned(
                top: 2,
                right: 2,
                child: SizedBox.square(
                  dimension: 24,
                  child: IconButton.filled(
                    padding: EdgeInsets.zero,
                    iconSize: 14,
                    style: IconButton.styleFrom(
                      backgroundColor: Colors.black.withValues(alpha: .62),
                      foregroundColor: Colors.white,
                      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                    ),
                    tooltip: 'Quitar ${plan.titulo} de la comparación',
                    icon: const Icon(Icons.close_rounded),
                    onPressed: onQuitar,
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 4),
        Text(
          plan.titulo,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w600, height: 1.2),
        ),
      ],
    );
  }
}

/// Lugar libre para otro plan (deja ver cuántos caben): del tamaño y radio de una miniatura.
class _Hueco extends StatelessWidget {
  const _Hueco();

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return ExcludeSemantics(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        // Sin esto el Column centra al hijo y el recuadro se encoge al ancho del «+».
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Container(
            key: const ValueKey('hueco-bandeja'),
            height: 52,
            decoration: BoxDecoration(
              color: cs.surfaceContainerHigh.withValues(alpha: .4),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: cs.outlineVariant),
            ),
            child: Icon(Icons.add_rounded, size: 20, color: cs.outline),
          ),
          const SizedBox(height: 4),
          const SizedBox(height: 14),
        ],
      ),
    );
  }
}

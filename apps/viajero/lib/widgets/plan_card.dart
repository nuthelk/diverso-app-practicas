import 'package:flutter/material.dart';
import 'package:diverso_core/diverso_core.dart';

import '../widgets/rating_stars.dart';
import '../widgets/verified_badge.dart';

/// Tarjeta de plan del catálogo: foto, precio final visible desde el inicio.
class PlanCard extends StatelessWidget {
  const PlanCard({super.key, required this.plan, required this.onTap});

  final Plan plan;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final disponibles = plan.fechasDisponibles;

    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Stack(
              children: [
                AspectRatio(
                  aspectRatio: 16 / 9,
                  child: plan.fotoPrincipal == null
                      ? Container(
                          color: cs.primaryContainer,
                          child: Center(
                            child: Text(
                              plan.categoria.emoji,
                              style: const TextStyle(fontSize: 42),
                            ),
                          ),
                        )
                      : Image.network(
                          plan.fotoPrincipal!,
                          fit: BoxFit.cover,
                          errorBuilder: (_, _, _) => Container(
                            color: cs.primaryContainer,
                            child: Center(
                              child: Text(plan.categoria.emoji,
                                  style: const TextStyle(fontSize: 42)),
                            ),
                          ),
                        ),
                ),
                Positioned(
                  top: 8,
                  left: 8,
                  child: plan.agency?.verificada == true
                      ? const VerifiedBadge()
                      : const SizedBox.shrink(),
                ),
                if (disponibles.isNotEmpty)
                  Positioned(
                    bottom: 8,
                    right: 8,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: Colors.black.withValues(alpha: .65),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(
                        'Cupos ${disponibles.first.cupoDisponible}',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 11,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),
                  ),
              ],
            ),
            Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Flexible(
                        child: Text(
                          plan.titulo,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: Theme.of(context)
                              .textTheme
                              .titleMedium
                              ?.copyWith(fontWeight: FontWeight.w700),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      Icon(Icons.place_outlined, size: 15, color: cs.primary),
                      const SizedBox(width: 3),
                      Text('${plan.destino} · ${plan.duracionTexto}',
                          style: Theme.of(context).textTheme.bodySmall),
                      const SizedBox(width: 8),
                      RatingStars(calificacion: plan.ratingPromedio, size: 14),
                      if (plan.reviewsCount > 0) ...[
                        const SizedBox(width: 3),
                        Text('(${plan.reviewsCount})',
                            style: Theme.of(context).textTheme.bodySmall),
                      ],
                    ],
                  ),
                  const SizedBox(height: 10),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            formatCOP(plan.precioCop),
                            style: Theme.of(context)
                                .textTheme
                                .titleLarge
                                ?.copyWith(fontWeight: FontWeight.w800, color: cs.primary),
                          ),
                          const Text('por persona · precio final',
                              style: TextStyle(fontSize: 10, color: Colors.black54)),
                        ],
                      ),
                      FilledButton.tonal(
                        onPressed: onTap,
                        style: FilledButton.styleFrom(
                          visualDensity: VisualDensity.compact,
                        ),
                        child: const Text('Ver plan'),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

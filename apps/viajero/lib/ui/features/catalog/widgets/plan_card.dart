import 'package:diverso_core/diverso_core.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../../router/app_routes.dart';
import '../../../core/theme/app_radii.dart';
import '../../../core/widgets/plan/price_text.dart';
import '../../../core/widgets/plan/verified_badge.dart';
import '../../../core/widgets/rating/puntaje_plan.dart';

/// Rejilla de tarjetas de plan en pantallas anchas (catálogo y su marcador de carga).
const planCardGridDelegate = SliverGridDelegateWithMaxCrossAxisExtent(
  maxCrossAxisExtent: 430,
  mainAxisSpacing: 14,
  crossAxisSpacing: 14,
  childAspectRatio: .82,
);

/// Tarjeta de plan del catálogo: foto protagonista, destino sobre la imagen,
/// precio final visible desde el inicio y check de comparación.
class PlanCard extends StatelessWidget {
  const PlanCard({super.key, required this.plan, this.comparada = false, this.onToggleComparar});

  final Plan plan;
  final bool comparada;

  /// Null oculta el botón de comparar (p. ej. en la página de una agencia).
  final ValueChanged<Plan>? onToggleComparar;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;

    return Card(
      color: cs.surfaceContainerLow,
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () => context.push(AppRoutes.plan(plan.id)),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Portada -----------------------------------------------------
            SizedBox(
              height: 168,
              child: Stack(
                fit: StackFit.expand,
                children: [
                  _PortadaPlan(plan: plan),
                  Positioned.fill(
                    child: DecoratedBox(
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          begin: Alignment.topCenter,
                          end: Alignment.bottomCenter,
                          colors: [
                            Colors.black.withValues(alpha: .22),
                            Colors.transparent,
                            Colors.black.withValues(alpha: .45),
                          ],
                          stops: const [0, .45, 1],
                        ),
                      ),
                    ),
                  ),
                  Positioned(
                    top: 10,
                    left: 10,
                    child: plan.agency?.verificada == true
                        ? const VerifiedBadge(blanco: true, compacto: true)
                        : const SizedBox.shrink(),
                  ),
                  if (onToggleComparar != null)
                    Positioned(
                      top: 6,
                      right: 6,
                      child: IconButton(
                        visualDensity: VisualDensity.compact,
                        style: IconButton.styleFrom(
                          backgroundColor: comparada
                              ? cs.primary
                              : Colors.black.withValues(alpha: .28),
                          foregroundColor: comparada ? cs.onPrimary : Colors.white,
                        ),
                        tooltip: comparada ? 'Quitar del comparador' : 'Agregar al comparador',
                        onPressed: () => onToggleComparar!(plan),
                        icon: Icon(
                          comparada ? Icons.check_rounded : Icons.compare_arrows_rounded,
                          size: 19,
                        ),
                      ),
                    ),
                  Positioned(
                    left: 12,
                    bottom: 10,
                    child: Row(
                      children: [
                        const Icon(Icons.location_on_rounded, size: 14, color: Colors.white),
                        const SizedBox(width: 3),
                        Text(
                          plan.destino,
                          style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.w700,
                            fontSize: 13,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: .22),
                            borderRadius: BorderRadius.circular(AppRadios.pill),
                          ),
                          child: Text(
                            plan.duracionTexto,
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 11,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  if (plan.fechasDisponibles.isNotEmpty)
                    Positioned(
                      right: 12,
                      bottom: 10,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(AppRadios.pill),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.event_available_rounded, size: 12, color: cs.primary),
                            const SizedBox(width: 3),
                            Text(
                              '${plan.fechasDisponibles.first.cupoDisponible} cupos',
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w700,
                                color: cs.primary,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                ],
              ),
            ),
            // Contenido ---------------------------------------------------
            Padding(
              padding: const EdgeInsets.fromLTRB(14, 12, 14, 14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    plan.titulo,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 15.5,
                      fontWeight: FontWeight.w700,
                      height: 1.25,
                      letterSpacing: -.3,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      PuntajePlan(plan: plan),
                      const Spacer(),
                      PriceText(monto: plan.precioCop),
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

/// Imagen de portada con fallback tipográfico cuando no hay foto.
class _PortadaPlan extends StatelessWidget {
  const _PortadaPlan({required this.plan});

  final Plan plan;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    if (plan.fotoPrincipal == null) {
      return Container(
        color: cs.primaryContainer,
        child: Center(child: Text(plan.categoria.emoji, style: const TextStyle(fontSize: 40))),
      );
    }
    return Image.network(
      plan.fotoPrincipal!,
      fit: BoxFit.cover,
      // Scroll 120 Hz: reutiliza el bitmap viejo entre cargas y usa un
      // remuestreo barato (la tarjeta nunca muestra la imagen a resolución
      // completa).
      gaplessPlayback: true,
      filterQuality: FilterQuality.low,
      errorBuilder: (_, _, _) => Container(
        color: cs.primaryContainer,
        child: Center(child: Text(plan.categoria.emoji, style: const TextStyle(fontSize: 40))),
      ),
    );
  }
}

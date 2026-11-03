import 'package:diverso_core/diverso_core.dart';
import 'package:flutter/material.dart';

import '../../theme/app_text.dart';
import 'insignia_nueva.dart';
import 'rating_stars.dart';

/// Puntaje de un plan: ★ con su valor y la cantidad de reseñas, o «Nueva» mientras no tenga
/// ninguna (un 0.0 sería engañoso). [detallado] escribe «· n reseñas verificadas» (ficha del plan)
/// en vez de «(n)» (tarjeta).
class PuntajePlan extends StatelessWidget {
  const PuntajePlan({super.key, required this.plan, this.detallado = false});

  final Plan plan;
  final bool detallado;

  @override
  Widget build(BuildContext context) {
    if (plan.esNuevo) return const InsigniaNueva();
    final suave = TextStyle(
      fontSize: detallado ? AppText.detalle : AppText.leyenda,
      color: Theme.of(context).colorScheme.onSurfaceVariant,
    );
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        RatingStars(calificacion: plan.ratingPromedio, mostrarNumero: true),
        if (detallado)
          Text(' · ${plan.reviewsCount} reseñas verificadas', style: suave)
        else ...[
          const SizedBox(width: 3),
          Text('(${plan.reviewsCount})', style: suave),
        ],
      ],
    );
  }
}

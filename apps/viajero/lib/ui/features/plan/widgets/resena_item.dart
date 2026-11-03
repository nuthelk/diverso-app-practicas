import 'package:diverso_core/diverso_core.dart';
import 'package:flutter/material.dart';

import '../../../core/theme/app_insets.dart';
import '../../../core/theme/app_radii.dart';
import '../../../core/theme/app_text.dart';
import '../../../core/widgets/rating/estrellas_calificacion.dart';

/// Una reseña verificada de la ficha del plan: avatar con la inicial, nombre, estrellas y comentario.
class ResenaItem extends StatelessWidget {
  const ResenaItem({super.key, required this.review});

  final Review review;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    // Un nombre vacío o en blanco cuenta como sin nombre.
    final nombre = review.viajeroNombre?.trim() ?? '';
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: AppInsets.tarjeta,
      decoration: BoxDecoration(
        color: cs.surfaceContainerLow,
        borderRadius: BorderRadius.circular(AppRadios.card),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              CircleAvatar(
                radius: 15,
                child: Text(
                  nombre.isEmpty ? 'V' : nombre.characters.first.toUpperCase(),
                  style: const TextStyle(fontSize: AppText.detalle, fontWeight: FontWeight.w700),
                ),
              ),
              const SizedBox(width: 9),
              Expanded(
                child: Text(
                  nombre.isEmpty ? 'Viajero' : review.viajeroNombre!,
                  style: const TextStyle(
                    fontWeight: FontWeight.w700,
                    fontSize: AppText.cuerpoChico,
                  ),
                ),
              ),
              EstrellasCalificacion(calificacion: review.calificacion, size: 14),
              const SizedBox(width: 5),
              Tooltip(
                message: 'Reseña verificada: solo quien compró puede opinar',
                child: Icon(Icons.verified_rounded, size: 14, color: cs.tertiary),
              ),
            ],
          ),
          if ((review.comentario ?? '').isNotEmpty) ...[
            const SizedBox(height: 10),
            Text(
              review.comentario!,
              style: const TextStyle(height: 1.45, fontSize: AppText.cuerpoChico),
            ),
          ],
        ],
      ),
    );
  }
}

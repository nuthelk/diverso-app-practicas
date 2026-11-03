import 'package:flutter/material.dart';

import '../../theme/diverso_colors.dart';

/// Calificación de una reseña: cinco estrellas, llenas hasta [calificacion] (1 a 5). A diferencia de
/// [RatingStars] (resumen «★ 4.8»), aquí la cantidad de estrellas ES el dato.
class EstrellasCalificacion extends StatelessWidget {
  const EstrellasCalificacion({super.key, required this.calificacion, this.size = 15});

  final int calificacion;
  final double size;

  @override
  Widget build(BuildContext context) {
    final dorado = DiversoColors.of(context).dorado;
    final vacia = Theme.of(context).colorScheme.outlineVariant;
    return Semantics(
      label: '$calificacion de 5 estrellas',
      excludeSemantics: true,
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          for (var i = 1; i <= 5; i++)
            i <= calificacion
                ? Icon(Icons.star_rounded, size: size, color: dorado)
                : Icon(Icons.star_outline_rounded, size: size, color: vacia),
        ],
      ),
    );
  }
}

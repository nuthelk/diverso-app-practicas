import 'package:flutter/material.dart';

class RatingStars extends StatelessWidget {
  const RatingStars({super.key, required this.calificacion, this.size = 16});

  final double calificacion;
  final double size;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: List.generate(5, (i) {
        final lleno = calificacion >= i + 0.75;
        final medio = !lleno && calificacion >= i + 0.25;
        return Icon(
          lleno ? Icons.star : medio ? Icons.star_half : Icons.star_border,
          size: size,
          color: cs.primary,
        );
      }),
    );
  }
}

import 'package:flutter/material.dart';

/// Estrellas compactas + valor numérico opcional.
class RatingStars extends StatelessWidget {
  const RatingStars({
    super.key,
    required this.calificacion,
    this.size = 15,
    this.mostrarNumero = false,
  });

  final double calificacion;
  final double size;
  final bool mostrarNumero;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(Icons.star_rounded, size: size + 2, color: const Color(0xFFE8A33D)),
        if (mostrarNumero)
          Text(
            calificacion.toStringAsFixed(1),
            style: TextStyle(fontSize: size - 1, fontWeight: FontWeight.w700, color: cs.onSurface),
          ),
      ],
    );
  }
}

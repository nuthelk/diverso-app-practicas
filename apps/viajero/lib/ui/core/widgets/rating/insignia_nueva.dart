import 'package:flutter/material.dart';

import '../../theme/app_radii.dart';

/// Píldora «Nueva» de lo que aún no tiene reseñas (planes y agencias).
class InsigniaNueva extends StatelessWidget {
  const InsigniaNueva({super.key, this.texto = 'Nueva'});

  final String texto;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: cs.primary.withValues(alpha: .10),
        borderRadius: BorderRadius.circular(AppRadios.pill),
      ),
      child: Text(
        texto,
        style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: cs.primary),
      ),
    );
  }
}

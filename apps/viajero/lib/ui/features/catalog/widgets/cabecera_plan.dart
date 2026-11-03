import 'package:diverso_core/diverso_core.dart';
import 'package:flutter/material.dart';

import '../../../core/theme/app_radii.dart';
import '../../../core/theme/app_text.dart';

class CabeceraPlan extends StatelessWidget {
  const CabeceraPlan({super.key, required this.plan, required this.mejorPrecio});

  final Plan plan;
  final bool mejorPrecio;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        AspectRatio(
          aspectRatio: 1.5,
          child: Container(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(AppRadios.control),
              color: cs.primaryContainer,
              image: plan.fotoPrincipal == null
                  ? null
                  : DecorationImage(image: NetworkImage(plan.fotoPrincipal!), fit: BoxFit.cover),
            ),
            child: plan.fotoPrincipal == null
                ? Center(
                    child: Text(
                      plan.categoria.emoji,
                      style: const TextStyle(fontSize: AppText.encabezado3xl),
                    ),
                  )
                : null,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          plan.titulo,
          maxLines: 3,
          overflow: TextOverflow.ellipsis,
          style: const TextStyle(
            fontWeight: FontWeight.w700,
            fontSize: AppText.cuerpoChico,
            height: 1.25,
          ),
        ),
        if (mejorPrecio) ...[
          const SizedBox(height: 6),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
            decoration: BoxDecoration(
              color: cs.primaryContainer,
              borderRadius: BorderRadius.circular(AppRadios.pill),
            ),
            child: Text(
              'Mejor precio',
              style: TextStyle(
                fontSize: AppText.micro,
                fontWeight: FontWeight.w700,
                color: cs.onPrimaryContainer,
              ),
            ),
          ),
        ],
      ],
    );
  }
}

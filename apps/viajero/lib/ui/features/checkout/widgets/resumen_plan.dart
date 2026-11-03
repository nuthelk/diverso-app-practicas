import 'package:diverso_core/diverso_core.dart';
import 'package:flutter/material.dart';

import '../../../core/theme/app_insets.dart';
import '../../../core/theme/app_radii.dart';
import '../../../core/theme/app_text.dart';

/// Cabecera del checkout: foto (o emoji), título, fecha larga, destino y punto de encuentro.
class ResumenPlan extends StatelessWidget {
  const ResumenPlan({super.key, required this.plan, required this.fecha});

  final Plan plan;
  final PlanDate fecha;

  static const double _lado = 64;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Container(
      padding: AppInsets.tarjetaAmplia,
      decoration: BoxDecoration(
        color: cs.surfaceContainerLow,
        borderRadius: BorderRadius.circular(AppRadios.card),
      ),
      child: Row(
        children: [
          Container(
            width: _lado,
            height: _lado,
            clipBehavior: Clip.antiAlias,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(AppRadios.field),
              color: cs.primaryContainer,
              image: plan.fotoPrincipal == null
                  ? null
                  : DecorationImage(image: NetworkImage(plan.fotoPrincipal!), fit: BoxFit.cover),
            ),
            child: plan.fotoPrincipal == null
                ? Center(
                    child: Text(
                      plan.categoria.emoji,
                      style: const TextStyle(fontSize: AppText.encabezadoXl),
                    ),
                  )
                : null,
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  plan.titulo,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontWeight: FontWeight.w700,
                    fontSize: AppText.enfasis,
                    height: 1.25,
                  ),
                ),
                const SizedBox(height: 5),
                Text(
                  '${formatFechaLarga(fecha.fecha)} · ${plan.destino}',
                  style: TextStyle(fontSize: AppText.leyendaGrande, color: cs.onSurfaceVariant),
                ),
                if (plan.puntoEncuentro.isNotEmpty)
                  Text(
                    plan.puntoEncuentro,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(fontSize: AppText.leyenda, color: cs.onSurfaceVariant),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

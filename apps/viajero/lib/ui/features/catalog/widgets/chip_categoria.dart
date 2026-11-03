import 'package:diverso_core/diverso_core.dart';
import 'package:flutter/material.dart';

import '../../../core/theme/app_radii.dart';
import '../../../core/theme/app_text.dart';

/// Chip de una categoría de experiencia del catálogo; resalta la seleccionada.
class ChipCategoria extends StatelessWidget {
  const ChipCategoria({
    super.key,
    required this.categoria,
    required this.seleccionada,
    required this.onTap,
  });

  final ExperienceCategory categoria;
  final bool seleccionada;
  final VoidCallback onTap;

  static const _iconos = {
    ExperienceCategory.aventura: Icons.hiking_rounded,
    ExperienceCategory.naturaleza: Icons.forest_rounded,
    ExperienceCategory.cultura: Icons.account_balance_rounded,
    ExperienceCategory.gastronomia: Icons.restaurant_rounded,
    ExperienceCategory.relax: Icons.spa_rounded,
    ExperienceCategory.urbano: Icons.location_city_rounded,
  };

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return AnimatedContainer(
      duration: const Duration(milliseconds: 180),
      curve: Curves.easeOut,
      decoration: BoxDecoration(
        color: seleccionada ? cs.primary : Colors.transparent,
        borderRadius: BorderRadius.circular(AppRadios.pill),
        border: Border.fromBorderSide(
          BorderSide(color: seleccionada ? cs.primary : cs.outlineVariant),
        ),
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(AppRadios.pill),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                _iconos[categoria],
                size: 16,
                color: seleccionada ? cs.onPrimary : cs.onSurfaceVariant,
              ),
              const SizedBox(width: 6),
              Text(
                categoria.label,
                style: TextStyle(
                  fontSize: AppText.detalle,
                  fontWeight: FontWeight.w600,
                  color: seleccionada ? cs.onPrimary : cs.onSurfaceVariant,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

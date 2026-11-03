import 'package:flutter/material.dart';

import '../../../core/theme/app_radii.dart';
import '../../../core/theme/app_text.dart';
import '../../../core/widgets/section_label.dart';

/// «¿Cuántos viajan?»: botones − / + con el número de personas y los cupos de la fecha. Qué
/// botones se habilitan lo decide el view model (`puedeQuitar` / `puedeAgregar`).
class SelectorPersonas extends StatelessWidget {
  const SelectorPersonas({
    super.key,
    required this.pax,
    required this.cupos,
    required this.puedeQuitar,
    required this.puedeAgregar,
    required this.onCambiar,
  });

  final int pax;
  final int cupos;
  final bool puedeQuitar;
  final bool puedeAgregar;
  final ValueChanged<int> onCambiar;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const SectionLabel('Personas'),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          decoration: BoxDecoration(
            color: cs.surfaceContainerLow,
            borderRadius: BorderRadius.circular(AppRadios.card),
          ),
          child: Row(
            children: [
              const Expanded(
                child: Text('¿Cuántos viajan?', style: TextStyle(fontWeight: FontWeight.w600)),
              ),
              _BotonPersonas(
                icono: Icons.remove_rounded,
                habilitado: puedeQuitar,
                onTap: () => onCambiar(pax - 1),
              ),
              SizedBox(
                width: 52,
                child: Text(
                  '$pax',
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    fontSize: AppText.encabezadoXs,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
              _BotonPersonas(
                icono: Icons.add_rounded,
                habilitado: puedeAgregar,
                onTap: () => onCambiar(pax + 1),
              ),
            ],
          ),
        ),
        const SizedBox(height: 6),
        Text(
          '$cupos cupos disponibles para esta fecha',
          style: TextStyle(fontSize: AppText.leyenda, color: cs.onSurfaceVariant),
        ),
      ],
    );
  }
}

class _BotonPersonas extends StatelessWidget {
  const _BotonPersonas({required this.icono, required this.habilitado, required this.onTap});

  final IconData icono;
  final bool habilitado;
  final VoidCallback onTap;

  static const double _lado = 38;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return IconButton.outlined(
      style: IconButton.styleFrom(
        minimumSize: const Size(_lado, _lado),
        maximumSize: const Size(_lado, _lado),
        side: BorderSide(color: habilitado ? cs.primary : cs.outlineVariant),
        foregroundColor: habilitado ? cs.primary : cs.outline,
      ),
      tooltip: icono == Icons.remove_rounded ? 'Quitar una persona' : 'Agregar una persona',
      onPressed: habilitado ? onTap : null,
      icon: Icon(icono, size: 18),
    );
  }
}

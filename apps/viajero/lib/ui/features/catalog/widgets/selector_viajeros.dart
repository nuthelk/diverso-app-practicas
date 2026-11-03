import 'package:flutter/material.dart';

import '../../../core/theme/app_text.dart';

/// Control "¿Cuántos viajan?" (− / +) que recalcula el total de la tabla.
class SelectorViajeros extends StatelessWidget {
  const SelectorViajeros({
    super.key,
    required this.pax,
    required this.onChanged,
    required this.min,
    required this.max,
  });

  final int pax;
  final ValueChanged<int> onChanged;
  final int min;
  final int max;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Row(
      children: [
        Expanded(
          child: Text(
            '¿Cuántos viajan?',
            style: TextStyle(
              fontSize: AppText.cuerpo,
              fontWeight: FontWeight.w600,
              color: cs.onSurface,
            ),
          ),
        ),
        IconButton.outlined(
          tooltip: 'Menos viajeros',
          onPressed: pax > min ? () => onChanged(pax - 1) : null,
          icon: const Icon(Icons.remove_rounded),
        ),
        SizedBox(
          width: 40,
          child: Text(
            '$pax',
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: AppText.subtituloGrande, fontWeight: FontWeight.w800),
          ),
        ),
        IconButton.outlined(
          tooltip: 'Más viajeros',
          onPressed: pax < max ? () => onChanged(pax + 1) : null,
          icon: const Icon(Icons.add_rounded),
        ),
      ],
    );
  }
}

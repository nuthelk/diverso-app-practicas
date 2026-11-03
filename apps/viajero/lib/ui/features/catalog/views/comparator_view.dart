import 'package:diverso_core/diverso_core.dart';
import 'package:flutter/material.dart';

import '../../../core/theme/app_text.dart';
import '../../../core/widgets/feedback/empty_state.dart';
import '../widgets/selector_viajeros.dart';
import '../widgets/tabla_comparacion.dart';

/// Comparador de planes "todo incluido" (Anexo 6, idea 7): enfrenta hasta 3
/// planes con precio final y qué incluye cada uno, sin sorpresas.
class ComparatorView extends StatefulWidget {
  const ComparatorView({super.key, required this.planes});

  final List<Plan> planes;

  @override
  State<ComparatorView> createState() => _ComparatorViewState();
}

class _ComparatorViewState extends State<ComparatorView> {
  static const _minViajeros = 1;
  static const _maxViajeros = 20;

  int _pax = 2;

  List<Plan> get planes => widget.planes;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final filas = buildComparisonRows(planes, pax: _pax);

    return Scaffold(
      appBar: AppBar(title: const Text('Comparar planes')),
      body: planes.length < 2
          ? const EmptyState(
              icono: Icons.compare_arrows_rounded,
              titulo: 'Nada para comparar',
              mensaje: 'Selecciona dos o tres planes en el catálogo con el ícono de comparar.',
            )
          : ListView(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
              children: [
                Text(
                  'Elige con toda la información',
                  style: TextStyle(
                    fontSize: AppText.encabezadoXl,
                    fontWeight: FontWeight.w800,
                    letterSpacing: -.8,
                    color: cs.onSurface,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Precio final por persona, sin cargos ocultos.',
                  style: TextStyle(color: cs.onSurfaceVariant, fontSize: AppText.cuerpoChico),
                ),
                const SizedBox(height: 16),
                SelectorViajeros(
                  pax: _pax,
                  onChanged: (v) => setState(() => _pax = v),
                  min: _minViajeros,
                  max: _maxViajeros,
                ),
                const SizedBox(height: 20),
                TablaComparacion(planes: planes, filas: filas),
              ],
            ),
    );
  }
}

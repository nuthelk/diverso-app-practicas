import 'package:diverso_core/diverso_core.dart';
import 'package:flutter/material.dart';

import '../../../core/theme/app_radii.dart';
import '../../../core/widgets/section_label.dart';

/// «Resumen» del checkout: precio por persona, personas y total a pagar.
class ResumenPago extends StatelessWidget {
  const ResumenPago({
    super.key,
    required this.precioPorPersona,
    required this.pax,
    required this.total,
  });

  final double precioPorPersona;
  final int pax;
  final double total;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const SectionLabel('Resumen'),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: cs.surfaceContainerLow,
            borderRadius: BorderRadius.circular(AppRadios.card),
          ),
          child: Column(
            children: [
              _LineaPago('Precio por persona', formatCOP(precioPorPersona)),
              _LineaPago('Personas', '$pax'),
              const Padding(padding: EdgeInsets.symmetric(vertical: 8), child: Divider()),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Total a pagar',
                    style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
                  ),
                  Text(
                    formatCOP(total),
                    style: TextStyle(
                      fontSize: 19,
                      fontWeight: FontWeight.w800,
                      letterSpacing: -.4,
                      color: cs.primary,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 6),
              Row(
                children: [
                  Icon(Icons.lock_outline_rounded, size: 12, color: cs.outline),
                  const SizedBox(width: 5),
                  Text(
                    'Precio final, sin cargos ocultos',
                    style: TextStyle(fontSize: 11.5, color: cs.outline),
                  ),
                ],
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _LineaPago extends StatelessWidget {
  const _LineaPago(this.etiqueta, this.valor);

  final String etiqueta;
  final String valor;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            etiqueta,
            style: TextStyle(fontSize: 13.5, color: Theme.of(context).colorScheme.onSurfaceVariant),
          ),
          Text(valor, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13.5)),
        ],
      ),
    );
  }
}

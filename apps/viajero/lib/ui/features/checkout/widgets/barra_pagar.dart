import 'package:diverso_core/diverso_core.dart';
import 'package:flutter/material.dart';

import '../../../core/theme/app_text.dart';

/// Barra inferior del checkout: total, personas y el botón «Pagar con Wompi». [onPagar] null =
/// botón bloqueado; [procesando] muestra el progreso.
class BarraPagar extends StatelessWidget {
  const BarraPagar({
    super.key,
    required this.total,
    required this.pax,
    required this.procesando,
    required this.onPagar,
  });

  final double total;
  final int pax;
  final bool procesando;
  final VoidCallback? onPagar;

  static const double _anchoBoton = 220;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Container(
      padding: EdgeInsets.fromLTRB(20, 12, 20, 14 + MediaQuery.viewInsetsOf(context).bottom),
      decoration: BoxDecoration(
        color: Theme.of(context).scaffoldBackgroundColor,
        border: Border(top: BorderSide(color: cs.outlineVariant.withValues(alpha: .5))),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  formatCOP(total),
                  style: TextStyle(
                    fontSize: AppText.encabezadoM,
                    fontWeight: FontWeight.w800,
                    letterSpacing: -.5,
                    color: cs.onSurface,
                  ),
                ),
                Text(
                  'total por $pax ${pax == 1 ? 'persona' : 'personas'}',
                  style: TextStyle(fontSize: AppText.nota, color: cs.onSurfaceVariant),
                ),
              ],
            ),
          ),
          SizedBox(
            width: _anchoBoton,
            child: FilledButton.icon(
              onPressed: onPagar,
              icon: procesando
                  ? const SizedBox(
                      height: 17,
                      width: 17,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Icons.lock_rounded, size: 17),
              label: Text(procesando ? 'Procesando…' : 'Pagar con Wompi'),
            ),
          ),
        ],
      ),
    );
  }
}

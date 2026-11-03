import 'package:diverso_core/diverso_core.dart';
import 'package:flutter/material.dart';

import '../../../core/theme/app_text.dart';

class ValorComparado extends StatelessWidget {
  const ValorComparado({
    super.key,
    required this.valor,
    required this.esPrecio,
    required this.destacado,
  });

  final String valor;
  final bool esPrecio;
  final bool destacado;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;

    if (esPrecio) {
      final numero = double.tryParse(valor);
      // Una sola línea: el «$» nunca queda separado del monto; si no cabe, se achica.
      return FittedBox(
        fit: BoxFit.scaleDown,
        alignment: Alignment.topLeft,
        child: Text(
          numero == null ? valor : formatCOP(numero),
          maxLines: 1,
          softWrap: false,
          style: TextStyle(
            fontSize: destacado ? AppText.subtitulo : AppText.cuerpoGrande,
            fontWeight: destacado ? FontWeight.w800 : FontWeight.w600,
            color: destacado ? cs.primary : cs.onSurface,
          ),
        ),
      );
    }
    final incluido = valor == '✓ Incluido';
    final vacio = valor == '—';
    return Text(
      valor,
      style: TextStyle(
        fontSize: AppText.detalle,
        height: 1.4,
        fontWeight: incluido ? FontWeight.w700 : FontWeight.w500,
        color: incluido
            ? cs.primary
            : vacio
            ? cs.outline
            : cs.onSurface,
      ),
    );
  }
}

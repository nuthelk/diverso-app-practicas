import 'package:diverso_core/diverso_core.dart';
import 'package:flutter/material.dart';

/// Lo que la política del plan da si se cancela AHORA (viene de `vista_previa_cancelacion`).
String textoPoliticaCancelacion(VistaPreviaCancelacion v) {
  if (!v.aplica || v.porcentaje <= 0) {
    return 'Si cancelas ahora no recibirás reembolso. ${v.motivo}';
  }
  final cuanto = '${v.porcentaje} % (${formatCOP(v.monto)})';
  final politica = v.porcentaje >= 100 ? '' : ' según la política del plan';
  return 'Si cancelas ahora te devolvemos el $cuanto$politica. '
      'Es un reembolso de prueba: no se mueve dinero real.';
}

/// Confirmación de cancelación: muestra el reembolso que daría la política ANTES de confirmar.
/// Devuelve true si el viajero confirma.
class CancelacionDialog extends StatelessWidget {
  const CancelacionDialog({super.key, required this.codigo, required this.vista});

  final String codigo;
  final VistaPreviaCancelacion vista;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return AlertDialog(
      title: const Text('¿Cancelar reserva?'),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('La reserva $codigo se cancelará y los cupos volverán a estar disponibles.'),
          const SizedBox(height: 12),
          Text(
            textoPoliticaCancelacion(vista),
            style: TextStyle(
              fontWeight: FontWeight.w600,
              color: vista.aplica ? cs.primary : cs.error,
            ),
          ),
        ],
      ),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Mantener')),
        FilledButton.tonal(
          style: FilledButton.styleFrom(foregroundColor: cs.error),
          onPressed: () => Navigator.pop(context, true),
          child: const Text('Sí, cancelar'),
        ),
      ],
    );
  }
}

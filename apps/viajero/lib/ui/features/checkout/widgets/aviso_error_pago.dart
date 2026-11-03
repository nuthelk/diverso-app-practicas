import 'package:flutter/material.dart';

import '../../../core/theme/app_insets.dart';
import '../../../core/theme/app_radii.dart';
import '../../../core/theme/app_text.dart';

/// Caja de error del checkout con el mensaje del view model.
class AvisoErrorPago extends StatelessWidget {
  const AvisoErrorPago({super.key, required this.mensaje});

  final String mensaje;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Container(
      padding: AppInsets.tarjeta,
      decoration: BoxDecoration(
        color: cs.errorContainer,
        borderRadius: BorderRadius.circular(AppRadios.card),
      ),
      child: Row(
        children: [
          Icon(Icons.error_outline_rounded, color: cs.onErrorContainer),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              mensaje,
              style: TextStyle(color: cs.onErrorContainer, fontSize: AppText.cuerpoChico),
            ),
          ),
        ],
      ),
    );
  }
}

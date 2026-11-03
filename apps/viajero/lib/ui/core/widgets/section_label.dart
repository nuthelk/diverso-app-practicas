import 'package:flutter/material.dart';

import '../theme/app_text.dart';

/// Etiqueta de sección: pequeña, mayúsculas, espaciada — jerarquía silenciosa.
class SectionLabel extends StatelessWidget {
  const SectionLabel(this.texto, {super.key, this.accion});

  final String texto;
  final Widget? accion;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        children: [
          Expanded(
            child: Text(
              texto.toUpperCase(),
              style: TextStyle(
                fontSize: AppText.etiqueta,
                fontWeight: FontWeight.w700,
                letterSpacing: 1.2,
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
            ),
          ),
          ?accion,
        ],
      ),
    );
  }
}

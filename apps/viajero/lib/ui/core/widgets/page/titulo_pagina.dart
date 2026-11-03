import 'package:flutter/material.dart';

import '../../theme/app_text.dart';

/// Título de página compartido (Explorar, Agencias, Reservas, Perfil): grande y en negrita.
class TituloPagina extends StatelessWidget {
  const TituloPagina(this.texto, {super.key});

  final String texto;

  static TextStyle estilo(ColorScheme cs) => TextStyle(
    fontSize: AppText.tituloPagina,
    fontWeight: FontWeight.w800,
    letterSpacing: -1,
    height: 1.1,
    color: cs.onSurface,
  );

  @override
  Widget build(BuildContext context) {
    return Text(
      texto,
      maxLines: 1,
      overflow: TextOverflow.ellipsis,
      style: estilo(Theme.of(context).colorScheme),
    );
  }
}

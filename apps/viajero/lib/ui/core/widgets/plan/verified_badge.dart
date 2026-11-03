import 'package:flutter/material.dart';

import '../../theme/app_radii.dart';
import '../../theme/app_text.dart';
import '../../theme/diverso_colors.dart';

/// Sello de confianza: agencia verificada (RNT + Cámara de Comercio). [blanco] es la versión para
/// ir sobre una foto: fondo oscuro casi opaco con texto blanco, legible sobre cualquier imagen.
class VerifiedBadge extends StatelessWidget {
  const VerifiedBadge({super.key, this.compacto = false, this.blanco = false});

  final bool compacto;
  final bool blanco;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final fg = blanco ? Colors.white : cs.primary;
    final bg = blanco
        ? DiversoColors.of(context).selloSobreFoto
        : cs.primary.withValues(alpha: .10);
    return Container(
      padding: EdgeInsets.symmetric(horizontal: compacto ? 7 : 10, vertical: compacto ? 2.5 : 5),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(AppRadios.pill)),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.verified_rounded, size: compacto ? 13 : 15, color: fg),
          const SizedBox(width: 4),
          Text(
            'Verificada RNT',
            style: TextStyle(
              fontSize: compacto ? AppText.micro : AppText.nota,
              fontWeight: FontWeight.w700,
              color: fg,
            ),
          ),
        ],
      ),
    );
  }
}

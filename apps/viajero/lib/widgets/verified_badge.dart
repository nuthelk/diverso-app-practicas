import 'package:flutter/material.dart';

/// Sello de confianza: agencia verificada con RNT y Cámara de Comercio.
class VerifiedBadge extends StatelessWidget {
  const VerifiedBadge({super.key, this.compacto = false});

  final bool compacto;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: compacto ? 8 : 10,
        vertical: compacto ? 3 : 5,
      ),
      decoration: BoxDecoration(
        color: cs.tertiaryContainer,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.verified, size: compacto ? 14 : 16, color: cs.tertiary),
          const SizedBox(width: 4),
          Text(
            'Verificada RNT',
            style: TextStyle(
              fontSize: compacto ? 10 : 11,
              fontWeight: FontWeight.w600,
              color: cs.onTertiaryContainer,
            ),
          ),
        ],
      ),
    );
  }
}

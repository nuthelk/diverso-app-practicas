import 'package:flutter/material.dart';

import '../../../core/theme/app_insets.dart';
import '../../../core/theme/app_radii.dart';
import '../../../core/theme/app_text.dart';

/// Tarjeta informativa del perfil: ícono redondo, título y texto (compra protegida, tus datos).
class TarjetaInfo extends StatelessWidget {
  const TarjetaInfo({super.key, required this.icono, required this.titulo, required this.cuerpo});

  final IconData icono;
  final String titulo;
  final String cuerpo;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Container(
      padding: AppInsets.tarjetaAmplia,
      decoration: BoxDecoration(
        color: cs.surfaceContainerLow,
        borderRadius: BorderRadius.circular(AppRadios.card),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(9),
            decoration: BoxDecoration(color: cs.primaryContainer, shape: BoxShape.circle),
            child: Icon(icono, size: 17, color: cs.onPrimaryContainer),
          ),
          const SizedBox(width: 13),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  titulo,
                  style: const TextStyle(fontWeight: FontWeight.w700, fontSize: AppText.cuerpo),
                ),
                const SizedBox(height: 4),
                Text(
                  cuerpo,
                  style: TextStyle(
                    fontSize: AppText.detalle,
                    height: 1.5,
                    color: cs.onSurfaceVariant,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

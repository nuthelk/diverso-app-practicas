import 'package:flutter/material.dart';

import '../../../core/theme/app_theme.dart';
import 'plan_card.dart';
import 'tarjeta_skeleton.dart';

/// Tarjetas de carga del catálogo: grid en pantallas anchas, columna en celulares.
class ResultadosSkeleton extends StatelessWidget {
  const ResultadosSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final esGrid = constraints.maxWidth > AppTheme.bpCompact;
        final n = esGrid ? 4 : 3;
        return Padding(
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
          child: esGrid
              ? GridView.builder(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  gridDelegate: planCardGridDelegate,
                  itemCount: n,
                  itemBuilder: (_, _) => const TarjetaSkeleton(),
                )
              : Column(
                  children: List.generate(
                    n,
                    (_) => const Padding(
                      padding: EdgeInsets.only(bottom: 14),
                      child: TarjetaSkeleton(),
                    ),
                  ),
                ),
        );
      },
    );
  }
}

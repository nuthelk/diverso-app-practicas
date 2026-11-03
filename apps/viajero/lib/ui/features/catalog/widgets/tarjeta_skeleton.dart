import 'package:flutter/material.dart';

import '../../../core/theme/app_insets.dart';
import '../../../core/widgets/feedback/skeleton.dart';

/// Marcador de posición con la forma de una [PlanCard] mientras carga el catálogo.
class TarjetaSkeleton extends StatelessWidget {
  const TarjetaSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return const Card(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Skeleton(height: 168, radius: 0),
          Padding(
            padding: AppInsets.tarjeta,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Skeleton(width: 200, height: 16),
                SizedBox(height: 10),
                Skeleton(width: 120, height: 12),
                SizedBox(height: 14),
                Skeleton(width: 150, height: 20),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

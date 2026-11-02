import 'package:flutter/material.dart';

import '../../../core/widgets/feedback/skeleton.dart';

/// Marcador de posición de la ficha del plan mientras carga.
class DetalleSkeleton extends StatelessWidget {
  const DetalleSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return const Column(
      children: [
        AspectRatio(aspectRatio: 1.4, child: Skeleton(height: double.infinity, radius: 0)),
        Padding(
          padding: EdgeInsets.all(22),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Skeleton(width: 260, height: 24),
              SizedBox(height: 14),
              Skeleton(height: 14),
              SizedBox(height: 10),
              Skeleton(width: 180, height: 14),
              SizedBox(height: 26),
              Skeleton(height: 90, radius: 20),
            ],
          ),
        ),
      ],
    );
  }
}

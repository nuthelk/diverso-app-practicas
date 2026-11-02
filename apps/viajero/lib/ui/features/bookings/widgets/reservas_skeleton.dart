import 'package:flutter/material.dart';

import '../../../core/widgets/feedback/skeleton.dart';

/// Tarjetas de relleno mientras carga «Mis reservas».
class ReservasSkeleton extends StatelessWidget {
  const ReservasSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(20),
      children: List.generate(
        3,
        (_) => const Padding(
          padding: EdgeInsets.only(bottom: 12),
          child: Skeleton(height: 108, radius: 20),
        ),
      ),
    );
  }
}

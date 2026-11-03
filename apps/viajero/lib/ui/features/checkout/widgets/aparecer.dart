import 'package:flutter/material.dart';

/// Entrada escalonada: cada bloque aparece con un pequeño desplazamiento
/// vertical según su [paso], dentro de la misma animación (sin timers).
class Aparecer extends StatelessWidget {
  const Aparecer({super.key, required this.paso, required this.child});

  final int paso;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    const escalon = 0.14;
    final inicio = (paso * escalon).clamp(0.0, 0.72);
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0, end: 1),
      duration: const Duration(milliseconds: 640),
      curve: Interval(inicio, (inicio + 0.42).clamp(0.0, 1.0), curve: Curves.easeOutCubic),
      builder: (context, t, child) => Opacity(
        opacity: t,
        child: Transform.translate(offset: Offset(0, 14 * (1 - t)), child: child),
      ),
      child: child,
    );
  }
}

/// Widgets compartidos del sistema de diseño Diverso.
library;

import 'package:flutter/material.dart';
import 'package:diverso_core/diverso_core.dart';

/// Estrellas compactas + valor numérico opcional.
class RatingStars extends StatelessWidget {
  const RatingStars({super.key, required this.calificacion, this.size = 15, this.mostrarNumero = false});

  final double calificacion;
  final double size;
  final bool mostrarNumero;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(Icons.star_rounded, size: size + 2, color: const Color(0xFFE8A33D)),
        if (mostrarNumero)
          Text(
            calificacion.toStringAsFixed(1),
            style: TextStyle(fontSize: size - 1, fontWeight: FontWeight.w700, color: cs.onSurface),
          ),
      ],
    );
  }
}

/// Sello de confianza: agencia verificada (RNT + Cámara de Comercio).
class VerifiedBadge extends StatelessWidget {
  const VerifiedBadge({super.key, this.compacto = false, this.blanco = false});

  final bool compacto;
  final bool blanco;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final fg = blanco ? Colors.white : cs.primary;
    final bg = blanco ? Colors.white.withValues(alpha: .18) : cs.primary.withValues(alpha: .10);
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
              fontSize: compacto ? 10 : 11,
              fontWeight: FontWeight.w700,
              color: fg,
            ),
          ),
        ],
      ),
    );
  }
}

/// Precio protagonista: monto grande + unidad discreta.
class PriceText extends StatelessWidget {
  const PriceText({super.key, required this.monto, this.alineado = CrossAxisAlignment.start});

  final double monto;
  final CrossAxisAlignment alineado;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Column(
      crossAxisAlignment: alineado,
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          formatCOP(monto),
          style: TextStyle(
            fontSize: 21,
            fontWeight: FontWeight.w800,
            letterSpacing: -.5,
            color: cs.onSurface,
          ),
        ),
        const Text('por persona · precio final',
            style: TextStyle(fontSize: 10.5, color: Colors.black45)),
      ],
    );
  }
}

/// Estado vacío o de error: icono, título, mensaje y acción opcional.
class EmptyState extends StatelessWidget {
  const EmptyState({
    super.key,
    required this.icono,
    required this.titulo,
    required this.mensaje,
    this.accion,
  });

  final IconData icono;
  final String titulo;
  final String mensaje;
  final Widget? accion;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(36),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: cs.surfaceContainerHigh,
                shape: BoxShape.circle,
              ),
              child: Icon(icono, size: 30, color: cs.onSurfaceVariant),
            ),
            const SizedBox(height: 16),
            Text(titulo,
                style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w700, letterSpacing: -.3)),
            const SizedBox(height: 5),
            ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 300),
              child: Text(
                mensaje,
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 13.5, height: 1.45, color: cs.onSurfaceVariant),
              ),
            ),
            if (accion != null) ...[const SizedBox(height: 18), accion!],
          ],
        ),
      ),
    );
  }
}

/// Placeholder con pulso para estados de carga (skeleton minimalista).
class Skeleton extends StatefulWidget {
  const Skeleton({super.key, this.width, this.height = 16, this.radius = 10});

  final double? width;
  final double height;
  final double radius;

  @override
  State<Skeleton> createState() => _SkeletonState();
}

class _SkeletonState extends State<Skeleton> with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl =
      AnimationController(vsync: this, duration: const Duration(milliseconds: 1100))..repeat(reverse: true);

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final base = Theme.of(context).colorScheme.surfaceContainerHigh;
    return FadeTransition(
      opacity: Tween(begin: .45, end: 1.0).animate(CurvedAnimation(parent: _ctrl, curve: Curves.easeInOut)),
      child: Container(
        width: widget.width,
        height: widget.height,
        decoration: BoxDecoration(color: base, borderRadius: BorderRadius.circular(widget.radius)),
      ),
    );
  }
}

/// Radios del sistema de diseño (acceso corto desde widgets).
abstract final class AppRadios {
  static const double field = 14;
  static const double card = 20;
  static const double sheet = 28;
  static const double pill = 999;
}

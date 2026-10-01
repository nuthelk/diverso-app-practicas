/// Widgets compartidos del panel de agencias.
library;

import 'package:flutter/material.dart';

/// Métrica de dashboard: icono tonal, valor protagonista, etiqueta discreta.
class StatCard extends StatelessWidget {
  const StatCard({
    super.key,
    required this.icono,
    required this.valor,
    required this.etiqueta,
    this.color,
  });

  final IconData icono;
  final String valor;
  final String etiqueta;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final tinta = color ?? cs.primary;
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: cs.surfaceContainerLow,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(color: tinta.withValues(alpha: .12), shape: BoxShape.circle),
            child: Icon(icono, color: tinta, size: 19),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  valor,
                  style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800, letterSpacing: -.4),
                ),
                const SizedBox(height: 2),
                Text(
                  etiqueta,
                  style: TextStyle(fontSize: 12, color: cs.onSurfaceVariant),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// Píldora de estado con semántica de color.
class StatusPill extends StatelessWidget {
  const StatusPill(this.texto, {super.key, this.color});

  final String texto;
  final Color? color;

  factory StatusPill.estado(String estado) {
    final (c, t) = switch (estado) {
      'verificado' => (const Color(0xFF1B7A4B), 'Verificada'),
      'rechazado' => (const Color(0xFFB3261E), 'Rechazada'),
      'pendiente' => (const Color(0xFFB25E09), 'Pendiente'),
      'confirmada' => (const Color(0xFF1B7A4B), 'Confirmada'),
      'pendiente_pago' => (const Color(0xFFB25E09), 'Pendiente'),
      'cancelada' => (const Color(0xFFB3261E), 'Cancelada'),
      'completada' => (const Color(0xFF4A5C6E), 'Completada'),
      'publicado' => (const Color(0xFF1B7A4B), 'Publicado'),
      'borrador' => (const Color(0xFF6B7280), 'Borrador'),
      'aprobado' => (const Color(0xFF1B7A4B), 'Aprobado'),
      'reembolsado' => (const Color(0xFF4A5C6E), 'Reembolsado'),
      _ => (const Color(0xFF6B7280), estado),
    };
    return StatusPill(t, color: c);
  }

  @override
  Widget build(BuildContext context) {
    final tinta = color ?? Theme.of(context).colorScheme.onSurfaceVariant;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: tinta.withValues(alpha: .12),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        texto,
        style: TextStyle(color: tinta, fontSize: 10.5, fontWeight: FontWeight.w700),
      ),
    );
  }
}

/// Estado vacío minimalista.
class EmptyState extends StatelessWidget {
  const EmptyState({
    super.key,
    required this.icono,
    required this.titulo,
    required this.mensaje,
    this.detalle,
    this.accion,
  });

  final IconData icono;
  final String titulo;
  final String mensaje;

  /// Causa técnica opcional (excepción cruda) mostrada en pequeño para
  /// poder diagnosticar errores de backend sin depurar.
  final String? detalle;
  final Widget? accion;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(40),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(color: cs.surfaceContainerHigh, shape: BoxShape.circle),
              child: Icon(icono, size: 30, color: cs.onSurfaceVariant),
            ),
            const SizedBox(height: 16),
            Text(titulo,
                style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w700, letterSpacing: -.3)),
            const SizedBox(height: 5),
            ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 340),
              child: Text(
                mensaje,
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 13.5, height: 1.45, color: cs.onSurfaceVariant),
              ),
            ),
            if (detalle != null) ...[
              const SizedBox(height: 8),
              ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 380),
                child: Text(
                  detalle!,
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 11,
                    fontFamily: 'monospace',
                    height: 1.35,
                    color: cs.onSurfaceVariant.withValues(alpha: .75),
                  ),
                ),
              ),
            ],
            if (accion != null) ...[const SizedBox(height: 18), accion!],
          ],
        ),
      ),
    );
  }
}

/// Skeleton con pulso para cargas.
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
    return FadeTransition(
      opacity: Tween(begin: .45, end: 1.0)
          .animate(CurvedAnimation(parent: _ctrl, curve: Curves.easeInOut)),
      child: Container(
        width: widget.width,
        height: widget.height,
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.surfaceContainerHigh,
          borderRadius: BorderRadius.circular(widget.radius),
        ),
      ),
    );
  }
}

/// Avatar con iniciales sobre superficie tonal.
class InitialsAvatar extends StatelessWidget {
  const InitialsAvatar(this.nombre, {super.key, this.radius = 18});

  final String nombre;
  final double radius;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final limpia = nombre.trim().isEmpty ? '?' : nombre.trim();
    final iniciales = limpia
        .split(RegExp(r'\s+'))
        .take(2)
        .map((p) => p.substring(0, 1).toUpperCase())
        .join();
    return CircleAvatar(
      radius: radius,
      backgroundColor: cs.primaryContainer,
      child: Text(
        iniciales,
        style: TextStyle(
          fontWeight: FontWeight.w800,
          fontSize: radius * .82,
          color: cs.onPrimaryContainer,
        ),
      ),
    );
  }
}

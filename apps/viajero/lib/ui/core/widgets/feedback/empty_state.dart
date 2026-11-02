import 'package:flutter/material.dart';

/// Estado vacío o de error: icono, título, mensaje y acción opcional.
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
        padding: const EdgeInsets.all(36),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(color: cs.surfaceContainerHigh, shape: BoxShape.circle),
              child: Icon(icono, size: 30, color: cs.onSurfaceVariant),
            ),
            const SizedBox(height: 16),
            Text(
              titulo,
              style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w700, letterSpacing: -.3),
            ),
            const SizedBox(height: 5),
            ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 300),
              child: Text(
                mensaje,
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 13.5, height: 1.45, color: cs.onSurfaceVariant),
              ),
            ),
            if (detalle != null) ...[
              const SizedBox(height: 8),
              ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 340),
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

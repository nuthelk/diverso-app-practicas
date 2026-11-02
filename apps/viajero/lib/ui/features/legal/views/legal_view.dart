import 'package:diverso_core/diverso_core.dart';
import 'package:flutter/material.dart';

/// Lectura de un documento legal (política de datos o términos).
/// Accesible sin sesión: se abre desde el registro antes de aceptar.
class LegalView extends StatelessWidget {
  const LegalView({super.key, required this.docId});

  final String docId;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final doc = DocumentoLegal.porId(docId);

    return Scaffold(
      appBar: AppBar(title: const Text('Documentos legales')),
      body: doc == null
          ? const Center(child: Text('Documento no encontrado.'))
          : SelectionArea(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(22, 8, 22, 48),
                children: [
                  Text(
                    'VERSIÓN ${kVersionLegal.toUpperCase()}',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 1.2,
                      color: cs.outline,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    doc.titulo,
                    style: const TextStyle(
                      fontSize: 25,
                      height: 1.2,
                      fontWeight: FontWeight.w800,
                      letterSpacing: -.6,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    doc.resumen,
                    style: TextStyle(fontSize: 15, height: 1.5, color: cs.onSurfaceVariant),
                  ),
                  const SizedBox(height: 18),
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: cs.tertiaryContainer.withValues(alpha: .55),
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: Text(
                      'Borrador para el piloto académico: debe revisarlo un abogado y '
                      'completarse con los datos del responsable antes del lanzamiento comercial.',
                      style: TextStyle(fontSize: 12.5, height: 1.5, color: cs.onTertiaryContainer),
                    ),
                  ),
                  for (final s in doc.secciones) ...[
                    const SizedBox(height: 26),
                    Semantics(
                      header: true,
                      child: Text(
                        s.titulo,
                        style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
                      ),
                    ),
                    for (final p in s.parrafos) ...[
                      const SizedBox(height: 10),
                      Text(p, style: TextStyle(fontSize: 14.5, height: 1.65, color: cs.onSurface)),
                    ],
                  ],
                ],
              ),
            ),
    );
  }
}

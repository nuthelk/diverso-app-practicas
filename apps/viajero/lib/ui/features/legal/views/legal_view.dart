import 'package:diverso_core/diverso_core.dart';
import 'package:flutter/material.dart';

import '../../../core/theme/app_insets.dart';
import '../../../core/theme/app_radii.dart';
import '../../../core/theme/app_text.dart';

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
                      fontSize: AppText.nota,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 1.2,
                      color: cs.outline,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    doc.titulo,
                    style: const TextStyle(
                      fontSize: AppText.encabezado2xl,
                      height: 1.2,
                      fontWeight: FontWeight.w800,
                      letterSpacing: -.6,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    doc.resumen,
                    style: TextStyle(
                      fontSize: AppText.enfasis,
                      height: 1.5,
                      color: cs.onSurfaceVariant,
                    ),
                  ),
                  const SizedBox(height: 18),
                  Container(
                    padding: AppInsets.tarjeta,
                    decoration: BoxDecoration(
                      color: cs.tertiaryContainer.withValues(alpha: .55),
                      borderRadius: BorderRadius.circular(AppRadios.field),
                    ),
                    child: Text(
                      'Borrador para el piloto académico: debe revisarlo un abogado y '
                      'completarse con los datos del responsable antes del lanzamiento comercial.',
                      style: TextStyle(
                        fontSize: AppText.leyendaGrande,
                        height: 1.5,
                        color: cs.onTertiaryContainer,
                      ),
                    ),
                  ),
                  for (final s in doc.secciones) ...[
                    const SizedBox(height: 26),
                    Semantics(
                      header: true,
                      child: Text(
                        s.titulo,
                        style: const TextStyle(
                          fontSize: AppText.subtitulo,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                    for (final p in s.parrafos) ...[
                      const SizedBox(height: 10),
                      Text(
                        p,
                        style: TextStyle(
                          fontSize: AppText.cuerpoGrande,
                          height: 1.65,
                          color: cs.onSurface,
                        ),
                      ),
                    ],
                  ],
                ],
              ),
            ),
    );
  }
}

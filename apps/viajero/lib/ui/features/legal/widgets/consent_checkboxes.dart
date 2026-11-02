import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../../router/app_routes.dart';

/// Casillas de autorización expresa (Ley 1581 de 2012). Nunca vienen
/// marcadas: el titular debe aceptarlas de forma activa.
class ConsentCheckboxes extends StatelessWidget {
  const ConsentCheckboxes({
    super.key,
    required this.aceptaDatos,
    required this.aceptaTerminos,
    required this.onDatos,
    required this.onTerminos,
    this.mostrarError = false,
  });

  final bool aceptaDatos;
  final bool aceptaTerminos;
  final ValueChanged<bool> onDatos;
  final ValueChanged<bool> onTerminos;

  /// Resalta las casillas pendientes tras un intento de envío.
  final bool mostrarError;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _Fila(
          valor: aceptaDatos,
          onChanged: onDatos,
          error: mostrarError && !aceptaDatos,
          partes: [
            const TextSpan(
              text:
                  'Autorizo de manera previa, expresa e informada el tratamiento de mis '
                  'datos personales según la ',
            ),
            _enlace(context, 'política de tratamiento de datos', AppRoutes.legal('privacidad')),
            const TextSpan(text: ' (Ley 1581 de 2012).'),
          ],
        ),
        const SizedBox(height: 4),
        _Fila(
          valor: aceptaTerminos,
          onChanged: onTerminos,
          error: mostrarError && !aceptaTerminos,
          partes: [
            const TextSpan(text: 'Acepto los '),
            _enlace(context, 'términos y condiciones', AppRoutes.legal('terminos-viajeros')),
            const TextSpan(text: '.'),
          ],
        ),
        if (mostrarError && (!aceptaDatos || !aceptaTerminos))
          Padding(
            padding: const EdgeInsets.only(left: 12, top: 4),
            child: Text(
              'Debes aceptar ambos documentos para crear tu cuenta.',
              style: TextStyle(fontSize: 12.5, color: cs.error),
            ),
          ),
      ],
    );
  }

  static TextSpan _enlace(BuildContext context, String texto, String ruta) {
    final cs = Theme.of(context).colorScheme;
    return TextSpan(
      text: texto,
      style: TextStyle(
        color: cs.primary,
        fontWeight: FontWeight.w700,
        decoration: TextDecoration.underline,
        decorationColor: cs.primary.withValues(alpha: .5),
      ),
      recognizer: TapGestureRecognizer()..onTap = () => context.push(ruta),
    );
  }
}

class _Fila extends StatelessWidget {
  const _Fila({
    required this.valor,
    required this.onChanged,
    required this.partes,
    required this.error,
  });

  final bool valor;
  final ValueChanged<bool> onChanged;
  final List<InlineSpan> partes;
  final bool error;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return MergeSemantics(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Checkbox(value: valor, isError: error, onChanged: (v) => onChanged(v ?? false)),
          Expanded(
            child: GestureDetector(
              behavior: HitTestBehavior.opaque,
              onTap: () => onChanged(!valor),
              child: Padding(
                padding: const EdgeInsets.only(top: 12),
                child: Text.rich(
                  TextSpan(children: partes),
                  style: TextStyle(fontSize: 13, height: 1.45, color: cs.onSurfaceVariant),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

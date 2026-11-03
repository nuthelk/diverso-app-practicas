import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../../router/app_routes.dart';

/// Vuelve de la página de una agencia.
void volverDeAgencia(BuildContext context) {
  // Tras recargar en web no hay nada a donde volver con pop: se va a la lista de agencias.
  if (context.canPop()) {
    context.pop();
  } else {
    context.go(AppRoutes.agencias);
  }
}

/// Pantalla sin cabecera de portada (cargando, error, no encontrada): solo el botón de volver.
class AvisoAgencia extends StatelessWidget {
  const AvisoAgencia({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        AppBar(
          leading: IconButton(
            tooltip: 'Volver',
            icon: const Icon(Icons.arrow_back_rounded),
            onPressed: () => volverDeAgencia(context),
          ),
        ),
        Expanded(child: child),
      ],
    );
  }
}

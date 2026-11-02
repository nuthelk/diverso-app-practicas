import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../router/app_routes.dart';
import '../core/widgets/feedback/empty_state.dart';

/// Pantalla del `errorBuilder` del router: una URL que no existe (enlace mal escrito o viejo).
class PaginaNoEncontradaView extends StatelessWidget {
  const PaginaNoEncontradaView({super.key, required this.ubicacion});

  final String ubicacion;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: EmptyState(
          icono: Icons.explore_off_rounded,
          titulo: 'No encontramos esta página',
          mensaje: 'El enlace puede estar mal escrito o la página ya no existe.',
          detalle: ubicacion,
          accion: FilledButton(
            onPressed: () => context.go(AppRoutes.explorar),
            child: const Text('Ir al inicio'),
          ),
        ),
      ),
    );
  }
}

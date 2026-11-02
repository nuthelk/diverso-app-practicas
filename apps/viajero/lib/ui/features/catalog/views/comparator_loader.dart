import 'package:diverso_core/diverso_core.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../../../router/app_routes.dart';
import '../../../core/widgets/feedback/empty_state.dart';
import '../view_models/comparator_view_model.dart';
import 'comparator_view.dart';

/// `/comparar?ids=a,b,c`: carga los planes por id desde el backend, así la pantalla se reconstruye
/// igual tras recargar la página en web. [planes] (de `state.extra`) solo evita la espera cuando
/// se llega desde el catálogo.
class ComparatorLoader extends StatefulWidget {
  const ComparatorLoader({super.key, required this.ids, this.planes});

  final List<String> ids;
  final List<Plan>? planes;

  @override
  State<ComparatorLoader> createState() => _ComparatorLoaderState();
}

class _ComparatorLoaderState extends State<ComparatorLoader> {
  late final ComparatorViewModel _viewModel;

  @override
  void initState() {
    super.initState();
    _viewModel = ComparatorViewModel(
      catalogo: context.read<CatalogRepository>(),
      ids: widget.ids,
      planesIniciales: widget.planes,
    );
    _viewModel.cargar();
  }

  @override
  void dispose() {
    _viewModel.dispose();
    super.dispose();
  }

  Widget _estado(Widget hijo) => Scaffold(
    appBar: AppBar(title: const Text('Comparar planes')),
    body: hijo,
  );

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: _viewModel,
      builder: (context, _) {
        final planes = _viewModel.planes;
        if (planes != null) return ComparatorView(planes: planes);
        final error = _viewModel.error;
        if (error == null) return _estado(const Center(child: CircularProgressIndicator()));
        return _estado(
          EmptyState(
            icono: Icons.cloud_off_rounded,
            titulo: 'No pudimos cargar la comparación',
            mensaje: error,
            accion: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                FilledButton.tonal(onPressed: _viewModel.cargar, child: const Text('Reintentar')),
                TextButton(
                  onPressed: () => context.go(AppRoutes.explorar),
                  child: const Text('Ir al catálogo'),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}

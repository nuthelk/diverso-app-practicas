import 'package:flutter/material.dart';

import '../../../core/theme/app_radii.dart';
import '../view_models/catalog_view_model.dart';
import 'filtros_sheet.dart';

final _fondoBoton = Colors.black.withValues(alpha: .05);

/// Botón de la barra del buscador que abre la hoja de filtros; la insignia cuenta los activos.
class BotonFiltros extends StatelessWidget {
  const BotonFiltros({super.key, required this.viewModel});

  final CatalogViewModel viewModel;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return ListenableBuilder(
      listenable: viewModel,
      builder: (context, _) => Badge(
        isLabelVisible: viewModel.filtrosActivos > 0,
        label: Text('${viewModel.filtrosActivos}'),
        child: IconButton.filledTonal(
          style: IconButton.styleFrom(
            backgroundColor: _fondoBoton,
            foregroundColor: cs.onSurface,
            minimumSize: const Size(52, 52),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadios.field)),
          ),
          tooltip: 'Filtros y orden',
          onPressed: () => _abrirHoja(context),
          icon: const Icon(Icons.tune_rounded),
        ),
      ),
    );
  }

  Future<void> _abrirHoja(BuildContext context) async {
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (context) => FiltrosSheet(viewModel: viewModel),
    );
  }
}

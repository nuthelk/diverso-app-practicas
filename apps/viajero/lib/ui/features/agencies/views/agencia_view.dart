import 'package:diverso_core/diverso_core.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../core/theme/app_insets.dart';
import '../../../core/theme/app_radii.dart';
import '../../../core/widgets/feedback/empty_state.dart';
import '../../../core/widgets/feedback/skeleton.dart';
import '../view_models/agencia_view_model.dart';
import '../widgets/aviso_agencia.dart';
import '../widgets/contenido_agencia.dart';

/// Página de una agencia (`/agencia/:id`): portada, logo o iniciales, nombre, puntaje, ciudad,
/// descripción y sus planes publicados. Carga todo del backend por id: sobrevive a una recarga
/// en web.
class AgenciaView extends StatefulWidget {
  const AgenciaView({super.key, required this.agencyId});

  final String agencyId;

  @override
  State<AgenciaView> createState() => _AgenciaViewState();
}

class _AgenciaViewState extends State<AgenciaView> {
  late final AgenciaViewModel _viewModel;

  @override
  void initState() {
    super.initState();
    _viewModel = AgenciaViewModel(
      catalogo: context.read<CatalogRepository>(),
      agencyId: widget.agencyId,
    )..cargar();
  }

  @override
  void dispose() {
    _viewModel.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: ListenableBuilder(
        listenable: _viewModel,
        builder: (context, _) {
          final vm = _viewModel;
          final agencia = vm.agencia;
          if (vm.cargando && agencia == null) return const _Esqueleto();
          if (vm.error != null && agencia == null) {
            return AvisoAgencia(
              child: EmptyState(
                icono: Icons.cloud_off_rounded,
                titulo: 'No pudimos cargar la agencia',
                mensaje: vm.error!,
                detalle: vm.errorDetalle,
                accion: FilledButton.tonalIcon(
                  onPressed: vm.cargar,
                  icon: const Icon(Icons.refresh_rounded),
                  label: const Text('Reintentar'),
                ),
              ),
            );
          }
          if (agencia == null) {
            return const AvisoAgencia(
              child: EmptyState(
                icono: Icons.storefront_outlined,
                titulo: 'Agencia no disponible',
                mensaje: 'Esta agencia no existe o ya no tiene planes publicados.',
              ),
            );
          }
          return ContenidoAgencia(agencia: agencia, planes: vm.planes, onRefresh: vm.cargar);
        },
      ),
    );
  }
}

class _Esqueleto extends StatelessWidget {
  const _Esqueleto();

  @override
  Widget build(BuildContext context) {
    return AvisoAgencia(
      child: ListView(
        padding: AppInsets.contenido,
        children: const [
          Skeleton(height: 160, radius: AppRadios.card),
          SizedBox(height: 16),
          Skeleton(width: 220, height: 22),
          SizedBox(height: 10),
          Skeleton(width: 140, height: 14),
          SizedBox(height: 24),
          Skeleton(height: 210, radius: AppRadios.card),
        ],
      ),
    );
  }
}

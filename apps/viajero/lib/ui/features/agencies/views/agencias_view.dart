import 'package:diverso_core/diverso_core.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../core/theme/app_insets.dart';
import '../../../core/theme/app_radii.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/feedback/empty_state.dart';
import '../../../core/widgets/feedback/skeleton.dart';
import '../../../core/widgets/page/titulo_pagina.dart';
import '../view_models/agencias_view_model.dart';
import '../widgets/agencia_card.dart';

/// Pestaña «Agencias»: las agencias verificadas con su puntaje, logo y portada, ordenables por
/// puntaje, número de planes o nombre. Cada una abre su página (`/agencia/:id`). El estado vive en
/// [AgenciasViewModel] (MVVM).
class AgenciasView extends StatefulWidget {
  const AgenciasView({super.key});

  @override
  State<AgenciasView> createState() => _AgenciasViewState();
}

class _AgenciasViewState extends State<AgenciasView> with AutomaticKeepAliveClientMixin {
  late final AgenciasViewModel _viewModel;

  @override
  bool get wantKeepAlive => true;

  @override
  void initState() {
    super.initState();
    _viewModel = AgenciasViewModel(catalogo: context.read<CatalogRepository>())..cargar();
  }

  @override
  void dispose() {
    _viewModel.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    super.build(context);
    final esGrid = MediaQuery.sizeOf(context).width > AppTheme.bpCompact;

    return Scaffold(
      appBar: AppBar(title: const TituloPagina('Agencias')),
      body: ListenableBuilder(
        listenable: _viewModel,
        builder: (context, _) {
          final vm = _viewModel;
          return RefreshIndicator(
            onRefresh: vm.cargar,
            child: CustomScrollView(
              // Permite el gesto de recargar aunque la lista sea corta o esté vacía.
              physics: const AlwaysScrollableScrollPhysics(),
              slivers: [
                if (vm.hayAgencias || vm.cargando)
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(20, 4, 20, 12),
                      child: _SelectorOrden(orden: vm.orden, onChanged: vm.cambiarOrden),
                    ),
                  ),
                if (vm.cargando && !vm.hayAgencias)
                  const SliverPadding(
                    padding: AppInsets.lista,
                    sliver: SliverToBoxAdapter(child: _Esqueletos()),
                  )
                else if (vm.error != null && !vm.hayAgencias)
                  SliverFillRemaining(
                    hasScrollBody: false,
                    child: EmptyState(
                      icono: Icons.cloud_off_rounded,
                      titulo: 'Sin conexión',
                      mensaje: vm.error!,
                      detalle: vm.errorDetalle,
                      accion: FilledButton.tonalIcon(
                        onPressed: vm.cargar,
                        icon: const Icon(Icons.refresh_rounded),
                        label: const Text('Reintentar'),
                      ),
                    ),
                  )
                else if (!vm.hayAgencias)
                  const SliverFillRemaining(
                    hasScrollBody: false,
                    child: EmptyState(
                      icono: Icons.storefront_outlined,
                      titulo: 'Aún no hay agencias',
                      mensaje: 'Cuando una agencia verificada publique planes, la verás aquí.',
                    ),
                  )
                else if (esGrid)
                  SliverPadding(
                    padding: AppInsets.lista,
                    sliver: SliverGrid.builder(
                      itemCount: vm.agencias.length,
                      gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
                        maxCrossAxisExtent: 430,
                        mainAxisSpacing: 14,
                        crossAxisSpacing: 14,
                        childAspectRatio: 1.7,
                      ),
                      itemBuilder: (context, i) => AgenciaCard(agencia: vm.agencias[i]),
                    ),
                  )
                else
                  SliverPadding(
                    padding: AppInsets.lista,
                    sliver: SliverList.builder(
                      itemCount: vm.agencias.length,
                      itemBuilder: (context, i) => Padding(
                        padding: AppInsets.entreTarjetas,
                        child: AgenciaCard(agencia: vm.agencias[i]),
                      ),
                    ),
                  ),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _SelectorOrden extends StatelessWidget {
  const _SelectorOrden({required this.orden, required this.onChanged});

  final OrdenAgencias orden;
  final ValueChanged<OrdenAgencias> onChanged;

  @override
  Widget build(BuildContext context) {
    return SegmentedButton<OrdenAgencias>(
      showSelectedIcon: false,
      segments: [
        for (final o in OrdenAgencias.values) ButtonSegment(value: o, label: Text(o.label)),
      ],
      selected: {orden},
      onSelectionChanged: (s) => onChanged(s.first),
    );
  }
}

class _Esqueletos extends StatelessWidget {
  const _Esqueletos();

  @override
  Widget build(BuildContext context) {
    return Column(
      children: List.generate(
        3,
        (_) => const Padding(
          padding: AppInsets.entreTarjetas,
          child: Skeleton(height: 210, radius: AppRadios.card),
        ),
      ),
    );
  }
}

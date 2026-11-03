import 'package:diverso_core/diverso_core.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../../../router/app_routes.dart';
import '../../../core/theme/app_insets.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/feedback/empty_state.dart';
import '../../../core/widgets/page/titulo_pagina.dart';
import '../view_models/catalog_view_model.dart';
import '../widgets/bandeja_comparar.dart';
import '../widgets/boton_filtros.dart';
import '../widgets/chip_categoria.dart';
import '../widgets/plan_card.dart';
import '../widgets/resultados_skeleton.dart';

/// Catálogo: buscador, filtros (texto, categoría, destino, fecha, precio),
/// grid responsivo y bandeja de comparación. El estado vive en
/// [CatalogViewModel] (MVVM).
class CatalogView extends StatefulWidget {
  const CatalogView({super.key});

  @override
  State<CatalogView> createState() => _CatalogViewState();
}

class _CatalogViewState extends State<CatalogView> with AutomaticKeepAliveClientMixin {
  late final CatalogViewModel _viewModel;
  final _searchCtrl = TextEditingController();

  @override
  bool get wantKeepAlive => true;

  @override
  void initState() {
    super.initState();
    _viewModel = CatalogViewModel(catalogo: context.read<CatalogRepository>())..cargar();
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    _viewModel.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    super.build(context);
    // El ancho de la ventana no cambia al hacer scroll: decidir aquí (una
    // vez por rebuild real) en vez de dentro del scroll view.
    final esGrid = MediaQuery.sizeOf(context).width > AppTheme.bpCompact;

    return Scaffold(
      // El título vive en el AppBar del Scaffold, fuera del scroll: las tarjetas no pueden pasar
      // por encima ni por debajo de la barra de estado.
      appBar: AppBar(title: const TituloPagina('Descubre Antioquia')),
      body: ListenableBuilder(
        listenable: _viewModel,
        builder: (context, _) {
          final vm = _viewModel;
          return RefreshIndicator(
            onRefresh: vm.cargar,
            child: CustomScrollView(
              slivers: [
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(20, 4, 20, 0),
                    child: Column(
                      children: [
                        // Buscador + filtros
                        Row(
                          children: [
                            Expanded(
                              child: TextField(
                                controller: _searchCtrl,
                                onChanged: vm.setTexto,
                                onSubmitted: (_) => vm.buscar(),
                                textInputAction: TextInputAction.search,
                                decoration: InputDecoration(
                                  hintText: 'Guatapé, café, parapente…',
                                  prefixIcon: const Icon(Icons.search_rounded),
                                  suffixIcon: vm.texto.isEmpty
                                      ? null
                                      : IconButton(
                                          tooltip: 'Borrar búsqueda',
                                          icon: const Icon(Icons.close_rounded, size: 19),
                                          onPressed: () {
                                            _searchCtrl.clear();
                                            vm.setTexto('');
                                            vm.buscar();
                                          },
                                        ),
                                ),
                              ),
                            ),
                            const SizedBox(width: 10),
                            BotonFiltros(viewModel: vm),
                          ],
                        ),
                        const SizedBox(height: 12),
                        // Chips de filtros activos
                        if (vm.filtrosActivos > 0) ...[
                          Wrap(
                            spacing: 8,
                            runSpacing: 8,
                            children: [
                              if (vm.destino != null)
                                InputChip(
                                  avatar: const Icon(Icons.location_on_outlined, size: 15),
                                  label: Text(vm.destino!),
                                  onDeleted: () => vm.setDestino(null),
                                ),
                              if (vm.fecha != null)
                                InputChip(
                                  avatar: const Icon(Icons.event_outlined, size: 15),
                                  label: Text(formatFechaCorta(vm.fecha!)),
                                  onDeleted: () => vm.setFecha(null),
                                ),
                              if (vm.precioMax != null)
                                InputChip(
                                  avatar: const Icon(Icons.payments_outlined, size: 15),
                                  label: Text('Hasta ${formatCOP(vm.precioMax!)}'),
                                  onDeleted: () => vm.setPrecioMax(null),
                                ),
                            ],
                          ),
                          const SizedBox(height: 12),
                        ],
                        // Categorías
                        SizedBox(
                          height: 40,
                          child: ListView(
                            scrollDirection: Axis.horizontal,
                            children: [
                              for (final cat in ExperienceCategory.values) ...[
                                ChipCategoria(
                                  categoria: cat,
                                  seleccionada: vm.categoria == cat,
                                  onTap: () => vm.toggleCategoria(cat),
                                ),
                                const SizedBox(width: 8),
                              ],
                            ],
                          ),
                        ),
                        const SizedBox(height: 6),
                      ],
                    ),
                  ),
                ),
                // Resultados ------------------------------------------------
                if (vm.cargando)
                  const SliverToBoxAdapter(child: ResultadosSkeleton())
                else if (vm.error != null)
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
                else if (vm.planes.isEmpty)
                  const SliverFillRemaining(
                    hasScrollBody: false,
                    child: EmptyState(
                      icono: Icons.search_off_rounded,
                      titulo: 'Sin resultados',
                      mensaje: 'Prueba con otro destino o quita algunos filtros.',
                    ),
                  )
                else if (esGrid)
                  // La decisión grid/lista se toma con el ancho de la VENTANA
                  // (estable), no con SliverLayoutBuilder: las constraints de
                  // un sliver cambian en cada cuadro de scroll y re-ejecutarían
                  // este subárbol a 120 Hz, matando la fluidez.
                  SliverPadding(
                    padding: AppInsets.listaConAire,
                    sliver: SliverGrid.builder(
                      itemCount: vm.planes.length,
                      gridDelegate: planCardGridDelegate,
                      itemBuilder: (context, i) => PlanCard(
                        plan: vm.planes[i],
                        comparada: vm.comparando(vm.planes[i]),
                        onToggleComparar: vm.toggleComparar,
                      ),
                    ),
                  )
                else
                  SliverPadding(
                    padding: AppInsets.listaConAire,
                    sliver: SliverList.builder(
                      itemCount: vm.planes.length,
                      itemBuilder: (context, i) => Padding(
                        padding: AppInsets.entreTarjetas,
                        child: PlanCard(
                          plan: vm.planes[i],
                          comparada: vm.comparando(vm.planes[i]),
                          onToggleComparar: vm.toggleComparar,
                        ),
                      ),
                    ),
                  ),
              ],
            ),
          );
        },
      ),
      // Bandeja de comparación (Anexo 6, idea 7): como bottomNavigationBar, la lista termina donde
      // empieza y el último plan nunca queda tapado.
      bottomNavigationBar: ListenableBuilder(
        listenable: _viewModel,
        builder: (context, _) {
          final sel = _viewModel.seleccion;
          return AnimatedSwitcher(
            duration: const Duration(milliseconds: 220),
            switchInCurve: Curves.easeOutCubic,
            switchOutCurve: Curves.easeInCubic,
            transitionBuilder: (child, anim) => SizeTransition(
              sizeFactor: anim,
              alignment: Alignment.topCenter,
              child: FadeTransition(opacity: anim, child: child),
            ),
            child: sel.isEmpty
                ? const SizedBox.shrink(key: ValueKey('sin-bandeja'))
                : BandejaComparar(
                    key: const ValueKey('bandeja'),
                    seleccion: sel,
                    maximo: CatalogViewModel.maxComparar,
                    onQuitar: _viewModel.toggleComparar,
                    onLimpiar: _viewModel.limpiarComparar,
                    onComparar: () =>
                        context.push(AppRoutes.compararPlanes(sel.map((p) => p.id)), extra: sel),
                  ),
          );
        },
      ),
    );
  }
}

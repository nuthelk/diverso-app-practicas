import 'package:flutter/material.dart';
import 'package:diverso_core/diverso_core.dart';
import 'package:provider/provider.dart';

import '../../core/app_theme.dart';
import '../../core/widgets.dart';
import 'agencia_card.dart';
import 'agencias_controller.dart';

/// Pestaña «Agencias»: las agencias verificadas con su puntaje, logo y portada, ordenables por
/// puntaje, número de planes o nombre. Cada una abre su página (`/agencia/:id`). El estado vive en
/// [AgenciasController] (MVVM).
class AgenciasView extends StatefulWidget {
  const AgenciasView({super.key});

  @override
  State<AgenciasView> createState() => _AgenciasViewState();
}

class _AgenciasViewState extends State<AgenciasView> with AutomaticKeepAliveClientMixin {
  late final AgenciasController _controller;

  @override
  bool get wantKeepAlive => true;

  @override
  void initState() {
    super.initState();
    _controller = AgenciasController(catalogo: context.read<CatalogService>())..cargar();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    super.build(context);
    final esGrid = MediaQuery.sizeOf(context).width > AppTheme.bpCompact;

    return Scaffold(
      appBar: AppBar(title: const TituloPagina('Agencias')),
      body: ListenableBuilder(
        listenable: _controller,
        builder: (context, _) {
          final c = _controller;
          return RefreshIndicator(
            onRefresh: c.cargar,
            child: CustomScrollView(
              // Permite el gesto de recargar aunque la lista sea corta o esté vacía.
              physics: const AlwaysScrollableScrollPhysics(),
              slivers: [
                if (c.hayAgencias || c.cargando)
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(20, 4, 20, 12),
                      child: _SelectorOrden(orden: c.orden, onChanged: c.cambiarOrden),
                    ),
                  ),
                if (c.cargando && !c.hayAgencias)
                  const SliverPadding(
                    padding: EdgeInsets.fromLTRB(20, 4, 20, 24),
                    sliver: SliverToBoxAdapter(child: _Esqueletos()),
                  )
                else if (c.error != null && !c.hayAgencias)
                  SliverFillRemaining(
                    hasScrollBody: false,
                    child: EmptyState(
                      icono: Icons.cloud_off_rounded,
                      titulo: 'Sin conexión',
                      mensaje: c.error!,
                      detalle: c.errorDetalle,
                      accion: FilledButton.tonalIcon(
                        onPressed: c.cargar,
                        icon: const Icon(Icons.refresh_rounded),
                        label: const Text('Reintentar'),
                      ),
                    ),
                  )
                else if (!c.hayAgencias)
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
                    padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
                    sliver: SliverGrid.builder(
                      itemCount: c.agencias.length,
                      gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
                        maxCrossAxisExtent: 430,
                        mainAxisSpacing: 14,
                        crossAxisSpacing: 14,
                        childAspectRatio: 1.7,
                      ),
                      itemBuilder: (context, i) => AgenciaCard(agencia: c.agencias[i]),
                    ),
                  )
                else
                  SliverPadding(
                    padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
                    sliver: SliverList.builder(
                      itemCount: c.agencias.length,
                      itemBuilder: (context, i) => Padding(
                        padding: const EdgeInsets.only(bottom: 14),
                        child: AgenciaCard(agencia: c.agencias[i]),
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
          padding: EdgeInsets.only(bottom: 14),
          child: Skeleton(height: 210, radius: AppRadios.card),
        ),
      ),
    );
  }
}

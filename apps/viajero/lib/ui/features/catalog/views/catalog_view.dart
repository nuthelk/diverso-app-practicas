import 'package:diverso_core/diverso_core.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../../core/theme/app_radii.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/feedback/empty_state.dart';
import '../../../core/widgets/feedback/skeleton.dart';
import '../../../core/widgets/page/titulo_pagina.dart';
import '../../../core/widgets/section_label.dart';
import '../view_models/catalog_view_model.dart';
import '../widgets/bandeja_comparar.dart';
import '../widgets/plan_card.dart';

/// Catálogo: buscador, filtros (texto, categoría, destino, fecha, precio),
/// grid responsivo y bandeja de comparación. El estado vive en
/// [CatalogViewModel] (MVVM).
class CatalogView extends StatefulWidget {
  const CatalogView({super.key});

  @override
  State<CatalogView> createState() => _CatalogViewState();
}

class _CatalogViewState extends State<CatalogView> with AutomaticKeepAliveClientMixin {
  late final CatalogViewModel _controller;
  final _searchCtrl = TextEditingController();

  @override
  bool get wantKeepAlive => true;

  @override
  void initState() {
    super.initState();
    _controller = CatalogViewModel(catalogo: context.read<CatalogRepository>())..cargar();
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    _controller.dispose();
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
        listenable: _controller,
        builder: (context, _) {
          final c = _controller;
          return RefreshIndicator(
            onRefresh: c.cargar,
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
                                onChanged: c.setTexto,
                                onSubmitted: (_) => c.buscar(),
                                textInputAction: TextInputAction.search,
                                decoration: InputDecoration(
                                  hintText: 'Guatapé, café, parapente…',
                                  prefixIcon: const Icon(Icons.search_rounded),
                                  suffixIcon: c.texto.isEmpty
                                      ? null
                                      : IconButton(
                                          tooltip: 'Borrar búsqueda',
                                          icon: const Icon(Icons.close_rounded, size: 19),
                                          onPressed: () {
                                            _searchCtrl.clear();
                                            c.setTexto('');
                                            c.buscar();
                                          },
                                        ),
                                ),
                              ),
                            ),
                            const SizedBox(width: 10),
                            _BotonFiltros(controller: c),
                          ],
                        ),
                        const SizedBox(height: 12),
                        // Chips de filtros activos
                        if (c.filtrosActivos > 0) ...[
                          Wrap(
                            spacing: 8,
                            runSpacing: 8,
                            children: [
                              if (c.destino != null)
                                InputChip(
                                  avatar: const Icon(Icons.location_on_outlined, size: 15),
                                  label: Text(c.destino!),
                                  onDeleted: () => c.setDestino(null),
                                ),
                              if (c.fecha != null)
                                InputChip(
                                  avatar: const Icon(Icons.event_outlined, size: 15),
                                  label: Text(formatFechaCorta(c.fecha!)),
                                  onDeleted: () => c.setFecha(null),
                                ),
                              if (c.precioMax != null)
                                InputChip(
                                  avatar: const Icon(Icons.payments_outlined, size: 15),
                                  label: Text('Hasta ${formatCOP(c.precioMax!)}'),
                                  onDeleted: () => c.setPrecioMax(null),
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
                                _ChipCategoria(
                                  categoria: cat,
                                  seleccionada: c.categoria == cat,
                                  onTap: () => c.toggleCategoria(cat),
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
                if (c.cargando)
                  SliverToBoxAdapter(child: _gridSkeleton(context))
                else if (c.error != null)
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
                else if (c.planes.isEmpty)
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
                    padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
                    sliver: SliverGrid.builder(
                      itemCount: c.planes.length,
                      gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
                        maxCrossAxisExtent: 430,
                        mainAxisSpacing: 14,
                        crossAxisSpacing: 14,
                        childAspectRatio: .82,
                      ),
                      itemBuilder: (context, i) => PlanCard(
                        plan: c.planes[i],
                        comparada: c.comparando(c.planes[i]),
                        onToggleComparar: c.toggleComparar,
                      ),
                    ),
                  )
                else
                  SliverPadding(
                    padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
                    sliver: SliverList.builder(
                      itemCount: c.planes.length,
                      itemBuilder: (context, i) => Padding(
                        padding: const EdgeInsets.only(bottom: 14),
                        child: PlanCard(
                          plan: c.planes[i],
                          comparada: c.comparando(c.planes[i]),
                          onToggleComparar: c.toggleComparar,
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
        listenable: _controller,
        builder: (context, _) {
          final sel = _controller.seleccion;
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
                    onQuitar: _controller.toggleComparar,
                    onLimpiar: _controller.limpiarComparar,
                    onComparar: () => context.push('/comparar', extra: sel),
                  ),
          );
        },
      ),
    );
  }

  Widget _gridSkeleton(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final esGrid = constraints.maxWidth > AppTheme.bpCompact;
        final n = esGrid ? 4 : 3;
        return Padding(
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
          child: esGrid
              ? GridView.builder(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
                    maxCrossAxisExtent: 430,
                    mainAxisSpacing: 14,
                    crossAxisSpacing: 14,
                    childAspectRatio: .82,
                  ),
                  itemCount: n,
                  itemBuilder: (_, _) => const _TarjetaSkeleton(),
                )
              : Column(
                  children: List.generate(
                    n,
                    (_) => const Padding(
                      padding: EdgeInsets.only(bottom: 14),
                      child: _TarjetaSkeleton(),
                    ),
                  ),
                ),
        );
      },
    );
  }
}

class _TarjetaSkeleton extends StatelessWidget {
  const _TarjetaSkeleton();

  @override
  Widget build(BuildContext context) {
    return const Card(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Skeleton(height: 168, radius: 0),
          Padding(
            padding: EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Skeleton(width: 200, height: 16),
                SizedBox(height: 10),
                Skeleton(width: 120, height: 12),
                SizedBox(height: 14),
                Skeleton(width: 150, height: 20),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _ChipCategoria extends StatelessWidget {
  const _ChipCategoria({required this.categoria, required this.seleccionada, required this.onTap});

  final ExperienceCategory categoria;
  final bool seleccionada;
  final VoidCallback onTap;

  static const _iconos = {
    ExperienceCategory.aventura: Icons.hiking_rounded,
    ExperienceCategory.naturaleza: Icons.forest_rounded,
    ExperienceCategory.cultura: Icons.account_balance_rounded,
    ExperienceCategory.gastronomia: Icons.restaurant_rounded,
    ExperienceCategory.relax: Icons.spa_rounded,
    ExperienceCategory.urbano: Icons.location_city_rounded,
  };

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return AnimatedContainer(
      duration: const Duration(milliseconds: 180),
      curve: Curves.easeOut,
      decoration: BoxDecoration(
        color: seleccionada ? cs.primary : Colors.transparent,
        borderRadius: BorderRadius.circular(AppRadios.pill),
        border: Border.fromBorderSide(
          BorderSide(color: seleccionada ? cs.primary : cs.outlineVariant),
        ),
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(AppRadios.pill),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                _iconos[categoria],
                size: 16,
                color: seleccionada ? cs.onPrimary : cs.onSurfaceVariant,
              ),
              const SizedBox(width: 6),
              Text(
                categoria.label,
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: seleccionada ? cs.onPrimary : cs.onSurfaceVariant,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _BotonFiltros extends StatelessWidget {
  const _BotonFiltros({required this.controller});

  final CatalogViewModel controller;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return ListenableBuilder(
      listenable: controller,
      builder: (context, _) => Badge(
        isLabelVisible: controller.filtrosActivos > 0,
        label: Text('${controller.filtrosActivos}'),
        child: IconButton.filledTonal(
          style: IconButton.styleFrom(
            backgroundColor: Colors.black.withValues(alpha: .05),
            foregroundColor: cs.onSurface,
            minimumSize: const Size(52, 52),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadios.field)),
          ),
          tooltip: 'Filtros y orden',
          onPressed: () => _hojaFiltros(context),
          icon: const Icon(Icons.tune_rounded),
        ),
      ),
    );
  }

  Future<void> _hojaFiltros(BuildContext context) async {
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (context) => _HojaFiltros(controller: controller),
    );
  }
}

/// Hoja de filtros: fecha, precio máximo y destino (Anexo 6: filtros por
/// destino, fecha, precio y categoría — los cuatro del catálogo).
class _HojaFiltros extends StatefulWidget {
  const _HojaFiltros({required this.controller});

  final CatalogViewModel controller;

  @override
  State<_HojaFiltros> createState() => _HojaFiltrosState();
}

class _HojaFiltrosState extends State<_HojaFiltros> {
  late double? _precio = widget.controller.precioMax;
  late DateTime? _fecha = widget.controller.fecha;
  String? _destinoTmp;
  final _busquedaDestino = TextEditingController();

  @override
  void dispose() {
    _busquedaDestino.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final c = widget.controller;
    final cs = Theme.of(context).colorScheme;
    final seleccionado = _destinoTmp ?? c.destino ?? '';
    final opciones = [
      'Todos los destinos',
      ...c.destinos.where(
        (d) => d.toLowerCase().contains(_busquedaDestino.text.trim().toLowerCase()),
      ),
    ];

    return Padding(
      padding: EdgeInsets.fromLTRB(24, 0, 24, 24 + MediaQuery.viewInsetsOf(context).bottom),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Filtros',
            style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800, letterSpacing: -.5),
          ),
          const SizedBox(height: 22),
          const SectionLabel('Fecha del plan'),
          Row(
            children: [
              Expanded(
                child: _OpcionFecha(
                  icono: Icons.calendar_month_rounded,
                  texto: _fecha == null ? 'Cualquier fecha' : formatFechaCorta(_fecha!),
                  seleccionado: _fecha != null,
                  onTap: () async {
                    final f = await showDatePicker(
                      context: context,
                      initialDate: _fecha ?? DateTime.now().add(const Duration(days: 1)),
                      firstDate: DateTime.now(),
                      lastDate: DateTime.now().add(const Duration(days: 365)),
                    );
                    if (f != null) setState(() => _fecha = f);
                  },
                ),
              ),
              if (_fecha != null) ...[
                const SizedBox(width: 8),
                IconButton.outlined(
                  tooltip: 'Quitar fecha',
                  onPressed: () => setState(() => _fecha = null),
                  icon: const Icon(Icons.close_rounded, size: 18),
                ),
              ],
            ],
          ),
          const SizedBox(height: 20),
          const SectionLabel('Precio máximo por persona'),
          Row(
            children: [
              Expanded(
                child: Slider(
                  value: (_precio ?? 600000).clamp(50000, 600000),
                  min: 50000,
                  max: 600000,
                  divisions: 11,
                  label: formatCOP(_precio ?? 600000),
                  onChangeEnd: (v) => setState(() => _precio = v >= 600000 ? null : v),
                  onChanged: (v) => setState(() => _precio = v >= 600000 ? null : v),
                ),
              ),
              SizedBox(
                width: 110,
                child: Text(
                  (_precio ?? 0) == 0 || _precio == null ? 'Sin límite' : formatCOP(_precio!),
                  textAlign: TextAlign.right,
                  style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13.5),
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          // Selector de destino: buscador + lista propia con scroll (el menú
          // de DropdownButton dentro de la hoja no recibía los gestos).
          const SectionLabel('Destino'),
          TextField(
            controller: _busquedaDestino,
            onChanged: (_) => setState(() {}),
            textInputAction: TextInputAction.search,
            decoration: const InputDecoration(
              hintText: 'Buscar destino…',
              prefixIcon: Icon(Icons.search_rounded),
              isDense: true,
            ),
          ),
          const SizedBox(height: 8),
          ConstrainedBox(
            constraints: const BoxConstraints(maxHeight: 192),
            child: ListView.builder(
              shrinkWrap: true,
              itemCount: opciones.length,
              itemBuilder: (context, i) {
                final d = opciones[i];
                final esTodos = i == 0;
                final sel = seleccionado == (esTodos ? '' : d);
                return ListTile(
                  dense: true,
                  visualDensity: VisualDensity.compact,
                  leading: Icon(
                    esTodos
                        ? Icons.travel_explore_outlined
                        : sel
                        ? Icons.check_circle_rounded
                        : Icons.location_on_outlined,
                    size: 19,
                    color: sel ? cs.primary : cs.onSurfaceVariant,
                  ),
                  title: Text(
                    d,
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: sel ? FontWeight.w700 : FontWeight.w500,
                      color: sel ? cs.primary : cs.onSurface,
                    ),
                  ),
                  onTap: () => setState(() => _destinoTmp = esTodos ? '' : d),
                );
              },
            ),
          ),
          const SizedBox(height: 24),
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: () {
                    setState(() {
                      _fecha = null;
                      _precio = null;
                      _destinoTmp = '';
                      _busquedaDestino.clear();
                    });
                  },
                  child: const Text('Limpiar'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                flex: 2,
                child: FilledButton.icon(
                  style: FilledButton.styleFrom(
                    backgroundColor: cs.primary,
                    foregroundColor: cs.onPrimary,
                  ),
                  onPressed: () async {
                    Navigator.pop(context);
                    await c.setDestino(
                      _destinoTmp == '' || _destinoTmp == null ? null : _destinoTmp,
                    );
                    await c.setPrecioMax(_precio);
                    await c.setFecha(_fecha);
                  },
                  icon: const Icon(Icons.check_rounded),
                  label: const Text('Aplicar filtros'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _OpcionFecha extends StatelessWidget {
  const _OpcionFecha({
    required this.icono,
    required this.texto,
    required this.seleccionado,
    required this.onTap,
  });

  final IconData icono;
  final String texto;
  final bool seleccionado;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return InkWell(
      borderRadius: BorderRadius.circular(AppRadios.field),
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
        decoration: BoxDecoration(
          color: cs.surfaceContainerHigh,
          borderRadius: BorderRadius.circular(AppRadios.field),
        ),
        child: Row(
          children: [
            Icon(icono, size: 19, color: cs.primary),
            const SizedBox(width: 10),
            Text(texto, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
          ],
        ),
      ),
    );
  }
}

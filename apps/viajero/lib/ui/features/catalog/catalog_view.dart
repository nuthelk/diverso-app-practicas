import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:diverso_core/diverso_core.dart';

import '../../../ui/core/app_theme.dart';
import '../../../ui/core/widgets.dart';
import 'catalog_controller.dart';
import 'plan_card.dart';

/// Catálogo: buscador, filtros (texto, categoría, destino, fecha, precio),
/// grid responsivo y barra de comparación. El estado vive en
/// [CatalogController] (MVVM).
class CatalogView extends StatefulWidget {
  const CatalogView({super.key});

  @override
  State<CatalogView> createState() => _CatalogViewState();
}

class _CatalogViewState extends State<CatalogView>
    with AutomaticKeepAliveClientMixin {
  final _controller = CatalogController();
  final _searchCtrl = TextEditingController();

  @override
  bool get wantKeepAlive => true;

  @override
  void initState() {
    super.initState();
    _controller.cargar();
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
    final cs = Theme.of(context).colorScheme;

    return Scaffold(
      body: ListenableBuilder(
        listenable: _controller,
        builder: (context, _) {
          final c = _controller;
          return RefreshIndicator(
            onRefresh: c.cargar,
            child: CustomScrollView(
              slivers: [
                // Encabezado ------------------------------------------------
                SliverAppBar.large(
                  title: Text(
                    'Descubre Antioquia',
                    style: TextStyle(
                      fontWeight: FontWeight.w800,
                      letterSpacing: -1,
                      color: cs.onSurface,
                    ),
                  ),
                ),
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
                                onSubmitted: (_) => c.buscar(),
                                textInputAction: TextInputAction.search,
                                decoration: InputDecoration(
                                  hintText: 'Guatapé, café, parapente…',
                                  prefixIcon: const Icon(Icons.search_rounded),
                                  suffixIcon: c.texto.isEmpty
                                      ? null
                                      : IconButton(
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
                else
                  SliverLayoutBuilder(
                    builder: (context, constraints) {
                      final ancho = constraints.crossAxisExtent;
                      final esGrid = ancho > AppTheme.bpCompact;
                      final hijos = [
                        for (final plan in c.planes)
                          PlanCard(
                            plan: plan,
                            comparada: c.comparando(plan),
                            onToggleComparar: c.toggleComparar,
                          ),
                      ];
                      if (esGrid) {
                        return SliverPadding(
                          padding: const EdgeInsets.fromLTRB(20, 8, 20, 140),
                          sliver: SliverGrid.builder(
                            itemCount: hijos.length,
                            gridDelegate:
                                const SliverGridDelegateWithMaxCrossAxisExtent(
                              maxCrossAxisExtent: 430,
                              mainAxisSpacing: 14,
                              crossAxisSpacing: 14,
                              childAspectRatio: .82,
                            ),
                            itemBuilder: (context, i) => hijos[i],
                          ),
                        );
                      }
                      return SliverPadding(
                        padding: const EdgeInsets.fromLTRB(20, 8, 20, 140),
                        sliver: SliverList.builder(
                          itemCount: hijos.length,
                          itemBuilder: (context, i) => Padding(
                            padding: const EdgeInsets.only(bottom: 14),
                            child: hijos[i],
                          ),
                        ),
                      );
                    },
                  ),
              ],
            ),
          );
        },
      ),
      // Barra de comparación (Anexo 6, idea 7)
      bottomNavigationBar: ListenableBuilder(
        listenable: _controller,
        builder: (context, _) {
          final sel = _controller.seleccion;
          if (sel.isEmpty) return const SizedBox.shrink();
          return SafeArea(
            child: Container(
              margin: const EdgeInsets.fromLTRB(20, 0, 20, 90),
              padding: const EdgeInsets.symmetric(horizontal: 8),
              decoration: BoxDecoration(
                color: cs.inverseSurface,
                borderRadius: BorderRadius.circular(AppRadios.pill),
              ),
              child: Row(
                children: [
                  const SizedBox(width: 12),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                    decoration: BoxDecoration(
                      color: cs.primary,
                      shape: BoxShape.circle,
                    ),
                    child: Text(
                      '${sel.length}',
                      style: TextStyle(
                        color: cs.onPrimary,
                        fontWeight: FontWeight.w800,
                        fontSize: 13,
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      sel.length == 1 ? 'Elige uno más para comparar' : 'Planes listos',
                      style: TextStyle(
                        color: cs.onInverseSurface,
                        fontWeight: FontWeight.w600,
                        fontSize: 13.5,
                      ),
                    ),
                  ),
                  TextButton(
                    onPressed: _controller.limpiarComparar,
                    child: const Text('Limpiar'),
                  ),
                  const SizedBox(width: 6),
                  FilledButton(
                    style: FilledButton.styleFrom(
                      minimumSize: const Size(0, 42),
                      padding: const EdgeInsets.symmetric(horizontal: 20),
                    ),
                    onPressed: sel.length >= 2
                        ? () => context.push('/comparar', extra: sel)
                        : null,
                    child: const Text('Comparar'),
                  ),
                  const SizedBox(width: 8),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _gridSkeleton(BuildContext context) {
    return LayoutBuilder(builder: (context, constraints) {
      final esGrid = constraints.maxWidth > AppTheme.bpCompact;
      final n = esGrid ? 4 : 3;
      return Padding(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 140),
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
                children: List.generate(n, (_) => const Padding(
                      padding: EdgeInsets.only(bottom: 14),
                      child: _TarjetaSkeleton(),
                    )),
              ),
      );
    });
  }
}

class _TarjetaSkeleton extends StatelessWidget {
  const _TarjetaSkeleton();

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Skeleton(height: 168, radius: 0),
          Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: const [
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
  const _ChipCategoria({
    required this.categoria,
    required this.seleccionada,
    required this.onTap,
  });

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

  final CatalogController controller;

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

  final CatalogController controller;

  @override
  State<_HojaFiltros> createState() => _HojaFiltrosState();
}

class _HojaFiltrosState extends State<_HojaFiltros> {
  late double? _precio = widget.controller.precioMax;
  late DateTime? _fecha = widget.controller.fecha;
  String? _destinoTmp;

  @override
  Widget build(BuildContext context) {
    final c = widget.controller;
    final cs = Theme.of(context).colorScheme;

    return Padding(
      padding: EdgeInsets.fromLTRB(
        24, 0, 24, 24 + MediaQuery.viewInsetsOf(context).bottom,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Filtros',
              style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800, letterSpacing: -.5)),
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
                  onPressed: () => setState(() => _fecha = null),
                  icon: const Icon(Icons.close_rounded, size: 18),
                ),
              ],
            ],
          ),
          const SizedBox(height: 20),
          SectionLabel('Precio máximo por persona'),
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
          const SectionLabel('Destino'),
          DropdownButtonHideUnderline(
            child: DropdownButton<String>(
              value: _destinoTmp ?? (c.destino ?? ''),
              isExpanded: true,
              borderRadius: BorderRadius.circular(AppRadios.field),
              items: [
                const DropdownMenuItem(value: '', child: Text('Todos los destinos')),
                ...c.destinos.map((d) => DropdownMenuItem(value: d, child: Text(d))),
              ],
              onChanged: (v) => setState(() => _destinoTmp = v),
            ),
          ),
          const SizedBox(height: 26),
          const SizedBox(height: 26),
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: () {
                    setState(() {
                      _fecha = null;
                      _precio = null;
                      _destinoTmp = '';
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
                        _destinoTmp == '' || _destinoTmp == null ? null : _destinoTmp);
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

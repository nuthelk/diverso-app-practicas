import 'package:flutter/material.dart';
import 'package:diverso_core/diverso_core.dart';

import '../widgets/plan_card.dart';
import 'plan_detail_page.dart';

class ExplorarPage extends StatefulWidget {
  const ExplorarPage({super.key});

  @override
  State<ExplorarPage> createState() => _ExplorarPageState();
}

class _ExplorarPageState extends State<ExplorarPage> {
  final _catalogo = CatalogService();
  final _searchCtrl = TextEditingController();

  List<Plan> _planes = [];
  List<String> _destinos = [];
  bool _cargando = true;
  String? _error;

  String? _destinoSel;
  ExperienceCategory? _categoriaSel;
  OrdenCatalogo _orden = OrdenCatalogo.rating;
  final Map<OrdenCatalogo, String> _ordenLabels = {
    OrdenCatalogo.rating: 'Mejor valorados',
    OrdenCatalogo.precioAsc: 'Menor precio',
    OrdenCatalogo.precioDesc: 'Mayor precio',
    OrdenCatalogo.recientes: 'Novedades',
  };

  @override
  void initState() {
    super.initState();
    _cargar();
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  Future<void> _cargar() async {
    setState(() {
      _cargando = true;
      _error = null;
    });
    try {
      final planes = await _catalogo.search(FiltrosCatalogo(
        texto: _searchCtrl.text,
        categoria: _categoriaSel,
        destino: _destinoSel,
        orden: _orden,
      ));
      final destinos = await _catalogo.destinos();
      if (!mounted) return;
      setState(() {
        _planes = planes;
        _destinos = destinos;
        _cargando = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = 'No pudimos cargar los planes. ¿Está encendido el servidor local?';
        _cargando = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            Icon(Icons.terrain, color: cs.primary),
            const SizedBox(width: 8),
            const Text('Diverso',
                style: TextStyle(fontWeight: FontWeight.w800, fontSize: 22)),
          ],
        ),
        actions: [
          IconButton(
            tooltip: 'Orden: ${_ordenLabels[_orden]}',
            icon: const Icon(Icons.sort),
            onPressed: _menuOrden,
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _cargar,
        child: CustomScrollView(
          slivers: [
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
                child: Column(
                  children: [
                    TextField(
                      controller: _searchCtrl,
                      decoration: InputDecoration(
                        hintText: 'Busca: Guatapé, café, parapente…',
                        prefixIcon: const Icon(Icons.search),
                        suffixIcon: _searchCtrl.text.isEmpty
                            ? null
                            : IconButton(
                                icon: const Icon(Icons.clear),
                                onPressed: () {
                                  _searchCtrl.clear();
                                  _cargar();
                                },
                              ),
                      ),
                      onSubmitted: (_) => _cargar(),
                    ),
                    const SizedBox(height: 12),
                    SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      child: Row(
                        children: [
                          _chipDestino(),
                          const SizedBox(width: 8),
                          for (final c in ExperienceCategory.values) ...[
                            FilterChip(
                              label: Text('${c.emoji} ${c.label}'),
                              selected: _categoriaSel == c,
                              onSelected: (sel) {
                                setState(() => _categoriaSel = sel ? c : null);
                                _cargar();
                              },
                            ),
                            const SizedBox(width: 8),
                          ],
                        ],
                      ),
                    ),
                    const SizedBox(height: 8),
                  ],
                ),
              ),
            ),
            if (_cargando)
              const SliverFillRemaining(
                child: Center(child: CircularProgressIndicator()),
              )
            else if (_error != null)
              SliverFillRemaining(
                child: _EstadoVacio(
                  icono: Icons.cloud_off,
                  titulo: 'Sin conexión',
                  mensaje: _error!,
                  accion: FilledButton.icon(
                    onPressed: _cargar,
                    icon: const Icon(Icons.refresh),
                    label: const Text('Reintentar'),
                  ),
                ),
              )
            else if (_planes.isEmpty)
              const SliverFillRemaining(
                child: _EstadoVacio(
                  icono: Icons.search_off,
                  titulo: 'Sin resultados',
                  mensaje: 'Prueba con otro destino o quita los filtros.',
                ),
              )
            else
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
                sliver: SliverList.builder(
                  itemCount: _planes.length,
                  itemBuilder: (context, i) {
                    final plan = _planes[i];
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: PlanCard(
                        plan: plan,
                        onTap: () => Navigator.of(context).push(
                          MaterialPageRoute(
                            builder: (_) => PlanDetailPage(planId: plan.id),
                          ),
                        ),
                      ),
                    );
                  },
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _chipDestino() {
    return InputChip(
      avatar: const Icon(Icons.place_outlined, size: 18),
      label: Text(_destinoSel ?? 'Destino'),
      onDeleted: _destinoSel == null
          ? null
          : () {
              setState(() => _destinoSel = null);
              _cargar();
            },
      onPressed: () async {
        final sel = await showDialog<String>(
          context: context,
          builder: (context) => SimpleDialog(
            title: const Text('Destino'),
            children: _destinos
                .map((d) => SimpleDialogOption(
                      onPressed: () => Navigator.pop(context, d),
                      child: Text(d),
                    ))
                .toList(),
          ),
        );
        if (sel != null) {
          setState(() => _destinoSel = sel);
          _cargar();
        }
      },
    );
  }

  Future<void> _menuOrden() async {
    final sel = await showDialog<OrdenCatalogo>(
      context: context,
      builder: (context) => SimpleDialog(
        title: const Text('Ordenar por'),
        children: _ordenLabels.entries
            .map((e) => SimpleDialogOption(
                  onPressed: () => Navigator.pop(context, e.key),
                  child: Text(
                    e.value,
                    style: TextStyle(
                      fontWeight: e.key == _orden ? FontWeight.w700 : null,
                    ),
                  ),
                ))
            .toList(),
      ),
    );
    if (sel != null && sel != _orden) {
      setState(() => _orden = sel);
      _cargar();
    }
  }
}

class _EstadoVacio extends StatelessWidget {
  const _EstadoVacio({
    required this.icono,
    required this.titulo,
    required this.mensaje,
    this.accion,
  });

  final IconData icono;
  final String titulo;
  final String mensaje;
  final Widget? accion;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icono, size: 56, color: Colors.black26),
            const SizedBox(height: 12),
            Text(titulo, style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 4),
            Text(
              mensaje,
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: Colors.black54),
            ),
            if (accion != null) ...[const SizedBox(height: 16), accion!],
          ],
        ),
      ),
    );
  }
}

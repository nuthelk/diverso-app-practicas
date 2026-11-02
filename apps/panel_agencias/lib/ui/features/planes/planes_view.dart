import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:diverso_core/diverso_core.dart';
import 'package:provider/provider.dart';

import '../../core/widgets.dart';
import '../shell/panel_controller.dart';
import 'fechas_dialog.dart';

/// Gestión de planes: crear, editar, publicar y administrar fechas con cupos.
class PlanesView extends StatefulWidget {
  const PlanesView({super.key});

  @override
  State<PlanesView> createState() => _PlanesViewState();
}

class _PlanesViewState extends State<PlanesView> {
  late final PanelController _controller;

  @override
  void initState() {
    super.initState();
    _controller = PanelController(servicio: context.read<AgencyRepository>());
    _controller.cargarTodo();
    _controller.addListener(_escucharMensaje);
  }

  @override
  void dispose() {
    _controller.removeListener(_escucharMensaje);
    _controller.dispose();
    super.dispose();
  }

  void _escucharMensaje() {
    final m = _controller.mensaje;
    if (m != null && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(m)));
      _controller.mensaje = null;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.transparent,
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => context.push('/planes/nuevo').then((_) => _controller.cargarTodo()),
        icon: const Icon(Icons.add_rounded),
        label: const Text('Nuevo plan'),
      ),
      body: ListenableBuilder(
        listenable: _controller,
        builder: (context, _) {
          final c = _controller;
          if (c.cargando) {
            return ListView(
              padding: const EdgeInsets.all(28),
              children: List.generate(
                3,
                (_) => const Padding(
                  padding: EdgeInsets.only(bottom: 12),
                  child: Skeleton(height: 110, radius: 20),
                ),
              ),
            );
          }
          if (c.error != null) {
            return EmptyState(
              icono: Icons.cloud_off_rounded,
              titulo: 'Sin conexión',
              mensaje: c.error!,
              detalle: c.errorDetalle,
              accion: FilledButton.tonal(onPressed: c.cargarTodo, child: const Text('Reintentar')),
            );
          }
          final planes = c.planes;
          if (planes.isEmpty) {
            return const EmptyState(
              icono: Icons.map_rounded,
              titulo: 'Aún no tienes planes',
              mensaje: 'Crea tu primer plan turístico con la ficha estandarizada de Diverso.',
            );
          }
          return RefreshIndicator(
            onRefresh: c.cargarTodo,
            child: ListView.builder(
              padding: const EdgeInsets.fromLTRB(28, 28, 28, 120),
              itemCount: planes.length,
              itemBuilder: (context, i) =>
                  _TarjetaPlan(plan: planes[i], controller: c),
            ),
          );
        },
      ),
    );
  }
}

class _TarjetaPlan extends StatelessWidget {
  const _TarjetaPlan({required this.plan, required this.controller});

  final Plan plan;
  final PanelController controller;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final publicado = plan.estado == PlanStatus.publicado;
    final proximas = plan.fechasDisponibles;

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: cs.surfaceContainerLow,
          borderRadius: BorderRadius.circular(20),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: 54,
                  height: 54,
                  clipBehavior: Clip.antiAlias,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(14),
                    color: cs.primaryContainer,
                    image: plan.fotoPrincipal == null
                        ? null
                        : DecorationImage(
                            image: NetworkImage(plan.fotoPrincipal!),
                            fit: BoxFit.cover,
                          ),
                  ),
                  child: plan.fotoPrincipal == null
                      ? Center(child: Text(plan.categoria.emoji, style: const TextStyle(fontSize: 22)))
                      : null,
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        plan.titulo,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15, height: 1.25),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '${plan.destino} · ${plan.categoria.label} · ${plan.duracionTexto} · '
                        '${formatCOP(plan.precioCop)} · ★ ${plan.ratingPromedio.toStringAsFixed(1)} (${plan.reviewsCount})',
                        style: TextStyle(fontSize: 12.5, color: cs.onSurfaceVariant),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                StatusPill.estado(plan.estado.name),
              ],
            ),
            const SizedBox(height: 12),
            Text(
              proximas.isEmpty
                  ? 'Sin fechas futuras — agrega fechas para vender'
                  : '${proximas.length} fechas futuras · próximas: '
                      '${proximas.take(3).map((d) => formatFechaCorta(d.fecha)).join(', ')}',
              style: TextStyle(fontSize: 12.5, color: proximas.isEmpty ? Colors.orange.shade800 : cs.primary),
            ),
            const Divider(height: 22),
            Row(
              children: [
                TextButton.icon(
                  style: TextButton.styleFrom(minimumSize: const Size(0, 38)),
                  onPressed: () => context
                      .push('/planes/editar/${plan.id}')
                      .then((_) => controller.cargarTodo()),
                  icon: const Icon(Icons.edit_outlined, size: 16),
                  label: const Text('Editar'),
                ),
                TextButton.icon(
                  style: TextButton.styleFrom(minimumSize: const Size(0, 38)),
                  onPressed: () => showDialog(
                    context: context,
                    builder: (_) => FechasDialog(
                      planId: plan.id,
                      agencyId: plan.agencyId,
                      initialFechas: plan.dates,
                    ),
                  ).then((_) => controller.cargarTodo()),
                  icon: const Icon(Icons.event_outlined, size: 16),
                  label: const Text('Fechas y cupos'),
                ),
                const Spacer(),
                FilledButton.tonal(
                  style: FilledButton.styleFrom(
                    minimumSize: const Size(0, 38),
                    visualDensity: VisualDensity.compact,
                    foregroundColor:
                        publicado ? cs.onSurfaceVariant : null,
                  ),
                  onPressed: () => controller.publicarPlan(plan.id, publicado: !publicado),
                  child: Row(
                    children: [
                      Icon(
                        publicado ? Icons.visibility_off_outlined : Icons.rocket_launch_outlined,
                        size: 15,
                      ),
                      const SizedBox(width: 6),
                      Text(publicado ? 'Despublicar' : 'Publicar'),
                    ],
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

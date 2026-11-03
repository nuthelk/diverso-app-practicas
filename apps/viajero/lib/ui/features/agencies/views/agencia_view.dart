import 'package:diverso_core/diverso_core.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../../../router/app_routes.dart';
import '../../../core/theme/app_insets.dart';
import '../../../core/theme/app_radii.dart';
import '../../../core/theme/app_text.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/agency_avatar.dart';
import '../../../core/widgets/feedback/empty_state.dart';
import '../../../core/widgets/feedback/skeleton.dart';
import '../../../core/widgets/page/cabecera_colapsable.dart';
import '../../../core/widgets/page/titulo_pagina.dart';
import '../../../core/widgets/plan/verified_badge.dart';
import '../../../core/widgets/section_label.dart';
import '../../catalog/widgets/plan_card.dart';
import '../view_models/agencia_view_model.dart';
import '../widgets/agencia_card.dart';

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
  late final AgenciaViewModel _controller;

  @override
  void initState() {
    super.initState();
    _controller = AgenciaViewModel(
      catalogo: context.read<CatalogRepository>(),
      agencyId: widget.agencyId,
    )..cargar();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: ListenableBuilder(
        listenable: _controller,
        builder: (context, _) {
          final c = _controller;
          final agencia = c.agencia;
          if (c.cargando && agencia == null) return const _Esqueleto();
          if (c.error != null && agencia == null) {
            return _Aviso(
              child: EmptyState(
                icono: Icons.cloud_off_rounded,
                titulo: 'No pudimos cargar la agencia',
                mensaje: c.error!,
                detalle: c.errorDetalle,
                accion: FilledButton.tonalIcon(
                  onPressed: c.cargar,
                  icon: const Icon(Icons.refresh_rounded),
                  label: const Text('Reintentar'),
                ),
              ),
            );
          }
          if (agencia == null) {
            return const _Aviso(
              child: EmptyState(
                icono: Icons.storefront_outlined,
                titulo: 'Agencia no disponible',
                mensaje: 'Esta agencia no existe o ya no tiene planes publicados.',
              ),
            );
          }
          return _Contenido(agencia: agencia, planes: c.planes, onRefresh: c.cargar);
        },
      ),
    );
  }
}

void _volver(BuildContext context) {
  // Tras recargar en web no hay nada a donde volver con pop: se va a la lista de agencias.
  if (context.canPop()) {
    context.pop();
  } else {
    context.go(AppRoutes.agencias);
  }
}

/// Pantalla sin cabecera de portada (cargando, error, no encontrada): solo el botón de volver.
class _Aviso extends StatelessWidget {
  const _Aviso({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        AppBar(
          leading: IconButton(
            tooltip: 'Volver',
            icon: const Icon(Icons.arrow_back_rounded),
            onPressed: () => _volver(context),
          ),
        ),
        Expanded(child: child),
      ],
    );
  }
}

class _Esqueleto extends StatelessWidget {
  const _Esqueleto();

  @override
  Widget build(BuildContext context) {
    return _Aviso(
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

class _Contenido extends StatelessWidget {
  const _Contenido({required this.agencia, required this.planes, required this.onRefresh});

  final AgenciaResumen agencia;
  final List<Plan> planes;
  final Future<void> Function() onRefresh;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final esGrid = MediaQuery.sizeOf(context).width > AppTheme.bpCompact;

    return RefreshIndicator(
      onRefresh: onRefresh,
      child: CustomScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        slivers: [
          CabeceraColapsable(
            titulo: agencia.nombre,
            alturaExpandida: 220,
            onVolver: () => _volver(context),
            fondo: PortadaAgencia(agencia: agencia),
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(22, 20, 22, 8),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      AgencyAvatar(agencia: agencia, size: 64),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              agencia.nombre,
                              style: TituloPagina.estilo(
                                cs,
                              ).copyWith(fontSize: AppText.encabezadoXl),
                            ),
                            const SizedBox(height: 8),
                            DatosAgencia(agencia: agencia),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),
                  const VerifiedBadge(),
                  if (agencia.descripcion.trim().isNotEmpty) ...[
                    const SizedBox(height: 16),
                    Text(
                      agencia.descripcion.trim(),
                      style: TextStyle(
                        fontSize: AppText.cuerpoGrande,
                        height: 1.5,
                        color: cs.onSurfaceVariant,
                      ),
                    ),
                  ],
                  const SizedBox(height: 28),
                  SectionLabel('Planes publicados (${planes.length})'),
                ],
              ),
            ),
          ),
          if (planes.isEmpty)
            const SliverToBoxAdapter(
              child: Padding(
                padding: EdgeInsets.fromLTRB(22, 8, 22, 32),
                child: Text('Esta agencia no tiene planes disponibles por ahora.'),
              ),
            )
          else if (esGrid)
            SliverPadding(
              padding: AppInsets.lista,
              sliver: SliverGrid.builder(
                itemCount: planes.length,
                gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
                  maxCrossAxisExtent: 430,
                  mainAxisSpacing: 14,
                  crossAxisSpacing: 14,
                  childAspectRatio: .82,
                ),
                itemBuilder: (context, i) => PlanCard(plan: planes[i]),
              ),
            )
          else
            SliverPadding(
              padding: AppInsets.lista,
              sliver: SliverList.builder(
                itemCount: planes.length,
                itemBuilder: (context, i) => Padding(
                  padding: AppInsets.entreTarjetas,
                  child: PlanCard(plan: planes[i]),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

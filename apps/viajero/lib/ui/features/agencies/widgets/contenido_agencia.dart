import 'package:diverso_core/diverso_core.dart';
import 'package:flutter/material.dart';

import '../../../core/theme/app_insets.dart';
import '../../../core/theme/app_text.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/agency_avatar.dart';
import '../../../core/widgets/page/cabecera_colapsable.dart';
import '../../../core/widgets/page/titulo_pagina.dart';
import '../../../core/widgets/plan/verified_badge.dart';
import '../../../core/widgets/section_label.dart';
import '../../catalog/widgets/plan_card.dart';
import 'agencia_card.dart';
import 'aviso_agencia.dart';

/// El cuerpo de la página de una agencia cargada: portada, datos, descripción y sus planes.
class ContenidoAgencia extends StatelessWidget {
  const ContenidoAgencia({
    super.key,
    required this.agencia,
    required this.planes,
    required this.onRefresh,
  });

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
            onVolver: () => volverDeAgencia(context),
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

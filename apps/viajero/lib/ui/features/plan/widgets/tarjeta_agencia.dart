import 'package:diverso_core/diverso_core.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../../router/app_routes.dart';
import '../../../core/theme/app_radii.dart';
import '../../../core/widgets/agency_avatar.dart';
import '../../../core/widgets/plan/verified_badge.dart';

/// Agencia del plan (confianza, Anexo 4); abre la página de la agencia con sus demás planes.
class TarjetaAgencia extends StatelessWidget {
  const TarjetaAgencia({super.key, required this.agency});

  final Agency agency;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Material(
      color: cs.surfaceContainerLow,
      borderRadius: BorderRadius.circular(AppRadios.card),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () => context.push(AppRoutes.agencia(agency.id)),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(
            children: [
              // Mismo avatar que la lista de agencias: logo o iniciales sobre el color de la agencia.
              AgencyAvatar(
                agencia: AgenciaResumen(
                  id: agency.id,
                  nombre: agency.nombre,
                  ciudad: agency.ciudad,
                  logoUrl: agency.logoUrl,
                ),
                size: 44,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      agency.nombre,
                      style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'Agencia local · RNT ${agency.numeroRnt}',
                      style: TextStyle(fontSize: 12.5, color: cs.onSurfaceVariant),
                    ),
                    if (agency.rntVigenteHasta != null)
                      Text(
                        'RNT vigente hasta el ${formatFechaTexto(agency.rntVigenteHasta!)}',
                        style: TextStyle(fontSize: 12, color: cs.onSurfaceVariant),
                      ),
                    // Debajo del texto y no a su lado: en celulares angostos le robaba el ancho al nombre.
                    if (agency.verificada) ...[
                      const SizedBox(height: 6),
                      // Con letra del sistema grande, se achica antes que desbordar.
                      const FittedBox(
                        fit: BoxFit.scaleDown,
                        alignment: Alignment.centerLeft,
                        child: VerifiedBadge(),
                      ),
                    ],
                  ],
                ),
              ),
              Icon(Icons.chevron_right_rounded, color: cs.onSurfaceVariant),
            ],
          ),
        ),
      ),
    );
  }
}

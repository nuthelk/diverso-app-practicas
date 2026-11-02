import 'package:diverso_core/diverso_core.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../../router/app_routes.dart';
import '../../../core/widgets/agency_avatar.dart';
import '../../../core/widgets/plan/verified_badge.dart';
import '../../../core/widgets/rating/insignia_nueva.dart';

/// Tarjeta de agencia de la lista: portada, logo (o iniciales), nombre, puntaje («Nueva» sin
/// reseñas), ciudad, número de planes y sello de verificación. Abre `/agencia/:id`.
class AgenciaCard extends StatelessWidget {
  const AgenciaCard({super.key, required this.agencia});

  final AgenciaResumen agencia;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Card(
      color: cs.surfaceContainerLow,
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () => context.push(AppRoutes.agencia(agencia.id)),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            SizedBox(
              height: 128,
              child: Stack(
                fit: StackFit.expand,
                children: [
                  PortadaAgencia(agencia: agencia),
                  const Positioned(
                    top: 10,
                    left: 10,
                    child: VerifiedBadge(blanco: true, compacto: true),
                  ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(14, 12, 14, 14),
              child: Row(
                children: [
                  AgencyAvatar(agencia: agencia),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          agencia.nombre,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontSize: 15.5,
                            fontWeight: FontWeight.w700,
                            letterSpacing: -.3,
                          ),
                        ),
                        const SizedBox(height: 5),
                        DatosAgencia(agencia: agencia),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Puntaje (★ 4.5 (2) o «Nueva»), ciudad y «N planes» en una línea que se parte si no cabe.
class DatosAgencia extends StatelessWidget {
  const DatosAgencia({super.key, required this.agencia});

  final AgenciaResumen agencia;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final suave = TextStyle(fontSize: 12.5, color: cs.onSurfaceVariant);
    return Wrap(
      spacing: 10,
      runSpacing: 3,
      crossAxisAlignment: WrapCrossAlignment.center,
      children: [
        if (agencia.esNueva)
          InsigniaNueva(texto: agencia.puntajeTexto)
        else
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.star_rounded, size: 17, color: Color(0xFFE8A33D)),
              const SizedBox(width: 2),
              Text(
                agencia.puntajeTexto,
                style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: cs.onSurface),
              ),
              const SizedBox(width: 3),
              Text('(${agencia.reviewsTotal})', style: suave),
            ],
          ),
        if (agencia.ciudad.isNotEmpty)
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.location_on_outlined, size: 14, color: cs.onSurfaceVariant),
              const SizedBox(width: 2),
              Text(agencia.ciudad, style: suave),
            ],
          ),
        Text(agencia.planesTexto, style: suave),
      ],
    );
  }
}

/// Foto de portada: la del plan mejor puntuado; sin foto, un fondo del color de la agencia.
class PortadaAgencia extends StatelessWidget {
  const PortadaAgencia({super.key, required this.agencia});

  final AgenciaResumen agencia;

  @override
  Widget build(BuildContext context) {
    final color = colorDeAgencia(agencia.id);
    final sinFoto = ColoredBox(
      color: color.withValues(alpha: .16),
      child: Center(
        child: Icon(Icons.storefront_rounded, size: 40, color: color.withValues(alpha: .55)),
      ),
    );
    final url = agencia.portadaUrl;
    if (url == null || url.isEmpty) return sinFoto;
    return Image.network(
      url,
      fit: BoxFit.cover,
      gaplessPlayback: true,
      filterQuality: FilterQuality.low,
      errorBuilder: (_, _, _) => sinFoto,
    );
  }
}

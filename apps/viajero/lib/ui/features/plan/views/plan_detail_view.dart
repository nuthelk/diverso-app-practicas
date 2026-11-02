import 'package:diverso_core/diverso_core.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../../core/theme/app_radii.dart';
import '../../../core/widgets/agency_avatar.dart';
import '../../../core/widgets/feedback/empty_state.dart';
import '../../../core/widgets/feedback/skeleton.dart';
import '../../../core/widgets/page/cabecera_colapsable.dart';
import '../../../core/widgets/plan/paso_itinerario.dart';
import '../../../core/widgets/plan/tarjeta_cancelacion.dart';
import '../../../core/widgets/plan/verified_badge.dart';
import '../../../core/widgets/rating/estrellas_calificacion.dart';
import '../../../core/widgets/rating/puntaje_plan.dart';
import '../../../core/widgets/section_label.dart';

/// Ficha del plan: hero con galería, confianza de la agencia, qué incluye,
/// itinerario y barra inferior con fecha, cupos en tiempo real y CTA.
class PlanDetailView extends StatefulWidget {
  const PlanDetailView({super.key, required this.planId});

  final String planId;

  @override
  State<PlanDetailView> createState() => _PlanDetailViewState();
}

class _PlanDetailViewState extends State<PlanDetailView> {
  late final CatalogRepository _catalogo;
  late final ReviewRepository _resenas;
  late Future<(Plan, List<Review>)> _future;
  final _pageCtrl = PageController();

  @override
  void initState() {
    super.initState();
    _catalogo = context.read<CatalogRepository>();
    _resenas = context.read<ReviewRepository>();
    _cargar();
  }

  @override
  void dispose() {
    _pageCtrl.dispose();
    super.dispose();
  }

  void _cargar() {
    _future = () async {
      final plan = await _catalogo.planDetalle(widget.planId);
      final reviews = await _resenas.porPlan(widget.planId, limit: 4);
      return (plan, reviews);
    }();
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;

    return Scaffold(
      body: FutureBuilder<(Plan, List<Review>)>(
        future: _future,
        builder: (context, snap) {
          if (snap.connectionState != ConnectionState.done) {
            return const _DetalleSkeleton();
          }
          if (snap.hasError) {
            return EmptyState(
              icono: Icons.cloud_off_rounded,
              titulo: 'No pudimos cargar el plan',
              mensaje: 'Revisa tu conexión e intenta de nuevo.',
              accion: FilledButton.tonal(
                onPressed: () => setState(_cargar),
                child: const Text('Reintentar'),
              ),
            );
          }
          final (plan, reviews) = snap.data!;

          // La barra va debajo del scroll, no encima: así el contenido termina donde ella empieza,
          // mida lo que mida (barra de gestos del sistema, tamaño de letra).
          return Column(
            children: [
              Expanded(
                child: CustomScrollView(
                  slivers: [
                    // Galería hero ------------------------------------------------
                    CabeceraColapsable(
                      titulo: plan.titulo,
                      alturaExpandida: 300,
                      onVolver: () => context.pop(),
                      fondo: plan.fotos.isEmpty
                          ? Container(color: cs.primaryContainer)
                          // Asentado cinematográfico: la foto entra con un
                          // leve zoom y se calma al hacerlo visible.
                          : TweenAnimationBuilder<double>(
                              tween: Tween(begin: 1.06, end: 1),
                              duration: const Duration(milliseconds: 900),
                              curve: Curves.easeOutCubic,
                              builder: (context, t, child) =>
                                  Transform.scale(scale: t, child: child),
                              child: PageView.builder(
                                controller: _pageCtrl,
                                itemCount: plan.fotos.length,
                                itemBuilder: (context, i) => Image.network(
                                  plan.fotos[i],
                                  fit: BoxFit.cover,
                                  gaplessPlayback: true,
                                  filterQuality: FilterQuality.low,
                                  errorBuilder: (_, _, _) => Container(color: cs.primaryContainer),
                                ),
                              ),
                            ),
                    ),
                    SliverToBoxAdapter(
                      child: Padding(
                        padding: const EdgeInsets.fromLTRB(22, 20, 22, 24),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // Encabezado -----------------------------------------
                            Text(
                              plan.titulo,
                              style: const TextStyle(
                                fontSize: 26,
                                fontWeight: FontWeight.w800,
                                height: 1.15,
                                letterSpacing: -.8,
                              ),
                            ),
                            const SizedBox(height: 8),
                            Row(
                              children: [
                                PuntajePlan(plan: plan, detallado: true),
                                const Spacer(),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                                  decoration: BoxDecoration(
                                    color: cs.secondaryContainer,
                                    borderRadius: BorderRadius.circular(999),
                                  ),
                                  child: Row(
                                    children: [
                                      Icon(
                                        Icons.schedule_rounded,
                                        size: 14,
                                        color: cs.onSecondaryContainer,
                                      ),
                                      const SizedBox(width: 4),
                                      Text(
                                        plan.duracionTexto,
                                        style: TextStyle(
                                          fontSize: 12,
                                          fontWeight: FontWeight.w700,
                                          color: cs.onSecondaryContainer,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 18),

                            // Agencia (confianza, Anexo 4) -----------------------
                            if (plan.agency != null) _TarjetaAgencia(agency: plan.agency!),
                            const SizedBox(height: 24),

                            if (plan.descripcion.isNotEmpty) ...[
                              const SectionLabel('La experiencia'),
                              Text(
                                plan.descripcion,
                                style: TextStyle(
                                  height: 1.55,
                                  fontSize: 14.5,
                                  color: cs.onSurface.withValues(alpha: .85),
                                ),
                              ),
                              const SizedBox(height: 24),
                            ],

                            // Qué incluye (transparencia de precio) --------------
                            if (plan.incluye.isNotEmpty ||
                                plan.incluyeTransporte ||
                                plan.incluyeComida ||
                                plan.incluyeHospedaje) ...[
                              const SectionLabel('Qué incluye · precio final'),
                              Wrap(
                                spacing: 8,
                                runSpacing: 8,
                                children: [
                                  if (plan.incluyeTransporte)
                                    const _IncluyePill(
                                      icono: Icons.directions_bus_rounded,
                                      texto: 'Transporte',
                                    ),
                                  if (plan.incluyeComida)
                                    const _IncluyePill(
                                      icono: Icons.restaurant_rounded,
                                      texto: 'Comida',
                                    ),
                                  if (plan.incluyeHospedaje)
                                    const _IncluyePill(
                                      icono: Icons.hotel_rounded,
                                      texto: 'Hospedaje',
                                    ),
                                  ...plan.incluye.map(
                                    (i) => _IncluyePill(
                                      icono: Icons.check_circle_rounded,
                                      texto: i,
                                      textoLargo: true,
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 24),
                            ],

                            // Itinerario ------------------------------------------
                            if (plan.itinerario.isNotEmpty) ...[
                              const SectionLabel('Itinerario'),
                              ...plan.itinerario.map((paso) => PasoItinerario(paso: paso)),
                              const SizedBox(height: 24),
                            ],

                            if (plan.puntoEncuentro.isNotEmpty) ...[
                              const SectionLabel('Punto de encuentro'),
                              Row(
                                children: [
                                  Icon(Icons.flag_rounded, size: 17, color: cs.primary),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: Text(
                                      plan.puntoEncuentro,
                                      style: const TextStyle(fontSize: 14.5),
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 24),
                            ],

                            // Política de cancelación visible (Anexo 5) ----------
                            if (plan.politicaCancelacion.isNotEmpty)
                              TarjetaCancelacion(texto: plan.politicaCancelacion),

                            // Reseñas verificadas ---------------------------------
                            if (reviews.isNotEmpty) ...[
                              const SizedBox(height: 24),
                              SectionLabel('Reseñas verificadas (${plan.reviewsCount})'),
                              ...reviews.map((r) => _ResenaItem(review: r)),
                            ] else if (plan.reviewsCount > 0) ...[
                              const SizedBox(height: 24),
                              SectionLabel('Reseñas verificadas (${plan.reviewsCount})'),
                              Text(
                                'Carga al volver a abrir…',
                                style: TextStyle(color: cs.onSurfaceVariant, fontSize: 13),
                              ),
                            ],
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              // Barra de reserva ----------------------------------------------
              _BarraReserva(plan: plan),
            ],
          );
        },
      ),
    );
  }
}

/// Agencia del plan (confianza, Anexo 4); abre la página de la agencia con sus demás planes.
class _TarjetaAgencia extends StatelessWidget {
  const _TarjetaAgencia({required this.agency});

  final Agency agency;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Material(
      color: cs.surfaceContainerLow,
      borderRadius: BorderRadius.circular(AppRadios.card),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () => context.push('/agencia/${agency.id}'),
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

class _IncluyePill extends StatelessWidget {
  const _IncluyePill({required this.icono, required this.texto, this.textoLargo = false});

  final IconData icono;
  final String texto;
  final bool textoLargo;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: cs.surfaceContainerLow,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icono, size: 15, color: cs.primary),
          const SizedBox(width: 6),
          Flexible(
            child: Text(
              texto,
              overflow: textoLargo ? TextOverflow.ellipsis : TextOverflow.visible,
              style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600),
            ),
          ),
        ],
      ),
    );
  }
}

class _ResenaItem extends StatelessWidget {
  const _ResenaItem({required this.review});

  final Review review;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: cs.surfaceContainerLow,
        borderRadius: BorderRadius.circular(AppRadios.card),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              CircleAvatar(
                radius: 15,
                child: Text(
                  (review.viajeroNombre ?? 'V').substring(0, 1).toUpperCase(),
                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700),
                ),
              ),
              const SizedBox(width: 9),
              Expanded(
                child: Text(
                  review.viajeroNombre ?? 'Viajero',
                  style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13.5),
                ),
              ),
              EstrellasCalificacion(calificacion: review.calificacion, size: 14),
              const SizedBox(width: 5),
              Tooltip(
                message: 'Reseña verificada: solo quien compró puede opinar',
                child: Icon(Icons.verified_rounded, size: 14, color: cs.tertiary),
              ),
            ],
          ),
          if ((review.comentario ?? '').isNotEmpty) ...[
            const SizedBox(height: 10),
            Text(review.comentario!, style: const TextStyle(height: 1.45, fontSize: 13.5)),
          ],
        ],
      ),
    );
  }
}

class _BarraReserva extends StatefulWidget {
  const _BarraReserva({required this.plan});

  final Plan plan;

  @override
  State<_BarraReserva> createState() => _BarraReservaState();
}

class _BarraReservaState extends State<_BarraReserva> {
  int _fechaIdx = 0;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final fechas = widget.plan.fechasDisponibles;

    if (fechas.isEmpty) {
      return _superficie(
        context,
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
          child: Row(
            children: [
              Icon(Icons.event_busy_rounded, color: cs.onSurfaceVariant),
              const SizedBox(width: 10),
              const Expanded(
                child: Text(
                  'Sin fechas disponibles por ahora',
                  style: TextStyle(fontWeight: FontWeight.w600),
                ),
              ),
              // Flexible: en celulares angostos o con letra grande el botón parte su texto en vez de desbordar.
              Flexible(
                child: TextButton(
                  onPressed: () => context.pop(),
                  child: const Text('Ver otros planes', textAlign: TextAlign.center),
                ),
              ),
            ],
          ),
        ),
      );
    }
    if (_fechaIdx >= fechas.length) _fechaIdx = 0;
    final fecha = fechas[_fechaIdx];
    final total = widget.plan.precioCop;

    return _superficie(
      context,
      SafeArea(
        minimum: const EdgeInsets.fromLTRB(20, 10, 20, 12),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            SizedBox(
              height: 62,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                itemCount: fechas.length,
                separatorBuilder: (_, _) => const SizedBox(width: 8),
                itemBuilder: (context, i) {
                  final f = fechas[i];
                  final sel = i == _fechaIdx;
                  final pocos = f.cupoDisponible <= 4;
                  return AnimatedContainer(
                    duration: const Duration(milliseconds: 160),
                    curve: Curves.easeOut,
                    padding: const EdgeInsets.symmetric(horizontal: 14),
                    decoration: BoxDecoration(
                      color: sel ? cs.primary : cs.surfaceContainerHigh,
                      borderRadius: BorderRadius.circular(AppRadios.field),
                    ),
                    child: InkWell(
                      borderRadius: BorderRadius.circular(AppRadios.field),
                      onTap: () => setState(() => _fechaIdx = i),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            formatFechaCorta(f.fecha),
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w700,
                              color: sel ? cs.onPrimary : cs.onSurface,
                            ),
                          ),
                          Text(
                            pocos ? '¡Últimos ${f.cupoDisponible}!' : '${f.cupoDisponible} cupos',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w600,
                              color: sel
                                  ? cs.onPrimary.withValues(alpha: .8)
                                  : pocos
                                  ? Colors.orange.shade800
                                  : cs.onSurfaceVariant,
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      formatCOP(total),
                      style: TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.w800,
                        letterSpacing: -.5,
                        color: cs.onSurface,
                      ),
                    ),
                    Text(
                      'por persona · precio final',
                      style: TextStyle(fontSize: 10.5, color: cs.onSurfaceVariant),
                    ),
                  ],
                ),
                const Spacer(),
                FilledButton.icon(
                  style: FilledButton.styleFrom(minimumSize: const Size(150, 52)),
                  onPressed: () => context.push('/checkout/${widget.plan.id}/${fecha.id}'),
                  icon: const Icon(Icons.lock_outline_rounded, size: 17),
                  label: const Text('Reservar'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _superficie(BuildContext context, Widget child) {
    final cs = Theme.of(context).colorScheme;
    return Container(
      decoration: BoxDecoration(
        color: Theme.of(context).scaffoldBackgroundColor,
        border: Border(top: BorderSide(color: cs.outlineVariant.withValues(alpha: .5))),
      ),
      child: child,
    );
  }
}

class _DetalleSkeleton extends StatelessWidget {
  const _DetalleSkeleton();

  @override
  Widget build(BuildContext context) {
    return const Column(
      children: [
        AspectRatio(aspectRatio: 1.4, child: Skeleton(height: double.infinity, radius: 0)),
        Padding(
          padding: EdgeInsets.all(22),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Skeleton(width: 260, height: 24),
              SizedBox(height: 14),
              Skeleton(height: 14),
              SizedBox(height: 10),
              Skeleton(width: 180, height: 14),
              SizedBox(height: 26),
              Skeleton(height: 90, radius: 20),
            ],
          ),
        ),
      ],
    );
  }
}

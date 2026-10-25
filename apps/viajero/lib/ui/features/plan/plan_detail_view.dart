import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:diverso_core/diverso_core.dart';

import '../../core/app_theme.dart';
import '../../core/widgets.dart';

/// Ficha del plan: hero con galería, confianza de la agencia, qué incluye,
/// itinerario y barra inferior con fecha, cupos en tiempo real y CTA.
class PlanDetailView extends StatefulWidget {
  const PlanDetailView({super.key, required this.planId});

  final String planId;

  @override
  State<PlanDetailView> createState() => _PlanDetailViewState();
}

class _PlanDetailViewState extends State<PlanDetailView> {
  final _catalogo = CatalogService();
  final _resenas = ReviewService();
  late Future<(Plan, List<Review>)> _future;
  final _pageCtrl = PageController();

  @override
  void initState() {
    super.initState();
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

          return Stack(
            children: [
              CustomScrollView(
                slivers: [
                  // Galería hero ------------------------------------------------
                  SliverAppBar(
                    pinned: true,
                    expandedHeight: 300,
                    leading: Padding(
                      padding: const EdgeInsets.all(8),
                      child: IconButton.filled(
                        style: IconButton.styleFrom(
                          backgroundColor: Colors.black.withValues(alpha: .30),
                          foregroundColor: Colors.white,
                        ),
                        tooltip: 'Volver',
                        icon: const Icon(Icons.arrow_back_rounded, size: 20),
                        onPressed: () => context.pop(),
                      ),
                    ),
                    flexibleSpace: FlexibleSpaceBar(
                      background: plan.fotos.isEmpty
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
                                  errorBuilder: (_, _, _) =>
                                      Container(color: cs.primaryContainer),
                                ),
                              ),
                            ),
                    ),
                  ),
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(22, 20, 22, 170),
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
                              RatingStars(calificacion: plan.ratingPromedio, mostrarNumero: true),
                              if (plan.reviewsCount > 0)
                                Text(
                                  ' · ${plan.reviewsCount} reseñas verificadas',
                                  style: TextStyle(fontSize: 13, color: cs.onSurfaceVariant),
                                ),
                              const Spacer(),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                                decoration: BoxDecoration(
                                  color: cs.secondaryContainer,
                                  borderRadius: BorderRadius.circular(999),
                                ),
                                child: Row(
                                  children: [
                                    Icon(Icons.schedule_rounded,
                                        size: 14, color: cs.onSecondaryContainer),
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
                                  const _IncluyePill(icono: Icons.directions_bus_rounded, texto: 'Transporte'),
                                if (plan.incluyeComida)
                                  const _IncluyePill(icono: Icons.restaurant_rounded, texto: 'Comida'),
                                if (plan.incluyeHospedaje)
                                  const _IncluyePill(icono: Icons.hotel_rounded, texto: 'Hospedaje'),
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
                            ...plan.itinerario.map((paso) => _PasoItinerario(paso: paso)),
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
                            _TarjetaCancelacion(texto: plan.politicaCancelacion),

                          // Reseñas verificadas ---------------------------------
                          if (reviews.isNotEmpty) ...[
                            const SizedBox(height: 24),
                            SectionLabel('Reseñas verificadas (${plan.reviewsCount})'),
                            ...reviews.map((r) => _ResenaItem(review: r)),
                          ] else if (plan.reviewsCount > 0) ...[
                            const SizedBox(height: 24),
                            SectionLabel('Reseñas verificadas (${plan.reviewsCount})'),
                            Text('Carga al volver a abrir…',
                                style: TextStyle(color: cs.onSurfaceVariant, fontSize: 13)),
                          ],
                        ],
                      ),
                    ),
                  ),
                ],
              ),
              // Barra de reserva ----------------------------------------------
              Positioned(
                left: 0,
                right: 0,
                bottom: 0,
                child: _BarraReserva(plan: plan),
              ),
            ],
          );
        },
      ),
    );
  }
}

class _TarjetaAgencia extends StatelessWidget {
  const _TarjetaAgencia({required this.agency});

  final Agency agency;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: cs.surfaceContainerLow,
        borderRadius: BorderRadius.circular(AppRadios.card),
      ),
      child: Row(
        children: [
          CircleAvatar(
            radius: 22,
            backgroundColor: cs.primaryContainer,
            child: Text(
              agency.nombre.substring(0, 1),
              style: TextStyle(
                fontWeight: FontWeight.w800,
                fontSize: 17,
                color: cs.onPrimaryContainer,
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(agency.nombre,
                    style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
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
              ],
            ),
          ),
          if (agency.verificada) const VerifiedBadge(),
        ],
      ),
    );
  }
}

class _TarjetaCancelacion extends StatelessWidget {
  const _TarjetaCancelacion({required this.texto});

  final String texto;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: cs.tertiaryContainer.withValues(alpha: .45),
        borderRadius: BorderRadius.circular(AppRadios.card),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(Icons.shield_outlined, size: 19, color: cs.onTertiaryContainer),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Política de cancelación',
                    style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13.5)),
                const SizedBox(height: 3),
                Text(
                  texto,
                  style: TextStyle(
                    fontSize: 13,
                    height: 1.45,
                    color: cs.onSurface.withValues(alpha: .8),
                  ),
                ),
              ],
            ),
          ),
        ],
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

class _PasoItinerario extends StatelessWidget {
  const _PasoItinerario({required this.paso});

  final ItinerarioPaso paso;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          SizedBox(
            width: 62,
            child: Text(
              paso.hora,
              textAlign: TextAlign.right,
              style: TextStyle(
                fontWeight: FontWeight.w800,
                fontSize: 13,
                color: cs.primary,
                height: 1.35,
              ),
            ),
          ),
          const SizedBox(width: 14),
          Column(
            children: [
              Container(
                margin: const EdgeInsets.only(top: 4),
                width: 8,
                height: 8,
                decoration: BoxDecoration(color: cs.primary, shape: BoxShape.circle),
              ),
              Expanded(child: Container(width: 1.6, color: cs.outlineVariant)),
            ],
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.only(bottom: 16),
              child: Text(
                paso.actividad,
                style: const TextStyle(height: 1.45, fontSize: 14),
              ),
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
              RatingStars(calificacion: review.calificacion.toDouble(), size: 13),
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
                child: Text('Sin fechas disponibles por ahora',
                    style: TextStyle(fontWeight: FontWeight.w600)),
              ),
              TextButton(
                onPressed: () => context.pop(),
                child: const Text('Ver otros planes'),
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
                    const Text('por persona · precio final',
                        style: TextStyle(fontSize: 10.5, color: Colors.black45)),
                  ],
                ),
                const Spacer(),
                FilledButton.icon(
                  style: FilledButton.styleFrom(
                    minimumSize: const Size(150, 52),
                  ),
                  onPressed: () => context.push(
                    '/checkout',
                    extra: (widget.plan, fecha),
                  ),
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

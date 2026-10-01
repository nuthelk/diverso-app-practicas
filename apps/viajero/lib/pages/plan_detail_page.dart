import 'package:flutter/material.dart';
import 'package:diverso_core/diverso_core.dart';

import '../widgets/rating_stars.dart';
import '../widgets/verified_badge.dart';
import 'checkout_page.dart';

class PlanDetailPage extends StatefulWidget {
  const PlanDetailPage({super.key, required this.planId});

  final String planId;

  @override
  State<PlanDetailPage> createState() => _PlanDetailPageState();
}

class _PlanDetailPageState extends State<PlanDetailPage> {
  final _catalogo = CatalogService();
  final _resenas = ReviewService();
  late Future<(Plan, List<Review>)> _future;

  @override
  void initState() {
    super.initState();
    _future = _cargar();
  }

  Future<(Plan, List<Review>)> _cargar() async {
    final plan = await _catalogo.planDetalle(widget.planId);
    final reviews = await _resenas.porPlan(widget.planId, limit: 5);
    return (plan, reviews);
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;

    return Scaffold(
      body: FutureBuilder<(Plan, List<Review>)>(
        future: _future,
        builder: (context, snap) {
          if (snap.connectionState != ConnectionState.done) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snap.hasError) {
            return Center(child: Text('No pudimos cargar el plan: ${snap.error}'));
          }
          final (plan, reviews) = snap.data!;

          return CustomScrollView(
            slivers: [
              SliverAppBar(
                expandedHeight: 240,
                pinned: true,
                flexibleSpace: FlexibleSpaceBar(
                  background: plan.fotos.isEmpty
                      ? Container(color: cs.primaryContainer)
                      : PageView.builder(
                          itemCount: plan.fotos.length,
                          itemBuilder: (context, i) => Image.network(
                            plan.fotos[i],
                            fit: BoxFit.cover,
                            errorBuilder: (_, _, _) =>
                                Container(color: cs.primaryContainer),
                          ),
                        ),
                ),
              ),
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Encabezado
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              plan.titulo,
                              style: Theme.of(context)
                                  .textTheme
                                  .headlineSmall
                                  ?.copyWith(fontWeight: FontWeight.w800),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 6),
                      Row(
                        children: [
                          Icon(Icons.place_outlined, size: 16, color: cs.primary),
                          const SizedBox(width: 4),
                          Text('${plan.destino} · ${plan.duracionTexto}'),
                          const SizedBox(width: 10),
                          RatingStars(calificacion: plan.ratingPromedio),
                          if (plan.reviewsCount > 0)
                            Text(' ${plan.ratingPromedio.toStringAsFixed(1)} '
                                '(${plan.reviewsCount} reseñas)'),
                        ],
                      ),
                      const SizedBox(height: 12),

                      // Agencia con sello de verificación (confianza, Anexo 4)
                      if (plan.agency != null) ...[
                        Card(
                          color: cs.surfaceContainerHighest,
                          child: Padding(
                            padding: const EdgeInsets.all(12),
                            child: Row(
                              children: [
                                CircleAvatar(
                                  backgroundColor: cs.primaryContainer,
                                  child: Text(
                                    plan.agency!.nombre.substring(0, 1),
                                style: TextStyle(color: cs.onPrimaryContainer),
                              ),
                                ),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        plan.agency!.nombre,
                                        style: const TextStyle(fontWeight: FontWeight.w700),
                                      ),
                                      Text(
                                        'Agencia local · RNT ${plan.agency!.numeroRnt}',
                                        style: Theme.of(context).textTheme.bodySmall,
                                      ),
                                    ],
                                  ),
                                ),
                                if (plan.agency!.verificada) const VerifiedBadge(),
                              ],
                            ),
                          ),
                        ),
                        const SizedBox(height: 16),
                      ],

                      // Qué incluye (transparencia de precio, Anexo 4)
                      const _Seccion(titulo: 'Qué incluye'),
                      Wrap(
                        spacing: 6,
                        runSpacing: 6,
                        children: [
                          if (plan.incluyeTransporte)
                            const _IncluyeChip(icono: Icons.directions_bus, texto: 'Transporte'),
                          if (plan.incluyeComida)
                            const _IncluyeChip(icono: Icons.restaurant, texto: 'Comida'),
                          if (plan.incluyeHospedaje)
                            const _IncluyeChip(icono: Icons.hotel, texto: 'Hospedaje'),
                          ...plan.incluye.map((i) => _IncluyeChip(
                              icono: Icons.check_circle_outline, texto: i)),
                        ],
                      ),
                      const SizedBox(height: 20),

                      if (plan.descripcion.isNotEmpty) ...[
                        const _Seccion(titulo: 'Descripción'),
                        Text(plan.descripcion, style: const TextStyle(height: 1.4)),
                        const SizedBox(height: 20),
                      ],

                      if (plan.itinerario.isNotEmpty) ...[
                        const _Seccion(titulo: 'Itinerario'),
                        ...plan.itinerario.map((paso) => _PasoItinerario(paso: paso)),
                        const SizedBox(height: 20),
                      ],

                      if (plan.puntoEncuentro.isNotEmpty) ...[
                        const _Seccion(titulo: 'Punto de encuentro'),
                        Row(
                          children: [
                            Icon(Icons.flag_outlined, size: 18, color: cs.primary),
                            const SizedBox(width: 6),
                            Expanded(child: Text(plan.puntoEncuentro)),
                          ],
                        ),
                        const SizedBox(height: 20),
                      ],

                      // Política de cancelación visible (Anexo 5)
                      if (plan.politicaCancelacion.isNotEmpty)
                        ExpansionTile(
                          tilePadding: EdgeInsets.zero,
                          title: const Text('Política de cancelación',
                              style:
                                  TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
                          childrenPadding: const EdgeInsets.only(bottom: 12),
                          children: [
                            Text(plan.politicaCancelacion,
                                style: const TextStyle(height: 1.4)),
                          ],
                        ),

                      // Reseñas verificadas
                      if (reviews.isNotEmpty) ...[
                        const SizedBox(height: 8),
                        _Seccion(
                            titulo: 'Reseñas verificadas (${plan.reviewsCount})'),
                        ...reviews.map((r) => _ResenaItem(review: r)),
                      ] else if (plan.reviewsCount > 0) ...[
                        const _Seccion(titulo: 'Reseñas'),
                        const Text('Carga las reseñas al abrir de nuevo…'),
                      ],
                      const SizedBox(height: 120),
                    ],
                  ),
                ),
              ),
            ],
          );
        },
      ),
      bottomSheet: FutureBuilder<(Plan, List<Review>)>(
        future: _future,
        builder: (context, snap) {
          if (!snap.hasData) return const SizedBox.shrink();
          final plan = snap.data!.$1;
          return _BarraReserva(plan: plan);
        },
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
      return SafeArea(
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: cs.surface,
            border: Border(top: BorderSide(color: Colors.black12)),
          ),
          child: Row(
            children: [
              const Expanded(child: Text('Sin fechas disponibles por ahora')),
              FilledButton.tonal(
                onPressed: () => Navigator.pop(context),
                child: const Text('Ver otros planes'),
              ),
            ],
          ),
        ),
      );
    }
    if (_fechaIdx >= fechas.length) _fechaIdx = 0;
    final fecha = fechas[_fechaIdx];

    return SafeArea(
      child: Container(
        padding: const EdgeInsets.fromLTRB(16, 10, 16, 10),
        decoration: BoxDecoration(
          color: cs.surface,
          border: const Border(top: BorderSide(color: Colors.black12)),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: .06),
              blurRadius: 12,
              offset: const Offset(0, -2),
            ),
          ],
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            SizedBox(
              height: 64,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                itemCount: fechas.length,
                separatorBuilder: (_, _) => const SizedBox(width: 8),
                itemBuilder: (context, i) {
                  final f = fechas[i];
                  final sel = i == _fechaIdx;
                  return ChoiceChip.elevated(
                    label: Text(
                      '${formatFechaCorta(f.fecha)}\n${f.cupoDisponible} cupos',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 12,
                        height: 1.2,
                        color: sel ? cs.onPrimary : null,
                      ),
                    ),
                    selected: sel,
                    onSelected: (_) => setState(() => _fechaIdx = i),
                    showCheckmark: false,
                  );
                },
              ),
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      formatCOP(widget.plan.precioCop),
                      style: Theme.of(context)
                          .textTheme
                          .titleLarge
                          ?.copyWith(fontWeight: FontWeight.w800, color: cs.primary),
                    ),
                    const Text('por persona · precio final',
                        style: TextStyle(fontSize: 10, color: Colors.black54)),
                  ],
                ),
                const Spacer(),
                FilledButton(
                  onPressed: () {
                    Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (_) => CheckoutPage(plan: widget.plan, fecha: fecha),
                      ),
                    );
                  },
                  child: const Text('Reservar'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _Seccion extends StatelessWidget {
  const _Seccion({required this.titulo});

  final String titulo;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Text(
        titulo,
        style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16),
      ),
    );
  }
}

class _IncluyeChip extends StatelessWidget {
  const _IncluyeChip({required this.icono, required this.texto});

  final IconData icono;
  final String texto;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: cs.secondaryContainer,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icono, size: 14, color: cs.onSecondaryContainer),
          const SizedBox(width: 5),
          Text(
            texto,
            style: TextStyle(
              fontSize: 12,
              color: cs.onSecondaryContainer,
              fontWeight: FontWeight.w500,
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
            width: 64,
            child: Text(
              paso.hora,
              textAlign: TextAlign.right,
              style: TextStyle(
                fontWeight: FontWeight.w700,
                fontSize: 13,
                color: cs.primary,
              ),
            ),
          ),
          const SizedBox(width: 12),
          Column(
            children: [
              Container(
                width: 10,
                height: 10,
                decoration: BoxDecoration(color: cs.primary, shape: BoxShape.circle),
              ),
              Expanded(child: Container(width: 2, color: Colors.black12)),
            ],
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.only(bottom: 14),
              child: Text(paso.actividad, style: const TextStyle(height: 1.3)),
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
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                CircleAvatar(
                  radius: 14,
                  child: Text(
                    (review.viajeroNombre ?? 'V').substring(0, 1).toUpperCase(),
                    style: const TextStyle(fontSize: 13),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    review.viajeroNombre ?? 'Viajero',
                    style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
                  ),
                ),
                RatingStars(calificacion: review.calificacion.toDouble(), size: 14),
                const SizedBox(width: 4),
                const Icon(Icons.verified, size: 13, color: Colors.blueGrey),
              ],
            ),
            if (review.comentario != null && review.comentario!.isNotEmpty) ...[
              const SizedBox(height: 8),
              Text(review.comentario!, style: const TextStyle(height: 1.3)),
            ],
          ],
        ),
      ),
    );
  }
}

import 'package:diverso_core/diverso_core.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../../core/theme/app_radii.dart';
import '../../../core/widgets/feedback/empty_state.dart';
import '../../../core/widgets/page/cabecera_colapsable.dart';
import '../../../core/widgets/plan/paso_itinerario.dart';
import '../../../core/widgets/plan/tarjeta_cancelacion.dart';
import '../../../core/widgets/rating/puntaje_plan.dart';
import '../../../core/widgets/section_label.dart';
import '../view_models/plan_detail_view_model.dart';
import '../widgets/barra_reserva.dart';
import '../widgets/detalle_skeleton.dart';
import '../widgets/incluye_pill.dart';
import '../widgets/resena_item.dart';
import '../widgets/tarjeta_agencia.dart';

/// Ficha del plan: hero con galería, confianza de la agencia, qué incluye,
/// itinerario y barra inferior con fecha, cupos en tiempo real y CTA. El estado vive en
/// [PlanDetailViewModel] (MVVM).
class PlanDetailView extends StatefulWidget {
  const PlanDetailView({super.key, required this.planId});

  final String planId;

  @override
  State<PlanDetailView> createState() => _PlanDetailViewState();
}

class _PlanDetailViewState extends State<PlanDetailView> {
  late final PlanDetailViewModel _viewModel;
  final _pageCtrl = PageController();

  @override
  void initState() {
    super.initState();
    _viewModel = PlanDetailViewModel(
      catalogo: context.read<CatalogRepository>(),
      resenas: context.read<ReviewRepository>(),
      planId: widget.planId,
    )..cargar();
  }

  @override
  void dispose() {
    _pageCtrl.dispose();
    _viewModel.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: ListenableBuilder(
        listenable: _viewModel,
        builder: (context, _) {
          final vm = _viewModel;
          final plan = vm.plan;
          if (vm.cargando) return const DetalleSkeleton();
          if (vm.error != null || plan == null) {
            return EmptyState(
              icono: Icons.cloud_off_rounded,
              titulo: 'No pudimos cargar el plan',
              mensaje: vm.error ?? '',
              accion: FilledButton.tonal(onPressed: vm.cargar, child: const Text('Reintentar')),
            );
          }

          // La barra va debajo del scroll, no encima: así el contenido termina donde ella empieza,
          // mida lo que mida (barra de gestos del sistema, tamaño de letra).
          return Column(
            children: [
              Expanded(
                child: _Contenido(plan: plan, reviews: vm.resenas, pageCtrl: _pageCtrl),
              ),
              BarraReserva(
                plan: plan,
                fechas: vm.fechas,
                seleccionada: vm.fechaSeleccionada,
                onSeleccionar: vm.seleccionarFecha,
              ),
            ],
          );
        },
      ),
    );
  }
}

/// Galería hero y secciones de la ficha (todo lo que hace scroll).
class _Contenido extends StatelessWidget {
  const _Contenido({required this.plan, required this.reviews, required this.pageCtrl});

  final Plan plan;
  final List<Review> reviews;
  final PageController pageCtrl;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return CustomScrollView(
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
                  builder: (context, t, child) => Transform.scale(scale: t, child: child),
                  child: PageView.builder(
                    controller: pageCtrl,
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
                        borderRadius: BorderRadius.circular(AppRadios.pill),
                      ),
                      child: Row(
                        children: [
                          Icon(Icons.schedule_rounded, size: 14, color: cs.onSecondaryContainer),
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
                if (plan.agency != null) TarjetaAgencia(agency: plan.agency!),
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
                        const IncluyePill(icono: Icons.directions_bus_rounded, texto: 'Transporte'),
                      if (plan.incluyeComida)
                        const IncluyePill(icono: Icons.restaurant_rounded, texto: 'Comida'),
                      if (plan.incluyeHospedaje)
                        const IncluyePill(icono: Icons.hotel_rounded, texto: 'Hospedaje'),
                      ...plan.incluye.map(
                        (i) => IncluyePill(
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
                        child: Text(plan.puntoEncuentro, style: const TextStyle(fontSize: 14.5)),
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
                  ...reviews.map((r) => ResenaItem(review: r)),
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
    );
  }
}

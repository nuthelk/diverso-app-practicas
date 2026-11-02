import 'package:diverso_core/diverso_core.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../../../router/app_routes.dart';
import '../../../core/widgets/feedback/empty_state.dart';
import '../view_models/review_view_model.dart';
import 'review_view.dart';

/// `/resena/:bookingId`: carga la reserva por id desde el backend, así la pantalla se reconstruye
/// igual tras recargar la página en web. [booking] (de `state.extra`) solo evita la espera cuando
/// se llega desde «Mis reservas». Si la reserva no se puede reseñar (aún no viajó, ya reseñada,
/// no confirmada) lo dice en vez de dejar escribir una reseña que el servidor rechazaría.
class ReviewLoader extends StatefulWidget {
  const ReviewLoader({super.key, required this.bookingId, this.booking});

  final String bookingId;
  final Booking? booking;

  @override
  State<ReviewLoader> createState() => _ReviewLoaderState();
}

class _ReviewLoaderState extends State<ReviewLoader> {
  late final ReviewViewModel _viewModel;

  @override
  void initState() {
    super.initState();
    _viewModel = ReviewViewModel(
      reservas: context.read<BookingRepository>(),
      resenas: context.read<ReviewRepository>(),
      bookingId: widget.bookingId,
      adelantada: widget.booking,
    )..cargar();
  }

  @override
  void dispose() {
    _viewModel.dispose();
    super.dispose();
  }

  Widget _estado(Widget hijo) => Scaffold(
    appBar: AppBar(title: const Text('Tu reseña')),
    body: hijo,
  );

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: _viewModel,
      builder: (context, _) {
        final vm = _viewModel;
        if (vm.cargando) return _estado(const Center(child: CircularProgressIndicator()));
        if (vm.error != null) {
          return _estado(
            EmptyState(
              icono: Icons.cloud_off_rounded,
              titulo: 'No pudimos cargar la reserva',
              mensaje: vm.error!,
              accion: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  FilledButton.tonal(onPressed: vm.cargar, child: const Text('Reintentar')),
                  TextButton(
                    onPressed: () => context.go(AppRoutes.reservas),
                    child: const Text('Ver mis reservas'),
                  ),
                ],
              ),
            ),
          );
        }
        if (!vm.puedeResenar) {
          return _estado(
            EmptyState(
              icono: Icons.rate_review_outlined,
              titulo: 'Esta reserva no se puede reseñar',
              mensaje: 'Solo se reseñan los viajes ya realizados que aún no tienen reseña.',
              accion: FilledButton.tonal(
                onPressed: () => context.go(AppRoutes.reservas),
                child: const Text('Ver mis reservas'),
              ),
            ),
          );
        }
        return ReviewView(viewModel: vm);
      },
    );
  }
}

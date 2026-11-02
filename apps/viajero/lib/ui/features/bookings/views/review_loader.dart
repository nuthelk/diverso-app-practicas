import 'package:diverso_core/diverso_core.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../../../router/app_routes.dart';
import '../../../core/widgets/feedback/empty_state.dart';
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
  late Future<Booking> _reserva;

  @override
  void initState() {
    super.initState();
    _cargar();
  }

  void _cargar() {
    final adelantada = widget.booking;
    _reserva = adelantada != null && adelantada.id == widget.bookingId
        ? Future.value(adelantada)
        : context.read<BookingRepository>().reserva(widget.bookingId);
  }

  Widget _estado(Widget hijo) => Scaffold(
    appBar: AppBar(title: const Text('Tu reseña')),
    body: hijo,
  );

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<Booking>(
      future: _reserva,
      builder: (context, snap) {
        if (snap.connectionState != ConnectionState.done) {
          return _estado(const Center(child: CircularProgressIndicator()));
        }
        final error = snap.error;
        if (error != null) {
          final f = error is DiversoException ? error : DiversoException.fromPostgrest(error);
          return _estado(
            EmptyState(
              icono: Icons.cloud_off_rounded,
              titulo: 'No pudimos cargar la reserva',
              mensaje: f.mensajeUsuario,
              accion: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  FilledButton.tonal(
                    onPressed: () => setState(_cargar),
                    child: const Text('Reintentar'),
                  ),
                  TextButton(
                    onPressed: () => context.go(AppRoutes.reservas),
                    child: const Text('Ver mis reservas'),
                  ),
                ],
              ),
            ),
          );
        }
        final reserva = snap.data!;
        if (!reserva.puedeResenar()) {
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
        return ReviewView(booking: reserva);
      },
    );
  }
}

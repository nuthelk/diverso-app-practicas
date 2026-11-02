import 'package:diverso_core/diverso_core.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../../core/widgets/feedback/empty_state.dart';
import 'booking_success_view.dart';

/// `/reserva/:bookingId`: confirmación cargada del backend. Si la reserva sigue pendiente de
/// pago se manda a verificar el pago; si está cancelada, lo dice.
class ReservaView extends StatefulWidget {
  const ReservaView({super.key, required this.bookingId});

  final String bookingId;

  @override
  State<ReservaView> createState() => _ReservaViewState();
}

class _ReservaViewState extends State<ReservaView> {
  late Future<Booking> _reserva;

  @override
  void initState() {
    super.initState();
    _cargar();
  }

  void _cargar() => _reserva = context.read<BookingRepository>().reserva(widget.bookingId);

  Widget _estado(Widget hijo) => Scaffold(appBar: AppBar(), body: hijo);

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
              accion: FilledButton.tonal(
                onPressed: () => context.go('/reservas'),
                child: const Text('Ver mis reservas'),
              ),
            ),
          );
        }
        final reserva = snap.data!;
        switch (reserva.estado) {
          case BookingStatus.confirmada:
          case BookingStatus.completada:
            return BookingSuccessView(booking: reserva);
          case BookingStatus.pendientePago:
            WidgetsBinding.instance.addPostFrameCallback((_) {
              if (mounted) context.go('${DiversoConfig.pagoResultadoPath}?reserva=${reserva.id}');
            });
            return _estado(const Center(child: CircularProgressIndicator()));
          case BookingStatus.cancelada:
            return _estado(
              EmptyState(
                icono: Icons.event_busy_rounded,
                titulo: 'Reserva cancelada',
                mensaje:
                    'La reserva ${reserva.codigo} está cancelada.'
                    '${reserva.etiquetaReembolso == null ? '' : ' ${reserva.etiquetaReembolso}.'}',
                accion: FilledButton.tonal(
                  onPressed: () => context.go('/reservas'),
                  child: const Text('Ver mis reservas'),
                ),
              ),
            );
        }
      },
    );
  }
}

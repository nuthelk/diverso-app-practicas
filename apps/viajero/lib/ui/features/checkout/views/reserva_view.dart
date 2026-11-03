import 'package:diverso_core/diverso_core.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../../../router/app_routes.dart';
import '../../../core/widgets/feedback/empty_state.dart';
import '../view_models/reserva_view_model.dart';
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
  late final ReservaViewModel _viewModel;

  @override
  void initState() {
    super.initState();
    _viewModel = ReservaViewModel(
      reservas: context.read<BookingRepository>(),
      bookingId: widget.bookingId,
    )..cargar();
  }

  @override
  void dispose() {
    _viewModel.dispose();
    super.dispose();
  }

  Widget _estado(Widget hijo) => Scaffold(appBar: AppBar(), body: hijo);

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: _viewModel,
      builder: (context, _) {
        final vm = _viewModel;
        if (vm.cargando) return _estado(const Center(child: CircularProgressIndicator()));
        final reserva = vm.reserva;
        if (vm.error != null || reserva == null) {
          return _estado(
            EmptyState(
              icono: Icons.cloud_off_rounded,
              titulo: 'No pudimos cargar la reserva',
              mensaje: vm.error ?? '',
              accion: FilledButton.tonal(
                onPressed: () => context.go(AppRoutes.reservas),
                child: const Text('Ver mis reservas'),
              ),
            ),
          );
        }
        switch (reserva.estado) {
          case BookingStatus.confirmada:
          case BookingStatus.completada:
            return BookingSuccessView(booking: reserva);
          case BookingStatus.pendientePago:
            WidgetsBinding.instance.addPostFrameCallback((_) {
              if (mounted) context.go(AppRoutes.pagoDeReserva(reserva.id));
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
                  onPressed: () => context.go(AppRoutes.reservas),
                  child: const Text('Ver mis reservas'),
                ),
              ),
            );
        }
      },
    );
  }
}

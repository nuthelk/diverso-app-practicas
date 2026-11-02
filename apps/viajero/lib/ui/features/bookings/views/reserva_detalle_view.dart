import 'package:diverso_core/diverso_core.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../../../router/app_routes.dart';
import '../../../core/widgets/feedback/empty_state.dart';
import '../../../core/widgets/feedback/skeleton.dart';
import '../acciones_reserva.dart';
import '../view_models/reserva_detalle_view_model.dart';
import '../widgets/detalle_reserva.dart';

/// `/reservas/:bookingId`: detalle de una reserva propia (estado, salida, punto de encuentro,
/// pago, itinerario, política y acciones). Si llega [booking] (desde «Mis reservas») se pinta de
/// inmediato; sin él (recarga en web, enlace directo) se carga del backend por id.
///
/// Al volver devuelve true si algo cambió (cancelación, pago, reseña), para que la lista se recargue.
class ReservaDetalleView extends StatefulWidget {
  const ReservaDetalleView({super.key, required this.bookingId, this.booking});

  final String bookingId;
  final Booking? booking;

  @override
  State<ReservaDetalleView> createState() => _ReservaDetalleViewState();
}

class _ReservaDetalleViewState extends State<ReservaDetalleView> {
  late final ReservaDetalleViewModel _viewModel;
  late final PaymentGateway _pasarela;

  @override
  void initState() {
    super.initState();
    _viewModel = ReservaDetalleViewModel(
      reservas: context.read<BookingRepository>(),
      bookingId: widget.bookingId,
      inicial: widget.booking,
    )..addListener(_escucharAviso);
    _pasarela = context.read<PaymentGateway>();
    if (widget.booking == null) _viewModel.cargar();
  }

  @override
  void dispose() {
    _viewModel.removeListener(_escucharAviso);
    _viewModel.dispose();
    super.dispose();
  }

  void _escucharAviso() {
    if (mounted) mostrarAviso(context, _viewModel);
  }

  void _volver() =>
      context.canPop() ? context.pop(_viewModel.cambio) : context.go(AppRoutes.reservas);

  Future<void> _pagar(Booking b) async {
    await completarPago(context, _viewModel, _pasarela, b);
    if (mounted) await _viewModel.pagoIntentado();
  }

  Future<void> _resenar(Booking b) async {
    final reseno = await context.push<bool>(AppRoutes.resena(b.id), extra: b);
    if (reseno == true && mounted) _viewModel.resenaPublicada();
  }

  /// Marco de las pantallas sin reserva (cargando / error): barra con volver.
  Widget _marco(Widget cuerpo) => Scaffold(
    appBar: AppBar(
      leading: IconButton(
        tooltip: 'Volver',
        icon: const Icon(Icons.arrow_back_rounded),
        onPressed: _volver,
      ),
    ),
    body: cuerpo,
  );

  @override
  Widget build(BuildContext context) {
    // Atrás (gesto o botón del sistema) también devuelve si hubo cambios; sin pantalla previa
    // (enlace directo) lleva a «Mis reservas».
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) _volver();
      },
      child: ListenableBuilder(listenable: _viewModel, builder: (context, _) => _cuerpo(context)),
    );
  }

  Widget _cuerpo(BuildContext context) {
    final vm = _viewModel;
    final b = vm.reserva;
    if (b != null) {
      return DetalleReserva(
        booking: b,
        puedeCancelar: vm.puedeCancelar(b),
        puedeResenar: vm.puedeResenar(b),
        onVolver: _volver,
        onCancelar: () => cancelarConConfirmacion(context, vm, b),
        onPagar: () => _pagar(b),
        onVerificar: () => context.go(AppRoutes.pagoDeReserva(b.id)),
        onResenar: () => _resenar(b),
      );
    }
    if (vm.error != null) {
      return _marco(
        EmptyState(
          icono: Icons.cloud_off_rounded,
          titulo: 'No pudimos cargar la reserva',
          mensaje: vm.error!,
          accion: FilledButton.tonal(onPressed: vm.cargar, child: const Text('Reintentar')),
        ),
      );
    }
    return _marco(
      ListView(
        padding: const EdgeInsets.all(20),
        children: const [
          Skeleton(height: 190, radius: 20),
          SizedBox(height: 16),
          Skeleton(height: 28, width: 220),
          SizedBox(height: 12),
          Skeleton(height: 120, radius: 20),
        ],
      ),
    );
  }
}

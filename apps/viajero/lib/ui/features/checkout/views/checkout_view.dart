import 'package:diverso_core/diverso_core.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../../../router/app_routes.dart';
import '../../../core/widgets/section_label.dart';
import '../pago_abierto.dart';
import '../pago_wompi.dart';
import '../view_models/checkout_view_model.dart';
import '../widgets/aviso_error_pago.dart';
import '../widgets/barra_pagar.dart';
import '../widgets/pago_wompi_card.dart';
import '../widgets/reserva_pendiente_aviso.dart';
import '../widgets/resumen_pago.dart';
import '../widgets/resumen_plan.dart';
import '../widgets/selector_personas.dart';

/// Checkout: resumen claro, personas, pago con Wompi (modo prueba) y total final —
/// todo en una pantalla, sin pasos innecesarios. El estado vive en [CheckoutViewModel] (MVVM).
class CheckoutView extends StatefulWidget {
  const CheckoutView({super.key, required this.plan, required this.fecha});

  final Plan plan;
  final PlanDate fecha;

  @override
  State<CheckoutView> createState() => _CheckoutViewState();
}

class _CheckoutViewState extends State<CheckoutView> {
  /// Espacio al final de la lista para que la barra de pago no tape el contenido.
  static const double _espacioBarra = 200;

  late final CheckoutViewModel _viewModel;
  late final PaymentGateway _pasarela;

  @override
  void initState() {
    super.initState();
    _viewModel = CheckoutViewModel(reservas: context.read<BookingRepository>())
      ..cargarPendiente(widget.fecha);
    _pasarela = context.read<PaymentGateway>();
  }

  @override
  void dispose() {
    _viewModel.dispose();
    super.dispose();
  }

  Future<PagoAbierto> _abrirPago(String bookingId) =>
      iniciarPago(context, pasarela: _pasarela, bookingId: bookingId);

  Future<void> _pagar() => _viewModel.pagar(widget.fecha, _abrirPago);

  /// Fallback si la redirección no llegó: el servidor consulta a Wompi por la reserva.
  void _yaPague(String bookingId) => context.go(AppRoutes.pagoDeReserva(bookingId));

  @override
  Widget build(BuildContext context) {
    final plan = widget.plan;

    return Scaffold(
      appBar: AppBar(title: const Text('Confirmar y pagar')),
      body: ListenableBuilder(
        listenable: _viewModel,
        builder: (context, _) {
          final vm = _viewModel;
          final pendiente = vm.pendiente;
          final error = vm.error;
          final bookingId = vm.bookingId;
          return Stack(
            children: [
              ListView(
                padding: const EdgeInsets.fromLTRB(20, 8, 20, _espacioBarra),
                children: [
                  // Reserva pendiente de esta fecha (p. ej. volvió atrás desde Wompi) --------
                  if (pendiente != null) ...[
                    ReservaPendienteAviso(
                      reserva: pendiente,
                      ocupado: vm.procesando,
                      onCompletar: () => vm.completarPendiente(_abrirPago),
                      onVerificar: () => _yaPague(pendiente.id),
                      onCancelar: vm.cancelarPendiente,
                    ),
                    const SizedBox(height: 16),
                  ],
                  ResumenPlan(plan: plan, fecha: widget.fecha),
                  const SizedBox(height: 22),
                  SelectorPersonas(
                    pax: vm.pax,
                    cupos: widget.fecha.cupoDisponible,
                    puedeQuitar: vm.puedeQuitarPersona,
                    puedeAgregar: vm.puedeAgregarPersona(widget.fecha.cupoDisponible),
                    onCambiar: vm.setPax,
                  ),
                  const SizedBox(height: 22),
                  // Pago con Wompi (modo prueba) ---------------------------------
                  const SectionLabel('Pago'),
                  const PagoWompiCard(),
                  const SizedBox(height: 22),
                  ResumenPago(precioPorPersona: plan.precioCop, pax: vm.pax, total: vm.total(plan)),
                  if (error != null) ...[
                    const SizedBox(height: 16),
                    AvisoErrorPago(mensaje: error),
                  ],
                  if (bookingId != null) ...[
                    const SizedBox(height: 10),
                    OutlinedButton.icon(
                      onPressed: vm.procesando ? null : () => _yaPague(bookingId),
                      icon: const Icon(Icons.refresh_rounded, size: 18),
                      label: const Text('Ya pagué, verificar'),
                    ),
                  ],
                ],
              ),
              Positioned(
                left: 0,
                right: 0,
                bottom: 0,
                child: BarraPagar(
                  total: vm.total(plan),
                  pax: vm.pax,
                  procesando: vm.procesando,
                  onPagar: vm.puedePagar ? _pagar : null,
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}

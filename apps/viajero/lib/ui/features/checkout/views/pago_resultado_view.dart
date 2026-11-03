import 'package:diverso_core/diverso_core.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../../../router/app_routes.dart';
import '../../../core/widgets/feedback/empty_state.dart';
import '../pago_abierto.dart';
import '../pago_wompi.dart';
import '../view_models/pago_resultado_view_model.dart';

/// `/pago/resultado`: destino de la redirección de Wompi (`?id=<transacción>`) o del
/// «Ya pagué, verificar» (`?reserva=<id>`). Verifica en el servidor y lleva a la confirmación
/// (`/reserva/:id`) si el pago fue aprobado.
class PagoResultadoView extends StatefulWidget {
  const PagoResultadoView({super.key, this.transactionId, this.bookingId});

  final String? transactionId;
  final String? bookingId;

  @override
  State<PagoResultadoView> createState() => _PagoResultadoViewState();
}

class _PagoResultadoViewState extends State<PagoResultadoView> {
  late final PagoResultadoViewModel _viewModel;
  late final PaymentGateway _pasarela;

  @override
  void initState() {
    super.initState();
    _pasarela = context.read<PaymentGateway>();
    _viewModel = PagoResultadoViewModel(
      pasarela: _pasarela,
      transactionId: widget.transactionId,
      bookingId: widget.bookingId,
    )..addListener(_alCambiar);
    if (_viewModel.sinDatos) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) context.go(AppRoutes.reservas);
      });
    } else {
      _viewModel.verificar();
    }
  }

  @override
  void dispose() {
    _viewModel
      ..removeListener(_alCambiar)
      ..dispose();
    super.dispose();
  }

  void _alCambiar() {
    final r = _viewModel.resultado;
    if (!_viewModel.cargando && r?.estado == EstadoPago.aprobado && mounted) {
      context.go(AppRoutes.reserva(r!.bookingId));
    }
  }

  Future<PagoAbierto> _abrirPago(String bookingId) =>
      iniciarPago(context, pasarela: _pasarela, bookingId: bookingId);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Resultado del pago')),
      body: ListenableBuilder(
        listenable: _viewModel,
        builder: (context, _) {
          final vm = _viewModel;
          if (vm.sinDatos || vm.cargando || vm.resultado?.estado == EstadoPago.aprobado) {
            return Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const CircularProgressIndicator(),
                  const SizedBox(height: 16),
                  Text(
                    vm.intentos > 1
                        ? 'Esperando a que Wompi confirme tu pago de prueba… (intento ${vm.intentos})'
                        : 'Confirmando tu pago de prueba con Wompi…',
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            );
          }
          final falla = vm.falla;
          if (falla != null) return _error(falla);
          return _resultado(vm.resultado!);
        },
      ),
    );
  }

  Widget _error(DiversoException falla) {
    final definitivo = falla.aprobadoTarde || falla.codigo == 'MONTO_NO_COINCIDE';
    return EmptyState(
      icono: falla.aprobadoTarde ? Icons.history_toggle_off_rounded : Icons.error_outline_rounded,
      titulo: falla.aprobadoTarde ? 'Tu reserva había vencido' : 'No pudimos verificar el pago',
      mensaje: falla.mensajeUsuario,
      accion: _acciones([
        if (!definitivo)
          FilledButton(onPressed: _viewModel.verificar, child: const Text('Reintentar')),
        _verReservas(definitivo),
      ]),
    );
  }

  Widget _resultado(PagoVerificado r) {
    final puedeReintentar =
        r.estado != EstadoPago.pendiente && r.bookingEstado == BookingStatus.pendientePago;
    final mensaje = r.estado == EstadoPago.pendiente
        ? 'Todavía no recibimos la confirmación de Wompi. Te avisaremos en Mis reservas cuando llegue.'
        : r.bookingEstado == BookingStatus.pendientePago
        ? r.mensajeUsuario
        : '${r.mensajeUsuario} Tu reserva ya no está vigente; vuelve a reservar.';
    return EmptyState(
      icono: r.estado == EstadoPago.pendiente
          ? Icons.hourglass_top_rounded
          : Icons.credit_card_off_rounded,
      titulo: r.estado == EstadoPago.pendiente ? 'Pago pendiente' : 'El pago no se completó',
      mensaje: mensaje,
      detalle: _viewModel.errorReintento,
      accion: _acciones([
        if (puedeReintentar)
          FilledButton(
            onPressed: _viewModel.reintentandoPago
                ? null
                : () => _viewModel.intentarDeNuevo(r.bookingId, _abrirPago),
            child: const Text('Intentar de nuevo'),
          ),
        if (r.estado == EstadoPago.pendiente)
          FilledButton(onPressed: _viewModel.verificar, child: const Text('Verificar de nuevo')),
        _verReservas(!puedeReintentar && r.estado != EstadoPago.pendiente),
      ]),
    );
  }

  Widget _verReservas(bool principal) {
    void ir() => context.go(AppRoutes.reservas);
    const texto = Text('Ver mis reservas');
    return principal
        ? FilledButton(onPressed: ir, child: texto)
        : TextButton(onPressed: ir, child: texto);
  }

  Widget _acciones(List<Widget> botones) => Column(
    mainAxisSize: MainAxisSize.min,
    children: [
      for (final b in botones) Padding(padding: const EdgeInsets.only(bottom: 8), child: b),
    ],
  );
}

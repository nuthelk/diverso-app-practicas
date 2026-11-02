import 'package:diverso_core/diverso_core.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/widgets.dart';
import 'pago_resultado_controller.dart';
import 'pago_wompi.dart';

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
  late final PagoResultadoController _controller;
  late final PaymentGateway _pasarela;
  String? _errorReintento;
  bool _reintentando = false;

  @override
  void initState() {
    super.initState();
    _pasarela = context.read<PaymentGateway>();
    _controller = PagoResultadoController(
      pasarela: _pasarela,
      transactionId: widget.transactionId,
      bookingId: widget.bookingId,
    )..addListener(_alCambiar);
    if (_controller.sinDatos) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) context.go('/reservas');
      });
    } else {
      _controller.verificar();
    }
  }

  @override
  void dispose() {
    _controller
      ..removeListener(_alCambiar)
      ..dispose();
    super.dispose();
  }

  void _alCambiar() {
    final r = _controller.resultado;
    if (!_controller.cargando && r?.estado == EstadoPago.aprobado && mounted) {
      context.go('/reserva/${r!.bookingId}');
    }
  }

  Future<void> _intentarDeNuevo(String bookingId) async {
    setState(() {
      _reintentando = true;
      _errorReintento = null;
    });
    try {
      final terminado = await iniciarPago(context, pasarela: _pasarela, bookingId: bookingId);
      if (!terminado && mounted) {
        _errorReintento =
            'Cerraste el pago antes de terminar. Si ya pagaste, toca «Verificar de nuevo».';
      }
    } on DiversoException catch (e) {
      _errorReintento = e.mensajeUsuario;
    } catch (_) {
      _errorReintento = 'No pudimos iniciar el pago. Intenta de nuevo.';
    }
    if (mounted) setState(() => _reintentando = false);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Resultado del pago')),
      body: ListenableBuilder(
        listenable: _controller,
        builder: (context, _) {
          final c = _controller;
          if (c.sinDatos || c.cargando || c.resultado?.estado == EstadoPago.aprobado) {
            return Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const CircularProgressIndicator(),
                  const SizedBox(height: 16),
                  Text(
                    c.intentos > 1
                        ? 'Esperando a que Wompi confirme tu pago de prueba… (intento ${c.intentos})'
                        : 'Confirmando tu pago de prueba con Wompi…',
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            );
          }
          final falla = c.falla;
          if (falla != null) return _error(falla);
          return _resultado(c.resultado!);
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
          FilledButton(onPressed: _controller.verificar, child: const Text('Reintentar')),
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
      detalle: _errorReintento,
      accion: _acciones([
        if (puedeReintentar)
          FilledButton(
            onPressed: _reintentando ? null : () => _intentarDeNuevo(r.bookingId),
            child: const Text('Intentar de nuevo'),
          ),
        if (r.estado == EstadoPago.pendiente)
          FilledButton(onPressed: _controller.verificar, child: const Text('Verificar de nuevo')),
        _verReservas(!puedeReintentar && r.estado != EstadoPago.pendiente),
      ]),
    );
  }

  Widget _verReservas(bool principal) {
    void ir() => context.go('/reservas');
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

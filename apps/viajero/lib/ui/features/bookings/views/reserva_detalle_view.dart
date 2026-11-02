import 'package:diverso_core/diverso_core.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../../../router/app_routes.dart';
import '../../../core/theme/app_radii.dart';
import '../../../core/widgets/feedback/empty_state.dart';
import '../../../core/widgets/feedback/skeleton.dart';
import '../../../core/widgets/page/cabecera_colapsable.dart';
import '../../../core/widgets/plan/paso_itinerario.dart';
import '../../../core/widgets/plan/tarjeta_cancelacion.dart';
import '../../../core/widgets/section_label.dart';
import '../acciones_reserva.dart';
import '../reserva_formato.dart';
import '../view_models/bookings_view_model.dart';
import '../widgets/reserva_widgets.dart';

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
  late final BookingRepository _servicio;
  late final PaymentGateway _pasarela;
  late final BookingsViewModel _controller;
  Booking? _reserva;
  DiversoException? _error;
  bool _cambio = false;

  @override
  void initState() {
    super.initState();
    _servicio = context.read<BookingRepository>();
    _pasarela = context.read<PaymentGateway>();
    _controller = BookingsViewModel(reservas: _servicio);
    _controller.addListener(_escucharMensaje);
    _reserva = widget.booking;
    if (_reserva == null) _cargar();
  }

  @override
  void dispose() {
    _controller.removeListener(_escucharMensaje);
    _controller.dispose();
    super.dispose();
  }

  void _escucharMensaje() {
    final m = _controller.mensaje;
    if (m != null && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(m)));
      _controller.mensaje = null;
    }
  }

  /// Trae la reserva del backend. Si ya había una a la vista y falla, la deja y avisa.
  Future<void> _cargar() async {
    setState(() => _error = null);
    try {
      final nueva = await _servicio.reserva(widget.bookingId);
      if (!mounted) return;
      // `reserva(id)` no sabe si ya se reseñó: no se pierde lo que la lista ya había marcado.
      setState(() => _reserva = (_reserva?.tieneResena ?? false) ? nueva.conResena() : nueva);
    } catch (e) {
      if (!mounted) return;
      if (_reserva != null) {
        _controller.avisar('No pudimos actualizar la reserva.');
      } else {
        setState(() => _error = e is DiversoException ? e : DiversoException.fromPostgrest(e));
      }
    }
  }

  void _volver() => context.canPop() ? context.pop(_cambio) : context.go(AppRoutes.reservas);

  Future<void> _cancelar(Booking b) async {
    if (!await cancelarConConfirmacion(context, _controller, b)) return;
    _cambio = true;
    await _cargar();
  }

  Future<void> _pagar(Booking b) async {
    await completarPago(context, _controller, _pasarela, b);
    _cambio = true;
    if (mounted) await _cargar();
  }

  Future<void> _resenar(Booking b) async {
    final reseno = await context.push<bool>(AppRoutes.resena(b.id), extra: b);
    if (reseno != true || !mounted) return;
    _cambio = true;
    setState(() => _reserva = b.conResena());
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
    final b = _reserva;
    final Widget cuerpo;
    if (b != null) {
      cuerpo = _Detalle(
        booking: b,
        puedeCancelar: _controller.puedeCancelar(b),
        puedeResenar: _controller.puedeResenar(b),
        onVolver: _volver,
        onCancelar: () => _cancelar(b),
        onPagar: () => _pagar(b),
        onVerificar: () => context.go(AppRoutes.pagoDeReserva(b.id)),
        onResenar: () => _resenar(b),
      );
    } else if (_error != null) {
      cuerpo = _marco(
        EmptyState(
          icono: Icons.cloud_off_rounded,
          titulo: 'No pudimos cargar la reserva',
          mensaje: _error!.mensajeUsuario,
          accion: FilledButton.tonal(onPressed: _cargar, child: const Text('Reintentar')),
        ),
      );
    } else {
      cuerpo = _marco(
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
    // Atrás (gesto o botón del sistema) también devuelve si hubo cambios; sin pantalla previa
    // (enlace directo) lleva a «Mis reservas».
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) _volver();
      },
      child: cuerpo,
    );
  }
}

class _Detalle extends StatelessWidget {
  const _Detalle({
    required this.booking,
    required this.puedeCancelar,
    required this.puedeResenar,
    required this.onVolver,
    required this.onCancelar,
    required this.onPagar,
    required this.onVerificar,
    required this.onResenar,
  });

  final Booking booking;
  final bool puedeCancelar;
  final bool puedeResenar;
  final VoidCallback onVolver;
  final VoidCallback onCancelar;
  final VoidCallback onPagar;
  final VoidCallback onVerificar;
  final VoidCallback onResenar;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final plan = booking.plan;
    final titulo = plan?.titulo ?? 'Plan';
    final agencia = plan?.agency?.nombre;
    final salida = textoSalida(booking);
    final planId = plan?.id ?? booking.planDate?.planId;
    final pendiente = booking.estado == BookingStatus.pendientePago;
    final pago = booking.pago;
    final etiquetaReembolso = booking.etiquetaReembolso;

    return Scaffold(
      body: CustomScrollView(
        slivers: [
          CabeceraColapsable(
            titulo: titulo,
            alturaExpandida: 240,
            onVolver: onVolver,
            fondo: FotoReserva(booking: booking),
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: EdgeInsets.fromLTRB(22, 20, 22, 28 + MediaQuery.paddingOf(context).bottom),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    titulo,
                    style: const TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.w800,
                      height: 1.15,
                      letterSpacing: -.7,
                    ),
                  ),
                  if (agencia != null) ...[
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Icon(Icons.storefront_outlined, size: 16, color: cs.onSurfaceVariant),
                        const SizedBox(width: 6),
                        Expanded(
                          child: Text(
                            agencia,
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w600,
                              color: cs.onSurfaceVariant,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                  const SizedBox(height: 14),
                  Wrap(
                    spacing: 8,
                    runSpacing: 6,
                    crossAxisAlignment: WrapCrossAlignment.center,
                    children: [
                      EstadoReservaPill(booking: booking),
                      ChipCodigo(codigo: booking.codigo),
                    ],
                  ),
                  const SizedBox(height: 18),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: cs.surfaceContainerLow,
                      borderRadius: BorderRadius.circular(AppRadios.card),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        if (salida != null) ...[
                          FilaDato(
                            icono: Icons.event_rounded,
                            texto: salida,
                            acento: cuentaRegresiva(booking),
                          ),
                          const SizedBox(height: 12),
                        ],
                        if ((plan?.puntoEncuentro ?? '').isNotEmpty) ...[
                          FilaDato(icono: Icons.place_outlined, texto: plan!.puntoEncuentro),
                          const SizedBox(height: 12),
                        ],
                        FilaDato(
                          icono: Icons.group_outlined,
                          texto: '${textoPersonas(booking.pax)} · ${formatCOP(booking.montoTotal)}',
                        ),
                        if (pago != null) ...[
                          const SizedBox(height: 12),
                          FilaDato(icono: Icons.credit_card_rounded, texto: pago.textoReferencia),
                        ],
                        if (etiquetaReembolso != null) ...[
                          const SizedBox(height: 12),
                          FilaDato(
                            icono: Icons.currency_exchange_rounded,
                            texto: etiquetaReembolso,
                            color: colorReembolso(booking, cs),
                          ),
                        ],
                      ],
                    ),
                  ),
                  if (plan != null && plan.itinerario.isNotEmpty) ...[
                    const SizedBox(height: 24),
                    const SectionLabel('Itinerario'),
                    ...plan.itinerario.map((paso) => PasoItinerario(paso: paso)),
                  ],
                  if (plan != null && plan.politicaCancelacion.isNotEmpty) ...[
                    const SizedBox(height: 8),
                    TarjetaCancelacion(texto: plan.politicaCancelacion),
                  ],
                  const SizedBox(height: 24),
                  if (pendiente) ...[
                    FilledButton(onPressed: onPagar, child: const Text('Completar pago')),
                    const SizedBox(height: 8),
                    TextButton(onPressed: onVerificar, child: const Text('Ya pagué, verificar')),
                    const SizedBox(height: 8),
                  ],
                  if (puedeResenar) ...[
                    FilledButton.tonalIcon(
                      onPressed: onResenar,
                      icon: const Icon(Icons.star_outline_rounded, size: 18),
                      label: const Text('Reseñar'),
                    ),
                    const SizedBox(height: 10),
                  ] else if (booking.tieneResena) ...[
                    Row(
                      children: [
                        Icon(Icons.rate_review_rounded, size: 15, color: cs.primary),
                        const SizedBox(width: 6),
                        Text(
                          'Ya dejaste tu reseña',
                          style: TextStyle(fontSize: 13, color: cs.primary),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                  ],
                  Row(
                    children: [
                      if (planId != null)
                        Expanded(
                          child: OutlinedButton(
                            onPressed: () => context.push(AppRoutes.plan(planId)),
                            child: const Text('Ver plan'),
                          ),
                        ),
                      if (planId != null && puedeCancelar) const SizedBox(width: 10),
                      if (puedeCancelar)
                        Expanded(
                          child: OutlinedButton(
                            style: OutlinedButton.styleFrom(
                              foregroundColor: cs.error,
                              side: BorderSide(color: cs.error.withValues(alpha: .5)),
                            ),
                            onPressed: onCancelar,
                            child: const Text('Cancelar'),
                          ),
                        ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

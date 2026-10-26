import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:diverso_core/diverso_core.dart';
import 'package:provider/provider.dart';

import '../../core/widgets.dart';
import '../checkout/pago_wompi.dart';
import 'bookings_controller.dart';
import 'cancel_dialog.dart';

/// Mis reservas: próximas e historial con acciones de reseña y cancelación.
class BookingsView extends StatefulWidget {
  const BookingsView({super.key});

  @override
  State<BookingsView> createState() => _BookingsViewState();
}

class _BookingsViewState extends State<BookingsView>
    with AutomaticKeepAliveClientMixin {
  late final BookingsController _controller;
  late final PaymentGateway _pasarela;

  @override
  bool get wantKeepAlive => true;

  @override
  void initState() {
    super.initState();
    _controller = BookingsController(reservas: context.read<BookingService>());
    _pasarela = context.read<PaymentGateway>();
    _controller.cargar();
    _controller.addListener(_escucharMensaje);
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

  Future<void> _confirmarCancelacion(BuildContext context, Booking b) async {
    final vista = await _controller.vistaPrevia(b);
    if (vista == null || !context.mounted) return;
    final confirmo = await showDialog<bool>(
      context: context,
      builder: (context) => CancelacionDialog(codigo: b.codigo, vista: vista),
    );
    if (confirmo == true) await _controller.cancelar(b);
  }

  /// Retoma el pago de una reserva que sigue pendiente (mientras dure la retención de 30 min).
  Future<void> _completarPago(Booking b) async {
    try {
      final terminado = await iniciarPago(context, pasarela: _pasarela, bookingId: b.id);
      if (!terminado) {
        _controller.avisar('Cerraste el pago antes de terminar. Si ya pagaste, toca «Ya pagué, verificar».');
      }
    } on DiversoException catch (e) {
      _controller.avisar(e.mensajeUsuario);
    }
  }

  @override
  Widget build(BuildContext context) {
    super.build(context);
    final cs = Theme.of(context).colorScheme;

    return DefaultTabController(
      length: 2,
      child: ListenableBuilder(
        listenable: _controller,
        builder: (context, _) {
          final c = _controller;
          return Scaffold(
            // AppBar + TabBar fuera del área de la lista: las tarjetas no pueden pasar por encima.
            appBar: AppBar(
              title: Text(
                'Mis reservas',
                style: TextStyle(
                  fontWeight: FontWeight.w800,
                  letterSpacing: -1,
                  color: cs.onSurface,
                ),
              ),
              bottom: TabBar(
                indicatorSize: TabBarIndicatorSize.label,
                labelColor: cs.primary,
                unselectedLabelColor: cs.onSurfaceVariant,
                indicatorWeight: 2.5,
                dividerColor: Colors.transparent,
                tabs: [
                  Tab(text: 'Próximas (${c.activas.length})'),
                  Tab(text: 'Historial (${c.historial.length})'),
                ],
              ),
            ),
            body: c.cargando
                ? ListView(
                    padding: const EdgeInsets.all(20),
                    children: List.generate(
                      3,
                      (_) => const Padding(
                        padding: EdgeInsets.only(bottom: 12),
                        child: Skeleton(height: 108, radius: 20),
                      ),
                    ),
                  )
                : c.error != null
                    ? EmptyState(
                        icono: Icons.cloud_off_rounded,
                        titulo: 'Sin conexión',
                        mensaje: c.error!,
                        accion: FilledButton.tonal(
                          onPressed: c.cargar,
                          child: const Text('Reintentar'),
                        ),
                      )
                    : c.reservas.isEmpty
                        ? const EmptyState(
                            icono: Icons.luggage_rounded,
                            titulo: 'Aún no tienes reservas',
                            mensaje:
                                'Cuando reserves un plan, aquí verás tu código, la fecha y el itinerario.',
                          )
                        : TabBarView(
                            children: [
                              _lista(c.activas, vacio: 'Sin viajes próximos — ¡hora de explorar!'),
                              _lista(c.historial, vacio: 'Todavía no hay historial.'),
                            ],
                          ),
          );
        },
      ),
    );
  }

  Widget _lista(List<Booking> lista, {required String vacio}) {
    if (lista.isEmpty) {
      return ListView(
        children: [
          const SizedBox(height: 120),
          Center(
            child: Text(vacio, style: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant)),
          ),
        ],
      );
    }
    return RefreshIndicator(
      onRefresh: _controller.cargar,
      child: ListView.builder(
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 140),
        itemCount: lista.length,
        itemBuilder: (context, i) => _TarjetaReserva(
          booking: lista[i],
          onResenar: _controller.puedeResenar(lista[i])
              ? () => context.push('/resena', extra: lista[i]).then((_) => _controller.cargar())
              : null,
          onPagar: lista[i].estado == BookingStatus.pendientePago ? () => _completarPago(lista[i]) : null,
          onVerificar: lista[i].estado == BookingStatus.pendientePago
              ? () => context.go('${DiversoConfig.pagoResultadoPath}?reserva=${lista[i].id}')
              : null,
          onCancelar: _controller.puedeCancelar(lista[i])
              ? () => _confirmarCancelacion(context, lista[i])
              : null,
        ),
      ),
    );
  }
}

class _TarjetaReserva extends StatelessWidget {
  const _TarjetaReserva({
    required this.booking,
    this.onResenar,
    this.onCancelar,
    this.onPagar,
    this.onVerificar,
  });

  final Booking booking;
  final VoidCallback? onResenar;
  final VoidCallback? onCancelar;
  final VoidCallback? onPagar;
  final VoidCallback? onVerificar;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final fecha = booking.planDate?.fecha;

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: cs.surfaceContainerLow,
          borderRadius: BorderRadius.circular(AppRadios.card),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Fecha grande
            if (fecha != null)
              SizedBox(
                width: 62,
                child: Column(
                  children: [
                    Text(
                      '${fecha.day}',
                      style: TextStyle(
                        fontSize: 26,
                        fontWeight: FontWeight.w800,
                        height: 1,
                        letterSpacing: -1,
                        color: cs.primary,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      _mesCorto(fecha.month),
                      style: TextStyle(
                        fontSize: 11.5,
                        fontWeight: FontWeight.w700,
                        letterSpacing: .8,
                        color: cs.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
              ),
            if (fecha != null) const SizedBox(width: 14),
            // Info
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    booking.plan?.titulo ?? 'Plan',
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15, height: 1.25),
                  ),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          '${booking.codigo} · ${booking.pax} pax · ${formatCOP(booking.montoTotal)}',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(fontSize: 12.5, color: cs.onSurfaceVariant),
                        ),
                      ),
                      const SizedBox(width: 8),
                      _EstadoPill(estado: booking.estado),
                    ],
                  ),
                  if (booking.pago != null) ...[
                    const SizedBox(height: 4),
                    Text(
                      booking.pago!.textoReferencia,
                      style: TextStyle(fontSize: 11.5, color: cs.outline),
                    ),
                  ],
                  if (booking.etiquetaReembolso != null) ...[
                    const SizedBox(height: 4),
                    Text(
                      booking.etiquetaReembolso!,
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: booking.reembolso?.estado == EstadoReembolso.rechazado ? cs.error : cs.primary,
                      ),
                    ),
                  ],
                  if (onPagar != null || onVerificar != null) ...[
                    const SizedBox(height: 10),
                    Wrap(
                      alignment: WrapAlignment.end,
                      spacing: 8,
                      runSpacing: 4,
                      children: [
                        if (onVerificar != null)
                          TextButton(onPressed: onVerificar, child: const Text('Ya pagué, verificar')),
                        if (onPagar != null)
                          FilledButton.tonal(
                            style: FilledButton.styleFrom(minimumSize: const Size(0, 38)),
                            onPressed: onPagar,
                            child: const Text('Completar pago'),
                          ),
                      ],
                    ),
                  ],
                  if (onResenar != null || onCancelar != null) ...[
                    const SizedBox(height: 10),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.end,
                      children: [
                        if (onResenar != null)
                          FilledButton.tonalIcon(
                            style: FilledButton.styleFrom(
                              minimumSize: const Size(0, 38),
                              padding: const EdgeInsets.symmetric(horizontal: 14),
                            ),
                            onPressed: onResenar,
                            icon: const Icon(Icons.star_outline_rounded, size: 16),
                            label: const Text('Reseñar'),
                          ),
                        if (onCancelar != null) ...[
                          if (onResenar != null) const SizedBox(width: 8),
                          TextButton(
                            style: TextButton.styleFrom(
                              foregroundColor: cs.error,
                              minimumSize: const Size(0, 38),
                            ),
                            onPressed: onCancelar,
                            child: const Text('Cancelar'),
                          ),
                        ],
                      ],
                    ),
                  ] else if (booking.tieneResena) ...[
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Icon(Icons.rate_review_rounded, size: 13, color: cs.primary),
                        const SizedBox(width: 4),
                        Text('Ya dejaste tu reseña',
                            style: TextStyle(fontSize: 12, color: cs.primary)),
                      ],
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _mesCorto(int m) => const [
        'ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN',
        'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'
      ][m - 1];
}

class _EstadoPill extends StatelessWidget {
  const _EstadoPill({required this.estado});

  final BookingStatus estado;

  @override
  Widget build(BuildContext context) {
    final (color, texto) = switch (estado) {
      BookingStatus.confirmada => (const Color(0xFF1B7A4B), 'Confirmada'),
      BookingStatus.pendientePago => (const Color(0xFFB25E09), 'Pendiente'),
      BookingStatus.cancelada => (const Color(0xFFB3261E), 'Cancelada'),
      BookingStatus.completada => (const Color(0xFF4A5C6E), 'Completada'),
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 3.5),
      decoration: BoxDecoration(
        color: color.withValues(alpha: .12),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        texto,
        style: TextStyle(color: color, fontSize: 10.5, fontWeight: FontWeight.w700),
      ),
    );
  }
}

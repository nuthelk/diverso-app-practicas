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
              title: const TituloPagina('Mis reservas'),
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
                              _lista(c.historial, vacio: 'Todavía no hay historial.', historial: true),
                            ],
                          ),
          );
        },
      ),
    );
  }

  Widget _lista(List<Booking> lista, {required String vacio, bool historial = false}) {
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
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
        itemCount: lista.length,
        itemBuilder: (context, i) => _TarjetaReserva(
          booking: lista[i],
          historial: historial,
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

/// Tarjeta de una reserva: foto del plan como cabecera con la fecha de salida y el estado encima,
/// y debajo título, agencia, código · pax · precio, pago, reembolso y las acciones. Sin foto,
/// la cabecera usa un respaldo de color con el ícono de la categoría. El historial se ve más
/// apagado.
class _TarjetaReserva extends StatelessWidget {
  const _TarjetaReserva({
    required this.booking,
    this.historial = false,
    this.onResenar,
    this.onCancelar,
    this.onPagar,
    this.onVerificar,
  });

  final Booking booking;
  final bool historial;
  final VoidCallback? onResenar;
  final VoidCallback? onCancelar;
  final VoidCallback? onPagar;
  final VoidCallback? onVerificar;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final agencia = booking.plan?.agency?.nombre;

    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Card(
        color: cs.surfaceContainerLow,
        clipBehavior: Clip.antiAlias,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _Encabezado(booking: booking, apagado: historial),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 14, 16, 14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    booking.plan?.titulo ?? 'Plan',
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontWeight: FontWeight.w700,
                      fontSize: 16,
                      height: 1.25,
                      color: historial ? cs.onSurface.withValues(alpha: .72) : cs.onSurface,
                    ),
                  ),
                  if (agencia != null) ...[
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        Icon(Icons.storefront_outlined, size: 14, color: cs.onSurfaceVariant),
                        const SizedBox(width: 5),
                        Expanded(
                          child: Text(
                            agencia,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600, color: cs.onSurfaceVariant),
                          ),
                        ),
                      ],
                    ),
                  ],
                  const SizedBox(height: 8),
                  Text(
                    '${booking.codigo} · ${booking.pax} pax · ${formatCOP(booking.montoTotal)}',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(fontSize: 13, color: cs.onSurfaceVariant),
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
}

/// Cabecera de la tarjeta: foto (o respaldo) con un degradado arriba para que la insignia de fecha
/// y la píldora de estado, ambas sólidas, se lean sobre cualquier imagen.
class _Encabezado extends StatelessWidget {
  const _Encabezado({required this.booking, required this.apagado});

  final Booking booking;
  final bool apagado;

  static const _altura = 132.0;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final plan = booking.plan;
    final fecha = booking.planDate?.fecha ?? booking.salidaAt?.toLocal();
    final foto = plan?.fotoPrincipal;

    Widget respaldo({Key? key}) => ColoredBox(
          key: key,
          color: cs.primaryContainer,
          child: Center(
            child: plan == null
                ? Icon(Icons.luggage_rounded, size: 40, color: cs.onPrimaryContainer)
                : Text(plan.categoria.emoji, style: const TextStyle(fontSize: 40)),
          ),
        );

    Widget fondo = foto == null
        ? respaldo(key: const ValueKey('sin-foto-reserva'))
        : Image.network(
            foto,
            key: const ValueKey('foto-reserva'),
            fit: BoxFit.cover,
            gaplessPlayback: true,
            filterQuality: FilterQuality.low,
            errorBuilder: (_, _, _) => respaldo(),
          );
    if (apagado) {
      // Historial: la foto pierde color para que las próximas destaquen.
      fondo = ColorFiltered(
        colorFilter: const ColorFilter.matrix(<double>[
          .55, .35, .10, 0, 0, //
          .20, .70, .10, 0, 0,
          .20, .35, .45, 0, 0,
          0, 0, 0, 1, 0,
        ]),
        child: fondo,
      );
    }

    return SizedBox(
      key: const ValueKey('encabezado-reserva'),
      height: _altura,
      child: Stack(
        fit: StackFit.expand,
        children: [
          fondo,
          DecoratedBox(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [Colors.black.withValues(alpha: .38), Colors.transparent],
                stops: const [0, .55],
              ),
            ),
          ),
          if (fecha != null) Positioned(top: 12, left: 12, child: _InsigniaFecha(fecha: fecha)),
          Positioned(
            top: 12,
            right: 12,
            // Una confirmada que ya salió se muestra «Realizada» (solo etiqueta: el estado no cambia).
            child: _EstadoPill(
              estado: booking.estado,
              realizada: booking.estado == BookingStatus.confirmada &&
                  booking.salida != null &&
                  !booking.esFutura(),
            ),
          ),
        ],
      ),
    );
  }
}

/// Día y mes de la salida en una insignia opaca (legible sobre cualquier foto).
class _InsigniaFecha extends StatelessWidget {
  const _InsigniaFecha({required this.fecha});

  final DateTime fecha;

  static const _meses = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Container(
      key: const ValueKey('insignia-fecha'),
      width: 52,
      padding: const EdgeInsets.symmetric(vertical: 6),
      decoration: BoxDecoration(
        color: cs.surface,
        borderRadius: BorderRadius.circular(14),
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: .25), blurRadius: 6, offset: const Offset(0, 2))],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            '${fecha.day}',
            style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800, height: 1, letterSpacing: -.5, color: cs.primary),
          ),
          const SizedBox(height: 3),
          Text(
            _meses[fecha.month - 1],
            style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: .8, color: cs.onSurfaceVariant),
          ),
        ],
      ),
    );
  }
}

/// Estado de la reserva: píldora de color sólido con texto blanco (legible sobre foto).
class _EstadoPill extends StatelessWidget {
  const _EstadoPill({required this.estado, this.realizada = false});

  final BookingStatus estado;
  final bool realizada;

  @override
  Widget build(BuildContext context) {
    final (color, texto) = switch (estado) {
      BookingStatus.confirmada when realizada => (const Color(0xFF4A5C6E), 'Realizada'),
      BookingStatus.confirmada => (const Color(0xFF1B7A4B), 'Confirmada'),
      BookingStatus.pendientePago => (const Color(0xFFB25E09), 'Pendiente'),
      BookingStatus.cancelada => (const Color(0xFFB3261E), 'Cancelada'),
      BookingStatus.completada => (const Color(0xFF4A5C6E), 'Completada'),
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 5),
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(AppRadios.pill),
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: .25), blurRadius: 6, offset: const Offset(0, 2))],
      ),
      child: Text(
        texto,
        style: const TextStyle(color: Colors.white, fontSize: 11.5, fontWeight: FontWeight.w700),
      ),
    );
  }
}

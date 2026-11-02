import 'package:diverso_core/diverso_core.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/widgets.dart';
import 'acciones_reserva.dart';
import 'bookings_controller.dart';
import 'reserva_formato.dart';
import 'reserva_widgets.dart';

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
          // Solo se recarga si en el detalle cambió algo (cancelación, pago, reseña): así volver
          // de mirar una reserva no borra la lista ni pierde el desplazamiento.
          onAbrir: () => context.push<bool>('/reservas/${lista[i].id}', extra: lista[i]).then((cambio) {
            if (cambio == true) _controller.cargar();
          }),
          onResenar: _controller.puedeResenar(lista[i])
              ? () => context.push('/resena', extra: lista[i]).then((_) => _controller.cargar())
              : null,
          onPagar: lista[i].estado == BookingStatus.pendientePago
              ? () => completarPago(context, _controller, _pasarela, lista[i])
              : null,
          onVerificar: lista[i].estado == BookingStatus.pendientePago
              ? () => context.go('${DiversoConfig.pagoResultadoPath}?reserva=${lista[i].id}')
              : null,
          onCancelar: _controller.puedeCancelar(lista[i])
              ? () => cancelarConConfirmacion(context, _controller, lista[i])
              : null,
        ),
      ),
    );
  }
}

/// Tarjeta de una reserva, tocable (abre el detalle): foto del plan como cabecera con la fecha de
/// salida, el estado y el código encima; debajo el título y la agencia, los datos que importan
/// (salida con su cuenta regresiva y punto de encuentro), el reembolso, un pie con personas y
/// total, y las acciones. Sin foto, la cabecera usa un respaldo de color con el ícono de la
/// categoría. El historial se ve más apagado.
class _TarjetaReserva extends StatelessWidget {
  const _TarjetaReserva({
    required this.booking,
    required this.onAbrir,
    this.historial = false,
    this.onResenar,
    this.onCancelar,
    this.onPagar,
    this.onVerificar,
  });

  final Booking booking;
  final VoidCallback onAbrir;
  final bool historial;
  final VoidCallback? onResenar;
  final VoidCallback? onCancelar;
  final VoidCallback? onPagar;
  final VoidCallback? onVerificar;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final agencia = booking.plan?.agency?.nombre;
    final salida = textoSalida(booking);
    final puntoEncuentro = booking.plan?.puntoEncuentro ?? '';
    final colorTexto = historial ? cs.onSurface.withValues(alpha: .72) : cs.onSurface;

    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Card(
        color: cs.surfaceContainerLow,
        clipBehavior: Clip.antiAlias,
        child: Semantics(
          button: true,
          label: 'Ver detalle de la reserva ${booking.codigo}',
          child: InkWell(
            onTap: onAbrir,
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
                        style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16, height: 1.25, color: colorTexto),
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
                      const SizedBox(height: 12),
                      if (salida != null)
                        FilaDato(
                          icono: Icons.event_rounded,
                          texto: salida,
                          acento: cuentaRegresiva(booking),
                          compacto: true,
                        ),
                      if (puntoEncuentro.isNotEmpty) ...[
                        const SizedBox(height: 6),
                        FilaDato(icono: Icons.place_outlined, texto: puntoEncuentro, compacto: true),
                      ],
                      if (booking.etiquetaReembolso != null) ...[
                        const SizedBox(height: 6),
                        FilaDato(
                          icono: Icons.currency_exchange_rounded,
                          texto: booking.etiquetaReembolso!,
                          color: colorReembolso(booking, cs),
                          compacto: true,
                        ),
                      ],
                      const SizedBox(height: 12),
                      Divider(height: 1, color: cs.outlineVariant),
                      const SizedBox(height: 12),
                      // Wrap: con letra muy grande el total baja a su propia línea en vez de desbordar.
                      Wrap(
                        alignment: WrapAlignment.spaceBetween,
                        crossAxisAlignment: WrapCrossAlignment.center,
                        spacing: 12,
                        runSpacing: 4,
                        children: [
                          Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Icons.group_outlined, size: 16, color: cs.onSurfaceVariant),
                              const SizedBox(width: 6),
                              Text(textoPersonas(booking.pax), style: TextStyle(fontSize: 13, color: cs.onSurfaceVariant)),
                            ],
                          ),
                          Text(
                            formatCOP(booking.montoTotal),
                            style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800, letterSpacing: -.3, color: colorTexto),
                          ),
                        ],
                      ),
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
                            Text('Ya dejaste tu reseña', style: TextStyle(fontSize: 12, color: cs.primary)),
                          ],
                        ),
                      ],
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Cabecera de la tarjeta: foto (o respaldo) con un degradado arriba para que la insignia de fecha
/// y la píldora de estado, ambas sólidas, se lean sobre cualquier imagen; el código de la reserva
/// va abajo a la izquierda.
class _Encabezado extends StatelessWidget {
  const _Encabezado({required this.booking, required this.apagado});

  final Booking booking;
  final bool apagado;

  static const _altura = 132.0;

  @override
  Widget build(BuildContext context) {
    final fecha = booking.planDate?.fecha ?? booking.salidaAt?.toLocal();

    return SizedBox(
      key: const ValueKey('encabezado-reserva'),
      height: _altura,
      child: Stack(
        fit: StackFit.expand,
        children: [
          FotoReserva(booking: booking, apagado: apagado),
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
          Positioned(top: 12, right: 12, child: EstadoReservaPill(booking: booking)),
          Positioned(
            left: 12,
            right: 12,
            bottom: 10,
            child: Align(
              alignment: Alignment.bottomLeft,
              child: ChipCodigo(codigo: booking.codigo, sobreFoto: true),
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

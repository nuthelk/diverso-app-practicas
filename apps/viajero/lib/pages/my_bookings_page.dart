import 'package:flutter/material.dart';
import 'package:diverso_core/diverso_core.dart';

import 'review_page.dart';

class MyBookingsPage extends StatefulWidget {
  const MyBookingsPage({super.key});

  @override
  State<MyBookingsPage> createState() => _MyBookingsPageState();
}

class _MyBookingsPageState extends State<MyBookingsPage>
    with AutomaticKeepAliveClientMixin {
  final _reservas = BookingService();
  late Future<List<Booking>> _future;

  @override
  bool get wantKeepAlive => true;

  @override
  void initState() {
    super.initState();
    _cargar();
  }

  void _cargar() {
    _future = _reservas.misReservas();
  }

  Future<void> _refrescar() async {
    setState(() => _cargar());
    await _future;
  }

  @override
  Widget build(BuildContext context) {
    super.build(context);
    return Scaffold(
      appBar: AppBar(title: const Text('Mis reservas')),
      body: FutureBuilder<List<Booking>>(
        future: _future,
        builder: (context, snap) {
          if (snap.connectionState != ConnectionState.done) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snap.hasError) {
            return Center(child: Text('Error: ${snap.error}'));
          }
          final todas = snap.data ?? const [];
          if (todas.isEmpty) {
            return const Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.luggage_outlined, size: 56, color: Colors.black26),
                  SizedBox(height: 12),
                  Text('Aún no tienes reservas'),
                  Text('Explora planes y reserva tu próximo escape',
                      style: TextStyle(color: Colors.black54)),
                ],
              ),
            );
          }

          final activas = todas
              .where((b) =>
                  b.estado == BookingStatus.confirmada ||
                  b.estado == BookingStatus.pendientePago)
              .toList();
          final historial = todas
              .where((b) =>
                  b.estado == BookingStatus.cancelada ||
                  b.estado == BookingStatus.completada)
              .toList();

          return RefreshIndicator(
            onRefresh: _refrescar,
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                if (activas.isNotEmpty) ...[
                  const _Titulo('Próximos viajes'),
                  ...activas.map((b) => _ReservaCard(
                        booking: b,
                        alCancelar: () => _confirmarCancelacion(b),
                        alResenar: b.puedeResenar ? () => _irAResena(b) : null,
                        alRefrescar: _refrescar,
                      )),
                  const SizedBox(height: 16),
                ],
                if (historial.isNotEmpty) ...[
                  const _Titulo('Historial'),
                  ...historial.map((b) => _ReservaCard(
                        booking: b,
                        alCancelar: null,
                        alResenar: b.puedeResenar ? () => _irAResena(b) : null,
                        alRefrescar: _refrescar,
                      )),
                ],
              ],
            ),
          );
        },
      ),
    );
  }

  Future<void> _irAResena(Booking b) async {
    if (b.plan == null) return;
    await Navigator.of(context).push<bool>(
      MaterialPageRoute(builder: (_) => ReviewPage(booking: b)),
    );
    _refrescar();
  }

  Future<void> _confirmarCancelacion(Booking b) async {
    final confirmo = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('¿Cancelar reserva?'),
        content: Text(
          'La reserva ${b.codigo} se cancelará y los cupos volverán a estar '
          'disponibles. ${b.pago?.estado == PaymentStatus.aprobado ? "El pago simulado quedará marcado como reembolsado." : ""}',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Mantener'),
          ),
          FilledButton.tonal(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Sí, cancelar'),
          ),
        ],
      ),
    );
    if (confirmo != true) return;
    if (!mounted) return;

    final msg = ScaffoldMessenger.of(context);
    try {
      await _reservas.cancelar(b.id);
      msg.showSnackBar(const SnackBar(content: Text('Reserva cancelada y cupos liberados.')));
    } on DiversoException catch (e) {
      msg.showSnackBar(SnackBar(content: Text(e.mensajeUsuario)));
    }
    _refrescar();
  }
}

class _Titulo extends StatelessWidget {
  const _Titulo(this.texto);

  final String texto;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10, top: 4),
      child: Text(texto,
          style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
    );
  }
}

class _ReservaCard extends StatelessWidget {
  const _ReservaCard({
    required this.booking,
    required this.alCancelar,
    required this.alResenar,
    required this.alRefrescar,
  });

  final Booking booking;
  final VoidCallback? alCancelar;
  final VoidCallback? alResenar;
  final Future<void> Function() alRefrescar;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final plan = booking.plan;
    final fecha = booking.planDate?.fecha;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    plan?.titulo ?? 'Plan',
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
                  ),
                ),
                _chipEstado(context, booking.estado),
              ],
            ),
            const SizedBox(height: 8),
            if (fecha != null)
              Row(
                children: [
                  Icon(Icons.event_outlined, size: 15, color: cs.primary),
                  const SizedBox(width: 4),
                  Text(formatFechaLarga(fecha)),
                  const SizedBox(width: 10),
                  Icon(Icons.group_outlined, size: 15, color: cs.primary),
                  const SizedBox(width: 4),
                  Text('${booking.pax} pax'),
                ],
              ),
            const SizedBox(height: 6),
            Row(
              children: [
                Icon(Icons.confirmation_number_outlined,
                    size: 15, color: Colors.black45),
                const SizedBox(width: 4),
                Text(booking.codigo,
                    style: const TextStyle(
                        fontWeight: FontWeight.w700, letterSpacing: 1)),
                const SizedBox(width: 12),
                Text(formatCOP(booking.montoTotal),
                    style: const TextStyle(color: Colors.black54)),
              ],
            ),
            if (booking.pago != null) ...[
              const SizedBox(height: 4),
              Text(
                'Pagado con ${booking.pago!.metodo.label} · ref. ${booking.pago!.referencia}',
                style: const TextStyle(fontSize: 12, color: Colors.black45),
              ),
            ],
            if (alCancelar != null || alResenar != null) ...[
              const Divider(height: 20),
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  if (alResenar != null)
                    FilledButton.tonalIcon(
                      onPressed: alResenar,
                      icon: const Icon(Icons.star_outline, size: 17),
                      label: const Text('Reseñar'),
                    ),
                  if (alCancelar != null) ...[
                    if (alResenar != null) const SizedBox(width: 8),
                    TextButton(
                      onPressed: alCancelar,
                      child: const Text('Cancelar'),
                    ),
                  ],
                ],
              ),
            ] else if (booking.tieneResena) ...[
              const SizedBox(height: 6),
              Row(
                children: [
                  Icon(Icons.rate_review, size: 14, color: cs.primary),
                  const SizedBox(width: 4),
                  Text('Ya dejaste tu reseña',
                      style: TextStyle(fontSize: 12, color: cs.primary)),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _chipEstado(BuildContext context, BookingStatus estado) {
    final (color, texto) = switch (estado) {
      BookingStatus.confirmada => (Colors.green.shade700, estado.label),
      BookingStatus.pendientePago => (Colors.orange.shade800, estado.label),
      BookingStatus.cancelada => (Colors.red.shade700, estado.label),
      BookingStatus.completada => (Colors.blueGrey, estado.label),
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: .12),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(texto,
          style: TextStyle(
              color: color, fontSize: 11, fontWeight: FontWeight.w700)),
    );
  }
}

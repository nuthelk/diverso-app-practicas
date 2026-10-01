import 'package:flutter/material.dart';
import 'package:diverso_core/diverso_core.dart';

/// Confirmación inmediata con código e itinerario (KPI del Anexo 4: < 5 min).
class BookingSuccessPage extends StatelessWidget {
  const BookingSuccessPage({
    super.key,
    required this.codigo,
    required this.referencia,
    required this.monto,
    required this.metodo,
    required this.planTitulo,
    required this.fecha,
    required this.pax,
    required this.puntoEncuentro,
  });

  final String codigo;
  final String referencia;
  final double monto;
  final PaymentMethodOption metodo;
  final String planTitulo;
  final DateTime fecha;
  final int pax;
  final String puntoEncuentro;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;

    return Scaffold(
      appBar: AppBar(
        title: const Text('¡Reserva confirmada!'),
        automaticallyImplyLeading: false,
      ),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          const SizedBox(height: 8),
          Icon(Icons.check_circle, color: cs.primary, size: 72),
          const SizedBox(height: 12),
          Text(
            'Tu reserva está confirmada',
            textAlign: TextAlign.center,
            style: Theme.of(context)
                .textTheme
                .headlineSmall
                ?.copyWith(fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 4),
          Text(
            'Te esperamos en el punto de encuentro. ¡Buen viaje!',
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: Colors.black54),
          ),
          const SizedBox(height: 24),
          Card(
            color: cs.primaryContainer,
            child: Padding(
              padding: const EdgeInsets.all(18),
              child: Column(
                children: [
                  Text(
                    'Código de reserva',
                    style: TextStyle(
                        color: cs.onPrimaryContainer, fontWeight: FontWeight.w500),
                  ),
                  const SizedBox(height: 4),
                  SelectableText(
                    codigo,
                    style: TextStyle(
                      fontSize: 28,
                      fontWeight: FontWeight.w900,
                      letterSpacing: 2,
                      color: cs.onPrimaryContainer,
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(planTitulo,
                      style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
                  const SizedBox(height: 10),
                  _fila(Icons.event, formatFechaLarga(fecha)),
                  _fila(Icons.group_outlined, '$pax ${pax == 1 ? 'persona' : 'personas'}'),
                  if (puntoEncuentro.isNotEmpty) _fila(Icons.flag_outlined, puntoEncuentro),
                  const Divider(height: 24),
                  _fila(Icons.payments_outlined,
                      '${formatCOP(monto)} pagados con ${metodo.label}'),
                  _fila(Icons.receipt_long_outlined, 'Ref. $referencia'),
                  const SizedBox(height: 6),
                  const Row(
                    children: [
                      Icon(Icons.verified_user, size: 15, color: Colors.blueGrey),
                      SizedBox(width: 5),
                      Expanded(
                        child: Text(
                          'Compra protegida: reembolso según política de cancelación.',
                          style: TextStyle(fontSize: 12, color: Colors.black54),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 24),
          FilledButton(
            style: FilledButton.styleFrom(
              padding: const EdgeInsets.symmetric(vertical: 14),
            ),
            onPressed: () => Navigator.of(context).popUntil((r) => r.isFirst),
            child: const Text('Seguir explorando'),
          ),
        ],
      ),
    );
  }

  Widget _fila(IconData icono, String texto) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Icon(icono, size: 17, color: Colors.black54),
          const SizedBox(width: 8),
          Expanded(child: Text(texto)),
        ],
      ),
    );
  }
}

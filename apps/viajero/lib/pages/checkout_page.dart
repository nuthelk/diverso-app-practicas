import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:diverso_core/diverso_core.dart';

import 'booking_success_page.dart';

/// Checkout: reserva con control de cupos + pago (simulado en el MVP).
///
/// Flujo (Anexo 6): crear reserva (RPC atómica anti-sobreventa) → pagar con
/// el medio local elegido → confirmación inmediata. Meta: < 5 minutos.
class CheckoutPage extends StatefulWidget {
  const CheckoutPage({super.key, required this.plan, required this.fecha});

  final Plan plan;
  final PlanDate fecha;

  @override
  State<CheckoutPage> createState() => _CheckoutPageState();
}

class _CheckoutPageState extends State<CheckoutPage> {
  static final _gateway = SimulatedPaymentGateway();

  final _reservas = BookingService();

  int _pax = 1;
  PaymentMethodOption _metodo = PaymentMethodOption.nequi;
  bool _procesando = false;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final plan = widget.plan;
    final total = plan.precioCop * _pax;
    final cupos = widget.fecha.cupoDisponible;

    return Scaffold(
      appBar: AppBar(title: const Text('Confirmar y pagar')),
      body: AbsorbPointer(
        absorbing: _procesando,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Text('Tu plan', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(plan.titulo,
                        style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
                    const SizedBox(height: 6),
                    Row(
                      children: [
                        Icon(Icons.event_outlined, size: 16, color: cs.primary),
                        const SizedBox(width: 4),
                        Text(formatFechaLarga(widget.fecha.fecha)),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        Icon(Icons.place_outlined, size: 16, color: cs.primary),
                        const SizedBox(width: 4),
                        Text(plan.puntoEncuentro.isEmpty
                            ? plan.destino
                            : plan.puntoEncuentro),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 20),

            // Personas
            Text('¿Cuántas personas?', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            Row(
              children: [
                _botonPax(Icons.remove, _pax > 1, () => setState(() => _pax--)),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 18),
                  child: Text('$_pax', style: Theme.of(context).textTheme.headlineSmall),
                ),
                _botonPax(Icons.add, _pax < cupos && _pax < 20,
                    () => setState(() => _pax++)),
                const SizedBox(width: 10),
                Text('$cupos cupos disponibles',
                    style: const TextStyle(color: Colors.black54, fontSize: 13)),
              ],
            ),
            const SizedBox(height: 20),

            // Precio final desde el inicio (sin cargos ocultos — Anexo 4)
            Text('Resumen del pago', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(14),
                child: Column(
                  children: [
                    _linea('Precio por persona', formatCOP(plan.precioCop)),
                    _linea('Personas', '$_pax'),
                    const Divider(height: 20),
                    _linea('Total a pagar', formatCOP(total), bold: true),
                    const SizedBox(height: 4),
                    const Row(
                      children: [
                        Icon(Icons.lock_outline, size: 14, color: Colors.black45),
                        SizedBox(width: 5),
                        Text('Precio final, sin cargos ocultos',
                            style: TextStyle(fontSize: 12, color: Colors.black45)),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 20),

            // Medio de pago local
            Text('Medio de pago', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 4),
            Text(
              'Pago protegido con garantía de reembolso. Modo demo: pago simulado.',
              style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Colors.black54),
            ),
            const SizedBox(height: 8),
            ...PaymentMethodOption.values.map((m) {
              final sel = m == _metodo;
              return Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Card(
                  color: sel ? cs.primaryContainer : null,
                  child: RadioGroup<PaymentMethodOption>(
                    groupValue: _metodo,
                    onChanged: (v) => setState(() => _metodo = v ?? _metodo),
                    child: RadioListTile<PaymentMethodOption>(
                      value: m,
                      title: Text(m.label,
                          style: TextStyle(
                            fontWeight: sel ? FontWeight.w700 : null,
                            color: sel ? cs.onPrimaryContainer : null,
                          )),
                      secondary: _iconoMetodo(m, cs),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 8),
                    ),
                  ),
                ),
              );
            }),
            const SizedBox(height: 12),
          ],
        ),
      ),
      bottomSheet: SafeArea(
        child: Container(
          padding: const EdgeInsets.fromLTRB(16, 10, 16, 12),
          decoration: BoxDecoration(
            color: cs.surface,
            border: const Border(top: BorderSide(color: Colors.black12)),
          ),
          child: Row(
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(formatCOP(total),
                      style: Theme.of(context)
                          .textTheme
                          .titleLarge
                          ?.copyWith(fontWeight: FontWeight.w800)),
                  const Text('total', style: TextStyle(fontSize: 11)),
                ],
              ),
              const Spacer(),
              FilledButton.icon(
                style: FilledButton.styleFrom(
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
                ),
                onPressed: _procesando ? null : _pagar,
                icon: _procesando
                    ? const SizedBox(
                        height: 18,
                        width: 18,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(Icons.lock),
                label: Text(_procesando ? 'Procesando…' : 'Pagar ${formatCOP(total)}'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _botonPax(IconData icono, bool habilitado, VoidCallback onTap) {
    return OutlinedButton(
      onPressed: habilitado ? onTap : null,
      style: OutlinedButton.styleFrom(
        minimumSize: const Size(40, 40),
        maximumSize: const Size(40, 40),
        padding: EdgeInsets.zero,
        shape: const CircleBorder(),
      ),
      child: Icon(icono, size: 18),
    );
  }

  Widget _iconoMetodo(PaymentMethodOption m, ColorScheme cs) {
    final icon = switch (m) {
      PaymentMethodOption.pse => Icons.account_balance,
      PaymentMethodOption.nequi => Icons.smartphone,
      PaymentMethodOption.daviplata => Icons.phone_android,
      PaymentMethodOption.tarjeta => Icons.credit_card,
    };
    return Icon(icon, color: cs.primary);
  }

  Widget _linea(String label, String valor, {bool bold = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(color: Colors.black54)),
          Text(
            valor,
            style: TextStyle(
              fontWeight: bold ? FontWeight.w800 : FontWeight.w600,
              fontSize: bold ? 16 : null,
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _pagar() async {
    HapticFeedback.mediumImpact();
    setState(() => _procesando = true);

    final nav = Navigator.of(context);
    final msg = ScaffoldMessenger.of(context);

    try {
      // 1) Reserva atómica (el servidor valida y descuenta cupos).
      final creada = await _reservas.crearReserva(
        planDateId: widget.fecha.id,
        pax: _pax,
      );

      // 2) Pago (simulado) — confirma la reserva en la misma transacción lógica.
      final pago = await _gateway.pagar(bookingId: creada.bookingId, metodo: _metodo);

      if (!mounted) return;
      nav.pushReplacement(MaterialPageRoute(
        builder: (_) => BookingSuccessPage(
          codigo: pago.codigo,
          referencia: pago.referencia,
          monto: pago.monto,
          metodo: _metodo,
          planTitulo: widget.plan.titulo,
          fecha: widget.fecha.fecha,
          pax: _pax,
          puntoEncuentro: widget.plan.puntoEncuentro,
        ),
      ));
    } on DiversoException catch (e) {
      if (!mounted) return;
      setState(() => _procesando = false);
      msg.showSnackBar(SnackBar(content: Text(e.mensajeUsuario)));
    } catch (e) {
      if (!mounted) return;
      setState(() => _procesando = false);
      msg.showSnackBar(
          const SnackBar(content: Text('No pudimos completar el pago. Intenta de nuevo.')));
    }
  }
}
